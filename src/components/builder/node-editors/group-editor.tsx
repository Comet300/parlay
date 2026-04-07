import { useBuilderStore } from '~/lib/stores/builder-store'
import { EditorField, EditorInput, EditorCheckbox } from './editor-field'
import { ConditionInput } from './condition-input'

export function GroupEditor({ nodeId }: { nodeId: string }) {
  const node = useBuilderStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNodeData = useBuilderStore((s) => s.updateNodeData)

  if (!node || node.data.type !== 'group') return null
  const d = node.data

  return (
    <div className="p-3">
      <h3 className="text-sm font-semibold mb-3">Group</h3>
      <EditorField label="Label">
        <EditorInput
          value={d.label}
          onChange={(v) => updateNodeData(nodeId, { label: v } as any)}
        />
      </EditorField>
      <EditorField label="Show if (condition)">
        <ConditionInput
          value={d.condition}
          onChange={(v) => updateNodeData(nodeId, { condition: v } as any)}
          placeholder='e.g. q-consent = "yes"'
        />
      </EditorField>
      <EditorCheckbox
        label="Shuffle children"
        checked={d.shuffle}
        onChange={(v) => updateNodeData(nodeId, { shuffle: v } as any)}
      />
    </div>
  )
}
