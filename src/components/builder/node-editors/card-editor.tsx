import { useBuilderStore } from '~/lib/stores/builder-store'
import { EditorField, EditorInput } from './editor-field'
import { BaseContentFields } from './base-content-fields'
import { CrepeEditorField } from './crepe-editor'
import { X, GripVertical, AlertCircle } from 'lucide-react'

export function CardEditor({ nodeId }: { nodeId: string }) {
  const node = useBuilderStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNodeData = useBuilderStore((s) => s.updateNodeData)
  const deadPaths = useBuilderStore((s) => s.deadPaths)

  if (!node || node.data.type !== 'card') return null
  const d = node.data

  const deadHandles = new Set(
    deadPaths
      .filter((dp) => dp.nodeId === nodeId && dp.handleId)
      .map((dp) => dp.handleId),
  )

  function updateButton(btnId: string, label: string) {
    updateNodeData(nodeId, {
      buttons: d.buttons.map((b) =>
        b.id === btnId ? { ...b, label } : b,
      ),
    } as any)
  }

  function addButton() {
    updateNodeData(nodeId, {
      buttons: [
        ...d.buttons,
        { id: crypto.randomUUID(), label: `Button ${d.buttons.length + 1}` },
      ],
    } as any)
  }

  function removeButton(btnId: string) {
    if (d.buttons.length <= 1) return
    updateNodeData(nodeId, {
      buttons: d.buttons.filter((b) => b.id !== btnId),
    } as any)
  }

  return (
    <div className="p-3">
      <h3 className="text-sm font-semibold mb-3">Card</h3>
      <BaseContentFields nodeId={nodeId} />
      <EditorField label="Content">
        <CrepeEditorField
          value={d.markdownContent}
          onChange={(v) => updateNodeData(nodeId, { markdownContent: v } as any)}
          placeholder="Card content..."
        />
      </EditorField>
      <EditorField label="Buttons">
        <div className="space-y-1.5">
          {d.buttons.map((btn) => (
            <div key={btn.id} className="flex items-center gap-1">
              <GripVertical className="h-3 w-3 text-text-faint cursor-grab" />
              <EditorInput
                value={btn.label}
                onChange={(v) => updateButton(btn.id, v)}
              />
              {deadHandles.has(`button-${btn.id}`) && (
                <span title="No outgoing edge"><AlertCircle className="h-3.5 w-3.5 text-error shrink-0" /></span>
              )}
              <button
                onClick={() => removeButton(btn.id)}
                className="p-1 text-text-faint hover:text-error"
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addButton}
          className="mt-1.5 text-xs text-blue-500 hover:text-blue-700"
        >
          + Add button
        </button>
      </EditorField>
    </div>
  )
}
