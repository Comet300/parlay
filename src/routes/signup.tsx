import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AuthLayout } from '~/components/auth/auth-layout'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { authClient } from '~/lib/auth/client'
import { getGoogleOAuthEnabled } from '~/lib/auth/google-oauth'

export const Route = createFileRoute('/signup')({
  loader: () => getGoogleOAuthEnabled(),
  component: SignupPage,
})

function mapError(error: { code?: string; status?: number; message?: string }) {
  if (error.status === 429 || error.code === 'TOO_MANY_REQUESTS')
    return 'Too many attempts, please try again later.'
  if (error.code === 'USER_ALREADY_EXISTS')
    return 'An account with this email already exists.'
  return error.message || 'Something went wrong. Please try again.'
}

function SignupPage() {
  const googleOAuthEnabled = Route.useLoaderData()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name: email.split('@')[0],
    })

    if (signUpError) {
      setError(mapError(signUpError))
      setLoading(false)
      return
    }

    navigate({ to: '/dashboard' })
  }

  async function handleGoogleSignUp() {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/dashboard',
    })
  }

  return (
    <AuthLayout title="Create your account">
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
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-text">
            Confirm password
          </label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign up'}
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
            onClick={handleGoogleSignUp}
          >
            Sign up with Google
          </Button>
        </>
      )}

      <div className="mt-4 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:text-accent">
          Log in
        </Link>
      </div>
    </AuthLayout>
  )
}
