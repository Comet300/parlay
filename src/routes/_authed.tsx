import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '~/components/layout/app-shell'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '~/lib/auth/server'
import { getRequest } from '@tanstack/react-start/server'

const getAuthenticatedUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })
    return session?.user ?? null
  },
)

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    const user = await getAuthenticatedUser()

    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }

    return { user }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
