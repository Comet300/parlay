import { useState, useRef, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, Plus, Star, Pencil, Check, X } from 'lucide-react'
import { createFacet, renameFacet, setDefaultFacet } from '~/lib/server/facets'

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-light transition-colors"
      >
        <span className="truncate max-w-[120px]">{currentFacet?.nickname ?? 'Facet'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-text-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-64 rounded-lg border border-border bg-surface shadow-lg py-1">
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
                      className="flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button onClick={() => handleRename(sibling.id)} className="p-1 text-primary hover:text-accent">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { setRenamingId(null); setRenameError('') }} className="p-1 text-text-muted hover:text-text">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {renameError && <p className="text-xs text-red-500 mt-1">{renameError}</p>}
                </div>
              ) : (
                <div
                  className={`flex items-center justify-between px-3 py-1.5 text-sm hover:bg-light group ${
                    sibling.id === currentFacetId ? 'bg-light text-primary font-medium' : 'text-text'
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
                      className="p-1 rounded hover:bg-black/5"
                      title="Rename"
                    >
                      <Pencil className="h-3 w-3 text-text-muted" />
                    </button>
                    {!roundRobinEnabled && !sibling.isDefault && (
                      <button
                        onClick={() => handleSetDefault(sibling.id)}
                        className="p-1 rounded hover:bg-black/5"
                        title="Set as default"
                      >
                        <Star className="h-3 w-3 text-text-muted" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="border-t border-border mt-1 pt-1">
            {creating ? (
              <div className="px-3 py-1.5">
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
                    className="flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <button onClick={handleCreate} className="p-1 text-primary hover:text-accent">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { setCreating(false); setCreateError('') }} className="p-1 text-text-muted hover:text-text">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {createError && <p className="text-xs text-red-500 mt-1">{createError}</p>}
              </div>
            ) : (
              <button
                onClick={() => { setCreating(true); setNewNickname(''); setCreateError('') }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-light w-full"
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
