import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/signup')({
  component: SignupComponent,
})

function SignupComponent() {
  return <div>Sign Up</div>
}
