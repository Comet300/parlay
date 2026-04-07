## Context

The form player route (`/$formId`) is currently a stub. The DB schema already has
`round_robin_log`, `increment_round_robin()`, and `round_robin_enabled`/`round_robin_counter`
on the forms table. The builder toolbar already reads `roundRobinEnabled` and passes it
to `FacetSwitcher`. The `updateFormRoundRobin` server function exists.

What's missing: the player-side two-phase load, FingerprintJS integration, the full
server-side facet resolution decision tree, the FormUnavailable page, and the toggle-OFF
prompt requiring default facet selection.

## Goals / Non-Goals

**Goals:**
- Implement the two-phase player load (loading shell -> fingerprint -> resolve)
- Implement the full facet resolution server action using `supabaseAdmin` (service role key)
- Integrate FingerprintJS v5.1 with cookie/localStorage fallback
- Wire round-robin assignment through `increment_round_robin()` and `round_robin_log`
- Build the FormUnavailable page with Parlay brand animation
- Add toggle-OFF prompt in builder to select default facet before disabling round-robin

**Non-Goals:**
- Full form rendering (page navigation, node renderers, LLM conversations, submission
  flow) — those are separate specs; this change only resolves *which* facet to serve
  and hands off a sanitized `flow_definition`
- Analytics dashboard for round-robin distribution
- Admin override to manually assign a visitor to a specific facet

## Decisions

### 1. Facet resolution as a TanStack Start server function (not an API route)

Use `createServerFn` for the Phase 2 resolution call, consistent with the existing
pattern in `src/lib/server/forms.ts`. The client calls it with `{ formId, visitorId }`.

**Why not an API route?** Server functions integrate with TanStack's data loading and
error handling. API routes (`src/routes/api/`) are reserved for external-facing endpoints
(submit, LLM proxy, export). Resolution is internal to the player SPA.

**Alternative considered:** A GET loader on `/$formId` that blocks on fingerprint. Rejected
because fingerprinting is client-side and async — it can't run in a route loader that
executes server-side.

### 2. Service role key for all resolution queries

The resolution server function uses `supabaseAdmin` (service role key) for:
- Reading forms + facets (public players have no JWT)
- Querying/inserting `round_robin_log`
- Calling `increment_round_robin()`
- Reading submissions for once-per-visitor check

This matches the established pattern documented in the specs: "service role key for
player reads + LLM proxy + submissions."

### 3. Fingerprint module at `src/lib/fingerprint.ts`

A thin wrapper over FingerprintJS with 5-second timeout and fallback to
cookie/localStorage. This module is client-only (imported only in the player component).

### 4. URL update via `window.history.replaceState`

After resolution, use `replaceState` to set `?v={nickname}` without triggering a
navigation. TanStack Router's `navigate({ search: { v } })` would also work but
`replaceState` is simpler for a one-time update from outside the router's search schema.

**Alternative considered:** Using TanStack Router search params. Viable, but adds
search schema coupling to the player route for a one-time write. `replaceState` is
the lighter touch.

### 5. Toggle-OFF prompt as inline UI in FacetSwitcher

When the user toggles round-robin OFF and multiple active facets exist, show an inline
dropdown in the FacetSwitcher area to pick the default facet. The toggle commit is
deferred until selection is confirmed. This keeps the interaction local — no modal dialog.

**Alternative considered:** A confirmation modal. Rejected because the action is low-stakes
and a modal is unnecessarily disruptive for a settings toggle.

### 6. FormUnavailable as a standalone component

`src/components/player/form-unavailable.tsx` — a full-viewport animated page using
Framer Motion. No facet data, no custom color scheme. Uses Parlay brand tokens only.

## Risks / Trade-offs

- **FingerprintJS accuracy (~60%):** Different visitors may get the same fingerprint,
  or the same visitor may get different fingerprints across browser updates/incognito.
  → Mitigation: cookie/localStorage fallback provides a second layer. Acceptable for
  free tier; the spec explicitly acknowledges this.

- **Race condition on concurrent first visits:** Two tabs opened simultaneously could
  both call `increment_round_robin` before either inserts into `round_robin_log`.
  → Mitigation: The unique index on `(visitor_id, form_id)` causes the second INSERT
  to conflict. ON CONFLICT DO NOTHING + re-read the existing row ensures idempotency.

- **Counter skips on conflict:** If a duplicate INSERT is rejected, the counter was
  already incremented but the assignment is discarded. This creates a small imbalance.
  → Acceptable: The spec doesn't require perfect distribution, and skips are rare.

- **Vercel 10s default timeout:** The Phase 2 resolution involves fingerprint (client)
  + server action (DB queries). FingerprintJS typically completes in <1s; the server
  action is a few DB queries. Well within the 10s default. No `maxDuration` override needed.
