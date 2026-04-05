import { createServerFn } from '@tanstack/react-start'

export const getGoogleOAuthEnabled = createServerFn({ method: 'GET' }).handler(
  async () => {
    return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
  },
)
