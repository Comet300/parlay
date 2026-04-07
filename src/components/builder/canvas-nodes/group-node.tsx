import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Group } from 'lucide-react'
import type { FlowNode, GroupNodeData } from '~/lib/node-registry/types'

export const GroupCanvasNode = memo(function GroupCanvasNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const d = data as GroupNodeData
  return (
    <div
      className={`rounded-lg border bg-gray-50/50 min-w-[180px] min-h-[60px] ${
        selected ? 'border-gray-500 shadow-sm' : 'border-gray-300'
      }`}
    >
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-gray-200 bg-gray-100/50 rounded-t-[7px]">
        <Group className="h-3 w-3 text-gray-500" />
        <span className="text-[10px] font-medium text-gray-600 truncate">
          {d.label || 'Group'}
        </span>
        {d.shuffle && (
          <span className="text-[10px] text-gray-400" title="Shuffle">🔀</span>
        )}
      </div>
      <div className="p-1.5 min-h-[40px]">
        {/* Children render here */}
      </div>
    </div>
  )
})
