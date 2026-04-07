import { useEffect } from 'react'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { EditorField } from './editor-field'
import { CrepeEditorField } from './crepe-editor'

const DEFAULT_START_CONTENT = `# Welcome

Thank you for taking the time to participate.

Tap **Continue** below to get started.`

const DEFAULT_END_CONTENT = `# Thank you!

Your responses have been recorded. You may now close this page.`

export function StartEndEditor({ nodeId }: { nodeId: string }) {
  const node = useBuilderStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNodeData = useBuilderStore((s) => s.updateNodeData)

  if (!node) return null

  const isStart = (node.type ?? node.data.type) === 'start'
  const content = 'markdownContent' in node.data ? String(node.data.markdownContent) : ''

  // Populate default content if empty (e.g., forms created before defaults were added)
  useEffect(() => {
    if (!content) {
      updateNodeData(nodeId, {
        markdownContent: isStart ? DEFAULT_START_CONTENT : DEFAULT_END_CONTENT,
      } as any)
    }
  }, [nodeId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-3">
      <h3 className="text-sm font-semibold mb-3">{isStart ? 'Start' : 'End'} Screen</h3>
      <EditorField label="Content">
        <CrepeEditorField
          value={content || (isStart ? DEFAULT_START_CONTENT : DEFAULT_END_CONTENT)}
          onChange={(v) => updateNodeData(nodeId, { markdownContent: v } as any)}
          placeholder={isStart ? 'Welcome message...' : 'Thank you message...'}
        />
      </EditorField>
    </div>
  )
}
