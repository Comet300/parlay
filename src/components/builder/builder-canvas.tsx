import { useCallback, useRef, useEffect, useState } from 'react'
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
import { useShallow } from 'zustand/shallow'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { getCanvasNodeTypes, NodeTypeRegistry } from '~/lib/node-registry'
import { PAGE_TIER_TYPES, CONTENT_TIER_TYPES, ALLOWED_CHILDREN, CONTAINER_TYPES } from '~/lib/node-registry/types'
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

// Simple toast state — no external dependency
let toastTimeout: ReturnType<typeof setTimeout> | undefined
function showToast(msg: string) {
  const el = document.getElementById('builder-toast')
  if (el) {
    el.textContent = msg
    el.classList.remove('hidden')
    clearTimeout(toastTimeout)
    toastTimeout = setTimeout(() => el.classList.add('hidden'), 3000)
  }
}

export function BuilderCanvas({ facetId, settingsOpen, addNodeOpen, onToggleAddNode }: BuilderCanvasProps) {
  console.log('[canvas] render')
  const { nodes, edges, onNodesChange, onEdgesChange, setViewport, addEdge, addNode, removeNodes, removeEdges, pushSnapshot, undo, redo, copyNodes, paste } = useBuilderStore(
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
    })),
  )
  const { screenToFlowPosition, fitView } = useReactFlow()
  const prevFacetRef = useRef(facetId)
  const [confirmDelete, setConfirmDelete] = useState<{
    nodeIds: string[]
    childCount: number
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
          showToast('Copied nodes must include their parent container')
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
          showToast('Start node can only have one outgoing edge')
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

      if (CONTENT_TIER_TYPES.has(nodeType)) {
        const container = findContainerAtPosition(nodes, position)
        if (!container) {
          showToast('All nodes must be inside a Page or Page Group')
          return
        }

        const parentType = (container.type ?? container.data.type) as NodeTypeName
        const allowed = ALLOWED_CHILDREN[parentType]
        if (!allowed || !allowed.has(nodeType)) {
          showToast(`Cannot place ${descriptor.label} inside ${parentType}`)
          return
        }

        pushSnapshot()
        addNode({
          id: crypto.randomUUID(),
          type: nodeType,
          position: {
            x: position.x - container.position.x,
            y: position.y - container.position.y,
          },
          data: descriptor.defaultData(),
          parentId: container.id,
          extent: 'parent',
        })
        return
      }

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

  // Inter-container drag: reparent content nodes on drag stop
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      if (!CONTENT_TIER_TYPES.has((node.type ?? node.data.type) as NodeTypeName)) return

      // Get the absolute position of the node
      const absX = node.parentId
        ? node.position.x + (nodes.find((n) => n.id === node.parentId)?.position.x ?? 0)
        : node.position.x
      const absY = node.parentId
        ? node.position.y + (nodes.find((n) => n.id === node.parentId)?.position.y ?? 0)
        : node.position.y

      const newContainer = findContainerAtPosition(
        nodes.filter((n) => n.id !== node.id && n.id !== node.parentId),
        { x: absX, y: absY },
      )

      if (newContainer) {
        // Validate nesting rules
        const parentType = (newContainer.type ?? newContainer.data.type) as NodeTypeName
        const allowed = ALLOWED_CHILDREN[parentType]
        if (!allowed || !allowed.has((node.type ?? node.data.type) as NodeTypeName)) return

        // Reparent
        if (newContainer.id !== node.parentId) {
          pushSnapshot()
          const updatedNodes = nodes.map((n) => {
            if (n.id !== node.id) return n
            return {
              ...n,
              parentId: newContainer.id,
              extent: 'parent' as const,
              position: {
                x: absX - newContainer.position.x,
                y: absY - newContainer.position.y,
              },
            }
          })
          useBuilderStore.getState().setNodes(updatedNodes)
        }
      } else if (node.parentId) {
        // Dragged outside all containers — snap back (keep current parent)
        // React Flow's extent: 'parent' already handles this visually
      }
    },
    [nodes, pushSnapshot],
  )

  function handleConfirmDelete() {
    if (!confirmDelete) return
    pushSnapshot()
    removeNodes(confirmDelete.nodeIds)
    setConfirmDelete(null)
  }

  return (
    <div className="relative h-full w-full">
      {/* Toast notification */}
      <div
        id="builder-toast"
        className="hidden absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg pointer-events-none"
      />
      <AddNodePanel open={!!addNodeOpen} onToggle={onToggleAddNode ?? (() => {})} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onMoveEnd={(_, viewport) => setViewport(viewport)}
        onDragOver={onDragOver}
        onDrop={onDrop}
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
