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
import { toast } from 'sonner'
import { useShallow } from 'zustand/shallow'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { getCanvasNodeTypes, NodeTypeRegistry } from '~/lib/node-registry'
import { PAGE_TIER_TYPES, CONTENT_TIER_TYPES, ALLOWED_CHILDREN, CONTAINER_TYPES } from '~/lib/node-registry/types'
import { CHILD_HEIGHT, CHILD_WIDTH, STACK_PADDING_X, STACK_PADDING_TOP, STACK_GAP } from '~/lib/stores/builder-store'
import type { FlowNode, NodeTypeName } from '~/lib/node-registry/types'
import { NodeConfigPopup } from './node-config-popup'
import { AddNodePanel } from './add-node-panel'

const nodeTypes = getCanvasNodeTypes()

interface BuilderCanvasProps {
  facetId: string
  settingsOpen?: boolean
  addNodeOpen?: boolean
  onToggleAddNode?: () => void
}


export function BuilderCanvas({ facetId, settingsOpen, addNodeOpen, onToggleAddNode }: BuilderCanvasProps) {
  console.log('[canvas] render')
  const { nodes, edges, onNodesChange, onEdgesChange, setViewport, addEdge, addNode, removeNodes, removeEdges, pushSnapshot, undo, redo, copyNodes, paste, relayout, reparentChild, detachNode } = useBuilderStore(
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
      pushSnapshot: s.pushSnapshot,
      undo: s.undo,
      redo: s.redo,
      copyNodes: s.copyNodes,
      paste: s.paste,
      relayout: s.relayout,
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

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
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

        // Calculate insert index based on drop y-position within container
        const relY = position.y - container.position.y
        const siblings = nodes.filter((n) => n.parentId === container.id).sort((a, b) => a.position.y - b.position.y)
        let insertIndex = siblings.length
        for (let i = 0; i < siblings.length; i++) {
          if (relY < siblings[i].position.y + 24) { // 24 = half child height
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

  // On drag start: if it's a child node, detach from parent so it can
  // move freely across the canvas. Convert position to absolute coords.
  const onNodeDragStart = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      const nodeType = (node.type ?? node.data.type) as NodeTypeName
      if (!node.parentId || !CONTENT_TIER_TYPES.has(nodeType)) return

      const parent = nodes.find((n) => n.id === node.parentId)
      const absX = (parent?.position.x ?? 0) + node.position.x
      const absY = (parent?.position.y ?? 0) + node.position.y

      // Save origin for snap-back
      dragOriginRef.current = {
        nodeId: node.id,
        parentId: node.parentId,
        position: { ...node.position },
      }

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
      const targetContainer = findContainerAtPosition(
        nodes.filter((n) => n.id !== node.id),
        dropPos,
      )

      if (!targetContainer || !CONTAINER_TYPES.has((targetContainer.type ?? targetContainer.data.type) as NodeTypeName)) {
        setDropPreview(null)
        return
      }

      const targetType = (targetContainer.type ?? targetContainer.data.type) as NodeTypeName
      if (targetType === 'scripted_llm' || targetType === 'real_llm') {
        setDropPreview(null)
        return
      }

      const relY = dropPos.y - targetContainer.position.y
      const siblings = nodes
        .filter((n) => n.parentId === targetContainer.id && n.id !== node.id)
        .sort((a, b) => a.position.y - b.position.y)
      let insertIndex = siblings.length
      for (let i = 0; i < siblings.length; i++) {
        if (relY < siblings[i].position.y + CHILD_HEIGHT / 2) {
          insertIndex = i
          break
        }
      }

      setDropPreview({ containerId: targetContainer.id, insertIndex })
    },
    [nodes],
  )

  // On drag stop: reparent into target container or snap back to origin
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      setDropPreview(null)
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
      const relY = dropPos.y - targetContainer.position.y
      const targetSiblings = nodes
        .filter((n) => n.parentId === targetContainer.id && n.id !== node.id)
        .sort((a, b) => a.position.y - b.position.y)
      let insertIndex = targetSiblings.length
      for (let i = 0; i < targetSiblings.length; i++) {
        if (relY < targetSiblings[i].position.y + CHILD_HEIGHT / 2) {
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

  // Inject skeleton preview node when dragging over a container
  const displayNodes = useMemo(() => {
    if (!dropPreview) return nodes

    const { containerId, insertIndex } = dropPreview
    const skeletonId = '__drop_preview__'
    const skeletonY = STACK_PADDING_TOP + insertIndex * (CHILD_HEIGHT + STACK_GAP)

    const skeleton: FlowNode = {
      id: skeletonId,
      type: 'drop_preview' as any,
      position: { x: STACK_PADDING_X, y: skeletonY },
      data: { type: 'drop_preview' } as any,
      parentId: containerId,
      selectable: false,
      draggable: false,
      style: { width: CHILD_WIDTH, height: CHILD_HEIGHT },
    }

    // Insert skeleton and shift siblings below it down
    const result = nodes.map((n) => {
      if (n.parentId !== containerId) return n
      const siblings = nodes
        .filter((s) => s.parentId === containerId)
        .sort((a, b) => a.position.y - b.position.y)
      const idx = siblings.indexOf(n)
      if (idx >= insertIndex) {
        // Shift down by one slot to make room for skeleton
        return {
          ...n,
          position: {
            x: STACK_PADDING_X,
            y: STACK_PADDING_TOP + (idx + 1) * (CHILD_HEIGHT + STACK_GAP),
          },
        }
      }
      return n
    })

    // Also resize the container to fit the extra skeleton
    const container = result.find((n) => n.id === containerId)
    if (container) {
      const childCount = result.filter((n) => n.parentId === containerId).length + 1
      const neededH = STACK_PADDING_TOP + childCount * CHILD_HEIGHT + (childCount - 1) * STACK_GAP + 12
      const idx = result.indexOf(container)
      result[idx] = {
        ...container,
        style: { ...container.style, height: Math.max(neededH, (container.style?.height as number) ?? 0) },
      }
    }

    // Add skeleton (after parent, before children for correct z-order)
    const parentIdx = result.findIndex((n) => n.id === containerId)
    result.splice(parentIdx + 1, 0, skeleton)
    return result
  }, [nodes, dropPreview])

  return (
    <div className="relative h-full w-full">
      <AddNodePanel open={!!addNodeOpen} onToggle={onToggleAddNode ?? (() => {})} />
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
      >
        <Background />
        <Controls />
        <MiniMap
          className="!bg-gray-50 !border-gray-200"
          maskColor="rgb(0,0,0,0.05)"
        />
      </ReactFlow>
      <NodeConfigPopup settingsOpen={settingsOpen} />

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

function findContainerAtPosition(
  nodes: FlowNode[],
  position: { x: number; y: number },
): FlowNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]
    if (!CONTAINER_TYPES.has((node.type ?? node.data.type) as NodeTypeName)) continue

    const w = (node.measured?.width ?? 200) as number
    const h = (node.measured?.height ?? 100) as number

    if (
      position.x >= node.position.x &&
      position.x <= node.position.x + w &&
      position.y >= node.position.y &&
      position.y <= node.position.y + h
    ) {
      return node
    }
  }
  return null
}
