import { useEffect, useState } from 'react'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { EditorField, EditorInput, EditorTextarea } from './editor-field'
import { BaseContentFields } from './base-content-fields'
import { getLiteLLMSettings } from '~/lib/server/settings'

export function RealLLMEditor({ nodeId }: { nodeId: string }) {
  const node = useBuilderStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNodeData = useBuilderStore((s) => s.updateNodeData)
  const [providers, setProviders] = useState<string[]>([])
  const [loadingProviders, setLoadingProviders] = useState(true)

  useEffect(() => {
    getLiteLLMSettings()
      .then((res) => setProviders(res.providers))
      .catch(() => setProviders([]))
      .finally(() => setLoadingProviders(false))
  }, [])

  if (!node || node.data.type !== 'real_llm') return null
  const d = node.data

  return (
    <div className="p-3 max-h-[60vh] overflow-y-auto">
      <h3 className="text-sm font-semibold mb-3">Real LLM</h3>
      <BaseContentFields nodeId={nodeId} />

      <EditorField label="Provider">
        {loadingProviders ? (
          <p className="text-xs text-gray-400">Loading providers...</p>
        ) : providers.length > 0 ? (
          <select
            value={d.provider}
            onChange={(e) => updateNodeData(nodeId, { provider: e.target.value } as any)}
            className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
          >
            <option value="">Select a provider</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : (
          <div>
            <EditorInput
              value={d.provider}
              onChange={(v) => updateNodeData(nodeId, { provider: v } as any)}
              placeholder="e.g. openai, anthropic"
            />
            <p className="text-[10px] text-amber-600 mt-0.5">
              No providers configured.{' '}
              <a href="/settings" className="underline hover:text-amber-700">
                Configure in Settings
              </a>
            </p>
          </div>
        )}
      </EditorField>

      <EditorField label="Model">
        <EditorInput
          value={d.model}
          onChange={(v) => updateNodeData(nodeId, { model: v } as any)}
          placeholder="e.g. gpt-4o, claude-sonnet-4-20250514"
        />
      </EditorField>

      <EditorField label="Setup prompt">
        <EditorTextarea
          value={d.setup_prompt}
          onChange={(v) => updateNodeData(nodeId, { setup_prompt: v } as any)}
          placeholder="System instructions for the LLM..."
          rows={4}
        />
        <p className="text-[10px] text-gray-400 mt-0.5">Hidden from respondents</p>
      </EditorField>

      <EditorField label="Ending condition">
        <EditorTextarea
          value={d.ending_condition}
          onChange={(v) => updateNodeData(nodeId, { ending_condition: v } as any)}
          placeholder="Instruct when to output [END_CONVERSATION]..."
          rows={3}
        />
        <p className="text-[10px] text-gray-400 mt-0.5">
          Hidden from respondents — instruct the LLM when to output [END_CONVERSATION]
        </p>
      </EditorField>

      <EditorField label="Max turns">
        <EditorInput
          type="number"
          value={d.maxTurns}
          onChange={(v) =>
            updateNodeData(nodeId, { maxTurns: Math.max(1, parseInt(v) || 10) } as any)
          }
        />
      </EditorField>
    </div>
  )
}
