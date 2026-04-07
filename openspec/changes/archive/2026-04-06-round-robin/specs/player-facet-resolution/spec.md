## ADDED Requirements

### Requirement: Resolve facet server action interface
The system SHALL expose a `resolveFacet` server function via `createServerFn`
at `src/lib/server/player.ts` with the following interface:

Input: `{ formId: string, visitorId: string, nickname?: string }`
(`nickname` is the `?v=` query param value if present on the client URL)

Output: one of:
- `{ type: 'resolved', facet: { id, nickname, flowDefinition }, formTitle: string }`
- `{ type: 'completed', endNodeData: object }` (visitor already submitted)
- `{ type: 'unavailable' }` (no active facets / archived assignment)
- `{ type: 'redirect', nickname: string }` (facet_nickname_history 301)
- `{ type: 'not_found' }` (form does not exist or nickname completely unrecognized)

The server function SHALL use `supabaseAdmin` (service role key) for all
queries. It SHALL NOT require an authenticated session — the form player
is public.

The server function SHALL implement the full decision tree from the
player-facet-resolution main spec within a single function call to
minimize round trips.

### Requirement: Form existence guard
The decision tree SHALL begin with a form existence check before any
resolution logic:

```
0. Look up form by formId. If not found → return { type: 'not_found' }
```

This prevents undefined behavior when a valid UUID does not match any
form in the database — without this guard, subsequent queries
(round_robin_log, facets, round_robin_enabled) would return empty
results and fall through unpredictably.

#### Scenario: Valid UUID, non-existent form
- **WHEN** resolveFacet is called with a valid UUID that matches no form
- **THEN** the server returns type 'not_found'
- **THEN** the player renders a 404 page

#### Scenario: Resolved facet returned
- **WHEN** a new visitor calls resolveFacet with a valid formId
- **THEN** the server returns type 'resolved' with sanitized flowDefinition
  (setup_prompt and ending_condition stripped from real_llm nodes)

#### Scenario: Already submitted visitor
- **WHEN** a visitor who completed the form calls resolveFacet
- **THEN** the server returns type 'completed' with the End node data

#### Scenario: No active facets
- **WHEN** resolveFacet is called for a form with all archived facets
- **THEN** the server returns type 'unavailable'

### Requirement: Archived facet check on direct nickname access
The resolution decision tree step 1 (when ?v= is present) SHALL include
an explicit check for archived facets between the active-facet lookup and
the nickname_history fallback:

```
1. If ?v= query param is present:
   a. Look up facet with that nickname in this form (any status).
   b. If found AND status = 'active' -> serve that facet.
   c. If found AND status = 'archived' -> return { type: 'unavailable' }
   d. If not found OR status = 'draft' -> check facet_nickname_history for a 301 redirect:
      - If history match found -> return { type: 'redirect', nickname }
      - If not found -> return { type: 'not_found' }
```

Draft facets are not published and SHALL NOT be accessible to respondents.
A draft facet matched by nickname is treated as if it does not exist.

This corrects the base spec's decision tree which only looks up "active"
facets at step 1.a, causing archived-nickname access to fall through to
nickname_history (no match) and then 404 — instead of the required
FormUnavailable (HTTP 410) per the form-unavailable spec.

#### Scenario: Archived facet accessed via ?v=
- **WHEN** a respondent visits /:formId?v=pilot and facet "pilot" is archived
- **THEN** step 1.a finds the facet but it is archived
- **THEN** step 1.c returns type 'unavailable'
- **THEN** the player renders FormUnavailable with HTTP 410

### Requirement: Pre-resolve server function for HTTP status codes
The system SHALL expose a `preResolve` GET server function via `createServerFn`
at `src/lib/server/player.ts` with the following interface:

Input: `{ formId: string, nickname?: string }`

Output: one of:
- `{ type: 'continue', formTitle: string }` (Phase 2 resolution needed)
- `{ type: 'unavailable' }` (archived facet or no active facets)
- `{ type: 'not_found' }` (form does not exist or nickname unrecognized)
- `{ type: 'redirect', nickname: string }` (facet_nickname_history 301)

This function performs visitor-independent checks from the route loader,
enabling proper HTTP status codes on the initial page response. It runs
the same decision tree steps that do not require a visitor_id:
- Step 0: form existence guard
- Step 1 (when ?v= present): facet status check (active → continue,
  archived → unavailable, draft/not found → nickname history)
- Step 2 (no ?v=): verify resolution is possible (active default or
  active facets exist)

The `/$formId` route loader SHALL call `preResolve` and map results to
HTTP status codes:
- `not_found` → `throw notFound()` (HTTP 404)
- `redirect` → `throw redirect({ statusCode: 301 })` (HTTP 301)
- `unavailable` → `setResponseStatus(410)` from `vinxi/http` (HTTP 410)
- `continue` → proceed to Phase 2 (client-side `resolveFacet`)

This two-function architecture is necessary because `resolveFacet` runs
client-side (after fingerprinting) and cannot set HTTP status codes on
the initial server response. `preResolve` handles the subset of checks
that are visitor-independent and can run server-side in the route loader.

#### Scenario: HTTP 410 for archived facet
- **WHEN** preResolve returns type 'unavailable'
- **THEN** the route loader calls `setResponseStatus(410)`
- **THEN** the page renders FormUnavailable with HTTP 410

#### Scenario: HTTP 404 for unknown nickname
- **WHEN** ?v=nonexistent and no facet or history match exists
- **THEN** preResolve returns type 'not_found'
- **THEN** the route loader throws `notFound()` (HTTP 404)

### Requirement: UUID validation on player route
The `/$formId` route SHALL validate that the `formId` parameter matches
UUID v4 format (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`).
Non-UUID paths SHALL return 404 immediately without entering the player flow.

#### Scenario: Non-UUID path
- **WHEN** a user navigates to `/not-a-uuid`
- **THEN** the route returns 404 without attempting fingerprinting or resolution
