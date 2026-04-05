import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/export/zip/$formId')({
  server: {
    handlers: {
      GET: () => new Response('Not Implemented', { status: 501 }),
    },
  },
})
