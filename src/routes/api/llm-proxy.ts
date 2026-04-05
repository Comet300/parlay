import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/llm-proxy')({
  server: {
    handlers: {
      POST: () => new Response('Not Implemented', { status: 501 }),
    },
  },
})
