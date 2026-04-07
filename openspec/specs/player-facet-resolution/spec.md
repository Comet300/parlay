# player-facet-resolution Specification

## Purpose
Define the complete server-side decision tree for resolving which facet
to serve when a respondent visits /:formId, executed during Phase 2
of the two-phase load after the visitor_id is received from the client.
After resolution, the URL is set to /:formId?v={nickname} once and
never changes again — all subsequent navigation is client-side state.

## Requirements

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

### Requirement: Resolution decision tree
The system SHALL resolve the facet using the following exact decision tree,
all executed server-side after receiving visitor_id from the client:

```
0. Look up form by formId. If not found → return { type: 'not_found' }

1. If ?v= query param is present:
   a. Look up facet with that nickname in this form (any status).
   b. If found AND status = 'active' -> serve that facet.
   c. If found AND status = 'archived' -> return { type: 'unavailable' }
   d. If not found OR status = 'draft' -> check facet_nickname_history for a 301 redirect:
      - If history match found -> return { type: 'redirect', nickname }
      - If not found -> return { type: 'not_found' }

2. If no ?v= param:
   a. Check round_robin_log for existing (visitor_id + form_id) assignment.
   b. If found:
      - Look up the assigned facet's current status
      - If the facet is active -> set URL to ?v={facet's current nickname}
        (use the facet row's current nickname, NOT the round_robin_log
        snapshot — the facet may have been renamed since assignment)
      - If the facet is archived -> render FormUnavailable page
   c. If not found:
      i. If round_robin_enabled = false:
         - set URL to ?v={default facet nickname where is_default=true AND status='active'}
         - If no active default found -> render FormUnavailable page
      ii. If round_robin_enabled = true:
         - Count active facets (status = 'active')
         - 0 active facets -> render FormUnavailable page
         - 1 active facet -> set URL to ?v={that nickname}, log assignment
         - N>1 active facets -> call increment_round_robin(formId),
           pick facets[index] ordered by created_at ASC, id ASC,
           INSERT into round_robin_log (visitor_id, facet),
           set URL to ?v={nickname}
```

### Requirement: Once-per-visitor submission enforcement
After resolution, the system SHALL check the submissions table for an
existing completed submission (is_complete = true) for this visitor_id +
facet_id combination.
If a completed submission exists: the system SHALL render the End node
content directly (the thank-you/completion screen) instead of starting
the form. The respondent SHALL NOT be able to retake the form.
If no completed submission exists: the system SHALL proceed with the
normal form flow (including resume prompt if a session exists).

### Requirement: Single URL update
After the resolution decision tree completes, the system SHALL set the
browser URL to /:formId?v={resolvedNickname} exactly once. This is the
only URL change during the entire form session. All subsequent page
navigation, LLM conversations, and submission happen as client-side
state transitions without URL changes.

### Requirement: Sensitive field stripping
Before returning the resolved facet's flow_definition to the client,
the server SHALL strip the following fields from all real_llm nodes:
- setup_prompt
- ending_condition
These fields are used server-side only by the /api/llm-proxy endpoint.
The client receives a sanitized flow_definition that does not contain
any hidden-from-respondent data.

### Requirement: Service role key for resolution queries
The system SHALL use the Supabase service role key for facet resolution
queries only. The form player is public but the server needs to read
across the active-facets RLS boundary to resolve assignments.
This is one of the limited contexts where the service role key is used.

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

### Requirement: UUID validation on player route
The `/$formId` route SHALL validate that the `formId` parameter matches
UUID v4 format (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`).
Non-UUID paths SHALL return 404 immediately without entering the player flow.

### Requirement: FormUnavailable conditions
The system SHALL render the FormUnavailable page when:
- round_robin_enabled = true and zero active facets exist, OR
- round_robin_enabled = false and no active default facet exists, OR
- The ?v= nickname belongs to a facet with status = 'archived', OR
- A return visitor's previously assigned facet has been archived

#### Scenario: Direct nickname, active facet
- GIVEN a form has an active facet with nickname "compass"
- WHEN a respondent visits /:formId?v=compass (with any visitor_id)
- THEN the system serves the compass facet directly
- AND does NOT increment the round-robin counter

#### Scenario: No param, first visit, round-robin off
- GIVEN round_robin_enabled = false
- AND the form has one active facet "control" with is_default = true
- AND no round_robin_log entry for this visitor_id
- WHEN the respondent visits /:formId
- THEN the system sets the URL to /:formId?v=control

#### Scenario: Return visitor, already submitted
- GIVEN visitor_id "abc123" previously completed the form for facet "horizon"
- AND submissions contains a row with visitor_id "abc123", facet_id matching
  "horizon", and is_complete = true
- WHEN visitor "abc123" visits /:formId again
- THEN the system finds the completed submission
- AND renders the End node content (thank-you screen) directly
- AND does NOT allow retaking the form

#### Scenario: Return visitor, assigned facet archived
- GIVEN visitor_id "abc123" was previously assigned to facet "horizon"
- AND facet "horizon" has since been archived
- WHEN the same visitor loads /:formId
- THEN the system finds the round_robin_log entry for "abc123"
- AND detects the assigned facet is archived
- AND renders the FormUnavailable page

#### Scenario: Sensitive fields stripped
- GIVEN a facet's flow_definition contains a real_llm node with
  setup_prompt "You are a research assistant" and ending_condition "End after 5 topics"
- WHEN the server returns the flow_definition to the client
- THEN setup_prompt and ending_condition are stripped from the real_llm node
- AND the client receives a sanitized version without those fields

#### Scenario: Archived facet access via ?v=
- GIVEN facet "pilot" has status = 'archived'
- WHEN a respondent visits /:formId?v=pilot
- THEN step 1.a finds the facet but it is archived
- THEN step 1.c returns type 'unavailable'
- THEN the player renders FormUnavailable with HTTP 410

#### Scenario: No active facets
- GIVEN all facets of a form are archived
- AND round_robin_enabled = true
- WHEN any respondent visits /:formId
- THEN the system renders the FormUnavailable page

#### Scenario: Valid UUID, non-existent form
- WHEN resolveFacet is called with a valid UUID that matches no form
- THEN the server returns type 'not_found'
- THEN the player renders a 404 page

#### Scenario: Resolved facet returned
- WHEN a new visitor calls resolveFacet with a valid formId
- THEN the server returns type 'resolved' with sanitized flowDefinition
  (setup_prompt and ending_condition stripped from real_llm nodes)

#### Scenario: Already submitted visitor
- WHEN a visitor who completed the form calls resolveFacet
- THEN the server returns type 'completed' with the End node data

#### Scenario: No active facets via resolveFacet
- WHEN resolveFacet is called for a form with all archived facets
- THEN the server returns type 'unavailable'

#### Scenario: HTTP 410 for archived facet
- WHEN preResolve returns type 'unavailable'
- THEN the route loader calls `setResponseStatus(410)`
- THEN the page renders FormUnavailable with HTTP 410

#### Scenario: HTTP 404 for unknown nickname
- WHEN ?v=nonexistent and no facet or history match exists
- THEN preResolve returns type 'not_found'
- THEN the route loader throws `notFound()` (HTTP 404)

#### Scenario: Non-UUID path
- WHEN a user navigates to /not-a-uuid
- THEN the route returns 404 without attempting fingerprinting or resolution
