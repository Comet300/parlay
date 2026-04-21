import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { Pool } from 'pg'
import { Resend } from 'resend'
import { verificationEmail, resetPasswordEmail } from '~/lib/email/templates'

const resend = new Resend(process.env.RESEND_API_KEY)

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  baseURL: process.env.APP_BASE_URL,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const { subject, html } = resetPasswordEmail(user.name ?? null, url)
      await resend.emails.send({
        from: 'Parlay <noreply@parlay.example.com>',
        to: user.email,
        subject,
        html,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { subject, html } = verificationEmail(user.name ?? null, url)
      await resend.emails.send({
        from: 'Parlay <noreply@parlay.example.com>',
        to: user.email,
        subject,
        html,
      })
    },
  },
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
  rateLimit: {
    storage: 'database',
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-up/email': { window: 60, max: 10 },
      '/forget-password/*': { window: 60, max: 3 },
    },
  },
  plugins: [tanstackStartCookies()],
})
