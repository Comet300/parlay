import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Viewport,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import type {
  FlowNode,
  FlowEdge,
  FlowDefinition,
  FlowNodeData,
  AliasInfo,
  DeadPathInfo,
  NodeTypeName,
} from '~/lib/node-registry/types'
import { PAGE_TIER_TYPES, CONTENT_TIER_TYPES } from '~/lib/node-registry/types'
import { ALIAS_TYPES } from '~/lib/node-registry/alias-utils'

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

const CONTAINER_NODE_TYPES = new Set<NodeTypeName>(['page', 'page_group', 'group'])

// ─── Stacked layout constants ─────────────────────────────────────────
// Children are laid out in a vertical stack inside containers (like Scratch)
export const STACK_PADDING_X = 12
export const STACK_PADDING_TOP = 44 // header area
export const STACK_PADDING_BOTTOM = 12
export const STACK_GAP = 8
export const CHILD_WIDTH = 176
export const CHILD_HEIGHT = 48
export const CONTAINER_MIN_W = CHILD_WIDTH + STACK_PADDING_X * 2
export const CONTAINER_MIN_H = STACK_PADDING_TOP + STACK_PADDING_BOTTOM

// ─── Pure helpers ──────────────────────────────────────────────────────

/**
 * Position children in a vertical stack inside their parent containers
 * and auto-size containers to fit. Children are ordered by their current
 * y position (preserving user reorder via drag).
 */
function stackChildren(nodes: FlowNode[]): FlowNode[] {
  const childrenByParent = new Map<string, FlowNode[]>()
  for (const node of nodes) {
    if (node.parentId) {
      if (!childrenByParent.has(node.parentId)) childrenByParent.set(node.parentId, [])
      childrenByParent.get(node.parentId)!.push(node)
    }
  }

  // Sort each parent's children by y position (stable order)
  childrenByParent.forEach((children) => {
    children.sort((a, b) => a.position.y - b.position.y)
  })

  return nodes.map((node) => {
    // Resize containers
    if (CONTAINER_NODE_TYPES.has(node.data.type as NodeTypeName)) {
      const children = childrenByParent.get(node.id)
      const childCount = children?.length ?? 0
      const neededH = childCount > 0
        ? STACK_PADDING_TOP + childCount * CHILD_HEIGHT + (childCount - 1) * STACK_GAP + STACK_PADDING_BOTTOM
        : CONTAINER_MIN_H
      return {
        ...node,
        style: {
          ...node.style,
          width: CONTAINER_MIN_W,
          height: Math.max(CONTAINER_MIN_H, neededH),
        },
      }
    }

    // Snap children to stack positions
    if (node.parentId) {
      const siblings = childrenByParent.get(node.parentId)
      if (siblings) {
        const index = siblings.indexOf(node)
        const stackX = STACK_PADDING_X
        const stackY = STACK_PADDING_TOP + index * (CHILD_HEIGHT + STACK_GAP)
        if (node.position.x !== stackX || node.position.y !== stackY) {
          return {
            ...node,
            position: { x: stackX, y: stackY },
            style: { ...node.style, width: CHILD_WIDTH, height: CHILD_HEIGHT },
            draggable: true, // still draggable for reorder
          }
        }
        return {
          ...node,
          style: { ...node.style, width: CHILD_WIDTH, height: CHILD_HEIGHT },
          draggable: true,
        }
      }
    }
    return node
  })
}

function ensureParentBeforeChild(nodes: FlowNode[]): FlowNode[] {
  const sorted: FlowNode[] = []
  const added = new Set<string>()
  const byId = new Map(nodes.map((n) => [n.id, n]))
  function addNode(node: FlowNode) {
    if (added.has(node.id)) return
    if (node.parentId) {
      const parent = byId.get(node.parentId)
      if (parent) addNode(parent)
    }
    sorted.push(node)
    added.add(node.id)
  }
  for (const node of nodes) addNode(node)
  return sorted
}

// ─── Derived state computation ─────────────────────────────────────────

function computeAliases(nodes: FlowNode[]): AliasInfo[] {
  const result: AliasInfo[] = []
  for (const node of nodes) {
    const data = node.data
    if (ALIAS_TYPES.has(data.type) && 'alias' in data && typeof data.alias === 'string' && data.alias) {
      result.push({
        alias: data.alias,
        label: 'label' in data ? String(data.label) : '',
        type: data.type,
        nodeId: node.id,
      })
    }
  }
  return result
}

