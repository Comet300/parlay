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
  SlugInfo,
  DeadPathInfo,
  NodeTypeName,
} from '~/lib/node-registry/types'
import { PAGE_TIER_TYPES, CONTENT_TIER_TYPES } from '~/lib/node-registry/types'

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

const CONTAINER_NODE_TYPES = new Set<NodeTypeName>(['page', 'page_group', 'group'])
const CONTAINER_PADDING = 20
const CONTAINER_HEADER = 40
const MIN_CONTAINER_W = 200
const MIN_CONTAINER_H = 100

// ─── Pure helpers ──────────────────────────────────────────────────────

function resizeContainers(nodes: FlowNode[]): FlowNode[] {
  const childrenByParent = new Map<string, FlowNode[]>()
  for (const node of nodes) {
    if (node.parentId) {
      if (!childrenByParent.has(node.parentId)) childrenByParent.set(node.parentId, [])
      childrenByParent.get(node.parentId)!.push(node)
    }
  }
  return nodes.map((node) => {
    if (!CONTAINER_NODE_TYPES.has(node.data.type as NodeTypeName)) return node
    const children = childrenByParent.get(node.id)
    if (!children || children.length === 0) return node
    let maxRight = 0
    let maxBottom = 0
    for (const child of children) {
      const cw = (child.measured?.width ?? 160) as number
      const ch = (child.measured?.height ?? 40) as number
      maxRight = Math.max(maxRight, child.position.x + cw)
      maxBottom = Math.max(maxBottom, child.position.y + ch)
    }
    const neededW = Math.max(MIN_CONTAINER_W, maxRight + CONTAINER_PADDING)
    const neededH = Math.max(MIN_CONTAINER_H, maxBottom + CONTAINER_PADDING + CONTAINER_HEADER)
    const currentW = node.style?.width as number | undefined
    const currentH = node.style?.height as number | undefined
    if (currentW !== undefined && currentW >= neededW && currentH !== undefined && currentH >= neededH) {
      return node
    }
    return {
      ...node,
      style: {
        ...node.style,
        width: Math.max(currentW ?? MIN_CONTAINER_W, neededW),
        height: Math.max(currentH ?? MIN_CONTAINER_H, neededH),
      },
    }
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

const SLUG_TYPES = new Set<NodeTypeName>([
  'likert', 'single_choice', 'multi_choice', 'email_collection',
  'card', 'scripted_llm', 'real_llm',
])

function computeSlugs(nodes: FlowNode[]): SlugInfo[] {
  const result: SlugInfo[] = []
  for (const node of nodes) {
    const data = node.data
    if (SLUG_TYPES.has(data.type) && 'slug' in data && typeof data.slug === 'string' && data.slug) {
      result.push({
        slug: data.slug,
        label: 'label' in data ? String(data.label) : '',
        type: data.type,
        nodeId: node.id,
      })
    }
  }
  return result
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

export interface SlugConflict {
  slug: string
  nodeIds: string[]
}

function computeSlugConflicts(nodes: FlowNode[]): SlugConflict[] {
  const slugMap = new Map<string, string[]>()
  for (const node of nodes) {
    const data = node.data
    if (SLUG_TYPES.has(data.type) && 'slug' in data && typeof data.slug === 'string' && data.slug) {
      if (!slugMap.has(data.slug)) slugMap.set(data.slug, [])
      slugMap.get(data.slug)!.push(node.id)
    }
  }
  const conflicts: SlugConflict[] = []
  slugMap.forEach((nodeIds, slug) => {
    if (nodeIds.length > 1) conflicts.push({ slug, nodeIds })
  })
  return conflicts
}

/**
 * Recompute all derived state from nodes and edges.
 * Call this in every mutation that changes nodes or edges.
 */
function withDerived(partial: { nodes: FlowNode[]; edges?: FlowEdge[] }, currentEdges: FlowEdge[]) {
  const edges = partial.edges ?? currentEdges
  return {
    ...partial,
    edges,
    deadPaths: computeDeadPaths(partial.nodes, edges),
    slugs: computeSlugs(partial.nodes),
    slugConflicts: computeSlugConflicts(partial.nodes),
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
  slugs: SlugInfo[]
  slugConflicts: SlugConflict[]

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
  slugs: [],
  slugConflicts: [],
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

    const orderedNodes = ensureParentBeforeChild(nodes)
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
      const nodes = resizeContainers(ensureParentBeforeChild([...state.nodes, node]))
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
      const nodes = state.nodes.filter((n) => !idsToRemove.has(n.id))
      const edges = state.edges.filter(
        (e) => !idsToRemove.has(e.source) && !idsToRemove.has(e.target),
      )
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
      const ordered = resizeContainers(ensureParentBeforeChild(nodes))
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
    const allNodes = resizeContainers(ensureParentBeforeChild([...deselected, ...newNodes]))
    const allEdges = [...edges, ...newEdges]
    set({
      ...withDerived({ nodes: allNodes, edges: allEdges }, allEdges),
      isDirty: true,
    }, false, 'paste')
    return newNodes
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
