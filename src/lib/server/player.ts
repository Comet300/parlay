import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '~/lib/supabase/server'

type ResolveFacetResult =
  | { type: 'resolved'; facet: { id: string; nickname: string; flowDefinition: Record<string, any> }; formTitle: string }
  | { type: 'completed'; endNodeData: Record<string, any> }
  | { type: 'unavailable' }
  | { type: 'redirect'; nickname: string }
  | { type: 'not_found' }

export type { ResolveFacetResult }

function stripSensitiveFields(flowDefinition: any): Record<string, any> {
  if (!flowDefinition?.nodes) return flowDefinition
  return {
    ...flowDefinition,
    nodes: flowDefinition.nodes.map((node: any) => {
      if (node.type !== 'real_llm') return node
      const data = { ...(node.data ?? {}) }
      delete data.setup_prompt
      delete data.ending_condition
      return { ...node, data }
    }),
  }
}

/**
 * Visitor-independent pre-resolution check, called from the route loader.
 * Returns early results (not_found, unavailable, redirect) that can be
 * mapped to proper HTTP status codes (404, 410, 301) server-side.
 * Returns { type: 'continue' } when Phase 2 (visitor-dependent) is needed.
 */
export type PreResolveResult =
  | { type: 'continue'; formTitle: string }
  | { type: 'unavailable' }
  | { type: 'not_found' }
  | { type: 'redirect'; nickname: string }

export const preResolve = createServerFn({ method: 'GET' })
  .inputValidator((data: { formId: string; nickname?: string }) => data)
  .handler(async ({ data }): Promise<PreResolveResult> => {
    const { formId, nickname } = data

    // 0. Form existence guard
    const { data: form, error: formError } = await supabaseAdmin
      .from('forms')
      .select('id, title, round_robin_enabled')
      .eq('id', formId)
      .single()

    if (formError || !form) return { type: 'not_found' }

    // 1. If ?v= nickname provided — check facet status (visitor-independent)
    if (nickname) {
      const { data: facet } = await supabaseAdmin
        .from('facets')
        .select('id, status')
        .eq('form_id', formId)
        .eq('nickname', nickname)
        .single()

      if (facet) {
        if (facet.status === 'active') return { type: 'continue', formTitle: form.title }
        if (facet.status === 'archived') return { type: 'unavailable' }
        // Draft — fall through to nickname history
      }

      // Nickname history check
      const { data: history } = await supabaseAdmin
        .from('facet_nickname_history')
        .select('facet_id, facets!inner(nickname, status, form_id)')
        .eq('old_nickname', nickname)
        .eq('facets.form_id', formId)

      const match = history?.find((h: any) => {
        const f = h.facets as any
        return f && f.status === 'active'
      })

      if (match) {
        const facetRow = match.facets as any
        return { type: 'redirect', nickname: facetRow.nickname }
      }

      return { type: 'not_found' }
    }

    // 2. No ?v= — check if resolution is even possible (visitor-independent)
    if (!form.round_robin_enabled) {
      const { data: defaultFacet } = await supabaseAdmin
        .from('facets')
        .select('id')
        .eq('form_id', formId)
        .eq('is_default', true)
        .eq('status', 'active')
        .single()

      if (!defaultFacet) return { type: 'unavailable' }
    } else {
      const { count } = await supabaseAdmin
        .from('facets')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', formId)
        .eq('status', 'active')

      if (!count) return { type: 'unavailable' }
    }

    return { type: 'continue', formTitle: form.title }
  })

