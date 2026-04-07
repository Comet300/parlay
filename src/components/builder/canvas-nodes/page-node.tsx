import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FileText } from 'lucide-react'
import type { FlowNode, PageNodeData } from '~/lib/node-registry/types'

export const PageCanvasNode = memo(function PageCanvasNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const d = data as PageNodeData
  return (
    <div
      className={`rounded-xl border-2 bg-blue-50/50 min-w-[200px] min-h-[100px] ${
        selected ? 'border-blue-500 shadow-md' : 'border-blue-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-200 bg-blue-100/50 rounded-t-[10px]">
        <FileText className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-xs font-semibold text-blue-700 truncate">
          {d.label || 'Page'}
        </span>
        {d.condition && (
          <span className="text-[10px] text-blue-500" title="Has condition">⚡</span>
        )}
      </div>
      <div className="p-2 min-h-[60px]">
        {/* Children render here via React Flow sub-flow */}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  )
})
