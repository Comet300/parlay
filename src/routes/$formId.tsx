import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$formId')({
  component: PlayerComponent,
})

function PlayerComponent() {
  const { formId } = Route.useParams()
  return <div>Player: {formId}</div>
}
