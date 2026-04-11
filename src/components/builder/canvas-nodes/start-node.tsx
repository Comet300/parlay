import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FlowNode } from '~/lib/node-registry/types'
import { stripMarkdown } from './strip-markdown'

export const StartCanvasNode = memo(function StartCanvasNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const content = (data as { markdownContent?: string }).markdownContent
  const preview = stripMarkdown(content).slice(0, 50)

  return (
    <div
      className={`rounded-xl border-2 bg-emerald-50 px-4 py-3 min-w-[160px] max-w-[200px] ${
        selected ? 'border-emerald-500 shadow-md' : 'border-emerald-300'
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Start
      </div>
      {preview && (
        <p className="mt-1 text-[11px] text-emerald-600/70 truncate">
          {preview}
        </p>
      )}
      <div className="mt-2 text-[10px] text-emerald-500 bg-emerald-100 rounded px-2 py-0.5 text-center font-medium">
        Continue →
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  )
})
