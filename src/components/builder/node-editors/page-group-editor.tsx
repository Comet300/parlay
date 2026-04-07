import { useBuilderStore } from '~/lib/stores/builder-store'
import { EditorField, EditorInput, EditorCheckbox } from './editor-field'
import { ConditionInput } from './condition-input'
import { CrepeEditorField } from './crepe-editor'

export function PageGroupEditor({ nodeId }: { nodeId: string }) {
  const node = useBuilderStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNodeData = useBuilderStore((s) => s.updateNodeData)

  if (!node || node.data.type !== 'page_group') return null
  const d = node.data

  return (
    <div className="p-3">
      <h3 className="text-sm font-semibold mb-3">Page Group</h3>
      <EditorField label="Label">
        <EditorInput
          value={d.label}
          onChange={(v) => updateNodeData(nodeId, { label: v } as any)}
        />
      </EditorField>
      <EditorField label="Max questions per page">
        <EditorInput
          type="number"
          value={d.maxQuestionsPerPage}
          onChange={(v) =>
            updateNodeData(nodeId, {
              maxQuestionsPerPage: Math.max(1, parseInt(v) || 1),
            } as any)
          }
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
      <EditorCheckbox
        label="Allow back navigation"
        checked={d.allow_back}
        onChange={(v) => updateNodeData(nodeId, { allow_back: v } as any)}
      />
      <EditorCheckbox
        label="Show progress bar"
        checked={d.show_progress_bar}
        onChange={(v) => updateNodeData(nodeId, { show_progress_bar: v } as any)}
      />
      {d.show_progress_bar && (
        <EditorCheckbox
          label="Is checkpoint"
          checked={d.is_checkpoint}
          onChange={(v) => updateNodeData(nodeId, { is_checkpoint: v } as any)}
        />
      )}
      <EditorField label="Header content">
        <CrepeEditorField
          value={d.headerContent}
          onChange={(v) => updateNodeData(nodeId, { headerContent: v } as any)}
          placeholder="Instructions shown above questions..."
        />
      </EditorField>
      {d.headerContent && (
        <EditorCheckbox
          label="Show header on all pages"
          checked={d.headerOnAllPages}
          onChange={(v) => updateNodeData(nodeId, { headerOnAllPages: v } as any)}
        />
      )}
    </div>
  )
}
