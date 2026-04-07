import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { loadBuilderFacet } from '~/lib/server/loaders'
import { BuilderToolbar } from '~/components/builder/builder-toolbar'
import { BuilderCanvas } from '~/components/builder/builder-canvas'
import { FormSettingsPanel } from '~/components/builder/form-settings-panel'
import { useAutoSave } from '~/lib/hooks/use-auto-save'
import { useMediaQuery } from '~/lib/hooks/use-media-query'
import { useBuilderStore } from '~/lib/stores/builder-store'

export const Route = createFileRoute('/_authed/build/$facetId')({
  loader: ({ params }) => loadBuilderFacet({ data: { facetId: params.facetId } }),
  component: BuilderComponent,
})

function BuilderComponent() {
  const { facetId } = Route.useParams()
  const data = Route.useLoaderData()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addNodeOpen, setAddNodeOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')

  const handleRefresh = useCallback(() => {
    router.invalidate()
  }, [router])

  useAutoSave(facetId, data.facet.flowDefinition, data.facet.colorScheme)

  return (
    <div className="flex flex-col h-full -m-6 -mt-6 md:-mt-6">
      <BuilderToolbar
        key={facetId}
        facetId={facetId}
        formId={data.form.id}
        formTitle={data.form.title}
        facetNickname={data.facet.nickname}
        facetStatus={data.facet.status}
        roundRobinEnabled={data.form.roundRobinEnabled}
        siblings={data.siblings}
        onRefresh={handleRefresh}
        onToggleAddNode={() => setAddNodeOpen((v) => !v)}
        onToggleSettings={() => {
          const opening = !settingsOpen
          setSettingsOpen(opening)
          // On mobile, dismiss node config popup when opening settings
          if (isMobile && opening) {
            const store = useBuilderStore.getState()
            const selected = store.nodes.filter((n) => n.selected)
            if (selected.length > 0) {
              store.onNodesChange(selected.map((n) => ({ type: 'select' as const, id: n.id, selected: false })))
            }
          }
        }}
      />
      <div className="flex-1 bg-background relative">
        <ReactFlowProvider>
          <BuilderCanvas
            facetId={facetId}
            settingsOpen={settingsOpen}
            addNodeOpen={addNodeOpen}
            onToggleAddNode={() => setAddNodeOpen((v) => !v)}
          />
        </ReactFlowProvider>
        <FormSettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          formId={data.form.id}
          roundRobinEnabled={data.form.roundRobinEnabled}
          siblingCount={data.siblings.length}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  )
}
