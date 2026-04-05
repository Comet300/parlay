import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthLayout } from '~/components/auth/auth-layout'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { authClient } from '~/lib/auth/client'
import { getGoogleOAuthEnabled } from '~/lib/auth/google-oauth'

const searchSchema = z.object({
  redirect: z.string().optional(),
  message: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  loader: () => getGoogleOAuthEnabled(),
  component: LoginPage,
})

function mapError(error: { code?: string; status?: number; message?: string }) {
  if (error.status === 429 || error.code === 'TOO_MANY_REQUESTS')
    return 'Too many attempts, please try again later.'
  if (error.code === 'INVALID_EMAIL_OR_PASSWORD')
    return 'Invalid email or password.'
  return error.message || 'Something went wrong. Please try again.'
}

function LoginPage() {
  const googleOAuthEnabled = Route.useLoaderData()
  const { redirect: redirectTo, message } = Route.useSearch()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    })

    if (signInError) {
      setError(mapError(signInError))
      setLoading(false)
      return
    }

    navigate({ to: redirectTo || '/dashboard' })
  }

  async function handleGoogleSignIn() {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: redirectTo || '/dashboard',
    })
  }

  return (
    <AuthLayout title="Log in to Parlay">
      {message && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-text">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-text">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </Button>
      </form>

      {googleOAuthEnabled && (
        <>
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={handleGoogleSignIn}
          >
            Sign in with Google
          </Button>
        </>
      )}

      <div className="mt-4 space-y-2 text-center text-sm">
        <div>
          <Link to="/forgot-password" className="text-primary hover:text-accent">
            Forgot password?
          </Link>
        </div>
        <div className="text-text-muted">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary hover:text-accent">
            Sign up
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
