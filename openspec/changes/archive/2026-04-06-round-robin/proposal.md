## Why

The form player route (`/$formId`) is a stub — it renders a placeholder instead of
resolving which facet to serve. Round-robin assignment is the core mechanism for
distributing respondents across facets for A/B testing and multi-variant research.
The DB schema (round_robin_log, increment_round_robin function) and builder toggle
already exist, but the player has no resolution logic, no fingerprinting, no session
handling, and no form rendering.

## What Changes

- Implement the full player route at `/$formId` with a two-phase load: Phase 1 loads
  the form shell and initializes FingerprintJS; Phase 2 sends the visitor_id to the
  server for facet resolution.
- Implement the server-side facet resolution decision tree (direct nickname lookup,
  return-visitor check, round-robin assignment, default facet fallback).
- Integrate FingerprintJS v5.1 for stable visitor identification.
- Implement the round-robin toggle-OFF prompt in the builder's Form Settings panel
  (select default facet before disabling).
- Implement the FormUnavailable page for edge cases (no active facets, archived
  facet access).

## Capabilities

### New Capabilities
- `round-robin`: Atomic counter-based facet assignment with visitor logging and
  return-visit idempotency

### Modified Capabilities
- `player-facet-resolution`: Adding the full resolution decision tree implementation
  (currently no player-side code exists)
- `player-session`: Player session resume/creation after facet resolution
- `player-fingerprint`: FingerprintJS initialization as Phase 1 of two-phase load

## Impact

- **New route logic**: `src/routes/$formId.tsx` — complete rewrite from stub to
  full player with two-phase load
- **New server functions**: facet resolution endpoint (`resolveFacet` via `createServerFn`) using service role key
- **Builder UI**: Form Settings panel needs toggle-OFF prompt for default facet selection
- **Dependencies**: FingerprintJS v5.1 (already in project deps)
- **Database**: No schema changes — round_robin_log table and increment_round_robin
  function already exist in the migration
