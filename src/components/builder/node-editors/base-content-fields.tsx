import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { EditorField, EditorInput, EditorCheckbox } from './editor-field'
import { ConditionInput } from './condition-input'
import { toAlias, isValidAlias } from '~/lib/node-registry/alias-utils'

interface BaseContentFieldsProps {
  nodeId: string
  showRequired?: boolean
}

const REFERENCE_TOOLTIP_TEXT =
  'Optional identifier used to reference this question in formula conditions, e.g. `q-age > 18`. Lowercase letters, numbers, and hyphens. Not visible to respondents.'

function HelpTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex ml-1 align-middle">
      <button
        type="button"
        aria-label="Help"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center h-3 w-3 rounded-full text-text-faint hover:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-light"
      >
        <HelpCircle className="h-3 w-3" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-4 top-0 z-tooltip w-64 rounded-md bg-stone-900 px-2 py-1.5 text-[11px] font-normal leading-snug text-white shadow-e3 whitespace-normal"
        >
          {text}
        </span>
      )}
    </span>
  )
}

export function BaseContentFields({ nodeId, showRequired = false }: BaseContentFieldsProps) {
  const node = useBuilderStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNodeData = useBuilderStore((s) => s.updateNodeData)
  const allAliases = useBuilderStore((s) => s.aliases)
  const [aliasWarning, setAliasWarning] = useState<string | null>(null)

  if (!node) return null

  const data = node.data
  const alias = 'alias' in data ? String(data.alias) : ''
  const label = 'label' in data ? String(data.label) : ''
  const condition = 'condition' in data ? String(data.condition) : ''
  const recordResponse = 'record_response' in data ? Boolean(data.record_response) : true
  const required = 'required' in data ? Boolean(data.required) : true

  const aliasConflict = allAliases.some(
    (a) => a.alias === alias && a.nodeId !== nodeId && alias !== '',
  )
  const aliasInvalid = alias !== '' && !isValidAlias(alias)

  return (
    <>
      <EditorField label="Label">
        <EditorInput
          value={label}
          onChange={(v) => {
            const updates: Record<string, unknown> = { label: v }
            // Auto-generate alias if alias is empty or was auto-generated from the previous label
            if (!alias || alias === toAlias(label)) {
              updates.alias = toAlias(v)
            }
            updateNodeData(nodeId, updates as any)
          }}
          placeholder="Question text"
        />
      </EditorField>

      <label className="block mb-3">
        <span className="text-xs font-medium text-text-muted mb-1 flex items-center shrink-0">
          Reference
          <HelpTooltip text={REFERENCE_TOOLTIP_TEXT} />
        </span>
        <EditorInput
          value={alias}
          onChange={(v) => {
            // Check if old alias is referenced in any condition formulas
            if (alias && v !== alias) {
              const affected = useBuilderStore.getState().nodes.filter(
                (n) =>
                  n.id !== nodeId &&
                  'condition' in n.data &&
                  typeof n.data.condition === 'string' &&
                  n.data.condition.includes(alias),
              )
              if (affected.length > 0) {
                const labels = affected
                  .map((n) => ('label' in n.data ? String(n.data.label) : n.id))
                  .join(', ')
                setAliasWarning(`Alias "${alias}" is referenced in conditions on: ${labels}`)
              } else {
                setAliasWarning(null)
              }
            } else {
              setAliasWarning(null)
            }
            updateNodeData(nodeId, { alias: v } as any)
          }}
          placeholder="e.g. q-age"
        />
        {aliasConflict && (
          <p className="text-[10px] text-error mt-0.5">Duplicate alias — must be unique</p>
        )}
        {aliasInvalid && (
          <p className="text-[10px] text-error mt-0.5">
            Lowercase alphanumeric with hyphens only
          </p>
        )}
        {aliasWarning && (
          <p className="text-[10px] text-warning-strong mt-0.5">{aliasWarning}</p>
        )}
      </label>

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
