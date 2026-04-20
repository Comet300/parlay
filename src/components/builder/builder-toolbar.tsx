import { useState, useRef, useCallback, useEffect } from 'react'
import { Copy, Check, MoreVertical, Archive, AlertTriangle, Settings, Menu, ArrowLeft, X, Plus, RotateCcw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { FacetSwitcher } from './facet-switcher'
import { archiveForm, updateFormTitle } from '~/lib/server/forms'
import { updateFacetStatus } from '~/lib/server/facets'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { useNavigate } from '@tanstack/react-router'
import { useMediaQuery } from '~/lib/hooks/use-media-query'
import { isValidAlias } from '~/lib/node-registry/alias-utils'

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
  onToggleSettings?: () => void
  onToggleAddNode?: () => void
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
  onToggleSettings,
  onToggleAddNode,
}: BuilderToolbarProps) {
  const [title, setTitle] = useState(formTitle)

  // Sync title when switching facets/forms
  useEffect(() => { setTitle(formTitle) }, [formTitle])
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isDirty = useBuilderStore((s) => s.isDirty)
  const deadPaths = useBuilderStore((s) => s.deadPaths)
  const multiOutgoing = useBuilderStore((s) => s.multiOutgoing)
  const aliasConflicts = useBuilderStore((s) => s.aliasConflicts)
  const aliases = useBuilderStore((s) => s.aliases)
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
    // Client-side pre-validation — matches server `validateForPublish` checks.
    const blockers: string[] = []
    if (deadPaths.length > 0) {
      blockers.push(`${deadPaths.length} dead path${deadPaths.length > 1 ? 's' : ''}`)
    }
    if (aliasConflicts.length > 0) {
      blockers.push(`${aliasConflicts.length} alias conflict${aliasConflicts.length > 1 ? 's' : ''}`)
    }
    if (multiOutgoing.length > 0) {
      blockers.push(`${multiOutgoing.length} node${multiOutgoing.length > 1 ? 's' : ''} with multiple outgoing edges`)
    }
    const invalidAliases = aliases.filter((a) => !isValidAlias(a.alias))
    if (invalidAliases.length > 0) {
      blockers.push(`${invalidAliases.length} invalid alias${invalidAliases.length === 1 ? '' : 'es'}`)
    }
    if (blockers.length > 0) {
      setPublishError(`Cannot publish: ${blockers.join(', ')}`)
      return
    }

    setPublishing(true)
    setPublishError(null)
    try {
      await updateFacetStatus({ data: { facetId, newStatus: 'active' } })
      onRefresh()
    } catch (err) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message)
          if (parsed.type === 'publish_validation' && Array.isArray(parsed.errors)) {
            setPublishError(`Cannot publish:\n${parsed.errors.map((e: string) => `• ${e}`).join('\n')}`)
          } else {
            setPublishError(err.message)
          }
        } catch {
          setPublishError(err.message)
        }
      } else {
        setPublishError('Publish failed')
      }
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

  if (isMobile) {
    return (
      <>
        <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="p-1 rounded hover:bg-light"
          >
            <ArrowLeft className="h-4 w-4 text-text-muted" />
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="text-sm font-semibold text-text bg-transparent border-none focus:outline-none flex-1 truncate"
          />
          {isDirty && (
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
          )}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded hover:bg-light"
          >
            <Menu className="h-4 w-4 text-text-muted" />
          </button>
        </div>

        {/* Mobile slide-over menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
            <div className="w-72 bg-surface border-l border-border shadow-xl h-full overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">Actions</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded hover:bg-light">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {deadPaths.length > 0 && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      const nodeIds = deadPaths.map((dp) => dp.nodeId)
                      window.dispatchEvent(new CustomEvent('builder:fitview-nodes', { detail: nodeIds }))
                    }}
                    className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5 w-full hover:bg-amber-100"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {deadPaths.length} dead path{deadPaths.length > 1 ? 's' : ''}
                  </button>
                )}
                <div className="border-b border-border pb-3">
                  <FacetSwitcher
                    currentFacetId={facetId}
                    formId={formId}
                    roundRobinEnabled={roundRobinEnabled}
                    siblings={siblings}
                    onRefresh={onRefresh}
                  />
                </div>
                {facetStatus === 'draft' && (
                  <Button size="sm" onClick={() => { setMobileMenuOpen(false); handlePublish() }} className="w-full">
                    Publish
                  </Button>
                )}
                {facetStatus === 'active' && (
                  <Button size="sm" variant="secondary" onClick={() => { setMobileMenuOpen(false); handleUnpublish() }} className="w-full">
                    Unpublish
                  </Button>
                )}
                {onToggleSettings && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); onToggleSettings() }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-text hover:bg-light rounded-lg"
                  >
                    <Settings className="h-3.5 w-3.5" /> Form Settings
                  </button>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); setConfirmArchive(true) }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Archive className="h-3.5 w-3.5" /> Archive form
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Archive confirmation (shared) */}
        {confirmArchive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setConfirmArchive(false)}>
            <div className="bg-surface border border-border rounded-xl p-6 shadow-lg max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-text">Archive form</h3>
              <p className="mt-2 text-sm text-text-muted">Archive "{formTitle}"? All facets will be archived.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setConfirmArchive(false)} className="px-3 py-1.5 text-sm rounded-lg border border-border text-text hover:bg-light">Cancel</button>
                <button onClick={handleArchiveForm} className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600">Archive</button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2">
      {/* Back to dashboard */}
      <button
        onClick={() => navigate({ to: '/dashboard' })}
        className="p-1 rounded hover:bg-light"
        title="Back to dashboard"
      >
        <ArrowLeft className="h-4 w-4 text-text-muted" />
      </button>

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

      {/* Add Node button */}
      {onToggleAddNode && (
        <button
          onClick={onToggleAddNode}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-xs font-medium text-text-muted hover:bg-light"
          title="Add Node"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Dead path warning badge */}
      {deadPaths.length > 0 && (
        <button
          onClick={() => {
            // Highlight dead-path nodes by fitting view to them
            const nodeIds = deadPaths.map((dp) => dp.nodeId)
            const event = new CustomEvent('builder:fitview-nodes', { detail: nodeIds })
            window.dispatchEvent(event)
          }}
          className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 hover:bg-amber-100"
          title="Click to highlight dead paths"
        >
          <AlertTriangle className="h-3 w-3" />
          {deadPaths.length} dead path{deadPaths.length > 1 ? 's' : ''}
        </button>
      )}

      {/* Multiple outgoing edges warning badge */}
      {multiOutgoing.length > 0 && (
        <button
          onClick={() => {
            const nodeIds = multiOutgoing.map((m) => m.nodeId)
            const event = new CustomEvent('builder:fitview-nodes', { detail: nodeIds })
            window.dispatchEvent(event)
          }}
          className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 hover:bg-amber-100"
          title="Click to highlight nodes with multiple outgoing edges"
        >
          <AlertTriangle className="h-3 w-3" />
          {multiOutgoing.length} extra edge{multiOutgoing.length > 1 ? 's' : ''}
        </button>
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

      {/* Form Settings button */}
      {onToggleSettings && (
        <button
          onClick={onToggleSettings}
          className="p-1.5 rounded hover:bg-light transition-colors"
          title="Form Settings"
        >
          <Settings className="h-4 w-4 text-text-muted" />
        </button>
      )}

      {/* Publish / Unpublish / Re-activate / URL */}
      {facetStatus === 'archived' && (
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            await updateFacetStatus({ data: { facetId, newStatus: 'active' } })
            onRefresh()
          }}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Re-activate
        </Button>
      )}

      {facetStatus === 'draft' && (
        <div className="relative">
          <Button size="sm" onClick={handlePublish} disabled={publishing}>
            {publishing ? 'Publishing...' : 'Publish'}
          </Button>
          {publishError && (
            <div className="absolute right-0 top-full mt-1 z-40 w-64 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 shadow-md whitespace-pre-line">
              {publishError}
              <button
                onClick={() => setPublishError(null)}
                className="ml-1 text-red-500 hover:text-red-700 underline"
              >
                dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {facetStatus === 'active' && (
        <>
          <div className="flex items-center gap-1.5 text-xs text-text-muted bg-light rounded-lg px-2.5 py-1.5">
            <span className="truncate max-w-[200px]">{publicUrl}</span>
            <button onClick={handleCopy} className="p-0.5 rounded hover:bg-black/5" title="Copy URL">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
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