function computeAnyPageHasProgressBar(nodes: FlowNode[]): boolean {
  for (const node of nodes) {
    const t = node.data.type
    if ((t === 'page' || t === 'page_group') && 'show_progress_bar' in node.data && node.data.show_progress_bar === true) {
      return true
    }
  }
  return false
}

function computeDeadPaths(nodes: FlowNode[], edges: FlowEdge[]): DeadPathInfo[] {
  const result: DeadPathInfo[] = []
  const outgoing = new Map<string, Set<string | null>>()
  for (const edge of edges) {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, new Set())
    outgoing.get(edge.source)!.add(edge.sourceHandle ?? null)
  }
  for (const node of nodes) {
    const t = node.data.type
    if (PAGE_TIER_TYPES.has(t) && t !== 'end' && t !== 'start') {
      if (!outgoing.has(node.id)) result.push({ nodeId: node.id })
    }
    if (t === 'start' && !outgoing.has(node.id)) {
      result.push({ nodeId: node.id })
    }
    if (t === 'card' && 'buttons' in node.data) {
      const buttons = node.data.buttons as { id: string; label: string }[]
      for (const btn of buttons) {
        const handleId = `button-${btn.id}`
        const nodeHandles = outgoing.get(node.id)
        if (!nodeHandles || !nodeHandles.has(handleId)) {
          result.push({ nodeId: node.id, handleId })
        }
      }
    }
  }
  return result
}

export interface AliasConflict {
  alias: string
  nodeIds: string[]
}

function computeAliasConflicts(nodes: FlowNode[]): AliasConflict[] {
  const aliasMap = new Map<string, string[]>()
  for (const node of nodes) {
    const data = node.data
    if (ALIAS_TYPES.has(data.type) && 'alias' in data && typeof data.alias === 'string' && data.alias) {
      if (!aliasMap.has(data.alias)) aliasMap.set(data.alias, [])
      aliasMap.get(data.alias)!.push(node.id)
    }
  }
  const conflicts: AliasConflict[] = []
  aliasMap.forEach((nodeIds, alias) => {
    if (nodeIds.length > 1) conflicts.push({ alias, nodeIds })
  })
  return conflicts
}

/**
 * Shallow-compare two arrays of objects by a key (or by reference for primitives).
 * Returns the previous array if content is equal, preventing unnecessary re-renders.
 */
function stableArray<T>(prev: T[], next: T[], key?: keyof T): T[] {
  if (prev.length !== next.length) return next
  for (let i = 0; i < next.length; i++) {
    if (key ? prev[i][key] !== next[i][key] : prev[i] !== next[i]) return next
  }
  return prev
}

// Cache for derived state to avoid new references when content hasn't changed
let prevDeadPaths: DeadPathInfo[] = []
let prevAliases: AliasInfo[] = []
let prevAliasConflicts: AliasConflict[] = []

/**
 * Recompute all derived state from nodes and edges.
 * Call this in every mutation that changes nodes or edges.
 * Returns stable array references when content hasn't changed.
 */
function withDerived(partial: { nodes: FlowNode[]; edges?: FlowEdge[] }, currentEdges: FlowEdge[]) {
  const edges = partial.edges ?? currentEdges
  const deadPaths = stableArray(prevDeadPaths, computeDeadPaths(partial.nodes, edges), 'nodeId')
  const aliases = stableArray(prevAliases, computeAliases(partial.nodes), 'nodeId')
  const aliasConflicts = stableArray(prevAliasConflicts, computeAliasConflicts(partial.nodes), 'alias')
  const anyPageHasProgressBar = computeAnyPageHasProgressBar(partial.nodes)
  prevDeadPaths = deadPaths
  prevAliases = aliases
  prevAliasConflicts = aliasConflicts
  return {
    ...partial,
    edges,
    deadPaths,
    aliases,
    aliasConflicts,
    anyPageHasProgressBar,
  }
}

// ─── Store ──────────────────────────────────────────────────────────────

interface BuilderState {
  facetId: string | null
  nodes: FlowNode[]
  edges: FlowEdge[]
  viewport: Viewport
  colorScheme: unknown | null
  isDirty: boolean

  // Derived state (recomputed by withDerived on every nodes/edges mutation)
  deadPaths: DeadPathInfo[]
  aliases: AliasInfo[]
  aliasConflicts: AliasConflict[]
  anyPageHasProgressBar: boolean

