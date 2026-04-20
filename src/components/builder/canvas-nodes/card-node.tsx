import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CreditCard } from 'lucide-react'
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
      className={`rounded-md border bg-white px-2.5 py-1.5 w-full h-full flex items-center gap-2 cursor-grab active:cursor-grabbing ${
        selected ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <span className="inline-flex items-center justify-center rounded w-6 h-6 shrink-0 bg-orange-100 text-orange-700">
        <CreditCard className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-800 truncate leading-tight">
          {d.label || 'Untitled Card'}
        </p>
        <p className="text-[10px] text-gray-400 truncate">
          Card · {d.buttons.length} btn{d.buttons.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Button handles — evenly spaced, distinct colors */}
      {d.buttons.map((btn, i) => {
        const count = d.buttons.length
        // Distribute handles evenly from 20% to 80% of the node height
        const pct = count === 1 ? 50 : 20 + (i / (count - 1)) * 60
        const colors = [
          '!bg-blue-500',
          '!bg-emerald-500',
          '!bg-amber-500',
          '!bg-violet-500',
          '!bg-rose-500',
          '!bg-cyan-500',
          '!bg-orange-500',
          '!bg-teal-500',
        ]
        const color = deadHandles.has(`button-${btn.id}`)
          ? '!bg-red-500'
          : colors[i % colors.length]
        return (
          <Handle
            key={btn.id}
            type="source"
            id={`button-${btn.id}`}
            position={Position.Right}
            style={{ top: `${pct}%` }}
            className={`!w-3.5 !h-3.5 !border-2 !border-white ${color}`}
            title={btn.label}
          />
        )
      })}
    </div>
  )
})
