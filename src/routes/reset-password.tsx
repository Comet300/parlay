import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthLayout } from '~/components/auth/auth-layout'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { authClient } from '~/lib/auth/client'

const searchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
})

export const Route = createFileRoute('/reset-password')({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token, error: urlError } = Route.useSearch()
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(
    urlError === 'INVALID_TOKEN' ? 'This reset link is invalid or expired.' : '',
  )
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <AuthLayout title="Invalid link">
        <p className="text-center text-sm text-text-muted">
          This password reset link is invalid or has expired.
        </p>
        <div className="mt-6 text-center">
          <Link to="/forgot-password" className="text-sm text-primary hover:text-accent">
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error: resetError } = await authClient.resetPassword({
      newPassword,
      token: token!,
    })

    if (resetError) {
      if (resetError.code === 'INVALID_TOKEN') {
        setError('This reset link is invalid or expired.')
      } else {
        setError(resetError.message || 'Something went wrong. Please try again.')
      }
      setLoading(false)
      return
    }

    navigate({
      to: '/login',
      search: { message: 'Password reset successfully. You can now log in.' },
    })
  }

  return (
    <AuthLayout title="Set new password">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-text">
            New password
          </label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-text">
            Confirm new password
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
          {loading ? 'Resetting...' : 'Reset password'}
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
