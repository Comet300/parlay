import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { Sliders, CircleDot, CheckSquare, Mail, Filter, DatabaseZap } from 'lucide-react'
import type { FlowNode, NodeTypeName } from '~/lib/node-registry/types'

const TYPE_CONFIG: Record<string, { label: string; color: string; Icon: typeof Sliders }> = {
  likert: { label: 'Likert', color: 'bg-amber-100 text-amber-700', Icon: Sliders },
  single_choice: { label: 'Single', color: 'bg-cyan-100 text-cyan-700', Icon: CircleDot },
  multi_choice: { label: 'Multi', color: 'bg-teal-100 text-teal-700', Icon: CheckSquare },
  email_collection: { label: 'Email', color: 'bg-pink-100 text-pink-700', Icon: Mail },
}

export const ContentCanvasNode = memo(function ContentCanvasNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const nodeType = data.type as NodeTypeName
  const config = TYPE_CONFIG[nodeType] ?? {
    label: nodeType,
    color: 'bg-gray-100 text-gray-700',
    Icon: Sliders,
  }
  const { Icon } = config

  const label = 'label' in data ? String(data.label) : ''
  const condition = 'condition' in data ? String(data.condition) : ''
  const recordResponse = 'record_response' in data ? data.record_response : true

  return (
    <div
      className={`rounded-md border bg-white px-2.5 py-1.5 w-full h-full flex items-center gap-2 cursor-grab active:cursor-grabbing ${
        selected ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <span
        className={`inline-flex items-center justify-center rounded w-6 h-6 shrink-0 ${config.color}`}
      >
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-800 truncate leading-tight">
          {label || 'Untitled'}
        </p>
        <p className="text-[10px] text-gray-400 truncate">{config.label}</p>
      </div>
      {condition && <span title="Has condition"><Filter className="h-3 w-3 text-gray-400 shrink-0" /></span>}
      {!recordResponse && (
        <span title="Not recorded"><DatabaseZap className="h-3 w-3 text-gray-300 shrink-0" /></span>
      )}
    </div>
  )
})
