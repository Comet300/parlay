import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { X } from 'lucide-react'

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardComponent,
})

function DashboardComponent() {
  const { user } = Route.useRouteContext()
  const [bannerDismissed, setBannerDismissed] = useState(false)

  return (
    <div>
      {!user.emailVerified && !bannerDismissed && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-800">
            Please verify your email address. Check your inbox for a verification link.
          </p>
          <button
            onClick={() => setBannerDismissed(true)}
            className="ml-3 shrink-0 rounded p-1 text-amber-600 hover:text-amber-800"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <h1 className="text-2xl font-bold text-text">Dashboard</h1>
      <p className="mt-1 text-text-muted">Welcome, {user.email}</p>
    </div>
  )
}
