import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

export function createAuthenticatedSupabaseClient(betterAuthUserId: string) {
  const token = jwt.sign(
    { sub: betterAuthUserId, role: 'authenticated' },
    process.env.SUPABASE_JWT_SECRET!,
    { expiresIn: '1h' },
  )

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { accessToken: async () => token },
  )
}
