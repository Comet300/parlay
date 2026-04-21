import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { MessageSquareCode, Bot } from 'lucide-react'
import type {
  FlowNode,
  ScriptedLLMNodeData,
  RealLLMNodeData,
} from '~/lib/node-registry/types'

export const LLMCanvasNode = memo(function LLMCanvasNode({
  data,
  selected,
}: NodeProps<FlowNode>) {
  const isScripted = data.type === 'scripted_llm'
  const Icon = isScripted ? MessageSquareCode : Bot
  const borderColor = isScripted ? 'border-indigo-300' : 'border-purple-300'
  const selectedBorder = isScripted ? 'border-indigo-500' : 'border-purple-500'
  const badgeColor = isScripted
    ? 'bg-indigo-100 text-indigo-700'
    : 'bg-purple-100 text-purple-700'

  return (
    <div
      className={`rounded-md border-2 bg-white px-4 py-3 min-w-[180px] ${
        selected ? `${selectedBorder} shadow-e2` : borderColor
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={`!w-4 !h-4 !border-2 !border-white ${
          isScripted ? '!bg-indigo-500' : '!bg-purple-500'
        }`}
      />

      <div className="flex items-center gap-2 mb-1">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badgeColor}`}
        >
          <Icon className="h-3 w-3" />
          {isScripted ? 'Scripted LLM' : 'Real LLM'}
        </span>
      </div>

      <p className="text-xs font-medium text-text truncate">
        {'label' in data ? String(data.label) : ''}
      </p>

      {isScripted && (
        <p className="text-[10px] text-text-faint mt-0.5">
          {(data as ScriptedLLMNodeData).script?.length ?? 0} turns
        </p>
      )}

      {!isScripted && (
        <p className="text-[10px] text-text-faint mt-0.5">
          {(data as RealLLMNodeData).provider || 'no provider'}
          {' · '}
          {(data as RealLLMNodeData).model || 'no model'}
          {' · '}
          max {(data as RealLLMNodeData).maxTurns}
        </p>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className={`!w-4 !h-4 !border-2 !border-white ${
          isScripted ? '!bg-indigo-500' : '!bg-purple-500'
        }`}
      />
    </div>
  )
})
