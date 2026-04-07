import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '~/lib/auth/server'
import { createAuthenticatedSupabaseClient } from '~/lib/supabase/authenticated-client'
import { supabaseAdmin } from '~/lib/supabase/server'

const NICKNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function validateNickname(nickname: string) {
  if (!nickname || nickname.length > 60 || !NICKNAME_PATTERN.test(nickname)) {
    throw new Error(
      'Nickname must be 1-60 characters, lowercase alphanumeric with hyphens only',
    )
  }
}

async function getSessionUserId(): Promise<string> {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export const createFacet = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { sourceFacetId: string; nickname: string }) => data,
  )
  .handler(async ({ data }) => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    validateNickname(data.nickname)

    // Fetch source facet
    const { data: source, error: sourceError } = await supabase
      .from('facets')
      .select('form_id, flow_definition, color_scheme')
      .eq('id', data.sourceFacetId)
      .single()

    if (sourceError || !source) throw new Error('Source facet not found')

    // Check nickname uniqueness against non-archived siblings
    const { data: existing } = await supabase
      .from('facets')
      .select('id')
      .eq('form_id', source.form_id)
      .eq('nickname', data.nickname)
      .neq('status', 'archived')
      .limit(1)

    if (existing?.length) throw new Error('Nickname already in use by another facet')

    // Check nickname uniqueness against history
    const { data: history } = await supabase
      .from('facet_nickname_history')
      .select('id, facet_id')
      .eq('old_nickname', data.nickname)

    if (history?.length) {
      // Filter to only history entries for facets in the same form
      const { data: formFacets } = await supabase
        .from('facets')
        .select('id')
        .eq('form_id', source.form_id)

      const formFacetIds = new Set(formFacets?.map((f) => f.id) ?? [])
      const conflict = history.some((h) => formFacetIds.has(h.facet_id))
      if (conflict) throw new Error('Nickname was previously used in this form and is permanently reserved')
    }

    // Deep-copy source data into new facet
    const { data: facet, error: facetError } = await supabase
      .from('facets')
      .insert({
        form_id: source.form_id,
        nickname: data.nickname,
        is_default: false,
        status: 'draft',
        color_scheme: source.color_scheme,
        flow_definition: source.flow_definition,
      })
      .select('id')
      .single()

    if (facetError || !facet) throw new Error(facetError?.message ?? 'Failed to create facet')

    return { facetId: facet.id }
  })

export const renameFacet = createServerFn({ method: 'POST' })
  .inputValidator((data: { facetId: string; newNickname: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    validateNickname(data.newNickname)

    // Fetch current facet
    const { data: facet, error: facetError } = await supabase
      .from('facets')
      .select('form_id, nickname')
      .eq('id', data.facetId)
      .single()

    if (facetError || !facet) throw new Error('Facet not found')

    if (facet.nickname === data.newNickname) return

    // Check new nickname not taken by non-archived sibling
    const { data: existing } = await supabase
      .from('facets')
      .select('id, nickname')
      .eq('form_id', facet.form_id)
      .eq('nickname', data.newNickname)
      .neq('status', 'archived')
      .limit(1)

    if (existing?.length) {
      throw new Error(
        `Nickname "${data.newNickname}" is already in use. Rename the other facet first.`,
      )
    }

    // Check new nickname not in history for this form
    const { data: formFacets } = await supabase
      .from('facets')
      .select('id')
      .eq('form_id', facet.form_id)

    const formFacetIds = formFacets?.map((f) => f.id) ?? []

    if (formFacetIds.length) {
      const { data: history } = await supabase
        .from('facet_nickname_history')
        .select('id')
        .eq('old_nickname', data.newNickname)
        .in('facet_id', formFacetIds)
        .limit(1)

      if (history?.length) {
        throw new Error('Nickname was previously used in this form and is permanently reserved')
      }
    }

    // Insert old nickname into history
    const { error: historyError } = await supabase
      .from('facet_nickname_history')
      .insert({ facet_id: data.facetId, old_nickname: facet.nickname })

    if (historyError) throw new Error(historyError.message)

    // Update nickname
    const { error: updateError } = await supabase
      .from('facets')
      .update({ nickname: data.newNickname })
      .eq('id', data.facetId)

    if (updateError) throw new Error(updateError.message)
  })

export const deleteFacet = createServerFn({ method: 'POST' })
  .inputValidator((data: { facetId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    // Fetch facet info
    const { data: facet, error: facetError } = await supabase
      .from('facets')
      .select('form_id, is_default')
      .eq('id', data.facetId)
      .single()

    if (facetError || !facet) throw new Error('Facet not found')

    // Count siblings
    const { count } = await supabase
      .from('facets')
      .select('id', { count: 'exact', head: true })
      .eq('form_id', facet.form_id)

    // Best-effort storage cleanup
    const { data: files } = await supabaseAdmin.storage
      .from('markdown-uploads')
      .list(data.facetId)
    if (files?.length) {
      await supabaseAdmin.storage
        .from('markdown-uploads')
        .remove(files.map((f) => `${data.facetId}/${f.name}`))
    }

    // If last facet, delete the entire form
    if (count === 1) {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', facet.form_id)
      if (error) throw new Error(error.message)
      return { formDeleted: true }
    }

    // Delete the facet
    const { error: deleteError } = await supabase
      .from('facets')
      .delete()
      .eq('id', data.facetId)

    if (deleteError) throw new Error(deleteError.message)

    // Auto-promote oldest remaining facet if this was the default
    if (facet.is_default) {
      const { data: oldest } = await supabase
        .from('facets')
        .select('id')
        .eq('form_id', facet.form_id)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(1)
        .single()

      if (oldest) {
        await supabase
          .from('facets')
          .update({ is_default: true })
          .eq('id', oldest.id)
      }
    }

    return { formDeleted: false }
  })

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['draft', 'archived'],
  archived: ['active'],
}

export const updateFacetStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: { facetId: string; newStatus: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    const { data: facet, error: facetError } = await supabase
      .from('facets')
      .select('status, flow_definition, form_id')
      .eq('id', data.facetId)
      .single()

    if (facetError || !facet) throw new Error('Facet not found')

    const allowed = VALID_TRANSITIONS[facet.status]
    if (!allowed?.includes(data.newStatus)) {
      throw new Error(`Cannot transition from ${facet.status} to ${data.newStatus}`)
    }

    // Publish validation: draft → active
    if (facet.status === 'draft' && data.newStatus === 'active') {
      const errors = await validateForPublish(facet.flow_definition, facet.form_id, supabase)
      if (errors.length > 0) {
        const structured = { type: 'publish_validation', errors }
        throw new Error(JSON.stringify(structured))
      }
    }

    const { error } = await supabase
      .from('facets')
      .update({ status: data.newStatus })
      .eq('id', data.facetId)

    if (error) throw new Error(error.message)
  })

