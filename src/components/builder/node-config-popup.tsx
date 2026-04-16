import { useEffect, useRef, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { X, Trash2, Maximize2, Minimize2 } from 'lucide-react'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { NodeTypeRegistry } from '~/lib/node-registry'
import { useMediaQuery } from '~/lib/hooks/use-media-query'
import type { NodeTypeName } from '~/lib/node-registry/types'

export function NodeConfigPopup() {
  const selectedNodeId = useBuilderStore((s) => s.nodes.find((n) => n.selected)?.id ?? null)
  const selectedNodeType = useBuilderStore((s) => {
    const n = s.nodes.find((n) => n.selected)
    return n ? ((n.type ?? n.data.type) as string) : null
  })
  const removeNodes = useBuilderStore((s) => s.removeNodes)
  const pushSnapshot = useBuilderStore((s) => s.pushSnapshot)
  const ref = useRef<HTMLDivElement>(null)
  const { fitView } = useReactFlow()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [maximized, setMaximized] = useState(false)

  // Center the canvas on the selected node when it first becomes selected
  const prevNodeId = useRef<string | null>(null)
  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== prevNodeId.current) {
      prevNodeId.current = selectedNodeId
      fitView({
        nodes: [{ id: selectedNodeId }],
        padding: 0.5,
        duration: 300,
        maxZoom: 1,
      })
    }
    if (!selectedNodeId) {
      prevNodeId.current = null
    }
  }, [selectedNodeId, fitView])

  if (!selectedNodeId || !selectedNodeType) return null

  const descriptor = NodeTypeRegistry.get(selectedNodeType as NodeTypeName)
  if (!descriptor) return null

  const EditorComponent = descriptor.editorComponent
  const isDeletable = selectedNodeType !== 'start' && selectedNodeType !== 'end'

  function handleClose() {
    useBuilderStore.getState().onNodesChange([
      { type: 'select', id: selectedNodeId!, selected: false },
    ])
  }

  function handleDelete() {
    if (!selectedNodeId || !isDeletable) return
    pushSnapshot()
    removeNodes([selectedNodeId])
  }

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-30 bg-black/15" onClick={handleClose} />
        <div
          ref={ref}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          data-node-config-popup
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 rounded-t-xl shadow-xl max-h-[70vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl">
            <span className="text-sm font-medium text-gray-600">
              {descriptor.label}
            </span>
            <div className="flex items-center gap-1">
              {isDeletable && (
                <button onClick={handleDelete} className="p-1 rounded hover:bg-red-50" title="Delete node">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              )}
              <button onClick={handleClose} className="p-1 rounded hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
          <EditorComponent nodeId={selectedNodeId} />
        </div>
      </>
    )
  }

  // Desktop: centered popup with backdrop (both minimized and maximized)
  const width = maximized ? 'min(680px, calc(100vw - 48px))' : 'min(420px, calc(100vw - 48px))'
  const height = maximized ? 'min(85vh, calc(100vh - 48px))' : 'min(80vh, calc(100vh - 80px))'

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/10" onClick={handleClose} />
      <div
        ref={ref}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        data-node-config-popup
        className="fixed z-40 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-visible flex flex-col"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width,
          height,
          transition: 'width 200ms ease, height 200ms ease',
        }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white rounded-t-xl shrink-0">
          <span className="text-sm font-medium text-gray-600">
            {descriptor.label}
          </span>
          <div className="flex items-center gap-1">
            {isDeletable && (
              <button onClick={handleDelete} className="p-1 rounded hover:bg-red-50" title="Delete node">
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            )}
            <button
              onClick={() => setMaximized((v) => !v)}
              className="p-1 rounded hover:bg-gray-100"
              title={maximized ? 'Minimize' : 'Expand'}
            >
              {maximized ? (
                <Minimize2 className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5 text-gray-400" />
              )}
            </button>
            <button onClick={handleClose} className="p-1 rounded hover:bg-gray-100">
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 flex flex-col">
          <EditorComponent nodeId={selectedNodeId} />
        </div>
      </div>
    </>
  )
}
