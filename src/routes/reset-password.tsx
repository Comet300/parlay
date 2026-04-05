import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordComponent,
})

function ResetPasswordComponent() {
  return <div>Reset Password</div>
}
