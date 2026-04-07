import { useEffect, useRef, useState } from 'react'
import { useReactFlow, useOnViewportChange } from '@xyflow/react'
import { X, Trash2 } from 'lucide-react'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { NodeTypeRegistry } from '~/lib/node-registry'
import { useMediaQuery } from '~/lib/hooks/use-media-query'
import type { NodeTypeName } from '~/lib/node-registry/types'

interface NodeConfigPopupProps {
  settingsOpen?: boolean
}

export function NodeConfigPopup({ settingsOpen }: NodeConfigPopupProps) {
  console.log('[popup] render')
  const selectedNodeId = useBuilderStore((s) => s.nodes.find((n) => n.selected)?.id ?? null)
  const selectedNodeType = useBuilderStore((s) => {
    const n = s.nodes.find((n) => n.selected)
    return n ? ((n.type ?? n.data.type) as string) : null
  })
  const removeNodes = useBuilderStore((s) => s.removeNodes)
  const pushSnapshot = useBuilderStore((s) => s.pushSnapshot)
  const ref = useRef<HTMLDivElement>(null)
  const reactFlow = useReactFlow()
  const flowToScreenRef = useRef(reactFlow.flowToScreenPosition)
  flowToScreenRef.current = reactFlow.flowToScreenPosition
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [screenPos, setScreenPos] = useState({ x: 0, y: 0 })

  // Reposition on viewport change and when selection/settings change.
  // Uses refs for flowToScreenPosition to avoid useCallback/useEffect dependency loops.
  useOnViewportChange({
    onEnd: () => reposition(),
  })

  function reposition() {
    console.log('[popup] reposition called, selectedNodeId:', selectedNodeId)
    if (!selectedNodeId) return
    const node = useBuilderStore.getState().nodes.find((n) => n.id === selectedNodeId)
    if (!node) return
    const nodeWidth = (node.measured?.width ?? 200) as number
    const useLeft = settingsOpen && !isMobile
    const pos = flowToScreenRef.current({
      x: useLeft
        ? node.position.x - 336
        : node.position.x + nodeWidth + 16,
      y: node.position.y,
    })
    setScreenPos(pos)
  }

  // Reposition once when node is first selected or settings toggles
  const prevNodeId = useRef<string | null>(null)
  const prevSettingsOpen = useRef(settingsOpen)
  useEffect(() => {
    const nodeChanged = selectedNodeId !== prevNodeId.current
    const settingsChanged = settingsOpen !== prevSettingsOpen.current
    console.log('[popup] useEffect', { nodeChanged, settingsChanged, selectedNodeId, prevNodeId: prevNodeId.current })
    if (nodeChanged || settingsChanged) {
      prevNodeId.current = selectedNodeId
      prevSettingsOpen.current = settingsOpen
      reposition()
    }
  })

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
        <div className="fixed inset-0 z-30 bg-black/20" onClick={handleClose} />
        <div
          ref={ref}
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

  // Desktop: positioned popover
  return (
    <div
      ref={ref}
      className="fixed z-40 bg-white border border-gray-200 rounded-xl shadow-xl w-[320px] max-h-[70vh] overflow-y-auto"
      style={{
        left: Math.min(screenPos.x, window.innerWidth - 340),
        top: Math.max(8, Math.min(screenPos.y, window.innerHeight - 400)),
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500">
          {descriptor.label}
        </span>
        <div className="flex items-center gap-0.5">
          {isDeletable && (
            <button onClick={handleDelete} className="p-0.5 rounded hover:bg-red-50" title="Delete node">
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          )}
          <button onClick={handleClose} className="p-0.5 rounded hover:bg-gray-100">
            <X className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </div>
      </div>
      <EditorComponent nodeId={selectedNodeId} />
    </div>
  )
}
