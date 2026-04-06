import { useState, useRef, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { FacetSwitcher } from './facet-switcher'
import { updateFormTitle } from '~/lib/server/forms'
import { updateFacetStatus } from '~/lib/server/facets'
import { useBuilderStore } from '~/lib/stores/builder-store'

interface BuilderToolbarProps {
  facetId: string
  formId: string
  formTitle: string
  facetNickname: string
  facetStatus: string
  roundRobinEnabled: boolean
  siblings: {
    id: string
    nickname: string
    isDefault: boolean
    status: string
  }[]
  onRefresh: () => void
}

export function BuilderToolbar({
  facetId,
  formId,
  formTitle,
  facetNickname,
  facetStatus,
  roundRobinEnabled,
  siblings,
  onRefresh,
}: BuilderToolbarProps) {
  const [title, setTitle] = useState(formTitle)
  const [publishing, setPublishing] = useState(false)
  const [showUrl, setShowUrl] = useState(facetStatus === 'active')
  const [copied, setCopied] = useState(false)
  const isDirty = useBuilderStore((s) => s.isDirty)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleTitleBlur = useCallback(() => {
    if (title !== formTitle) {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        await updateFormTitle({ data: { formId, title } })
        onRefresh()
      }, 300)
    }
  }, [title, formTitle, formId, onRefresh])

  async function handlePublish() {
    setPublishing(true)
    try {
      await updateFacetStatus({ data: { facetId, newStatus: 'active' } })
      setShowUrl(true)
      onRefresh()
    } finally {
      setPublishing(false)
    }
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${formId}?v=${facetNickname}`

  function handleCopy() {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2">
      {/* Form title (inline editable) */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        className="text-sm font-semibold text-text bg-transparent border-none focus:outline-none focus:ring-0 truncate max-w-[200px] hover:bg-light rounded px-1 -ml-1"
      />

      {/* Unsaved indicator */}
      {isDirty && (
        <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
      )}

      {/* Facet switcher */}
      <FacetSwitcher
        currentFacetId={facetId}
        formId={formId}
        roundRobinEnabled={roundRobinEnabled}
        siblings={siblings}
        onRefresh={onRefresh}
      />

      <div className="flex-1" />

      {/* Publish / URL */}
      {facetStatus === 'draft' && (
        <Button size="sm" onClick={handlePublish} disabled={publishing}>
          {publishing ? 'Publishing...' : 'Publish'}
        </Button>
      )}

      {showUrl && facetStatus === 'active' && (
        <div className="flex items-center gap-1.5 text-xs text-text-muted bg-light rounded-lg px-2.5 py-1.5">
          <span className="truncate max-w-[200px]">{publicUrl}</span>
          <button onClick={handleCopy} className="p-0.5 rounded hover:bg-black/5" title="Copy URL">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}
