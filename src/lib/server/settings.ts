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

export const getLiteLLMSettings = createServerFn({ method: 'GET' })
  .handler(async () => {
    const userId = await getSessionUserId()
    const supabase = createAuthenticatedSupabaseClient(userId)

    const { data, error } = await supabase
      .from('user_profiles')
      .select('litellm_api_keys')
      .eq('id', userId)
      .single()

    if (error || !data) return { providers: [] as string[] }

    const keys = data.litellm_api_keys as Record<string, string> | null
    if (!keys || typeof keys !== 'object') return { providers: [] as string[] }

    return { providers: Object.keys(keys) }
  })
