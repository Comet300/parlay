import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from './server'
import { createAuthenticatedSupabaseClient } from '~/lib/supabase/authenticated-client'

export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      throw new Response('Unauthorized', { status: 401 })
    }

    const supabase = createAuthenticatedSupabaseClient(session.user.id)

    return next({
      context: {
        user: session.user,
        supabase,
      },
    })
  },
)
