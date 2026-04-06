import { useEffect, useRef } from 'react'
import { useBuilderStore } from '~/lib/stores/builder-store'
import { saveFacetData } from '~/lib/server/facets'

const AUTO_SAVE_DELAY = 2000

export function useAutoSave(
  facetId: string,
  serverFlowDefinition: unknown,
  serverColorScheme: unknown,
) {
  const initializeFromServer = useBuilderStore((s) => s.initializeFromServer)
  const isDirty = useBuilderStore((s) => s.isDirty)
  const storeFacetId = useBuilderStore((s) => s.facetId)
  const flowDefinition = useBuilderStore((s) => s.flowDefinition)
  const colorScheme = useBuilderStore((s) => s.colorScheme)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const initializedRef = useRef<string | null>(null)

  // Initialize store from server data when facet changes
  useEffect(() => {
    if (initializedRef.current !== facetId) {
      initializeFromServer(facetId, serverFlowDefinition, serverColorScheme)
      initializedRef.current = facetId
    }
  }, [facetId, serverFlowDefinition, serverColorScheme, initializeFromServer])

  // Auto-save when dirty
  useEffect(() => {
    if (!isDirty || storeFacetId !== facetId) return

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        await saveFacetData({
          data: {
            facetId,
            flowDefinition: flowDefinition ?? undefined,
            colorScheme: colorScheme ?? undefined,
          },
        })
        useBuilderStore.getState().markClean()
      } catch {
        // Save failed — isDirty stays true, retry on next change
      }
    }, AUTO_SAVE_DELAY)

    return () => clearTimeout(timeoutRef.current)
  }, [facetId, isDirty, flowDefinition, colorScheme, storeFacetId])
}
