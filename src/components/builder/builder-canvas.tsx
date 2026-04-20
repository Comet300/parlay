import { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Trash2, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/shallow'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { getCanvasNodeTypes, NodeTypeRegistry } from '~/lib/node-registry'
import { PAGE_TIER_TYPES, CONTENT_TIER_TYPES, ALLOWED_CHILDREN, CONTAINER_TYPES } from '~/lib/node-registry/types'
import { CHILD_HEIGHT, STACK_PADDING_X, STACK_PADDING_TOP, STACK_PADDING_BOTTOM, STACK_GAP, MAX_GROUP_NEST_DEPTH, CONTAINER_MIN_H, CONTAINER_MIN_W } from '~/lib/stores/builder-store'
import type { FlowNode, NodeTypeName } from '~/lib/node-registry/types'
import { NodeConfigPopup } from './node-config-popup'
import { AddNodePanel } from './add-node-panel'

const nodeTypes = getCanvasNodeTypes()

// Module-level flag: true while a handle-click-triggered selection is
// being undone. The popup reads this to skip its fitView centering.
export let __handleClickInProgress = false

interface BuilderCanvasProps {
  facetId: string
  settingsOpen?: boolean
  addNodeOpen?: boolean
  onToggleAddNode?: () => void
}


export function BuilderCanvas({ facetId, addNodeOpen, onToggleAddNode }: BuilderCanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, setViewport, addEdge, addNode, removeNodes, removeEdges, setNodes, pushSnapshot, undo, redo, copyNodes, paste, reparentChild, detachNode } = useBuilderStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
      setViewport: s.setViewport,
      addEdge: s.addEdge,
      addNode: s.addNode,
      removeNodes: s.removeNodes,
      removeEdges: s.removeEdges,
      setNodes: s.setNodes,
      pushSnapshot: s.pushSnapshot,
      undo: s.undo,
      redo: s.redo,
      copyNodes: s.copyNodes,
      paste: s.paste,
      reparentChild: s.reparentChild,
      detachNode: s.detachNode,
    })),
  )
  const { screenToFlowPosition, fitView } = useReactFlow()
  const prevFacetRef = useRef(facetId)
  const [confirmDelete, setConfirmDelete] = useState<{
    nodeIds: string[]
    childCount: number
  } | null>(null)
  const [dropPreview, setDropPreview] = useState<{
    containerId: string
    insertIndex: number
  } | null>(null)
  // Preserves the origin slot during internal drags so the source container
  // doesn't visibly shrink. Cleared on drop/snap.
  const [originPreview, setOriginPreview] = useState<{
    containerId: string
    insertIndex: number
  } | null>(null)

  // Listen for dead-path highlight from toolbar
  useEffect(() => {
    function handleFitNodes(e: Event) {
      const nodeIds = (e as CustomEvent).detail as string[]
      if (nodeIds.length > 0) {
        fitView({ nodes: nodeIds.map((id) => ({ id })), padding: 0.3, duration: 400 })
      }
    }
    window.addEventListener('builder:fitview-nodes', handleFitNodes)
    return () => window.removeEventListener('builder:fitview-nodes', handleFitNodes)
  }, [fitView])

  // Fit view on initial load and facet switch
  const initialFitDone = useRef(false)
  useEffect(() => {
    if (!initialFitDone.current || prevFacetRef.current !== facetId) {
      initialFitDone.current = true
      prevFacetRef.current = facetId
      setTimeout(() => fitView({ padding: 0.2 }), 50)
    }
  }, [facetId, fitView, nodes.length])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return

      const meta = e.metaKey || e.ctrlKey

      // Delete/Backspace — delete selected nodes/edges
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        const selectedNodes = nodes.filter((n) => n.selected)
        const selectedEdges = edges.filter((e) => e.selected)

        // Delete selected edges
        if (selectedEdges.length > 0) {
          pushSnapshot()
          removeEdges(selectedEdges.map((e) => e.id))
        }

        // Filter out Start/End from deletion
        const deletable = selectedNodes.filter(
          (n) => (n.type ?? n.data.type) !== 'start' && (n.type ?? n.data.type) !== 'end',
        )
        if (deletable.length === 0) return

        // Check if any are containers with children
        const childCount = nodes.filter(
          (n) =>
            n.parentId &&
            deletable.some((d) => d.id === n.parentId) &&
            !deletable.some((d) => d.id === n.id),
        ).length

        if (childCount > 0) {
          setConfirmDelete({ nodeIds: deletable.map((n) => n.id), childCount })
        } else {
          pushSnapshot()
          removeNodes(deletable.map((n) => n.id))
        }
        return
      }

      // Escape — deselect all nodes and edges
      if (e.key === 'Escape') {
        const store = useBuilderStore.getState()
        store.onNodesChange(
          nodes
            .filter((n) => n.selected)
            .map((n) => ({ type: 'select' as const, id: n.id, selected: false })),
        )
        store.onEdgesChange(
          edges
            .filter((edge) => edge.selected)
            .map((edge) => ({ type: 'select' as const, id: edge.id, selected: false })),
        )
        return
      }

      // Ctrl/Cmd+A — select all
      if (meta && e.key === 'a') {
        e.preventDefault()
        useBuilderStore.getState().onNodesChange(
          nodes.map((n) => ({ type: 'select' as const, id: n.id, selected: true })),
        )
        return
      }

      // Ctrl/Cmd+Z — undo
      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y — redo
      if ((meta && e.key === 'z' && e.shiftKey) || (meta && e.key === 'y')) {
        e.preventDefault()
        redo()
        return
      }

      // Ctrl/Cmd+C — copy
      if (meta && e.key === 'c') {
        const selected = nodes.filter((n) => n.selected).map((n) => n.id)
        if (selected.length > 0) {
          e.preventDefault()
          copyNodes(selected)
        }
        return
      }

      // Ctrl/Cmd+V — paste
      if (meta && e.key === 'v') {
        e.preventDefault()
        pushSnapshot()
        const result = paste()
        if (result === null) {
          toast.error('Copied nodes must include their parent container')
        }
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [nodes, edges, pushSnapshot, removeNodes, removeEdges, undo, redo, copyNodes, paste])

  // Edge connection validation
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const targetNode = nodes.find((n) => n.id === connection.target)
      if (!sourceNode || !targetNode) return false

      const sourceType = (sourceNode.type ?? sourceNode.data.type) as string
      const targetType = (targetNode.type ?? targetNode.data.type) as string

      if (sourceType === 'end') return false
      if (targetType === 'start') return false

      if (connection.sourceHandle?.startsWith('button-')) {
        return PAGE_TIER_TYPES.has(targetType as NodeTypeName) && targetType !== 'start'
      }

      if (CONTENT_TIER_TYPES.has(sourceType as NodeTypeName)) return false

      if (PAGE_TIER_TYPES.has(sourceType as NodeTypeName)) {
        return PAGE_TIER_TYPES.has(targetType as NodeTypeName) && targetType !== 'start'
      }

      return false
    },
    [nodes],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const sourceNode = nodes.find((n) => n.id === connection.source)
      if (!sourceNode) return

      // Start node is hard-limited to one outgoing edge (per spec).
      if ((sourceNode.type ?? sourceNode.data.type) === 'start') {
        const existing = edges.filter((e) => e.source === connection.source)
        if (existing.length >= 1) {
          toast.error('Start node can only have one outgoing edge')
          return
        }
      }

      pushSnapshot()
      addEdge({
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: 'default',
        style: { strokeWidth: 2.5, stroke: '#94a3b8' },
      })
    },
    [nodes, edges, addEdge, pushSnapshot],
  )

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      // During an external (sidebar) drag, compute the would-be drop target
      // and show a skeleton preview inside the target container.
      // DataTransfer payloads from external drags aren't readable during
      // dragover (only on drop) in most browsers, so we show the skeleton
      // only when hovering over a valid container-tier area.
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const container = findContainerAtPosition(nodes, position)
      if (!container) {
        if (dropPreview) setDropPreview(null)
        return
      }
      const containerType = (container.type ?? container.data.type) as NodeTypeName
      if (containerType === 'scripted_llm' || containerType === 'real_llm') {
        if (dropPreview) setDropPreview(null)
        return
      }

      // Calculate insert index based on drop y within container. The
      // container's position is relative to its parent (if nested), so use
      // its absolute y to match the canvas-absolute drop position.
      const containerAbs = absolutePosition(nodes, container)
      const relY = position.y - containerAbs.y
      const siblings = nodes
        .filter((n) => n.parentId === container.id)
        .sort((a, b) => a.position.y - b.position.y)
      let insertIndex = siblings.length
      for (let i = 0; i < siblings.length; i++) {
        const sibH = (siblings[i].style?.height as number) ?? CHILD_HEIGHT
        if (relY < siblings[i].position.y + sibH / 2) {
          insertIndex = i
          break
        }
      }

      if (
        !dropPreview ||
        dropPreview.containerId !== container.id ||
        dropPreview.insertIndex !== insertIndex
      ) {
        setDropPreview({ containerId: container.id, insertIndex })
      }
    },
    [nodes, dropPreview, screenToFlowPosition],
  )

  const onDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear when leaving the pane entirely, not when moving between children
    const related = e.relatedTarget as Node | null
    if (!related || !(e.currentTarget as Node).contains(related)) {
      setDropPreview(null)
    }
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      // Clear any hover skeleton so the real node replaces it cleanly
      setDropPreview(null)
      const typeStr = e.dataTransfer.getData('application/parlay-node-type')
      if (!typeStr) return

      const nodeType = typeStr as NodeTypeName
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

      const descriptor = NodeTypeRegistry.get(nodeType)
      if (!descriptor) return

      // Content-tier: must land on a valid container
      if (CONTENT_TIER_TYPES.has(nodeType)) {
        const container = findContainerAtPosition(nodes, position)
        if (!container) {
          toast.error('Content nodes must be placed inside a Page or Page Group')
          return
        }

        const parentType = (container.type ?? container.data.type) as NodeTypeName

        // LLM nodes cannot contain children
        if (parentType === 'scripted_llm' || parentType === 'real_llm') {
          toast.error('LLM nodes cannot contain child elements')
          return
        }

        const allowed = ALLOWED_CHILDREN[parentType]
        if (!allowed || !allowed.has(nodeType)) {
          toast.error(`Cannot place ${descriptor.label} inside a ${parentType.replace('_', ' ')}`)
          return
        }

        // Enforce Group nesting depth cap
        if (nodeType === 'group') {
          let depth = 1
          let cursor: FlowNode | undefined = container
          while (cursor && cursor.data.type === 'group') {
            depth += 1
            cursor = cursor.parentId
              ? nodes.find((n) => n.id === cursor!.parentId)
              : undefined
          }
          if (depth > MAX_GROUP_NEST_DEPTH) {
            toast.error(`Cannot nest Groups more than ${MAX_GROUP_NEST_DEPTH} levels deep`)
            return
          }
        }

        // Calculate insert index based on drop y-position within container
        // (use absolute y since container may be nested inside another container)
        const containerAbs = absolutePosition(nodes, container)
        const relY = position.y - containerAbs.y
        const siblings = nodes.filter((n) => n.parentId === container.id).sort((a, b) => a.position.y - b.position.y)
        let insertIndex = siblings.length
        for (let i = 0; i < siblings.length; i++) {
          const sibH = (siblings[i].style?.height as number) ?? CHILD_HEIGHT
          if (relY < siblings[i].position.y + sibH / 2) {
            insertIndex = i
            break
          }
        }

        pushSnapshot()
        const newNode: FlowNode = {
          id: crypto.randomUUID(),
          type: nodeType,
          position: { x: 0, y: insertIndex * 56 }, // rough position, stackChildren will fix
          data: descriptor.defaultData(),
          parentId: container.id,
        }
        addNode(newNode)
        return
      }

      // Page-tier: place on canvas root
      pushSnapshot()
      addNode({
        id: crypto.randomUUID(),
        type: nodeType,
        position,
        data: descriptor.defaultData(),
      })
    },
    [nodes, screenToFlowPosition, addNode, pushSnapshot],
  )

  // Track original parent + position for cross-container drag and snap-back
  const dragOriginRef = useRef<{
    nodeId: string
    parentId: string
    position: { x: number; y: number }
  } | null>(null)
  // Remembers the last container the drag was targeting. Used for hysteresis
  // so the preview doesn't flicker when the pointer is near a container edge.
  const lastTargetRef = useRef<string | null>(null)

  // On drag start: if it's a child node, detach from parent so it can
  // move freely across the canvas. Convert position to absolute coords.
  const onNodeDragStart = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      const nodeType = (node.type ?? node.data.type) as NodeTypeName
      if (!node.parentId || !CONTENT_TIER_TYPES.has(nodeType)) return

      const { x: absX, y: absY } = absolutePosition(nodes, node)

      // Save origin for snap-back
      dragOriginRef.current = {
        nodeId: node.id,
        parentId: node.parentId,
        position: { ...node.position },
      }

      // Record origin slot so we can show a skeleton there during the drag
      const originSiblings = nodes
        .filter((n) => n.parentId === node.parentId && n.id !== node.id)
        .sort((a, b) => a.position.y - b.position.y)
      let originIdx = originSiblings.length
      for (let i = 0; i < originSiblings.length; i++) {
        if (node.position.y < originSiblings[i].position.y) {
          originIdx = i
          break
        }
      }
      setOriginPreview({ containerId: node.parentId, insertIndex: originIdx })

      // Detach from parent, convert to absolute position
      detachNode(node.id, { x: absX, y: absY })
    },
    [nodes, detachNode],
  )

  // During drag: compute where the skeleton preview should appear
  const onNodeDrag = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      if (!dragOriginRef.current) return // only for child node drags

      const dropPos = node.position // absolute (detached)
      const otherNodes = nodes.filter((n) => n.id !== node.id)
      let targetContainer = findContainerAtPosition(otherNodes, dropPos)

      // Hysteresis: if the pointer is still inside the previously-targeted
      // container's bounds, keep that target to prevent jitter at container
      // boundaries. Only switch when the pointer clearly leaves it.
      if (lastTargetRef.current && targetContainer?.id !== lastTargetRef.current) {
        const lastTarget = otherNodes.find((n) => n.id === lastTargetRef.current)
        if (lastTarget) {
          const abs = absolutePosition(otherNodes, lastTarget)
          const w = (lastTarget.style?.width as number) ?? 200
          const h = (lastTarget.style?.height as number) ?? 100
          if (
            dropPos.x >= abs.x &&
            dropPos.x <= abs.x + w &&
            dropPos.y >= abs.y &&
            dropPos.y <= abs.y + h
          ) {
            targetContainer = lastTarget
          }
        }
      }

      if (!targetContainer || !CONTAINER_TYPES.has((targetContainer.type ?? targetContainer.data.type) as NodeTypeName)) {
        lastTargetRef.current = null
        setDropPreview(null)
        return
      }

      const targetType = (targetContainer.type ?? targetContainer.data.type) as NodeTypeName
      if (targetType === 'scripted_llm' || targetType === 'real_llm') {
        lastTargetRef.current = null
        setDropPreview(null)
        return
      }
      lastTargetRef.current = targetContainer.id

      const targetAbs = absolutePosition(nodes, targetContainer)
      const relY = dropPos.y - targetAbs.y
      const siblings = nodes
        .filter((n) => n.parentId === targetContainer.id && n.id !== node.id)
        .sort((a, b) => a.position.y - b.position.y)
      let insertIndex = siblings.length
      for (let i = 0; i < siblings.length; i++) {
        const sibH = (siblings[i].style?.height as number) ?? CHILD_HEIGHT
        if (relY < siblings[i].position.y + sibH / 2) {
          insertIndex = i
          break
        }
      }

      setDropPreview({ containerId: targetContainer.id, insertIndex })

      // If the user has dragged into a different container than origin,
      // release the origin slot so the source container shrinks back
      // (no "ghost" slot held open in a container the node is leaving).
      const origin = dragOriginRef.current
      if (origin && origin.parentId !== targetContainer.id) {
        setOriginPreview(null)
      }
    },
    [nodes],
  )

  // On drag stop: reparent into target container or snap back to origin
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      setDropPreview(null)
      setOriginPreview(null)
      lastTargetRef.current = null
      const origin = dragOriginRef.current
      dragOriginRef.current = null

      const nodeType = (node.type ?? node.data.type) as NodeTypeName

      // Page-tier nodes (not children) — no stacking behavior
      if (!origin) return

      // node.position is now absolute (we detached in dragStart)
      const dropPos = node.position

      // Find which container the node was dropped on
      const targetContainer = findContainerAtPosition(
        nodes.filter((n) => n.id !== node.id),
        dropPos,
      )

      if (!targetContainer) {
        // Dropped outside any container
        toast.error('Content nodes must be placed inside a Page or Page Group')
        snapBack(origin)
        return
      }

      const targetType = (targetContainer.type ?? targetContainer.data.type) as NodeTypeName

      if (targetType === 'scripted_llm' || targetType === 'real_llm') {
        toast.error('LLM nodes cannot contain child elements')
        snapBack(origin)
        return
      }

      const allowed = ALLOWED_CHILDREN[targetType]
      if (!allowed || !allowed.has(nodeType)) {
        toast.error(`Cannot place ${NodeTypeRegistry.get(nodeType)?.label ?? nodeType} inside a ${targetType.replace('_', ' ')}`)
        snapBack(origin)
        return
      }

      // Calculate insert index based on drop y relative to target container
      // (use absolute y since container may be nested inside another container)
      const targetAbs = absolutePosition(nodes, targetContainer)
      const relY = dropPos.y - targetAbs.y
      const targetSiblings = nodes
        .filter((n) => n.parentId === targetContainer.id && n.id !== node.id)
        .sort((a, b) => a.position.y - b.position.y)
      let insertIndex = targetSiblings.length
      for (let i = 0; i < targetSiblings.length; i++) {
        const sibH = (targetSiblings[i].style?.height as number) ?? CHILD_HEIGHT
        if (relY < targetSiblings[i].position.y + sibH / 2) {
          insertIndex = i
          break
        }
      }

      pushSnapshot()
      reparentChild(node.id, targetContainer.id, insertIndex)
    },
    [nodes, pushSnapshot, reparentChild],
  )

  /** Snap a node back to its original parent at its original position */
  function snapBack(origin: { nodeId: string; parentId: string; position: { x: number; y: number } }) {
    // Re-insert at the position it came from (y determines order)
    const store = useBuilderStore.getState()
    const siblings = store.nodes
      .filter((n) => n.parentId === origin.parentId && n.id !== origin.nodeId)
      .sort((a, b) => a.position.y - b.position.y)
    // Find the original index based on y position
    let insertIndex = siblings.length
    for (let i = 0; i < siblings.length; i++) {
      if (origin.position.y <= siblings[i].position.y) {
        insertIndex = i
        break
      }
    }
    reparentChild(origin.nodeId, origin.parentId, insertIndex)
  }

  function handleConfirmDelete() {
    if (!confirmDelete) return
    pushSnapshot()
    removeNodes(confirmDelete.nodeIds)
    setConfirmDelete(null)
  }

  /**
   * Inject skeleton preview node(s) for the origin slot and the drop target
   * so (a) the source container doesn't visibly shrink during a drag and
   * (b) the user sees exactly where a drop will land. If origin and target
   * refer to the same slot, render only one skeleton.
   */
  const displayNodes = useMemo(() => {
    if (!dropPreview && !originPreview) return nodes

    // Combine slots by container. Rule: when the drop target is in the same
    // container as the origin, show only the drop target skeleton (this is
    // a reorder-in-place; showing two skeletons would double the gap).
    // When dropping into a different container, keep BOTH skeletons so the
    // source container doesn't visibly shrink.
    type Slot = { containerId: string; insertIndex: number }
    const slots: Slot[] = []
    const sameContainerDrag =
      originPreview && dropPreview && originPreview.containerId === dropPreview.containerId
    if (sameContainerDrag) {
      slots.push(dropPreview!)
    } else {
      if (originPreview) slots.push(originPreview)
      if (dropPreview) slots.push(dropPreview)
    }

    // For each container that has a slot, rebuild its children positions with
    // skeleton(s) inserted, and grow the container to fit.
    const slotsByContainer = new Map<string, number[]>()
    for (const s of slots) {
      if (!slotsByContainer.has(s.containerId)) slotsByContainer.set(s.containerId, [])
      slotsByContainer.get(s.containerId)!.push(s.insertIndex)
    }
    slotsByContainer.forEach((arr) => arr.sort((a, b) => a - b))

    // Build a Map so we can mutate node positions without worrying about
    // parent-before-child ordering in `nodes`.
    const resultMap = new Map<string, FlowNode>()
    for (const n of nodes) resultMap.set(n.id, { ...n })

    const skeletons: FlowNode[] = []

    for (const [containerId, inserts] of slotsByContainer) {
      const container = resultMap.get(containerId)
      if (!container) continue
      const siblings = nodes
        .filter((s) => s.parentId === containerId)
        .sort((a, b) => a.position.y - b.position.y)

      // Interleave siblings with skeletons at the requested insert indices
      const newOrder: { kind: 'real' | 'skel'; node?: FlowNode; id?: string }[] = []
      let skelCounter = 0
      const insertQueue = [...inserts].sort((a, b) => a - b)
      for (let i = 0; i <= siblings.length; i++) {
        while (insertQueue.length && insertQueue[0] === i) {
          insertQueue.shift()
          newOrder.push({
            kind: 'skel',
            id: `__drop_preview__${containerId}_${skelCounter++}`,
          })
        }
        if (i < siblings.length) newOrder.push({ kind: 'real', node: siblings[i] })
      }

      // Assign cumulative y positions
      let y = STACK_PADDING_TOP
      for (const entry of newOrder) {
        if (entry.kind === 'real' && entry.node) {
          const existing = resultMap.get(entry.node.id)!
          const h = (existing.style?.height as number) ?? CHILD_HEIGHT
          resultMap.set(entry.node.id, {
            ...existing,
            position: { x: STACK_PADDING_X, y },
          })
          y += h + STACK_GAP
        } else if (entry.kind === 'skel' && entry.id) {
          const parentW = (container.style?.width as number) ?? CONTAINER_MIN_W
          const skelW = parentW - 2 * STACK_PADDING_X
          const skel: FlowNode = {
            id: entry.id,
            type: 'drop_preview' as any,
            position: { x: STACK_PADDING_X, y },
            data: { type: 'drop_preview' } as any,
            parentId: containerId,
            selectable: false,
            draggable: false,
            width: skelW,
            height: CHILD_HEIGHT,
            style: {
              width: skelW,
              height: CHILD_HEIGHT,
            },
            // Pre-populate measured so React Flow skips the ResizeObserver
            // measurement pass that would otherwise trigger an infinite
            // render loop (dimensions change → displayNodes recomputes →
            // new skeleton instance → re-measure → …).
            measured: { width: skelW, height: CHILD_HEIGHT },
          }
          skeletons.push(skel)
          y += CHILD_HEIGHT + STACK_GAP
        }
      }

      // Grow container to fit the extra skeleton(s)
      const currentH = (container.style?.height as number) ?? CONTAINER_MIN_H
      const neededH = Math.max(currentH, y - STACK_GAP + STACK_PADDING_BOTTOM)
      resultMap.set(containerId, {
        ...container,
        style: { ...container.style, height: neededH },
      })
    }

    // Propagate size changes up the parent chain: when a Group grows to
    // accommodate a skeleton, its Page/PageGroup ancestor must grow too so
    // the Group doesn't visually overflow its parent. We also recompute each
    // ancestor's children y-positions because changing one child's height
    // shifts later siblings.
    //
    // Build a children-by-parent index from the in-progress resultMap and
    // repeatedly recompute heights/positions bottom-up until stable.
    const allNodes = Array.from(resultMap.values()).concat(skeletons)
    const childrenByParent = new Map<string, FlowNode[]>()
    for (const n of allNodes) {
      if (!n.parentId) continue
      if (!childrenByParent.has(n.parentId)) childrenByParent.set(n.parentId, [])
      childrenByParent.get(n.parentId)!.push(n)
    }
    childrenByParent.forEach((arr) => arr.sort((a, b) => a.position.y - b.position.y))

    function recomputeContainer(containerId: string) {
      const container = resultMap.get(containerId)
      if (!container) return
      const kids = childrenByParent.get(containerId) ?? []
      if (kids.length === 0) return

      // Reassign each child's cumulative y, then set container height
      let y = STACK_PADDING_TOP
      for (const kid of kids) {
        const h = (kid.style?.height as number) ?? CHILD_HEIGHT
        if (kid.id.startsWith('__drop_preview__')) {
          const idx = skeletons.findIndex((s) => s.id === kid.id)
          if (idx >= 0) {
            skeletons[idx] = {
              ...skeletons[idx],
              position: { x: STACK_PADDING_X, y },
            }
          }
        } else {
          const real = resultMap.get(kid.id)
          if (real) {
            resultMap.set(kid.id, {
              ...real,
              position: { x: STACK_PADDING_X, y },
            })
          }
        }
        y += h + STACK_GAP
      }
      const neededH = y - STACK_GAP + STACK_PADDING_BOTTOM
      const currentH = (container.style?.height as number) ?? CONTAINER_MIN_H
      if (neededH > currentH) {
        resultMap.set(containerId, {
          ...container,
          style: { ...container.style, height: neededH },
        })
      }
    }

    // Walk each container-touching ancestor chain starting from each grown
    // container, bottom-up.
    const toVisit = new Set<string>(slotsByContainer.keys())
    while (toVisit.size > 0) {
      // Pick a container whose no-descendant-is-in-toVisit (process deepest first)
      let picked: string | null = null
      for (const id of toVisit) {
        const hasDescendantPending = Array.from(toVisit).some((other) => {
          if (other === id) return false
          const otherNode = resultMap.get(other)
          let pid = otherNode?.parentId
          while (pid) {
            if (pid === id) return true
            pid = resultMap.get(pid)?.parentId
          }
          return false
        })
        if (!hasDescendantPending) {
          picked = id
          break
        }
      }
      if (!picked) picked = Array.from(toVisit)[0]!
      toVisit.delete(picked)
      recomputeContainer(picked)
      // Queue the parent so it also recomputes with our new height
      const parent = resultMap.get(picked)?.parentId
      if (parent && resultMap.has(parent)) {
        toVisit.add(parent)
      }
    }

    // Return nodes in their original order, then append skeletons after all
    // their potential parents have appeared.
    const out = nodes.map((n) => resultMap.get(n.id)!)
    out.push(...skeletons)
    return out
  }, [nodes, dropPreview, originPreview])

  // Track pending connect-on-click: when a source handle has been tapped
  // and we're waiting for the target tap, hide the popup so its backdrop
  // doesn't block target handles.
  const [connectPending, setConnectPending] = useState(false)

  const selectedEdges = edges.filter((e) => e.selected)

  function handleDeleteSelectedEdges() {
    if (selectedEdges.length === 0) return
    pushSnapshot()
    removeEdges(selectedEdges.map((e) => e.id))
  }

  // When a handle (connection dot) is tapped/clicked, prevent the event
  // from bubbling to the node wrapper — otherwise React Flow selects the
  // node (which opens our popup) instead of starting a connection.
  // When a handle (connection dot) is tapped/clicked, React Flow processes
  // it for connectOnClick AND selects the parent node (opening our popup).
  // We let the click propagate so connectOnClick works, but immediately
  // undo the node selection so the popup doesn't block the next handle tap.
  const handleClickRef = useRef(false)

  const onWrapperClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.react-flow__handle')) {
      handleClickRef.current = true
      __handleClickInProgress = true
      // Deselect the node after React Flow's click processing finishes
      requestAnimationFrame(() => {
        if (!handleClickRef.current) return
        handleClickRef.current = false
        __handleClickInProgress = false
        const store = useBuilderStore.getState()
        const selected = store.nodes.filter((n) => n.selected)
        if (selected.length > 0) {
          store.onNodesChange(
            selected.map((n) => ({ type: 'select' as const, id: n.id, selected: false })),
          )
        }
      })
    }
  }, [])

  /**
   * Auto-arrange: topological BFS from Start left-to-right, assigning
   * each node to a column (depth from Start). Within each column, nodes
   * are spaced vertically. Children (content-tier) stay with their
   * parent containers — only root-level page-tier nodes are repositioned.
   */
  function handleAutoArrange() {
    pushSnapshot()

    // Only arrange root-level (no parentId) page-tier nodes.
    const rootNodes = nodes.filter((n) => !n.parentId)

    // Build adjacency from edges (source → targets)
    const adj = new Map<string, string[]>()
    for (const edge of edges) {
      if (!adj.has(edge.source)) adj.set(edge.source, [])
      adj.get(edge.source)!.push(edge.target)
    }

    // BFS from Start to assign columns (depth)
    const startNode = rootNodes.find((n) => (n.type ?? n.data.type) === 'start')
    if (!startNode) return

    const depth = new Map<string, number>()
    const queue: string[] = [startNode.id]
    depth.set(startNode.id, 0)

    while (queue.length > 0) {
      const current = queue.shift()!
      const currentDepth = depth.get(current)!
      for (const target of adj.get(current) ?? []) {
        if (!depth.has(target) || depth.get(target)! < currentDepth + 1) {
          depth.set(target, currentDepth + 1)
          queue.push(target)
        }
      }
    }

    // Any nodes not reachable from Start get placed in a final column
    const maxDepth = Math.max(0, ...Array.from(depth.values()))
    for (const n of rootNodes) {
      if (!depth.has(n.id)) {
        depth.set(n.id, maxDepth + 1)
      }
    }

    // Group nodes by column
    const columns = new Map<number, FlowNode[]>()
    for (const n of rootNodes) {
      const d = depth.get(n.id) ?? 0
      if (!columns.has(d)) columns.set(d, [])
      columns.get(d)!.push(n)
    }

    // Layout constants
    const COLUMN_GAP = 350
    const ROW_GAP = 120

    // Assign positions: each column at x = col * COLUMN_GAP.
    // Within each column, center nodes vertically around y=0.
    const newPositions = new Map<string, { x: number; y: number }>()
    for (const [col, colNodes] of columns) {
      const x = col * COLUMN_GAP
      const totalHeight = colNodes.reduce((sum, n) => {
        const h = (n.style?.height as number) ?? 100
        return sum + h
      }, 0) + (colNodes.length - 1) * ROW_GAP
      let y = -totalHeight / 2
      for (const n of colNodes) {
        const h = (n.style?.height as number) ?? 100
        newPositions.set(n.id, { x, y })
        y += h + ROW_GAP
      }
    }

    // Apply new positions to root nodes; children keep their relative positions
    const updated = nodes.map((n) => {
      const pos = newPositions.get(n.id)
      if (pos) return { ...n, position: pos }
      return n
    })

    setNodes(updated)

    // Fit the canvas to show everything after arranging
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 })
    }, 50)
  }

  return (
    <div className="relative h-full w-full" onClick={onWrapperClick}>
      <AddNodePanel open={!!addNodeOpen} onToggle={onToggleAddNode ?? (() => {})} />
      {!addNodeOpen && (
        <button
          onClick={handleAutoArrange}
          className="absolute left-[8.5rem] top-3 z-30 flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          title="Auto-arrange nodes"
        >
          <LayoutGrid className="h-4 w-4" />
          Arrange
        </button>
      )}
      {selectedEdges.length > 0 && !addNodeOpen && (
        <button
          onClick={handleDeleteSelectedEdges}
          className="absolute left-[16.5rem] top-3 z-30 flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-100 transition-colors"
          title="Delete selected edge"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      )}
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onMoveEnd={(_, viewport) => setViewport(viewport)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          type: 'default',
          style: { strokeWidth: 2.5, stroke: '#94a3b8' },
        }}
        deleteKeyCode={null}
        multiSelectionKeyCode="Meta"
        selectNodesOnDrag={false}
        panOnDrag
        zoomOnPinch
        connectOnClick
        onConnectStart={() => setConnectPending(true)}
        onConnectEnd={() => setConnectPending(false)}
      >
        <Background />
        <Controls />
        <MiniMap
          className="!bg-gray-50 !border-gray-200"
          maskColor="rgb(0,0,0,0.05)"
        />
      </ReactFlow>
      {!connectPending && <NodeConfigPopup />}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Delete nodes?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This will also delete {confirmDelete.childCount} child node
              {confirmDelete.childCount > 1 ? 's' : ''} inside the container
              {confirmDelete.nodeIds.length > 1 ? 's' : ''}.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Absolute (canvas-root) position of a node, walking up parentId chain. */
