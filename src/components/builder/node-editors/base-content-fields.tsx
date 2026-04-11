import { useState } from 'react'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { EditorField, EditorInput, EditorCheckbox } from './editor-field'
import { ConditionInput } from './condition-input'
import { slugify } from '~/lib/node-registry/slug-utils'

interface BaseContentFieldsProps {
  nodeId: string
  showRequired?: boolean
}

export function BaseContentFields({ nodeId, showRequired = false }: BaseContentFieldsProps) {
  const node = useBuilderStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNodeData = useBuilderStore((s) => s.updateNodeData)
  const allSlugs = useBuilderStore((s) => s.slugs)
  const [slugWarning, setSlugWarning] = useState<string | null>(null)

  if (!node) return null

  const data = node.data
  const slug = 'slug' in data ? String(data.slug) : ''
  const label = 'label' in data ? String(data.label) : ''
  const condition = 'condition' in data ? String(data.condition) : ''
  const recordResponse = 'record_response' in data ? Boolean(data.record_response) : true
  const required = 'required' in data ? Boolean(data.required) : true

  const slugConflict = allSlugs.some(
    (s) => s.slug === slug && s.nodeId !== nodeId && slug !== '',
  )
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  const slugInvalid = slug !== '' && !slugPattern.test(slug)

  return (
    <>
      <EditorField label="Label">
        <EditorInput
          value={label}
          onChange={(v) => {
            const updates: Record<string, unknown> = { label: v }
            // Auto-generate slug if slug is empty or was auto-generated
            if (!slug || slug === slugify(label)) {
              updates.slug = slugify(v)
            }
            updateNodeData(nodeId, updates as any)
          }}
          placeholder="Question text"
        />
      </EditorField>

      <EditorField label="Slug">
        <EditorInput
          value={slug}
          onChange={(v) => {
            // Check if old slug is referenced in any condition formulas
            if (slug && v !== slug) {
              const affected = useBuilderStore.getState().nodes.filter(
                (n) =>
                  n.id !== nodeId &&
                  'condition' in n.data &&
                  typeof n.data.condition === 'string' &&
                  n.data.condition.includes(slug),
              )
              if (affected.length > 0) {
                const labels = affected
                  .map((n) => ('label' in n.data ? String(n.data.label) : n.id))
                  .join(', ')
                setSlugWarning(`Slug "${slug}" is referenced in conditions on: ${labels}`)
              } else {
                setSlugWarning(null)
              }
            } else {
              setSlugWarning(null)
            }
            updateNodeData(nodeId, { slug: v } as any)
          }}
          placeholder="e.g. q-age"
        />
        {slugConflict && (
          <p className="text-[10px] text-red-500 mt-0.5">Duplicate slug — must be unique</p>
        )}
        {slugInvalid && (
          <p className="text-[10px] text-red-500 mt-0.5">
            Lowercase alphanumeric with hyphens only
          </p>
        )}
        {slugWarning && (
          <p className="text-[10px] text-amber-600 mt-0.5">{slugWarning}</p>
        )}
      </EditorField>

      <EditorField label="Show if (condition)">
        <ConditionInput
          value={condition}
          onChange={(v) => updateNodeData(nodeId, { condition: v } as any)}
          placeholder='e.g. q-consent = "yes"'
        />
      </EditorField>

      <EditorCheckbox
        label="Record response"
        checked={recordResponse}
        onChange={(v) => updateNodeData(nodeId, { record_response: v } as any)}
      />

      {showRequired && (
        <EditorCheckbox
          label="Required"
          checked={required}
          onChange={(v) => updateNodeData(nodeId, { required: v } as any)}
        />
      )}
    </>
  )
}
