import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Square } from 'lucide-react'
import type { FlowNode } from '~/lib/node-registry/types'
import { stripMarkdown } from './strip-markdown'

export const EndCanvasNode = memo(function EndCanvasNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const content = (data as { markdownContent?: string }).markdownContent
  const preview = stripMarkdown(content).slice(0, 50)

  return (
    <div
      className={`rounded-md border-2 bg-error-subtle px-4 py-3 min-w-[160px] max-w-[200px] ${
        selected ? 'border-red-500 shadow-e2' : 'border-red-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-red-500 !w-4 !h-4 !border-2 !border-white"
      />
      <div className="flex items-center gap-2 text-sm font-semibold text-error-strong">
        <Square className="h-3 w-3 fill-red-500 text-error" />
        End
      </div>
      {preview && (
        <p className="mt-1 text-[11px] text-error-strong/70 truncate">
          {preview}
        </p>
      )}
    </div>
  )
})
