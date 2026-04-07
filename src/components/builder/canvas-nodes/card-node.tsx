import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CreditCard, Filter, DatabaseZap } from 'lucide-react'
import type { FlowNode, CardNodeData } from '~/lib/node-registry/types'
import { useBuilderStore } from '~/lib/stores/builder-store'

export const CardCanvasNode = memo(function CardCanvasNode({
  id,
  data,
  selected,
}: NodeProps<FlowNode>) {
  const d = data as CardNodeData
  const deadPaths = useBuilderStore((s) => s.deadPaths)
  const deadHandles = new Set(
    deadPaths
      .filter((dp) => dp.nodeId === id && dp.handleId)
      .map((dp) => dp.handleId),
  )

  return (
    <div
      className={`rounded-lg border bg-white px-3 py-2 min-w-[200px] max-w-[240px] ${
        selected ? 'border-blue-500 shadow-md ring-1 ring-blue-200' : 'border-gray-200'
      }`}
    >
      {/* Type badge */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700">
          <CreditCard className="h-2.5 w-2.5" />
          Card
        </span>
        {d.condition && <Filter className="h-3 w-3 text-gray-400" />}
        {!d.record_response && <DatabaseZap className="h-3 w-3 text-gray-300" />}
        <span className="ml-auto text-[10px] text-gray-400">
          {d.buttons.length} btn{d.buttons.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Markdown preview */}
      <p className="text-xs text-gray-800 line-clamp-2 leading-tight mb-1">
        {d.markdownContent ? d.markdownContent.slice(0, 80) : d.label || 'Untitled Card'}
      </p>

      {/* Slug */}
      {d.slug && (
        <p className="text-[10px] text-gray-400 truncate">{d.slug}</p>
      )}

      {/* Button handles */}
      {d.buttons.map((btn, i) => (
        <Handle
          key={btn.id}
          type="source"
          id={`button-${btn.id}`}
          position={Position.Right}
          style={{ top: `${40 + i * 24}%` }}
          className={`!w-2.5 !h-2.5 !border-2 !border-white ${
            deadHandles.has(`button-${btn.id}`) ? '!bg-red-500' : '!bg-orange-500'
          }`}
          title={btn.label}
        />
      ))}
    </div>
  )
})