  // Undo/redo
  undoStack: { nodes: FlowNode[]; edges: FlowEdge[] }[]
  redoStack: { nodes: FlowNode[]; edges: FlowEdge[] }[]
  clipboard: { nodes: FlowNode[]; edges: FlowEdge[] } | null

  // Actions
  initializeFromServer: (facetId: string, flowDefinition: unknown, colorScheme: unknown) => void
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void
  setViewport: (viewport: Viewport) => void
  setColorScheme: (colorScheme: unknown) => void
  markClean: () => void
  addNode: (node: FlowNode) => void
  updateNodeData: (nodeId: string, data: Partial<FlowNodeData>) => void
  removeNodes: (nodeIds: string[]) => void
  addEdge: (edge: FlowEdge) => void
  removeEdges: (edgeIds: string[]) => void
  setNodes: (nodes: FlowNode[]) => void
  pushSnapshot: () => void
  undo: () => void
  redo: () => void
  copyNodes: (nodeIds: string[]) => void
  paste: () => FlowNode[] | null
  /** Temporarily detach a child from its parent for cross-container drag. */
  detachNode: (nodeId: string, absolutePosition: { x: number; y: number }) => void
  /** Snap all children to stacked positions. Call after drag-stop or reparent. */
  relayout: () => void
  /** Move a child to a new index within its container, or to a new container. */
  reparentChild: (nodeId: string, newParentId: string, insertIndex: number) => void
  getFlowDefinition: () => FlowDefinition
}

const MAX_UNDO = 50

