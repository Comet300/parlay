import { useState, useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { MoreVertical, ExternalLink, Pencil, Trash2, Archive, Play, Pause, RotateCcw, FileSpreadsheet } from 'lucide-react'
import { Card } from '~/components/ui/card'
import { deleteFacet, updateFacetStatus, setDefaultFacet } from '~/lib/server/facets'
import { deleteForm, updateFormRoundRobin } from '~/lib/server/forms'

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
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onCancel}>
      <div className="bg-surface border border-border rounded-xl p-6 shadow-lg max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        <p className="mt-2 text-sm text-text-muted">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-lg border border-border text-text hover:bg-light">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
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
  const [confirmArchive, setConfirmArchive] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

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

  async function handleArchive() {
    setConfirmArchive(false)
    setOpen(false)
    await handleStatusChange('archived')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.preventDefault(); setOpen(!open) }}
        className="p-0.5 rounded hover:bg-black/10 transition-colors"
        aria-label={`Actions for ${facet.nickname}`}
      >
        <MoreVertical className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-border bg-surface shadow-lg py-1">
          <Link
            to="/build/$facetId"
            params={{ facetId: facet.id }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-light w-full"
            onClick={() => setOpen(false)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
          <button
            onClick={() => {
              window.open(`/${formId}?v=${facet.nickname}`, '_blank')
              setOpen(false)
            }}
            disabled={facet.status === 'archived'}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-light w-full disabled:opacity-40 disabled:pointer-events-none"
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
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-light w-full"
            >
              <Play className="h-3.5 w-3.5" /> Publish
            </button>
          )}
          {facet.status === 'active' && (
            <>
              <button
                onClick={() => handleStatusChange('draft')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-light w-full"
              >
                <Pause className="h-3.5 w-3.5" /> Unpublish
              </button>
              <button
                onClick={() => { setOpen(false); setConfirmArchive(true) }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-light w-full"
              >
                <Archive className="h-3.5 w-3.5" /> Archive
              </button>
            </>
          )}
          {facet.status === 'archived' && (
            <button
              onClick={() => handleStatusChange('active')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-text hover:bg-light w-full"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Re-activate
            </button>
          )}
          <div className="border-t border-border my-1" />
          <button
            onClick={() => { setOpen(false); setConfirmDelete(true) }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 w-full"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete facet
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete facet"
        message={`Delete "${facet.nickname}" and all its response data? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={confirmArchive}
        title="Archive facet"
        message={`Archive "${facet.nickname}"? It will no longer be accessible to respondents.`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setConfirmArchive(false)}
      />
    </div>
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
  const formMenuRef = useRef<HTMLDivElement>(null)

  const defaultFacet = form.facets.find((f) => f.is_default) ?? form.facets[0]
  const allDraft = form.facets.every((f) => f.status === 'draft')

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
    <Card className="overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <Link to="/build/$facetId" params={{ facetId: defaultFacet?.id ?? '' }} className="block relative">
        <img src="/thumbnail-placeholder.svg" alt="" className="w-full h-36 object-cover" />
        {allDraft && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-text-muted/30 uppercase tracking-widest select-none">
              Draft
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Title + form menu */}
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/build/$facetId"
            params={{ facetId: defaultFacet?.id ?? '' }}
            className="text-sm font-semibold text-text hover:text-primary truncate"
          >
            {form.title}
          </Link>
          <div className="relative" ref={formMenuRef}>
            <button
              onClick={() => setFormMenuOpen(!formMenuOpen)}
              className="p-1 rounded hover:bg-light transition-colors shrink-0"
              aria-label="Form actions"
            >
              <MoreVertical className="h-4 w-4 text-text-muted" />
            </button>
            {formMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-border bg-surface shadow-lg py-1">
                <button
                  onClick={() => { setFormMenuOpen(false); setConfirmDeleteForm(true) }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 w-full"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete form
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Facet chips */}
        <div className="flex flex-wrap gap-1.5">
          {form.facets.map((facet) => {
            const chipColor =
              facet.status === 'active'
                ? 'bg-light text-primary'
                : facet.status === 'archived'
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-gray-100 text-gray-500 opacity-60'
            return (
              <span key={facet.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${chipColor}`}>
                {facet.nickname}
                {facet.is_default && <span className="text-[10px]">(default)</span>}
                <FacetChipMenu facet={facet} formId={form.id} onAction={onRefresh} />
              </span>
            )
          })}
        </div>

        {/* Round-robin toggle + default selector */}
        {form.facets.length > 1 && (
          <div className="flex flex-col gap-2 text-xs text-text-muted mt-auto pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.round_robin_enabled}
                  onChange={handleRoundRobinToggle}
                  className="rounded border-border text-primary focus:ring-primary/50"
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
              <div className="flex items-center gap-2 bg-light rounded-lg px-2.5 py-1.5">
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
        open={confirmDeleteForm}
        title="Delete form"
        message={`Delete "${form.title}" and all its facets and response data? This cannot be undone.`}
        onConfirm={handleDeleteForm}
        onCancel={() => setConfirmDeleteForm(false)}
      />
    </Card>
  )
}
