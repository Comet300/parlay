import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '@tanstack/react-router'
import { MoreVertical, ExternalLink, Pencil, Trash2, Archive, Play, Pause, RotateCcw, FileSpreadsheet } from 'lucide-react'
import { Card } from '~/components/ui/card'
import { Modal } from '~/components/ui/modal'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { deleteFacet, updateFacetStatus, setDefaultFacet } from '~/lib/server/facets'
import { archiveForm, deleteForm, updateFormRoundRobin } from '~/lib/server/forms'

interface Facet {
  id: string
  nickname: string
  is_default: boolean
  status: string
}

interface FormWithFacets {
  id: string
  title: string
  round_robin_enabled: boolean
  updated_at: string
  facets: Facet[]
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} maxWidth={420}>
      <h3 className="text-lg font-bold tracking-[-0.015em] text-text">{title}</h3>
      <p className="mt-1 text-sm text-text-muted">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="destructive" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

function FacetChipMenu({
  facet,
  formId,
  onAction,
}: {
  facet: Facet
  formId: string
  onAction: () => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.right })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    function handleScroll() { updatePosition() }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open, updatePosition])

  async function handleStatusChange(newStatus: string) {
    setOpen(false)
    await updateFacetStatus({ data: { facetId: facet.id, newStatus } })
    onAction()
  }

  async function handleDelete() {
    setConfirmDelete(false)
    setOpen(false)
    await deleteFacet({ data: { facetId: facet.id } })
    onAction()
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => { e.preventDefault(); setOpen(!open) }}
        className="p-0.5 rounded hover:bg-border-light transition-colors"
        aria-label={`Actions for ${facet.nickname}`}
      >
        <MoreVertical className="h-3 w-3" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, transform: 'translateX(-100%)' }}
          className="z-dropdown w-44 rounded-lg border border-border bg-white shadow-e3 py-1"
        >
          <Link
            to="/build/$facetId"
            params={{ facetId: facet.id }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-border-light w-full"
            onClick={() => setOpen(false)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
          <button
            onClick={() => {
              window.open(`/${formId}?v=${facet.nickname}`, '_blank')
              setOpen(false)
            }}
            disabled={facet.status !== 'active'}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-border-light w-full disabled:opacity-40 disabled:pointer-events-none"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View Live
          </button>
          <button
            disabled
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-muted w-full opacity-40 cursor-not-allowed"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
          </button>
          <div className="border-t border-border my-1" />
          {facet.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('active')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-border-light w-full"
            >
              <Play className="h-3.5 w-3.5" /> Publish
            </button>
          )}
          {facet.status === 'active' && (
            <button
              onClick={() => handleStatusChange('draft')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-border-light w-full"
            >
              <Pause className="h-3.5 w-3.5" /> Unpublish
            </button>
          )}
          {facet.status === 'archived' && (
            <button
              onClick={() => handleStatusChange('active')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-border-light w-full"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Re-activate
            </button>
          )}
          <div className="border-t border-border my-1" />
          <button
            onClick={() => { setOpen(false); setConfirmDelete(true) }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-error-strong hover:bg-error-subtle w-full"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete facet
          </button>
        </div>,
        document.body,
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete facet"
        message={`Delete "${facet.nickname}" and all its response data? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

export function FormCard({
  form,
  onRefresh,
}: {
  form: FormWithFacets
  onRefresh: () => void
}) {
  const [formMenuOpen, setFormMenuOpen] = useState(false)
  const [confirmDeleteForm, setConfirmDeleteForm] = useState(false)
  const [confirmArchiveForm, setConfirmArchiveForm] = useState(false)
  const formMenuRef = useRef<HTMLDivElement>(null)

  const defaultFacet = form.facets.find((f) => f.is_default) ?? form.facets[0]
  const allArchived = form.facets.every((f) => f.status === 'archived')
  const hasActive = form.facets.some((f) => f.status === 'active')

  useEffect(() => {
    if (!formMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (formMenuRef.current && !formMenuRef.current.contains(e.target as Node)) setFormMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [formMenuOpen])

  async function handleDeleteForm() {
    setConfirmDeleteForm(false)
    await deleteForm({ data: { formId: form.id } })
    onRefresh()
  }

  async function handleArchiveForm() {
    setConfirmArchiveForm(false)
    await archiveForm({ data: { formId: form.id } })
    onRefresh()
  }

  const [pendingRoundRobinOff, setPendingRoundRobinOff] = useState(false)

  async function handleRoundRobinToggle() {
    if (form.round_robin_enabled) {
      // Toggling OFF — prompt user to select default facet first
      setPendingRoundRobinOff(true)
    } else {
      // Toggling ON — immediate
      await updateFormRoundRobin({ data: { formId: form.id, enabled: true } })
      onRefresh()
    }
  }

  async function handleConfirmRoundRobinOff(facetId: string) {
    await setDefaultFacet({ data: { formId: form.id, facetId } })
    await updateFormRoundRobin({ data: { formId: form.id, enabled: false } })
    setPendingRoundRobinOff(false)
    onRefresh()
  }

  async function handleSetDefault(facetId: string) {
    await setDefaultFacet({ data: { formId: form.id, facetId } })
    onRefresh()
  }

  return (
    <Card interactive className="overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <Link to="/build/$facetId" params={{ facetId: defaultFacet?.id ?? '' }} className="block">
        <img src="/thumbnail-placeholder.svg?v=rebrand" alt="" className="w-full h-36 object-cover" />
      </Link>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Title + form menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/build/$facetId"
              params={{ facetId: defaultFacet?.id ?? '' }}
              className="text-sm font-semibold text-text hover:text-primary truncate"
            >
              {form.title}
            </Link>
            {allArchived ? (
              <Badge className="shrink-0 uppercase tracking-[0.06em] bg-stone-200 text-text-muted">Archived</Badge>
            ) : hasActive ? (
              <Badge variant="success" className="shrink-0 uppercase tracking-[0.06em]">Active</Badge>
            ) : (
              <Badge className="shrink-0 uppercase tracking-[0.06em]">Draft</Badge>
            )}
          </div>
          <div className="relative" ref={formMenuRef}>
            <button
              onClick={() => setFormMenuOpen(!formMenuOpen)}
              className="p-1 rounded hover:bg-border-light transition-colors shrink-0"
              aria-label="Form actions"
            >
              <MoreVertical className="h-4 w-4 text-text-muted" />
            </button>
            {formMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-dropdown w-48 rounded-lg border border-border bg-surface shadow-e3 py-1">
                {!allArchived && (
                  <button
                    onClick={() => { setFormMenuOpen(false); setConfirmArchiveForm(true) }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-border-light w-full"
                  >
                    <Archive className="h-3.5 w-3.5" /> Archive form
                  </button>
                )}
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => { setFormMenuOpen(false); setConfirmDeleteForm(true) }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-error-strong hover:bg-error-subtle w-full"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete form
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Facet chips with per-chip action menu — hidden when there's only one facet */}
        {form.facets.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {form.facets.map((facet) => {
              const chipColor =
                facet.status === 'active'
                  ? 'bg-primary-subtle text-primary'
                  : facet.status === 'archived'
                    ? 'bg-stone-200 text-text-faint'
                    : 'bg-stone-200 text-text-muted opacity-60'
              return (
                <span key={facet.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${chipColor}`}>
                  {facet.nickname}
                  {facet.is_default && !form.round_robin_enabled && <span className="text-[10px]">(default)</span>}
                  <FacetChipMenu facet={facet} formId={form.id} onAction={onRefresh} />
                </span>
              )
            })}
          </div>
        )}

        {/* Round-robin toggle + default selector */}
        {form.facets.length > 1 && (
          <div className="flex flex-col gap-2 text-xs text-text-muted mt-auto pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.round_robin_enabled}
                  onChange={handleRoundRobinToggle}
                  className="rounded border-border text-primary focus:ring-primary-light"
                />
                Round-robin
              </label>
              {!form.round_robin_enabled && !pendingRoundRobinOff && (
                <select
                  value={defaultFacet?.id ?? ''}
                  onChange={(e) => handleSetDefault(e.target.value)}
                  className="text-xs border border-border rounded px-1.5 py-0.5 bg-surface"
                >
                  {form.facets.map((f) => (
                    <option key={f.id} value={f.id}>{f.nickname}</option>
                  ))}
                </select>
              )}
            </div>
            {pendingRoundRobinOff && (
              <div className="flex items-center gap-2 bg-primary-subtle rounded-lg px-2.5 py-1.5">
                <span className="text-text shrink-0">Select default facet:</span>
                <select
                  onChange={(e) => handleConfirmRoundRobinOff(e.target.value)}
                  defaultValue=""
                  className="text-xs border border-border rounded px-1.5 py-0.5 bg-surface flex-1"
                >
                  <option value="" disabled>Choose...</option>
                  {form.facets.map((f) => (
                    <option key={f.id} value={f.id}>{f.nickname}</option>
                  ))}
                </select>
                <button
                  onClick={() => setPendingRoundRobinOff(false)}
                  className="text-text-muted hover:text-text"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmArchiveForm}
        title="Archive form"
        message={`Archive "${form.title}"? All facets will be archived and URLs will stop working.`}
        confirmLabel="Archive"
        onConfirm={handleArchiveForm}
        onCancel={() => setConfirmArchiveForm(false)}
      />
      <ConfirmDialog
        open={confirmDeleteForm}
        title="Delete form"
        message={`Delete "${form.title}" and all its facets and response data? This cannot be undone.`}
        onConfirm={handleDeleteForm}
        onCancel={() => setConfirmDeleteForm(false)}
      />
    </Card>
  )
}