export const useBuilderStore = create<BuilderState>()(devtools<BuilderState>((set, get) => ({
  facetId: null,
  nodes: [],
  edges: [],
  viewport: DEFAULT_VIEWPORT,
  colorScheme: null,
  isDirty: false,
  deadPaths: [],
  aliases: [],
  aliasConflicts: [],
  anyPageHasProgressBar: false,
  undoStack: [],
  redoStack: [],
  clipboard: null,

  initializeFromServer: (facetId, flowDefinition, colorScheme) => {
    let nodes: FlowNode[] = []
    let edges: FlowEdge[] = []
    let viewport: Viewport = DEFAULT_VIEWPORT

    if (
      flowDefinition &&
      typeof flowDefinition === 'object' &&
      'nodes' in flowDefinition &&
      Array.isArray((flowDefinition as FlowDefinition).nodes)
    ) {
      const fd = flowDefinition as FlowDefinition
      nodes = fd.nodes
      edges = fd.edges ?? []
      viewport = fd.viewport ?? DEFAULT_VIEWPORT
    } else {
      const defaultFlow = getDefaultFlow()
      nodes = defaultFlow.nodes
      edges = defaultFlow.edges
      viewport = defaultFlow.viewport
    }

    const orderedNodes = stackChildren(ensureParentBeforeChild(nodes))
    set({
      facetId,
      ...withDerived({ nodes: orderedNodes, edges }, edges),
      viewport,
      colorScheme,
      isDirty: false,
      undoStack: [],
      redoStack: [],
      clipboard: null,
    }, false, 'initializeFromServer')
  },

  onNodesChange: (changes) => {
    const types = changes.map((c) => c.type)
    console.log('[store] onNodesChange', types.join(', '), `(${changes.length} changes)`)

    // Guard: if all changes are deselections AND focus is inside a
    // contentEditable element within the popup (i.e. ProseMirror editor),
    // ignore. React Flow fires deselect-all when focus leaves its pane.
    // We must NOT block intentional deselections from close buttons etc.
    const allDeselects =
      changes.length > 0 &&
      changes.every((c) => c.type === 'select' && !c.selected)
    if (allDeselects && typeof document !== 'undefined') {
      const active = document.activeElement as HTMLElement | null
      const inPopup = active?.closest?.('[data-node-config-popup]')
      const isEditable = active?.isContentEditable || active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA'
      if (inPopup && isEditable) {
        console.log('[store] onNodesChange — ignoring deselect (editing in popup)')
        return
      }
    }

    // Dimension-only changes: apply silently without recomputing derived state
    const meaningful = changes.filter((c) => c.type !== 'dimensions')
    if (meaningful.length === 0) {
      console.log('[store] onNodesChange — dimensions only, silent apply')
      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes),
      }), false, 'onNodesChange/dimensions')
      return
    }

    const isDirtyChange = meaningful.some(
      (c) => c.type === 'add' || c.type === 'remove' || c.type === 'position' || c.type === 'replace',
    )
    set((state) => {
      const nodes = applyNodeChanges(changes, state.nodes)
      return {
        ...withDerived({ nodes }, state.edges),
        ...(isDirtyChange ? { isDirty: true } : {}),
      }
    }, false, 'onNodesChange')
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const edges = applyEdgeChanges(changes, state.edges)
      return {
        ...withDerived({ nodes: state.nodes, edges }, edges),
        isDirty: true,
      }
    }, false, 'onEdgesChange')
  },

  setViewport: (viewport) => set({ viewport, isDirty: true }, false, 'setViewport'),

  setColorScheme: (colorScheme) => set({ colorScheme, isDirty: true }, false, 'setColorScheme'),

  markClean: () => set({ isDirty: false }, false, 'markClean'),

  addNode: (node) => {
    set((state) => {
      const nodes = stackChildren(ensureParentBeforeChild([...state.nodes, node]))
      return { ...withDerived({ nodes }, state.edges), isDirty: true }
    }, false, 'addNode')
  },

  updateNodeData: (nodeId, data) => {
    console.log('[store] updateNodeData', nodeId, Object.keys(data))
    set((state) => {
      const nodes = state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } as FlowNodeData } : n,
      )
      return { ...withDerived({ nodes }, state.edges), isDirty: true }
    }, false, 'updateNodeData')
  },

  removeNodes: (nodeIds) => {
    const idsToRemove = new Set(nodeIds)
    set((state) => {
      for (const node of state.nodes) {
        if (node.parentId && idsToRemove.has(node.parentId)) idsToRemove.add(node.id)
      }
      for (const node of state.nodes) {
        if (node.parentId && idsToRemove.has(node.parentId)) idsToRemove.add(node.id)
      }
      const remaining = state.nodes.filter((n) => !idsToRemove.has(n.id))
      const edges = state.edges.filter(
        (e) => !idsToRemove.has(e.source) && !idsToRemove.has(e.target),
      )
      const nodes = stackChildren(remaining)
      return { ...withDerived({ nodes, edges }, edges), isDirty: true }
    }, false, 'removeNodes')
  },

  addEdge: (edge) => {
    set((state) => {
      const edges = [...state.edges, edge]
      return { ...withDerived({ nodes: state.nodes, edges }, edges), isDirty: true }
    }, false, 'addEdge')
  },

  removeEdges: (edgeIds) => {
    const ids = new Set(edgeIds)
    set((state) => {
      const edges = state.edges.filter((e) => !ids.has(e.id))
      return { ...withDerived({ nodes: state.nodes, edges }, edges), isDirty: true }
    }, false, 'removeEdges')
  },

  setNodes: (nodes) => {
    set((state) => {
      const ordered = stackChildren(ensureParentBeforeChild(nodes))
      return { ...withDerived({ nodes: ordered }, state.edges), isDirty: true }
    }, false, 'setNodes')
  },

  // ─── Undo/Redo ─────────────────────────────────────────────────
  pushSnapshot: () => {
    const { nodes, edges, undoStack } = get()
    const snapshot = { nodes: [...nodes], edges: [...edges] }
    set({
      undoStack: [...undoStack.slice(-(MAX_UNDO - 1)), snapshot],
      redoStack: [],
    }, false, 'pushSnapshot')
  },

  undo: () => {
    const { undoStack, nodes, edges } = get()
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, { nodes, edges }],
      ...withDerived({ nodes: prev.nodes, edges: prev.edges }, prev.edges),
      isDirty: true,
    }), false, 'undo')
  },

  redo: () => {
    const { redoStack, nodes, edges } = get()
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, { nodes, edges }],
      ...withDerived({ nodes: next.nodes, edges: next.edges }, next.edges),
      isDirty: true,
    }), false, 'redo')
  },

  // ─── Clipboard ──────────────────────────────────────────────────
  copyNodes: (nodeIds) => {
    const { nodes, edges } = get()
    const idSet = new Set(nodeIds)
    for (const node of nodes) {
      if (node.parentId && idSet.has(node.parentId)) idSet.add(node.id)
    }
    for (const node of nodes) {
      if (node.parentId && idSet.has(node.parentId)) idSet.add(node.id)
    }
    const copiedNodes = nodes.filter((n) => idSet.has(n.id))
    const copiedEdges = edges.filter((e) => idSet.has(e.source) && idSet.has(e.target))
    set({ clipboard: { nodes: copiedNodes, edges: copiedEdges } }, false, 'copyNodes')
  },

  paste: () => {
    const { clipboard, nodes, edges } = get()
    if (!clipboard || clipboard.nodes.length === 0) return null

    const copiedIds = new Set(clipboard.nodes.map((n) => n.id))
    for (const n of clipboard.nodes) {
      if (n.parentId && CONTENT_TIER_TYPES.has(n.data.type as NodeTypeName) && !copiedIds.has(n.parentId)) {
        return null
      }
    }

    const idMap = new Map<string, string>()
    for (const n of clipboard.nodes) idMap.set(n.id, crypto.randomUUID())

    const newNodes: FlowNode[] = clipboard.nodes.map((n) => ({
      ...n,
      id: idMap.get(n.id)!,
      position: { x: n.position.x + 20, y: n.position.y + 20 },
      selected: true,
      parentId: n.parentId ? idMap.get(n.parentId) : undefined,
    }))

    const newEdges: FlowEdge[] = clipboard.edges.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }))

    const deselected = nodes.map((n) => ({ ...n, selected: false }))
    const allNodes = stackChildren(ensureParentBeforeChild([...deselected, ...newNodes]))
    const allEdges = [...edges, ...newEdges]
    set({
      ...withDerived({ nodes: allNodes, edges: allEdges }, allEdges),
      isDirty: true,
    }, false, 'paste')
    return newNodes
  },

  detachNode: (nodeId, absolutePosition) => {
    set((state) => {
      // Remove parentId and set absolute position — don't re-stack yet
      // (the node is being dragged, stacking happens on drop)
      const nodes = state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, parentId: undefined, position: absolutePosition }
          : n,
      )
      // Re-stack remaining siblings in the old container
      return { nodes: stackChildren(ensureParentBeforeChild(nodes)) }
    }, false, 'detachNode')
  },

  relayout: () => {
    set((state) => {
      const nodes = stackChildren(ensureParentBeforeChild(state.nodes))
      return { ...withDerived({ nodes }, state.edges) }
    }, false, 'relayout')
  },

  reparentChild: (nodeId, newParentId, insertIndex) => {
    set((state) => {
      // Remove from old parent's ordering (by changing parentId)
      let nodes = state.nodes.map((n) => {
        if (n.id !== nodeId) return n
        return { ...n, parentId: newParentId }
      })

      // Collect new parent's children sorted by position, insert at index
      const siblings = nodes
        .filter((n) => n.parentId === newParentId && n.id !== nodeId)
        .sort((a, b) => a.position.y - b.position.y)
      siblings.splice(insertIndex, 0, nodes.find((n) => n.id === nodeId)!)

      // Assign y positions to establish order before stackChildren
      nodes = nodes.map((n) => {
        if (n.parentId !== newParentId) return n
        const idx = siblings.findIndex((s) => s.id === n.id)
        if (idx === -1) return n
        return { ...n, position: { x: STACK_PADDING_X, y: STACK_PADDING_TOP + idx * (CHILD_HEIGHT + STACK_GAP) } }
      })

      nodes = stackChildren(ensureParentBeforeChild(nodes))
      return { ...withDerived({ nodes }, state.edges), isDirty: true }
    }, false, 'reparentChild')
  },

  getFlowDefinition: () => {
    const { nodes, edges, viewport } = get()
    return { nodes, edges, viewport }
  },
}), { name: 'builder-store' }))

// ─── Default flow helper ────────────────────────────────────────────
const DEFAULT_START_CONTENT = `# Welcome

Thank you for taking the time to participate.

Tap **Continue** below to get started.`

const DEFAULT_END_CONTENT = `# Thank you!

Your responses have been recorded. You may now close this page.`

function getDefaultFlow(): FlowDefinition {
  const startId = 'start-node'
  const endId = 'end-node'
  return {
    nodes: [
      {
        id: startId,
        type: 'start',
        position: { x: 0, y: 200 },
        data: { type: 'start', markdownContent: DEFAULT_START_CONTENT },
        deletable: false,
      },
      {
        id: endId,
        type: 'end',
        position: { x: 600, y: 200 },
        data: { type: 'end', markdownContent: DEFAULT_END_CONTENT },
        deletable: false,
      },
    ],
    edges: [
      {
        id: `${startId}->${endId}`,
        source: startId,
        target: endId,
        type: 'default',
      },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

export { getDefaultFlow }