async function validateForPublish(
  flowDef: unknown,
  formId: string,
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
): Promise<string[]> {
  const errors: string[] = []

  if (!flowDef || typeof flowDef !== 'object') {
    errors.push('No flow definition found')
    return errors
  }

  const fd = flowDef as { nodes?: unknown[]; edges?: unknown[] }
  const nodes = (fd.nodes ?? []) as Array<{
    id: string
    data: { type: string; slug?: string; buttons?: { id: string }[]; provider?: string; label?: string }
  }>
  const edges = (fd.edges ?? []) as Array<{ source: string; sourceHandle?: string }>

  const pageTierTypes = new Set(['start', 'page', 'page_group', 'scripted_llm', 'real_llm'])

  // Dead path check
  const outgoing = new Map<string, Set<string | undefined>>()
  for (const edge of edges) {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, new Set())
    outgoing.get(edge.source)!.add(edge.sourceHandle)
  }

  for (const node of nodes) {
    if (pageTierTypes.has(node.data.type) && node.data.type !== 'end') {
      if (!outgoing.has(node.id)) {
        errors.push(`Node "${node.data.label ?? node.id}" has no outgoing edge`)
      }
    }
    if (node.data.type === 'card' && node.data.buttons) {
      for (const btn of node.data.buttons) {
        const handles = outgoing.get(node.id)
        if (!handles || !handles.has(`button-${btn.id}`)) {
          errors.push(`Card "${node.data.label ?? node.id}" has a button with no outgoing edge`)
        }
      }
    }
  }

  // Slug uniqueness check
  const slugMap = new Map<string, string[]>()
  for (const node of nodes) {
    if (node.data.slug) {
      if (!slugMap.has(node.data.slug)) slugMap.set(node.data.slug, [])
      slugMap.get(node.data.slug)!.push(node.id)
    }
  }
  slugMap.forEach((nodeIds, slug) => {
    if (nodeIds.length > 1) errors.push(`Duplicate slug "${slug}"`)
  })

  // LLM provider check
  const llmNodes = nodes.filter((n) => n.data.type === 'real_llm' && n.data.provider)
  if (llmNodes.length > 0) {
    const { data: form } = await supabase
      .from('forms')
      .select('user_id')
      .eq('id', formId)
      .single()

    if (form?.user_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('litellm_api_keys')
        .eq('id', form.user_id)
        .single()

      const keys = profile?.litellm_api_keys as Record<string, string> | null
      const providers = keys ? Object.keys(keys) : []

      for (const node of llmNodes) {
        if (!providers.includes(node.data.provider!)) {
          errors.push(
            `LLM node "${node.data.label ?? node.id}" references unconfigured provider "${node.data.provider}"`,
          )
        }
      }
    }
  }

  return errors
}

export const setDefaultFacet = createServerFn({ method: 'POST' })
  .inputValidator((data: { formId: string; facetId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    // Verify ownership via RLS before calling the SECURITY DEFINER function
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id')
      .eq('id', data.formId)
      .single()

    if (formError || !form) throw new Error('Form not found')

    // Atomic two-step via Postgres function
    const { error } = await supabaseAdmin.rpc('set_default_facet', {
      p_form_id: data.formId,
      p_facet_id: data.facetId,
    })

    if (error) throw new Error(error.message)
  })

export const saveFacetData = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      facetId: string
      flowDefinition?: unknown
      colorScheme?: unknown
    }) => data,
  )
  .handler(async ({ data }) => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    const updates: Record<string, unknown> = {}
    if (data.flowDefinition !== undefined) updates.flow_definition = data.flowDefinition
    if (data.colorScheme !== undefined) updates.color_scheme = data.colorScheme

    if (Object.keys(updates).length === 0) return

    const { error } = await supabase
      .from('facets')
      .update(updates)
      .eq('id', data.facetId)

    if (error) throw new Error(error.message)
  })
