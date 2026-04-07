# deployment Specification

## Purpose
Define the Vercel deployment configuration, environment variable management,
and production build pipeline for Parlay.

## Requirements

### Requirement: Vercel configuration
The project SHALL include a `vercel.json` at the repository root with per-route `maxDuration` settings:
- `/api/llm-proxy`: 60 seconds (streaming LLM responses)
- `/api/submit`: 30 seconds
- `/api/export/*`: 30 seconds
- Default: 10 seconds

#### Scenario: LLM proxy gets extended timeout
- **WHEN** a request hits `/api/llm-proxy` on Vercel
- **THEN** the function is allowed up to 60 seconds before timing out

#### Scenario: Default routes use standard timeout
- **WHEN** a request hits any route not explicitly configured
- **THEN** the function times out after 10 seconds

### Requirement: Vercel build configuration
The `vercel.json` SHALL configure the build command as `npm run build` and the output directory as per TanStack Start's Vercel adapter output. The framework preset SHALL be set if required by TanStack Start's Vercel deployment guide.

#### Scenario: Vercel build succeeds
- **WHEN** Vercel runs the build step
- **THEN** `npm run build` produces the expected output without errors

### Requirement: Environment variables in Vercel
The project's `.env.example` SHALL serve as the reference for which environment variables must be configured in the Vercel project settings. All server-only variables (DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, BETTER_AUTH_SECRET, RESEND_API_KEY) SHALL NOT be prefixed with `VITE_` or otherwise exposed to the client bundle.

#### Scenario: Secrets not leaked to client
- **WHEN** the production build is inspected
- **THEN** server-only environment variables do not appear in any client-side JavaScript bundle

### Requirement: Custom SSR stream handler
The project SHALL include a custom server entry point (`src/server.tsx`)
that wraps TanStack Start's default stream handler. This is required because
TanStack Router only propagates status codes for redirects (3xx), notFound
(404), and errors (500). Custom status codes set via `setResponseStatus()`
in route loaders (e.g. 410 Gone for unavailable forms) are ignored by the
default handler.

The custom handler SHALL:
1. Render the router to a stream using `renderRouterToStream`
2. Read the h3 event status via `getResponseStatus()` after rendering
3. If the event status is non-200 and the response status is 200, re-wrap
   the Response with the correct status code
4. Otherwise, return the response unchanged

#### Scenario: Loader sets 410 Gone
- GIVEN a route loader calls `setResponseStatus(410)` for an unavailable form
- WHEN the SSR handler renders the response
- THEN the HTTP response has status 410 (not 200)

### Requirement: Production build script
The `package.json` SHALL include a `build` script that produces a production-ready Vercel deployment. The `start` script SHALL be configured for local production testing if supported by TanStack Start.

#### Scenario: Build produces deployable output
- **WHEN** the developer runs `npm run build`
- **THEN** the build completes without errors
- **AND** produces output compatible with Vercel's serverless functions
