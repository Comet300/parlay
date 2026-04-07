import { useState, useRef, useCallback, useEffect } from 'react'
import { Copy, Check, MoreVertical, Archive } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { FacetSwitcher } from './facet-switcher'
import { archiveForm, updateFormTitle } from '~/lib/server/forms'
import { updateFacetStatus } from '~/lib/server/facets'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { useNavigate } from '@tanstack/react-router'

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

  // Sync title when switching facets/forms
  useEffect(() => { setTitle(formTitle) }, [formTitle])
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const isDirty = useBuilderStore((s) => s.isDirty)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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
      onRefresh()
    } finally {
      setPublishing(false)
    }
  }

  async function handleUnpublish() {
    setUnpublishing(true)
    try {
      await updateFacetStatus({ data: { facetId, newStatus: 'draft' } })
      onRefresh()
    } finally {
      setUnpublishing(false)
    }
  }

  async function handleArchiveForm() {
    setConfirmArchive(false)
    await archiveForm({ data: { formId } })
    navigate({ to: '/dashboard' })
  }

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

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

      {/* Publish / Unpublish / URL */}
      {facetStatus === 'draft' && (
        <Button size="sm" onClick={handlePublish} disabled={publishing}>
          {publishing ? 'Publishing...' : 'Publish'}
        </Button>
      )}

      {facetStatus === 'active' && (
        <>
          {facetStatus === 'active' && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted bg-light rounded-lg px-2.5 py-1.5">
              <span className="truncate max-w-[200px]">{publicUrl}</span>
              <button onClick={handleCopy} className="p-0.5 rounded hover:bg-black/5" title="Copy URL">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
          <Button size="sm" variant="secondary" onClick={handleUnpublish} disabled={unpublishing}>
            {unpublishing ? 'Unpublishing...' : 'Unpublish'}
          </Button>
        </>
      )}

      {/* Form actions menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 rounded hover:bg-light transition-colors"
          aria-label="Form actions"
        >
          <MoreVertical className="h-4 w-4 text-text-muted" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-lg border border-border bg-surface shadow-lg py-1">
            <button
              onClick={() => { setMenuOpen(false); setConfirmArchive(true) }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-light w-full"
            >
              <Archive className="h-3.5 w-3.5" /> Archive form
            </button>
          </div>
        )}
      </div>

      {/* Archive form confirmation */}
      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setConfirmArchive(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 shadow-lg max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text">Archive form</h3>
            <p className="mt-2 text-sm text-text-muted">Archive "{formTitle}"? All facets will be archived and URLs will stop working.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmArchive(false)} className="px-3 py-1.5 text-sm rounded-lg border border-border text-text hover:bg-light">
                Cancel
              </button>
              <button onClick={handleArchiveForm} className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600">
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
