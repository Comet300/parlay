import { useBuilderStore } from '~/lib/stores/builder-store'
import { EditorField, EditorInput, EditorCheckbox } from './editor-field'
import { BaseContentFields } from './base-content-fields'
import { X } from 'lucide-react'

export function MultiChoiceEditor({ nodeId }: { nodeId: string }) {
  const node = useBuilderStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNodeData = useBuilderStore((s) => s.updateNodeData)

  if (!node || node.data.type !== 'multi_choice') return null
  const d = node.data

  function updateOption(optionId: string, label: string) {
    updateNodeData(nodeId, {
      options: d.options.map((o) =>
        o.id === optionId ? { ...o, label } : o,
      ),
    } as any)
  }

  function addOption() {
    updateNodeData(nodeId, {
      options: [
        ...d.options,
        { id: crypto.randomUUID(), label: `Option ${d.options.length + 1}` },
      ],
    } as any)
  }

  function removeOption(optionId: string) {
    if (d.options.length <= 1) return
    updateNodeData(nodeId, {
      options: d.options.filter((o) => o.id !== optionId),
    } as any)
  }

  return (
    <div className="p-3">
      <h3 className="text-sm font-semibold mb-3">Multi Choice</h3>
      <BaseContentFields nodeId={nodeId} showRequired />
      <EditorField label="Options">
        <div className="space-y-1.5">
          {d.options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-1">
              <EditorInput
                value={opt.label}
                onChange={(v) => updateOption(opt.id, v)}
              />
              <button
                onClick={() => removeOption(opt.id)}
                className="p-1 text-text-faint hover:text-error"
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addOption}
          className="mt-1.5 text-xs text-blue-500 hover:text-blue-700"
        >
          + Add option
        </button>
      </EditorField>
      <EditorCheckbox
        label="Shuffle options"
        checked={d.shuffleOptions}
        onChange={(v) => updateNodeData(nodeId, { shuffleOptions: v } as any)}
      />
    </div>
  )
}
