import { useBuilderStore } from '~/lib/stores/builder-store'
import { EditorField, EditorInput } from './editor-field'
import { BaseContentFields } from './base-content-fields'

export function LikertEditor({ nodeId }: { nodeId: string }) {
  const node = useBuilderStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNodeData = useBuilderStore((s) => s.updateNodeData)

  if (!node || node.data.type !== 'likert') return null
  const d = node.data

  return (
    <div className="p-3">
      <h3 className="text-sm font-semibold mb-3">Likert Scale</h3>
      <BaseContentFields nodeId={nodeId} showRequired />
      <div className="grid grid-cols-2 gap-2">
        <EditorField label="Min">
          <EditorInput
            type="number"
            value={d.min}
            onChange={(v) => updateNodeData(nodeId, { min: parseInt(v) || 1 } as any)}
          />
        </EditorField>
        <EditorField label="Max">
          <EditorInput
            type="number"
            value={d.max}
            onChange={(v) => updateNodeData(nodeId, { max: parseInt(v) || 7 } as any)}
          />
        </EditorField>
      </div>
      <EditorField label="Min label">
        <EditorInput
          value={d.minLabel}
          onChange={(v) => updateNodeData(nodeId, { minLabel: v } as any)}
        />
      </EditorField>
      <EditorField label="Max label">
        <EditorInput
          value={d.maxLabel}
          onChange={(v) => updateNodeData(nodeId, { maxLabel: v } as any)}
        />
      </EditorField>
    </div>
  )
}
