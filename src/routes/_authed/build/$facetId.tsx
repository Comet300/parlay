import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import { loadBuilderFacet } from '~/lib/server/loaders'
import { BuilderToolbar } from '~/components/builder/builder-toolbar'
import { useAutoSave } from '~/lib/hooks/use-auto-save'

export const Route = createFileRoute('/_authed/build/$facetId')({
  loader: ({ params }) => loadBuilderFacet({ data: { facetId: params.facetId } }),
  component: BuilderComponent,
})

function BuilderComponent() {
  const { facetId } = Route.useParams()
  const data = Route.useLoaderData()
  const router = useRouter()

  const handleRefresh = useCallback(() => {
    router.invalidate()
  }, [router])

  // Initialize auto-save with server data
  useAutoSave(facetId, data.facet.flowDefinition, data.facet.colorScheme)

  return (
    <div className="flex flex-col h-full -m-6 -mt-6 md:-mt-6">
      <BuilderToolbar
        facetId={facetId}
        formId={data.form.id}
        formTitle={data.form.title}
        facetNickname={data.facet.nickname}
        facetStatus={data.facet.status}
        roundRobinEnabled={data.form.roundRobinEnabled}
        siblings={data.siblings}
        onRefresh={handleRefresh}
      />
      <div className="flex-1 bg-background">
        {/* React Flow canvas will be added in builder-canvas change */}
      </div>
    </div>
  )
}
