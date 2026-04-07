## 1. Fingerprint Module

- [x] 1.1 Create `src/lib/fingerprint.ts` with `getVisitorId()` — FingerprintJS load, 5s timeout race, cookie/localStorage fallback chain, persistence on success
- [x] 1.2 Verify FingerprintJS v5.1 is in package.json dependencies (install if missing)

## 2. Facet Resolution Server Action

- [x] 2.1 Create `src/lib/server/player.ts` with `resolveFacet` server function using `supabaseAdmin` — input: `{ formId, visitorId, nickname? }`, output: resolved/completed/unavailable/redirect/not_found union type
- [x] 2.2 Implement the full decision tree: form existence guard (not found → not_found) → nickname lookup if provided (with explicit archived-facet check → unavailable before falling through to nickname_history; unknown nickname → not_found) → round_robin_log check → round-robin or default fallback (single active facet assigned directly without calling increment_round_robin) → once-per-visitor submission check → sensitive field stripping
- [x] 2.3 Implement round-robin INSERT with `ON CONFLICT (visitor_id, form_id) DO NOTHING` + re-read for idempotent concurrent handling
- [x] 2.4 Implement facet_nickname_history redirect lookup (return `{ type: 'redirect', nickname }` for renamed facets)

## 3. Player Route

- [x] 3.1 Rewrite `src/routes/$formId.tsx` — UUID validation guard (non-UUID → 404), Phase 1 loading shell with spinner
- [x] 3.2 Implement Phase 2 client logic — call `getVisitorId()`, then `resolveFacet({ formId, visitorId, nickname: searchParams.v })`, handle each result type (resolved → render, completed → End screen, unavailable → FormUnavailable, redirect → replaceState, not_found → 404)
- [x] 3.3 Set URL via `window.history.replaceState` to `/:formId?v={nickname}` after resolution (one-time, no further URL changes)

## 4. FormUnavailable Page

- [x] 4.1 Create `src/components/player/form-unavailable.tsx` — full-viewport animated page with Framer Motion, Parlay brand tokens (#EA4C89, #F8F9FC), friendly message, logo, no facet data
- [x] 4.2 Wire FormUnavailable into the player route for `type: 'unavailable'` resolution results with HTTP 410 status; wire 404 for unrecognized form IDs and unknown nicknames

## 5. Builder Toggle-OFF Prompt

- [x] 5.1 Update `src/components/builder/facet-switcher.tsx` — when toggling round-robin OFF with >1 active facets, show inline dropdown to select default facet; auto-select if only 1 active facet
- [x] 5.2 Wire the toggle commit: call `updateFormRoundRobin` + change-default-facet transaction only after user confirms selection

## 6. Integration Verification

- [ ] 6.1 Manually test the full flow: visit `/:formId` → fingerprint → resolution → facet served with correct `?v=` param
- [ ] 6.2 Test return visitor path: same visitor_id gets same facet from round_robin_log without counter increment
- [ ] 6.3 Test toggle-OFF prompt: disable round-robin with multiple facets → prompted for default → confirm → round-robin disabled
- [ ] 6.4 Test FormUnavailable: archive all facets → visit form → see unavailable page
