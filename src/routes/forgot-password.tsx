import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordComponent,
})

function ForgotPasswordComponent() {
  return <div>Forgot Password</div>
}
