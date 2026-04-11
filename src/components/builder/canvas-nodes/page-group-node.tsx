import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Layers } from 'lucide-react'
import type { FlowNode, PageGroupNodeData } from '~/lib/node-registry/types'

export const PageGroupCanvasNode = memo(function PageGroupCanvasNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const d = data as PageGroupNodeData
  return (
    <div
      className={`rounded-xl border-2 border-dashed bg-violet-50/50 w-full h-full ${
        selected ? 'border-violet-500 shadow-md' : 'border-violet-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-violet-200 bg-violet-100/50 rounded-t-[10px]">
        <Layers className="h-3.5 w-3.5 text-violet-600" />
        <span className="text-xs font-semibold text-violet-700 truncate flex-1">
          {d.label || 'Page Group'}
        </span>
        <span className="text-[10px] text-violet-500">
          {d.maxQuestionsPerPage}/pg
        </span>
        {d.condition && (
          <span className="text-[10px] text-violet-500" title="Has condition">&#x26A1;</span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  )
})
