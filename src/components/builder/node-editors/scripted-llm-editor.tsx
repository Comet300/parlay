import { useBuilderStore } from '~/lib/stores/builder-store'
import { EditorField, EditorTextarea } from './editor-field'
import { BaseContentFields } from './base-content-fields'
import { X } from 'lucide-react'
import type { ScriptedLLMTurn } from '~/lib/node-registry/types'

export function ScriptedLLMEditor({ nodeId }: { nodeId: string }) {
  const node = useBuilderStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNodeData = useBuilderStore((s) => s.updateNodeData)

  if (!node || node.data.type !== 'scripted_llm') return null
  const d = node.data

  function updateTurn(turnId: string, updates: Partial<ScriptedLLMTurn>) {
    updateNodeData(nodeId, {
      script: d.script.map((t) =>
        t.id === turnId ? { ...t, ...updates } : t,
      ),
    } as any)
  }

  function addTurn() {
    const newTurn: ScriptedLLMTurn = {
      id: crypto.randomUUID(),
      botMessage: '',
      options: [{ id: crypto.randomUUID(), label: 'Continue', nextTurnId: null }],
    }
    updateNodeData(nodeId, { script: [...d.script, newTurn] } as any)
  }

  function removeTurn(turnId: string) {
    if (d.script.length <= 1) return
    const remaining = d.script.filter((t) => t.id !== turnId)
    const updates: Record<string, unknown> = { script: remaining }
    // Fix startTurnId if we removed the current start
    if (d.startTurnId === turnId) {
      updates.startTurnId = remaining[0].id
    }
    // Clear nextTurnId references to removed turn
    updates.script = (remaining as ScriptedLLMTurn[]).map((t) => ({
      ...t,
      options: t.options.map((o) =>
        o.nextTurnId === turnId ? { ...o, nextTurnId: null } : o,
      ),
    }))
    updateNodeData(nodeId, updates as any)
  }

  function addOption(turnId: string) {
    const turn = d.script.find((t) => t.id === turnId)
    if (!turn) return
    updateTurn(turnId, {
      options: [
        ...turn.options,
        { id: crypto.randomUUID(), label: 'Option', nextTurnId: null },
      ],
    })
  }

  function updateOption(
    turnId: string,
    optionId: string,
    updates: Partial<ScriptedLLMTurn['options'][number]>,
  ) {
    const turn = d.script.find((t) => t.id === turnId)
    if (!turn) return
    updateTurn(turnId, {
      options: turn.options.map((o) =>
        o.id === optionId ? { ...o, ...updates } : o,
      ),
    })
  }

  function removeOption(turnId: string, optionId: string) {
    const turn = d.script.find((t) => t.id === turnId)
    if (!turn || turn.options.length <= 1) return
    updateTurn(turnId, {
      options: turn.options.filter((o) => o.id !== optionId),
    })
  }

  return (
    <div className="p-3 max-h-[60vh] overflow-y-auto">
      <h3 className="text-sm font-semibold mb-3">Scripted LLM</h3>
      <BaseContentFields nodeId={nodeId} />

      <EditorField label="Start turn">
        <select
          value={d.startTurnId}
          onChange={(e) => updateNodeData(nodeId, { startTurnId: e.target.value } as any)}
          className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-sm"
        >
          {d.script.map((t) => (
            <option key={t.id} value={t.id}>
              {t.botMessage.slice(0, 40) || `Turn ${t.id.slice(0, 6)}`}
            </option>
          ))}
        </select>
      </EditorField>

      <div className="space-y-4 mt-3">
        {d.script.map((turn, i) => (
          <div key={turn.id} className="border border-border rounded-lg p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-text-muted">Turn {i + 1}</span>
              <button
                onClick={() => removeTurn(turn.id)}
                className="text-text-faint hover:text-error"
                title="Remove turn"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <EditorTextarea
              value={turn.botMessage}
              onChange={(v) => updateTurn(turn.id, { botMessage: v })}
              placeholder="Bot message..."
              rows={2}
            />
            <div className="mt-1.5 space-y-1">
              {turn.options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-1">
                  <input
                    value={opt.label}
                    onChange={(e) =>
                      updateOption(turn.id, opt.id, { label: e.target.value })
                    }
                    className="flex-1 rounded border border-border px-1.5 py-1 text-xs"
                    placeholder="Option label"
                  />
                  <select
                    value={opt.nextTurnId ?? ''}
                    onChange={(e) =>
                      updateOption(turn.id, opt.id, {
                        nextTurnId: e.target.value || null,
                      })
                    }
                    className="w-28 rounded border border-border px-1 py-1 text-xs"
                  >
                    <option value="">End conversation</option>
                    {d.script
                      .filter((t) => t.id !== turn.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          Turn {d.script.indexOf(t) + 1}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => removeOption(turn.id, opt.id)}
                    className="text-text-faint hover:text-error"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addOption(turn.id)}
                className="text-[10px] text-blue-500 hover:text-blue-700"
              >
                + Add option
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={addTurn}
        className="mt-2 text-xs text-blue-500 hover:text-blue-700"
      >
        + Add turn
      </button>
    </div>
  )
}
