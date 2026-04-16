import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Layers } from 'lucide-react'
import type { FlowNode, GroupNodeData } from '~/lib/node-registry/types'

export const GroupCanvasNode = memo(function GroupCanvasNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const d = data as GroupNodeData
  // Match the Page style (rounded-xl, blue palette, header bar with icon)
  // but use lighter tints to read as "nested page" inside a Page/PageGroup.
  return (
    <div
      className={`rounded-xl border-2 bg-blue-50/40 w-full h-full ${
        selected ? 'border-blue-500 shadow-md' : 'border-blue-200'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-200 bg-blue-100/40 rounded-t-[10px]">
        <Layers className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-xs font-semibold text-blue-700 truncate flex-1">
          {d.label || 'Group'}
        </span>
        {d.condition && (
          <span className="text-[10px] text-blue-500" title="Has condition">&#x26A1;</span>
        )}
        {d.shuffle && (
          <span className="text-[10px] text-blue-500" title="Shuffle">&#x1F500;</span>
        )}
      </div>
      {/* Children render here via React Flow sub-flow, auto-stacked */}
    </div>
  )
})
