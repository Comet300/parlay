import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '~/lib/auth/server'
import { createAuthenticatedSupabaseClient } from '~/lib/supabase/authenticated-client'
import { supabaseAdmin } from '~/lib/supabase/server'

const DEFAULT_START_CONTENT = `# Welcome

Thank you for taking the time to participate.

Tap **Continue** below to get started.`

const DEFAULT_END_CONTENT = `# Thank you!

Your responses have been recorded. You may now close this page.`

const DEFAULT_FLOW_DEFINITION = {
  nodes: [
    {
      id: 'start',
      type: 'start',
      position: { x: 0, y: 200 },
      data: { type: 'start', label: 'Start', markdownContent: DEFAULT_START_CONTENT },
      deletable: false,
    },
    {
      id: 'end',
      type: 'end',
      position: { x: 600, y: 200 },
      data: { type: 'end', label: 'End', markdownContent: DEFAULT_END_CONTENT },
      deletable: false,
    },
  ],
  edges: [
    {
      id: 'start->end',
      source: 'start',
      target: 'end',
      type: 'default',
    },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
}

const DEFAULT_COLOR_SCHEME = {
  primary: '#EA4C89',
  accent: '#C4307A',
  background: '#FFFFFF',
  theme: 'default',
}

async function getSessionUserId(): Promise<string> {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export const createForm = createServerFn({ method: 'POST' }).handler(
  async () => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    const { data: form, error: formError } = await supabase
      .from('forms')
      .insert({ user_id: userId, title: 'Untitled Form' })
      .select('id')
      .single()

    if (formError || !form) throw new Error(formError?.message ?? 'Failed to create form')

    const { data: facet, error: facetError } = await supabase
      .from('facets')
      .insert({
        form_id: form.id,
        nickname: 'default',
        is_default: true,
        status: 'draft',
        color_scheme: DEFAULT_COLOR_SCHEME,
        flow_definition: DEFAULT_FLOW_DEFINITION,
      })
      .select('id')
      .single()

    if (facetError || !facet) throw new Error(facetError?.message ?? 'Failed to create facet')

    return { facetId: facet.id }
  },
)

export const updateFormTitle = createServerFn({ method: 'POST' })
  .inputValidator((data: { formId: string; title: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    const { error } = await supabase
      .from('forms')
      .update({ title: data.title })
      .eq('id', data.formId)

    if (error) throw new Error(error.message)
  })

export const updateFormRoundRobin = createServerFn({ method: 'POST' })
  .inputValidator((data: { formId: string; enabled: boolean }) => data)
  .handler(async ({ data }) => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    const { error } = await supabase
      .from('forms')
      .update({ round_robin_enabled: data.enabled })
      .eq('id', data.formId)

    if (error) throw new Error(error.message)
  })

export const archiveForm = createServerFn({ method: 'POST' })
  .inputValidator((data: { formId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    const { error } = await supabase
      .from('facets')
      .update({ status: 'archived' })
      .eq('form_id', data.formId)
      .neq('status', 'archived')

    if (error) throw new Error(error.message)
  })

export const deleteForm = createServerFn({ method: 'POST' })
  .inputValidator((data: { formId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    // Fetch facet IDs for storage cleanup
    const { data: facets } = await supabase
      .from('facets')
      .select('id')
      .eq('form_id', data.formId)

    // Best-effort storage cleanup using service-role client
    if (facets) {
      for (const facet of facets) {
        const { data: files } = await supabaseAdmin.storage
          .from('markdown-uploads')
          .list(facet.id)
        if (files?.length) {
          await supabaseAdmin.storage
            .from('markdown-uploads')
            .remove(files.map((f) => `${facet.id}/${f.name}`))
        }
      }
    }

    // Delete form (CASCADE handles facets, submissions, etc.)
    const { error } = await supabase
      .from('forms')
      .delete()
      .eq('id', data.formId)

    if (error) throw new Error(error.message)
  })
