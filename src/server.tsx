import {
  createStartHandler,
  getResponseStatus,
} from '@tanstack/react-start/server'
import {
  defineHandlerCallback,
  renderRouterToStream,
} from '@tanstack/react-router/ssr/server'
import { StartServer } from '@tanstack/react-start-server'

/**
 * Custom stream handler that propagates h3 event status codes to the SSR response.
 *
 * TanStack Router only sets the response status for redirects (3xx), notFound (404),
 * and errors (500). Any custom status code set via setResponseStatus() in a loader
 * (e.g. 410 Gone) is ignored because renderRouterToStream hard-codes the status from
 * router.stores.statusCode.state.
 *
 * This handler reads the h3 event status after rendering and, if a loader set a
 * non-200 code that the router didn't pick up, re-wraps the Response with that code.
 */
const customStreamHandler = defineHandlerCallback(
  async ({ request, router, responseHeaders }) => {
    const response = await renderRouterToStream({
      request,
      router,
      responseHeaders,
      children: <StartServer router={router} />,
    })

    const eventStatus = getResponseStatus()
    if (eventStatus !== 200 && response.status === 200) {
      return new Response(response.body, {
        status: eventStatus,
        headers: response.headers,
      })
    }

    return response
  },
)

export default {
  fetch: createStartHandler(customStreamHandler),
}
