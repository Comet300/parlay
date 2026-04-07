## ADDED Requirements

### Requirement: Fingerprint module implementation
The system SHALL implement a fingerprint wrapper module at
`src/lib/fingerprint.ts` exporting a single `getVisitorId()` async function.

The module SHALL:
1. Eagerly load FingerprintJS at module import time (`FingerprintJS.load()`)
2. Race the fingerprint computation against a 5-second timeout
3. On timeout or error, execute the fallback chain:
   a. Read `parlay_vid` cookie → use if present
   b. Read `parlay_vid` from localStorage → use if present
   c. Generate a new UUID v4 and persist to both cookie and localStorage
4. On successful fingerprint, persist the visitor_id to cookie and localStorage
   as a consistency cache

The cookie SHALL be set with `SameSite=Lax`, `max-age=31536000` (1 year),
and `path=/`.

#### Scenario: Successful fingerprint
- **WHEN** FingerprintJS completes within 5 seconds
- **THEN** the returned visitorId is the FingerprintJS result
- **THEN** the visitorId is also written to cookie and localStorage

#### Scenario: Timeout fallback with existing cookie
- **WHEN** FingerprintJS times out after 5 seconds
- **THEN** the system reads the `parlay_vid` cookie
- **THEN** uses the cookie value as the visitorId

#### Scenario: Full fallback to new UUID
- **WHEN** FingerprintJS fails and no cookie or localStorage value exists
- **THEN** the system generates a UUID v4
- **THEN** persists it to both `parlay_vid` cookie and localStorage
