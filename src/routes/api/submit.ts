import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/submit')({
  server: {
    handlers: {
      POST: () => new Response('Not Implemented', { status: 501 }),
    },
  },
})
