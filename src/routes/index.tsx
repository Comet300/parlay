import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  return (
    <div>
      <h1>Parlay</h1>
      <p>Visual interview &amp; survey flow builder</p>
    </div>
  )
}
