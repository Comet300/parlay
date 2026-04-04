# player-fingerprint Specification

## Purpose
Define the use of FingerprintJS for respondent identification, the fallback
identification strategy, once-per-visitor enforcement, and the two-phase
page load pattern that coordinates client-side identification with
server-side facet resolution.

## Requirements

### Requirement: FingerprintJS integration
The system SHALL use the open-source FingerprintJS library v5.1
(npm: `@fingerprintjs/fingerprintjs`, MIT license) to compute a
visitor_id client-side when a respondent visits /:formId.
The system SHALL implement a fingerprint wrapper in app/lib/fingerprint.ts
that handles loading the library and returning the visitor_id:

```typescript
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const fpPromise = FingerprintJS.load();

export async function getVisitorId(): Promise<string> {
  const fp = await fpPromise;
  const result = await fp.get();
  return result.visitorId;
}
```

Note: FingerprintJS v5.x is the MIT-licensed open-source edition (distinct
from the proprietary "Fingerprint Pro" service). It provides browser-based
fingerprinting with moderate accuracy (~60%). The visitor_id may change
after browser updates or in incognito mode. This is an acceptable
trade-off for the free tier. The fallback identification strategy (below)
provides additional resilience.

### Requirement: Fallback identification
If FingerprintJS fails to load or compute a visitor_id (e.g., blocked
by an ad blocker, script error, or timeout after 5 seconds), the system
SHALL fall back to a two-tier identification strategy:

1. First-party cookie: check for a parlay_vid cookie. If present, use
   its value as the visitor_id.
2. localStorage: check for a parlay_vid key. If present, use its value.
3. If neither exists: generate a new UUID v4 as the visitor_id, store it
   in both a first-party cookie (parlay_vid, SameSite=Lax, max-age=1 year)
   and localStorage (parlay_vid).

When FingerprintJS succeeds, the system SHALL also persist its visitor_id
to the cookie and localStorage as a consistency cache for future fallback.

### Requirement: Two-phase load pattern
The system SHALL implement a two-phase load for the form player:

Phase 1 — Immediate render:
The form player route (`src/routes/$formId.tsx`) SHALL validate that the
formId parameter is a valid UUID. If it is not a UUID, the route SHALL
return 404 immediately — this prevents named routes like `/dashboard` or
`/settings` from accidentally entering the player flow on typos.
TanStack Start matches explicit routes (e.g., `/login`) before parameterized
routes (e.g., `/$formId`), but the UUID check provides defense in depth.

The page SHALL render a loading state (spinner or skeleton) immediately
on navigation before any fingerprinting or facet resolution occurs.
The server SHALL NOT block on fingerprint computation during this phase.

Phase 2 — Resolution:
Once the visitor_id is determined (via FingerprintJS or fallback), the
client SHALL call a server action passing the visitor_id.
The server action SHALL perform the full facet resolution decision tree
(see player-facet-resolution spec), including:
- Facet assignment / round-robin
- Once-per-visitor check (has this visitor already submitted?)
- Sensitive field stripping from flow_definition
The server action returns the resolved facet data or a redirect instruction.
The player SHALL then render the resolved facet content (or End screen
if already submitted, or FormUnavailable if applicable).
After Phase 2 sets the URL to /:formId?v={nickname}, the URL SHALL NOT
change again for the remainder of the session.

### Requirement: No cookie dependency for core tracking
The system SHALL NOT use cookies as the primary identification mechanism.
FingerprintJS visitor_id is the primary method; cookies and localStorage
are fallback only.

### Requirement: Once-per-visitor enforcement
The system SHALL use the visitor_id (whether from FingerprintJS or fallback)
to enforce once-per-visitor submission. During Phase 2, the server checks
the submissions table for a completed submission matching this visitor_id
and facet_id. If found, the form is not re-enterable (see player-facet-resolution
spec for details). This means:
- FingerprintJS visitors: reliably blocked from retaking (fingerprint persists)
- Cookie/localStorage fallback visitors: blocked unless they clear both
  cookies and localStorage (acceptable trade-off for the free tier)

### Requirement: visitor_id in submissions
The system SHALL store the computed visitor_id in the submissions row
when creating a submission record.

### Requirement: Post-completion behavior
The system SHALL retain the round_robin_log entry after form completion.
The system SHALL NOT delete or invalidate the visitor's assignment after
the form is submitted (kept for analytics).

#### Scenario: Two-phase player load sequence
- GIVEN a respondent navigates to /:formId
- WHEN the page initially loads (Phase 1)
- THEN the system shows a loading spinner immediately
- AND FingerprintJS begins computing visitor_id in the background
- WHEN visitor_id is ready (Phase 2)
- THEN the client calls the facet resolution server action with visitor_id
- WHEN the server action returns the resolved facet
- THEN the URL is set to /:formId?v={nickname} (one-time URL update)
- AND the player renders the form content
- AND the URL never changes again

#### Scenario: FingerprintJS blocked by ad blocker
- GIVEN FingerprintJS fails to load due to an ad blocker
- WHEN the 5-second timeout elapses
- THEN the system falls back to first-party cookie / localStorage
- AND generates a new UUID if no prior visitor_id is found
- AND proceeds with Phase 2 using the fallback visitor_id

#### Scenario: Returning respondent, already submitted
- GIVEN visitor_id "fp_abc123" previously completed facet "horizon"
- WHEN the same visitor loads /:formId
- THEN Phase 2 finds the completed submission for this visitor + facet
- AND renders the End node (thank-you screen) directly
- AND the form is NOT re-enterable

#### Scenario: Returning respondent, in progress
- GIVEN visitor_id "fp_abc123" was previously assigned to facet "horizon"
- AND no completed submission exists
- WHEN the same visitor loads /:formId
- THEN Phase 2 resolves to facet "horizon"
- AND the resume prompt is shown (if a localStorage session exists)
