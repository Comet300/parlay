import { useState, useCallback, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { X, Search, Plus, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { EmptyState } from '~/components/ui/empty-state'
import { Spinner } from '~/components/ui/spinner'
import { FormCard } from '~/components/dashboard/form-card'
import { loadDashboardForms, type SortOption } from '~/lib/server/loaders'
import { createForm } from '~/lib/server/forms'

type StatusFilter = 'all' | 'has_active' | 'all_draft' | 'has_archived'

interface DashboardSearch {
  page?: number
  search?: string
  sort?: SortOption
  status?: StatusFilter
}

export const Route = createFileRoute('/_authed/dashboard')({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    page: Number(search.page) || undefined,
    search: (search.search as string) || undefined,
    sort: (search.sort as SortOption) || undefined,
    status: (search.status as StatusFilter) || undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    loadDashboardForms({
      data: {
        page: deps.page ?? 1,
        pageSize: 12,
        search: deps.search,
        sort: deps.sort ?? 'created_at_desc',
      },
    }),
  component: DashboardComponent,
})

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'has_active', label: 'Active' },
  { value: 'all_draft', label: 'Draft' },
  { value: 'has_archived', label: 'Archived' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'created_at_desc', label: 'Newest first' },
  { value: 'created_at_asc', label: 'Oldest first' },
  { value: 'updated_at', label: 'Last updated' },
  { value: 'title', label: 'Alphabetical (A-Z)' },
]

function DashboardComponent() {
  const { user } = Route.useRouteContext()
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [creating, setCreating] = useState(false)
  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const statusFilter = search.status ?? 'all'
  const currentPage = search.page ?? 1
  const totalPages = Math.ceil(data.total / data.pageSize)

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: searchInput || undefined,
          page: undefined,
        }),
        replace: true,
      })
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchInput, navigate])

  const handleRefresh = useCallback(() => {
    navigate({ search: (prev) => ({ ...prev }), replace: true })
  }, [navigate])

  async function handleNewForm() {
    setCreating(true)
    try {
      const result = await createForm()
      navigate({ to: '/build/$facetId', params: { facetId: result.facetId } })
    } finally {
      setCreating(false)
    }
  }

  // Client-side status filtering
  const filteredForms = data.forms.filter((form) => {
    if (statusFilter === 'all') return true
    const facets = (form as any).facets as { status: string }[]
    switch (statusFilter) {
      case 'has_active':
        return facets.some((f) => f.status === 'active')
      case 'all_draft':
        return facets.every((f) => f.status === 'draft')
      case 'has_archived':
        return facets.some((f) => f.status === 'archived')
      default:
        return true
    }
  })

  return (
    <div>
      {!user.emailVerified && !bannerDismissed && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-warning-subtle border border-warning-subtle px-4 py-3">
          <p className="text-sm text-warning-strong">
            Please verify your email address. Check your inbox for a verification link.
          </p>
          <button
            onClick={() => setBannerDismissed(true)}
            className="ml-3 shrink-0 rounded p-1 text-warning-strong hover:text-warning-strong"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="typo-display text-text">Dashboard</h1>
        <Button onClick={handleNewForm} disabled={creating}>
          {creating ? <Spinner size={12} className="mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
          {creating ? 'Creating…' : 'New Form'}
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search forms..."
            className="pl-9"
          />
        </div>

        {/* Status filters */}
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    status: filter.value === 'all' ? undefined : filter.value,
                    page: undefined,
                  }),
                  replace: true,
                })
              }
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                statusFilter === filter.value
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border text-text-muted hover:bg-border-light'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={search.sort ?? 'created_at_desc'}
          onChange={(e) =>
            navigate({
              search: (prev) => ({
                ...prev,
                sort: e.target.value as SortOption,
                page: undefined,
              }),
              replace: true,
            })
          }
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-surface text-text"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {data.forms.length === 0 && !search.search ? (
        <EmptyState
          icon={FileText}
          title="No forms yet"
          description="Create your first research flow. Drag nodes, add questions, and publish to a public URL."
          action={
            <Button onClick={handleNewForm} disabled={creating}>
              <Plus className="h-4 w-4" /> New Form
            </Button>
          }
        />
      ) : filteredForms.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <p>No forms match your filters.</p>
        </div>
      ) : (
        <>
          {/* Form grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredForms.map((form) => (
              <FormCard key={form.id} form={form as any} onRefresh={handleRefresh} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      page: Math.max(1, currentPage - 1),
                    }),
                    replace: true,
                  })
                }
                disabled={currentPage <= 1}
                className="p-2 rounded-lg border border-border hover:bg-border-light disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-text-muted">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      page: Math.min(totalPages, currentPage + 1),
                    }),
                    replace: true,
                  })
                }
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg border border-border hover:bg-border-light disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
