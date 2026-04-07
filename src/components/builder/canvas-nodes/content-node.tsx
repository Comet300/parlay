import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Sliders, CircleDot, CheckSquare, Mail, Filter, DatabaseZap } from 'lucide-react'
import type { FlowNode, NodeTypeName } from '~/lib/node-registry/types'

const TYPE_CONFIG: Record<string, { label: string; color: string; Icon: typeof Sliders }> = {
  likert: { label: 'Likert', color: 'bg-amber-100 text-amber-700 border-amber-300', Icon: Sliders },
  single_choice: { label: 'Single Choice', color: 'bg-cyan-100 text-cyan-700 border-cyan-300', Icon: CircleDot },
  multi_choice: { label: 'Multi Choice', color: 'bg-teal-100 text-teal-700 border-teal-300', Icon: CheckSquare },
  email_collection: { label: 'Email', color: 'bg-pink-100 text-pink-700 border-pink-300', Icon: Mail },
}

export const ContentCanvasNode = memo(function ContentCanvasNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const nodeType = data.type as NodeTypeName
  const config = TYPE_CONFIG[nodeType] ?? {
    label: nodeType,
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    Icon: Sliders,
  }
  const { Icon } = config

  const label = 'label' in data ? String(data.label) : ''
  const slug = 'slug' in data ? String(data.slug) : ''
  const condition = 'condition' in data ? String(data.condition) : ''
  const recordResponse = 'record_response' in data ? data.record_response : true

  return (
    <div
      className={`rounded-lg border bg-white px-3 py-2 min-w-[160px] max-w-[200px] ${
        selected ? 'border-blue-500 shadow-md ring-1 ring-blue-200' : 'border-gray-200'
      }`}
    >
      {/* Type badge */}
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${config.color}`}
        >
          <Icon className="h-2.5 w-2.5" />
          {config.label}
        </span>
        {condition && <span title="Has condition"><Filter className="h-3 w-3 text-gray-400" /></span>}
        {!recordResponse && (
          <span title="Response not recorded"><DatabaseZap className="h-3 w-3 text-gray-300" /></span>
        )}
      </div>

      {/* Label (2 lines max) */}
      <p className="text-xs text-gray-800 line-clamp-2 leading-tight">
        {label || 'Untitled'}
      </p>

      {/* Slug */}
      {slug && (
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{slug}</p>
      )}
    </div>
  )
})
