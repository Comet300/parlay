import { useState, useRef, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, Plus, Pencil, Check, X, Shuffle } from 'lucide-react'
import { createFacet, renameFacet, setDefaultFacet } from '~/lib/server/facets'
import { updateFormRoundRobin } from '~/lib/server/forms'

const NICKNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

interface Sibling {
  id: string
  nickname: string
  isDefault: boolean
  status: string
}

export function FacetSwitcher({
  currentFacetId,
  formId,
  roundRobinEnabled,
  siblings,
  onRefresh,
}: {
  currentFacetId: string
  formId: string
  roundRobinEnabled: boolean
  siblings: Sibling[]
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [createError, setCreateError] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')
  const [togglingOff, setTogglingOff] = useState(false)
  const [selectedDefaultId, setSelectedDefaultId] = useState<string | null>(null)
  const [toggleBusy, setToggleBusy] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const currentFacet = siblings.find((s) => s.id === currentFacetId)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setRenamingId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (creating) createInputRef.current?.focus()
  }, [creating])

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus()
  }, [renamingId])

  function validateNickname(value: string): string | null {
    if (!value) return 'Nickname is required'
    if (value.length > 60) return 'Max 60 characters'
    if (!NICKNAME_PATTERN.test(value)) return 'Lowercase alphanumeric with hyphens only'
    return null
  }

  async function handleCreate() {
    const error = validateNickname(newNickname)
    if (error) { setCreateError(error); return }

    try {
      const result = await createFacet({
        data: { sourceFacetId: currentFacetId, nickname: newNickname },
      })
      setCreating(false)
      setNewNickname('')
      setCreateError('')
      setOpen(false)
      navigate({ to: '/build/$facetId', params: { facetId: result.facetId } })
    } catch (err: any) {
      setCreateError(err.message ?? 'Failed to create facet')
    }
  }

  async function handleRename(facetId: string) {
    const error = validateNickname(renameValue)
    if (error) { setRenameError(error); return }

    try {
      await renameFacet({ data: { facetId, newNickname: renameValue } })
      setRenamingId(null)
      setRenameValue('')
      setRenameError('')
      onRefresh()
    } catch (err: any) {
      setRenameError(err.message ?? 'Failed to rename facet')
    }
  }

  async function handleSetDefault(facetId: string) {
    await setDefaultFacet({ data: { formId, facetId } })
    onRefresh()
  }

  const activeSiblings = siblings.filter((s) => s.status === 'active')

  async function handleRoundRobinToggle() {
    if (roundRobinEnabled) {
      // Toggling OFF
      if (activeSiblings.length <= 1) {
        // Auto-select the single (or no) active facet as default
        setToggleBusy(true)
        try {
          if (activeSiblings.length === 1) {
            await setDefaultFacet({ data: { formId, facetId: activeSiblings[0].id } })
          }
          await updateFormRoundRobin({ data: { formId, enabled: false } })
          onRefresh()
        } finally {
          setToggleBusy(false)
        }
      } else {
        // Multiple active facets — prompt for default selection
        setTogglingOff(true)
        setSelectedDefaultId(null)
      }
    } else {
      // Toggling ON — commit immediately
      setToggleBusy(true)
      try {
        await updateFormRoundRobin({ data: { formId, enabled: true } })
        onRefresh()
      } finally {
        setToggleBusy(false)
      }
    }
  }

  async function handleConfirmToggleOff() {
    if (!selectedDefaultId) return
    setToggleBusy(true)
    try {
      await setDefaultFacet({ data: { formId, facetId: selectedDefaultId } })
      await updateFormRoundRobin({ data: { formId, enabled: false } })
      setTogglingOff(false)
      onRefresh()
    } finally {
      setToggleBusy(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-border-light transition-colors"
      >
        <span className="truncate max-w-[120px]">{currentFacet?.nickname ?? 'Facet'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-text-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-dropdown w-64 rounded-lg border border-border bg-surface shadow-e3 py-1">
          {siblings.map((sibling) => (
            <div key={sibling.id}>
              {renamingId === sibling.id ? (
                <div className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => { setRenameValue(e.target.value); setRenameError('') }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(sibling.id)
                        if (e.key === 'Escape') { setRenamingId(null); setRenameError('') }
                      }}
                      className="flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-light"
                    />
                    <button onClick={() => handleRename(sibling.id)} className="p-1 text-primary hover:text-primary-hover">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { setRenamingId(null); setRenameError('') }} className="p-1 text-text-muted hover:text-text">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {renameError && <p className="text-xs text-error mt-1">{renameError}</p>}
                </div>
              ) : (
                <div
                  className={`flex items-center justify-between px-3 py-1.5 text-sm hover:bg-border-light group ${
                    sibling.id === currentFacetId ? 'bg-primary-subtle text-primary font-medium' : 'text-text'
                  }`}
                >
                  <button
                    onClick={() => {
                      setOpen(false)
                      if (sibling.id !== currentFacetId) {
                        navigate({ to: '/build/$facetId', params: { facetId: sibling.id } })
                      }
                    }}
                    className="flex-1 text-left truncate"
                  >
                    {sibling.nickname}
                    {sibling.isDefault && (
                      <span className="ml-1 text-[10px] text-text-muted">(default)</span>
                    )}
                  </button>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setRenamingId(sibling.id)
                        setRenameValue(sibling.nickname)
                        setRenameError('')
                      }}
                      className="p-1 rounded hover:bg-border-light"
                      title="Rename"
                    >
                      <Pencil className="h-3 w-3 text-text-muted" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Round-robin toggle */}
          <div className="border-t border-border mt-1 pt-1 px-3 py-1.5">
            <button
              onClick={handleRoundRobinToggle}
              disabled={toggleBusy}
              className="flex items-center gap-2 text-sm w-full hover:bg-border-light rounded px-1 py-0.5"
            >
              <Shuffle className="h-3.5 w-3.5 text-text-muted shrink-0" />
              <span className="flex-1 text-left">Round-robin</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                roundRobinEnabled
                  ? 'bg-primary/10 text-primary'
                  : 'bg-border-light text-text-muted'
              }`}>
                {roundRobinEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
            {togglingOff && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-text-muted">Select default facet:</p>
                <select
                  value={selectedDefaultId ?? ''}
                  onChange={(e) => setSelectedDefaultId(e.target.value || null)}
                  className="w-full text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-light"
                >
                  <option value="">Choose...</option>
                  {activeSiblings.map((s) => (
                    <option key={s.id} value={s.id}>{s.nickname}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleConfirmToggleOff}
                    disabled={!selectedDefaultId || toggleBusy}
                    className="text-xs px-2 py-1 rounded bg-primary text-white hover:bg-accent disabled:opacity-50"
                  >
                    {toggleBusy ? 'Saving…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setTogglingOff(false)}
                    className="text-xs px-2 py-1 rounded text-text-muted hover:bg-border-light"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {!roundRobinEnabled && !togglingOff && siblings.length > 1 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-text-muted shrink-0">Default:</span>
                <select
                  value={siblings.find((s) => s.isDefault)?.id ?? ''}
                  onChange={(e) => handleSetDefault(e.target.value)}
                  className="flex-1 min-w-0 text-xs border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-light"
                >
                  {siblings.map((s) => (
                    <option key={s.id} value={s.id}>{s.nickname}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="border-t border-border mt-1 pt-1">
            {creating ? (
              <div className="px-3 py-1.5 overflow-hidden">
                <div className="flex items-center gap-1">
                  <input
                    ref={createInputRef}
                    value={newNickname}
                    onChange={(e) => { setNewNickname(e.target.value); setCreateError('') }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate()
                      if (e.key === 'Escape') { setCreating(false); setCreateError('') }
                    }}
                    placeholder="facet-name"
                    className="min-w-0 flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-light"
                  />
                  <button onClick={handleCreate} className="shrink-0 p-1 text-primary hover:text-primary-hover">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { setCreating(false); setCreateError('') }} className="shrink-0 p-1 text-text-muted hover:text-text">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {createError && <p className="text-xs text-error mt-1">{createError}</p>}
              </div>
            ) : (
              <button
                onClick={() => { setCreating(true); setNewNickname(''); setCreateError('') }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-border-light w-full"
              >
                <Plus className="h-3.5 w-3.5" /> Create facet
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
