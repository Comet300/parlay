import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '~/lib/auth/server'
import { createAuthenticatedSupabaseClient } from '~/lib/supabase/authenticated-client'

async function getSessionUserId(): Promise<string> {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export type SortOption = 'updated_at' | 'created_at_desc' | 'created_at_asc' | 'title'

export const loadDashboardForms = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      page?: number
      pageSize?: number
      search?: string
      sort?: SortOption
    }) => data,
  )
  .handler(async ({ data }) => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    const page = data.page ?? 1
    const pageSize = data.pageSize ?? 12
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('forms')
      .select('*, facets(*)', { count: 'exact' })

    if (data.search) {
      query = query.ilike('title', `%${data.search}%`)
    }

    switch (data.sort) {
      case 'created_at_desc':
        query = query.order('created_at', { ascending: false })
        break
      case 'created_at_asc':
        query = query.order('created_at', { ascending: true })
        break
      case 'title':
        query = query.order('title', { ascending: true })
        break
      default:
        query = query.order('updated_at', { ascending: false })
        break
    }

    query = query.range(offset, offset + pageSize - 1)

    const { data: forms, error, count } = await query

    if (error) throw new Error(error.message)

    return {
      forms: forms ?? [],
      total: count ?? 0,
      page,
      pageSize,
    }
  })

export const loadBuilderFacet = createServerFn({ method: 'GET' })
  .inputValidator((data: { facetId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    // Fetch the facet with its parent form
    const { data: facet, error: facetError } = await supabase
      .from('facets')
      .select('*, forms(id, title, round_robin_enabled)')
      .eq('id', data.facetId)
      .single()

    if (facetError || !facet) throw new Error('Facet not found')

    // Fetch sibling facets
    const form = facet.forms as unknown as {
      id: string
      title: string
      round_robin_enabled: boolean
    }

    const { data: siblings, error: siblingsError } = await supabase
      .from('facets')
      .select('id, nickname, is_default, status')
      .eq('form_id', form.id)
      .order('created_at', { ascending: true })

    if (siblingsError) throw new Error(siblingsError.message)

    return {
      facet: {
        id: facet.id,
        formId: form.id,
        nickname: facet.nickname,
        isDefault: facet.is_default,
        status: facet.status,
        colorScheme: facet.color_scheme,
        flowDefinition: facet.flow_definition,
      },
      form: {
        id: form.id,
        title: form.title,
        roundRobinEnabled: form.round_robin_enabled,
      },
      siblings: (siblings ?? []).map((s) => ({
        id: s.id,
        nickname: s.nickname,
        isDefault: s.is_default,
        status: s.status,
      })),
    }
  })