function absolutePosition(
  nodes: FlowNode[],
  node: FlowNode,
): { x: number; y: number } {
  let x = node.position.x
  let y = node.position.y
  let pid = node.parentId
  const byId = new Map(nodes.map((n) => [n.id, n]))
  while (pid) {
    const parent = byId.get(pid)
    if (!parent) break
    x += parent.position.x
    y += parent.position.y
    pid = parent.parentId
  }
  return { x, y }
}

/** Find the innermost container whose absolute bounds contain the given
 *  canvas-absolute position. Nested containers are considered first. */
function findContainerAtPosition(
  nodes: FlowNode[],
  position: { x: number; y: number },
): FlowNode | null {
  // Candidate containers with absolute bounds
  const candidates: { node: FlowNode; x: number; y: number; w: number; h: number; depth: number }[] = []
  for (const node of nodes) {
    if (!CONTAINER_TYPES.has((node.type ?? node.data.type) as NodeTypeName)) continue
    const abs = absolutePosition(nodes, node)
    const w = ((node.style?.width as number) ?? (node.measured?.width ?? 200)) as number
    const h = ((node.style?.height as number) ?? (node.measured?.height ?? 100)) as number
    // Depth = number of ancestors; innermost containers have greater depth
    let depth = 0
    let pid = node.parentId
    const byId = new Map(nodes.map((n) => [n.id, n]))
    while (pid) {
      depth += 1
      pid = byId.get(pid)?.parentId
    }
    candidates.push({ node, x: abs.x, y: abs.y, w, h, depth })
  }
  // Sort deepest first so we hit the innermost valid container
  candidates.sort((a, b) => b.depth - a.depth)
  for (const c of candidates) {
    if (
      position.x >= c.x &&
      position.x <= c.x + c.w &&
      position.y >= c.y &&
      position.y <= c.y + c.h
    ) {
      return c.node
    }
  }
  return null
}
