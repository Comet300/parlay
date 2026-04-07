import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FlowNode } from '~/lib/node-registry/types'

export const EndCanvasNode = memo(function EndCanvasNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const content = (data as { markdownContent?: string }).markdownContent
  const preview = content
    ?.split('\n')
    .find((l) => l.trim() && !l.startsWith('#'))
    ?.trim()
    .slice(0, 60)

  return (
    <div
      className={`rounded-xl border-2 bg-red-50 px-4 py-3 min-w-[160px] max-w-[200px] ${
        selected ? 'border-red-500 shadow-md' : 'border-red-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-red-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        End
      </div>
      {preview && (
        <p className="mt-1 text-[11px] text-red-600/70 truncate">
          {preview}
        </p>
      )}
    </div>
  )
})