export const resolveFacet = createServerFn({ method: 'POST' })
  .inputValidator((data: { formId: string; visitorId: string; nickname?: string }) => data)
  .handler(async ({ data }): Promise<ResolveFacetResult> => {
    const { formId, visitorId, nickname } = data

    // 0. Form existence guard
    const { data: form, error: formError } = await supabaseAdmin
      .from('forms')
      .select('id, title, round_robin_enabled')
      .eq('id', formId)
      .single()

    if (formError || !form) return { type: 'not_found' }

    let resolvedFacet: { id: string; nickname: string; flow_definition: any } | null = null

    // 1. If ?v= nickname provided
    if (nickname) {
      // Look up facet with that nickname (any status)
      const { data: facet } = await supabaseAdmin
        .from('facets')
        .select('id, nickname, status, flow_definition')
        .eq('form_id', formId)
        .eq('nickname', nickname)
        .single()

      if (facet) {
        if (facet.status === 'active') {
          resolvedFacet = facet
        } else if (facet.status === 'archived') {
          return { type: 'unavailable' }
        } else {
          // Draft — treat as non-existent, fall through to nickname history
        }
      }

      if (!resolvedFacet) {
        // Check facet_nickname_history for a redirect (scoped to current form)
        const { data: history } = await supabaseAdmin
          .from('facet_nickname_history')
          .select('facet_id, facets!inner(nickname, status, form_id)')
          .eq('old_nickname', nickname)
          .eq('facets.form_id', formId)

        const match = history?.find((h: any) => {
          const f = h.facets as any
          return f && f.status === 'active'
        })

        if (match) {
          const facetRow = match.facets as any
          return { type: 'redirect', nickname: facetRow.nickname }
        }

        return { type: 'not_found' }
      }
    }

    // 2. No ?v= param (or draft facet fell through)
    if (!resolvedFacet) {
      // 2a. Check round_robin_log for existing assignment
      const { data: logEntry } = await supabaseAdmin
        .from('round_robin_log')
        .select('facet_id, facets(id, nickname, status, flow_definition)')
        .eq('form_id', formId)
        .eq('visitor_id', visitorId)
        .single()

      if (logEntry) {
        const assignedFacet = logEntry.facets as any
        if (assignedFacet?.status === 'active') {
          resolvedFacet = assignedFacet
        } else {
          return { type: 'unavailable' }
        }
      }
    }

    // 2c. No existing assignment — resolve via round-robin or default
    if (!resolvedFacet) {
      if (!form.round_robin_enabled) {
        // Default facet path
        const { data: defaultFacet } = await supabaseAdmin
          .from('facets')
          .select('id, nickname, flow_definition')
          .eq('form_id', formId)
          .eq('is_default', true)
          .eq('status', 'active')
          .single()

        if (!defaultFacet) return { type: 'unavailable' }
        resolvedFacet = defaultFacet
      } else {
        // Round-robin path
        const { data: activeFacets } = await supabaseAdmin
          .from('facets')
          .select('id, nickname, flow_definition')
          .eq('form_id', formId)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })

        if (!activeFacets?.length) return { type: 'unavailable' }

        let assigned: typeof activeFacets[0]

        if (activeFacets.length === 1) {
          // Single active facet — assign directly without incrementing counter
          assigned = activeFacets[0]
        } else {
          // N>1 — call increment_round_robin
          const { data: index, error: rpcError } = await supabaseAdmin
            .rpc('increment_round_robin', { p_form_id: formId })

          if (rpcError || index === null || index === undefined) {
            return { type: 'unavailable' }
          }

          assigned = activeFacets[index % activeFacets.length]
        }

        // Log the assignment (ON CONFLICT DO NOTHING for idempotency)
        await supabaseAdmin
          .from('round_robin_log')
          .upsert(
            {
              form_id: formId,
              facet_id: assigned.id,
              facet_nickname: assigned.nickname,
              visitor_id: visitorId,
            },
            { onConflict: 'visitor_id,form_id', ignoreDuplicates: true },
          )

        // Re-read in case of conflict (another request assigned first)
        const { data: existingLog } = await supabaseAdmin
          .from('round_robin_log')
          .select('facet_id, facets(id, nickname, status, flow_definition)')
          .eq('form_id', formId)
          .eq('visitor_id', visitorId)
          .single()

        if (existingLog) {
          const loggedFacet = existingLog.facets as any
          if (loggedFacet?.status === 'active') {
            resolvedFacet = loggedFacet
          } else {
            return { type: 'unavailable' }
          }
        } else {
          resolvedFacet = assigned
        }
      }
    }

    if (!resolvedFacet) return { type: 'unavailable' }

    // Once-per-visitor check
    const { data: completedSubmission } = await supabaseAdmin
      .from('submissions')
      .select('id')
      .eq('visitor_id', visitorId)
      .eq('facet_id', resolvedFacet.id)
      .eq('is_complete', true)
      .limit(1)
      .single()

    if (completedSubmission) {
      // Find the End node data from flow_definition
      const endNode = resolvedFacet.flow_definition?.nodes?.find(
        (n: any) => n.type === 'end',
      )
      return { type: 'completed', endNodeData: (endNode?.data ?? {}) as Record<string, any> }
    }

    return {
      type: 'resolved',
      facet: {
        id: resolvedFacet.id,
        nickname: resolvedFacet.nickname,
        flowDefinition: stripSensitiveFields(resolvedFacet.flow_definition),
      },
      formTitle: form.title,
    }
  })
