import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/build/$facetId')({
  component: BuilderComponent,
})

function BuilderComponent() {
  const { facetId } = Route.useParams()
  return <div>Builder: {facetId}</div>
}
