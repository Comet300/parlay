import { Plus, X } from 'lucide-react'
import { NodeTypeRegistry } from '~/lib/node-registry'
import type { NodeTypeName } from '~/lib/node-registry/types'

interface AddNodePanelProps {
  open: boolean
  onToggle: () => void
}

export function AddNodePanel({ open, onToggle }: AddNodePanelProps) {
  const pageTier: { typeName: NodeTypeName; label: string }[] = []
  const contentTier: { typeName: NodeTypeName; label: string }[] = []

  NodeTypeRegistry.forEach((desc) => {
    if (desc.typeName === 'start' || desc.typeName === 'end') return
    if (desc.tier === 'page') {
      pageTier.push({ typeName: desc.typeName, label: desc.label })
    } else {
      contentTier.push({ typeName: desc.typeName, label: desc.label })
    }
  })

  function onDragStart(e: React.DragEvent, nodeType: NodeTypeName) {
    e.dataTransfer.setData('application/parlay-node-type', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <>
      {!open && (
        <button
          onClick={onToggle}
          className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Node
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-0 z-30 h-full w-56 bg-white border-r border-gray-200 shadow-lg overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Add Node</span>
            <button onClick={onToggle} className="p-0.5 rounded hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="p-2">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1 mb-1">
              Page-tier
            </p>
            {pageTier.map((item) => (
              <div
                key={item.typeName}
                draggable
                onDragStart={(e) => onDragStart(e, item.typeName)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-gray-50 active:cursor-grabbing text-sm text-gray-700"
              >
                <span className="h-5 w-5 rounded bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold">
                  {item.label[0]}
                </span>
                {item.label}
              </div>
            ))}

            <div className="mt-3">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1 mb-1">
                Content-tier
              </p>
              {contentTier.map((item) => (
                <div
                  key={item.typeName}
                  draggable
                  onDragStart={(e) => onDragStart(e, item.typeName)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-gray-50 active:cursor-grabbing text-sm text-gray-700"
                >
                  <span className="h-5 w-5 rounded bg-amber-100 flex items-center justify-center text-[10px] text-amber-600 font-bold">
                    {item.label[0]}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
