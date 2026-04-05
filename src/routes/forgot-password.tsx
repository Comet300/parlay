import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AuthLayout } from '~/components/auth/auth-layout'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { authClient } from '~/lib/auth/client'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: resetError } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    })

    if (resetError) {
      if (resetError.status === 429 || resetError.code === 'TOO_MANY_REQUESTS') {
        setError('Too many attempts, please try again later.')
      } else {
        // Show success even on error to prevent email enumeration
        setSent(true)
      }
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email">
        <p className="text-center text-sm text-text-muted">
          If an account exists for <strong>{email}</strong>, we've sent a
          password reset link. Check your inbox.
        </p>
        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-primary hover:text-accent">
            Back to login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset your password">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <p className="mb-4 text-center text-sm text-text-muted">
        Enter your email and we'll send you a link to reset your password.
      </p>

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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm text-primary hover:text-accent">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  )
}
