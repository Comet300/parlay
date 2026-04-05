import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsComponent,
})

function SettingsComponent() {
  return <div>Settings</div>
}
