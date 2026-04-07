import { useState, useEffect } from 'react'
import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { getVisitorId } from '~/lib/fingerprint'
import { preResolve, resolveFacet, type ResolveFacetResult } from '~/lib/server/player'
import { FormUnavailable } from '~/components/player/form-unavailable'
import { setResponseStatus } from '@tanstack/react-start/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/$formId')({
  beforeLoad: ({ params }) => {
    if (!UUID_RE.test(params.formId)) {
      throw notFound()
    }
  },
  loader: async ({ params, location }) => {
    const searchParams = new URLSearchParams(location.search)
    const nickname = searchParams.get('v') || undefined

    const result = await preResolve({ data: { formId: params.formId, nickname } })

    if (result.type === 'not_found') {
      throw notFound()
    }

    if (result.type === 'redirect') {
      throw redirect({
        to: '/$formId',
        params: { formId: params.formId },
        search: { v: result.nickname },
        statusCode: 301,
      })
    }

    if (result.type === 'unavailable') {
      setResponseStatus(410)
      return { unavailable: true as const }
    }

    return { unavailable: false as const }
  },
  component: PlayerComponent,
})

type ResolvedState =
  | { status: 'loading' }
  | { status: 'resolved'; facet: { id: string; nickname: string; flowDefinition: Record<string, any> }; formTitle: string }
  | { status: 'completed'; endNodeData: Record<string, any> }
  | { status: 'unavailable' }
  | { status: 'not_found' }

function PlayerComponent() {
  const { formId } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const [state, setState] = useState<ResolvedState>({ status: loaderData.unavailable ? 'unavailable' : 'loading' })

  useEffect(() => {
    // If the loader already determined unavailable, skip Phase 2
    if (loaderData.unavailable) return

    let cancelled = false

    async function resolve() {
      const visitorId = await getVisitorId()

      const params = new URLSearchParams(window.location.search)
      const nickname = params.get('v') || undefined

      const result = await resolveFacet({ data: { formId, visitorId, nickname } }) as ResolveFacetResult

      if (cancelled) return

      switch (result.type) {
        case 'resolved': {
          // One-time URL update
          const url = new URL(window.location.href)
          url.searchParams.set('v', result.facet.nickname)
          window.history.replaceState(null, '', url.toString())
          setState({
            status: 'resolved',
            facet: result.facet,
            formTitle: result.formTitle,
          })
          break
        }
        case 'completed':
          setState({ status: 'completed', endNodeData: result.endNodeData })
          break
        case 'redirect': {
          // Loader handles most redirects server-side (HTTP 301).
          // This client-side path is a fallback for edge cases.
          const url = new URL(window.location.href)
          url.searchParams.set('v', result.nickname)
          window.history.replaceState(null, '', url.toString())
          const retryResult = await resolveFacet({
            data: { formId, visitorId, nickname: result.nickname },
          }) as ResolveFacetResult
          if (cancelled) return
          if (retryResult.type === 'resolved') {
            setState({
              status: 'resolved',
              facet: retryResult.facet,
              formTitle: retryResult.formTitle,
            })
          } else if (retryResult.type === 'completed') {
            setState({ status: 'completed', endNodeData: retryResult.endNodeData })
          } else {
            setState({ status: 'unavailable' })
          }
          break
        }
        case 'unavailable':
          setState({ status: 'unavailable' })
          break
        case 'not_found':
          setState({ status: 'not_found' })
          break
      }
    }

    resolve()
    return () => { cancelled = true }
  }, [formId, loaderData.unavailable])

  if (state.status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F8F9FC]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#EA4C89] border-t-transparent" />
      </div>
    )
  }

  if (state.status === 'not_found') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F8F9FC] gap-3">
        <p className="text-6xl font-bold text-[#EA4C89]">404</p>
        <p className="text-lg text-gray-500">This form could not be found.</p>
      </div>
    )
  }

  if (state.status === 'unavailable') {
    return <FormUnavailable />
  }

  if (state.status === 'completed') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F8F9FC] gap-4">
        <p className="text-2xl font-semibold text-gray-800">Thank you!</p>
        <p className="text-gray-500">You have already completed this form.</p>
      </div>
    )
  }

  // status === 'resolved' — placeholder for full form renderer
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F8F9FC] gap-4">
      <p className="text-lg text-gray-500">
        Form loaded: <span className="font-medium text-gray-800">{state.formTitle}</span>
      </p>
      <p className="text-sm text-gray-400">
        Facet: {state.facet.nickname}
      </p>
    </div>
  )
}
