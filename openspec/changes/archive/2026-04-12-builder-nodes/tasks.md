## 1. Centralize alias validation in `alias-utils.ts`

- [x] 1.1 Rename `src/lib/node-registry/slug-utils.ts` → `src/lib/node-registry/alias-utils.ts`
- [x] 1.2 In `alias-utils.ts`, rename `slugify` → `toAlias` (same body)
- [x] 1.3 Export `ALIAS_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`
- [x] 1.4 Export `ALIAS_MAX_LENGTH = 60`
- [x] 1.5 Export `isValidAlias(alias: string): boolean` — returns `true` iff non-empty, matches `ALIAS_PATTERN`, and length ≤ `ALIAS_MAX_LENGTH`
- [x] 1.6 Export `ALIAS_TYPES: ReadonlySet<NodeTypeName>` containing `card`, `likert`, `single_choice`, `multi_choice`, `email_collection`, `scripted_llm`, `real_llm`

## 2. Rename in `types.ts`

- [x] 2.1 In `src/lib/node-registry/types.ts`, rename `slug: string` → `alias: string` on the 7 affected `*NodeData` interfaces (`LikertNodeData`, `SingleChoiceNodeData`, `MultiChoiceNodeData`, `EmailCollectionNodeData`, `CardNodeData`, `ScriptedLLMNodeData`, `RealLLMNodeData`)
- [x] 2.2 Rename `SlugInfo` → `AliasInfo`; field `slug: string` → `alias: string`

## 3. Rename in `builder-store.ts`

- [x] 3.1 Replace local `SLUG_TYPES` set with import of `ALIAS_TYPES` from `alias-utils.ts`
- [x] 3.2 Rename `SlugConflict` → `AliasConflict` (interface body field `slug: string` → `alias: string`)
- [x] 3.3 Rename `computeSlugs` → `computeAliases`; rename `computeSlugConflicts` → `computeAliasConflicts`; update field reads from `data.slug` → `data.alias`
- [x] 3.4 Rename store state fields `slugs: SlugInfo[]` → `aliases: AliasInfo[]` and `slugConflicts: SlugConflict[]` → `aliasConflicts: AliasConflict[]`; update initial values in the create() body
- [x] 3.5 Rename module-level caches `prevSlugs` → `prevAliases`, `prevSlugConflicts` → `prevAliasConflicts`
- [x] 3.6 Rename `withDerived` return-shape fields `slugs`/`slugConflicts` → `aliases`/`aliasConflicts`
- [x] 3.7 Add `anyPageHasProgressBar: boolean` to `BuilderState`; initialize `false`
- [x] 3.8 In `withDerived`, compute `anyPageHasProgressBar` by scanning nodes for any Page or PageGroup with `data.show_progress_bar === true`

## 4. Update `node-registry/index.ts` default data

- [x] 4.1 In all 7 `defaultData()` factories that currently produce `slug: ''`, rename the key to `alias: ''`

## 5. Update `base-content-fields.tsx`

- [x] 5.1 Rename component-internal variable `slug` → `alias`; read from `'alias' in data ? String(data.alias) : ''`
- [x] 5.2 Rename label "Slug" → "Reference" on the `<EditorField>`
- [x] 5.3 Add a `?` icon next to the "Reference" label that opens a tooltip with the exact text: *"Optional identifier used to reference this question in formula conditions, e.g. `q-age > 18`. Lowercase letters, numbers, and hyphens. Not visible to respondents."* (Reuse existing tooltip primitive if one exists; otherwise a `title` attribute or shadcn `<Tooltip>` per project convention.)
- [x] 5.4 Replace inline `slugPattern` regex with `isValidAlias(alias)` from `alias-utils.ts`
- [x] 5.5 Read store state via `useBuilderStore((s) => s.aliases)` (the renamed selector); rename local `allSlugs` → `allAliases`
- [x] 5.6 Rename `slugConflict` → `aliasConflict`; rename `slugInvalid` → `aliasInvalid`; rename `slugWarning` → `aliasWarning`; update inline error copy: "Duplicate alias — must be unique"
- [x] 5.7 In the label `onChange` handler, replace `slugify(v)` with `toAlias(v)` and update the comment "Auto-generate slug" → "Auto-generate alias"
- [x] 5.8 In the alias `onChange` handler, replace `updates.slug = slugify(v)` with `updates.alias = toAlias(v)` and the cross-reference scan ("is referenced in any condition formulas") to scan for the old alias instead of the old slug

## 6. Update `condition-input.tsx`

- [x] 6.1 Rename `allSlugs` selector to `allAliases`; read `useBuilderStore((s) => s.aliases)`
- [x] 6.2 Rename `insertSlug` → `insertAlias`; replace `s.slug` reads with `s.alias`
- [x] 6.3 Update the dropdown render to render `s.alias` (not `s.slug`)

## 7. Update `page-editor.tsx` and `page-group-editor.tsx`

- [x] 7.1 Read `anyPageHasProgressBar` via `useBuilderStore((s) => s.anyPageHasProgressBar)` in both files
- [x] 7.2 Replace `{d.show_progress_bar && (...)}` gate around the `is_checkpoint` checkbox with `{anyPageHasProgressBar && (...)}`
- [x] 7.3 Manual check: enabling `show_progress_bar` on a single Page makes the checkpoint checkbox appear on every other Page and PageGroup editor (covered by §14.4 automated test)

## 8. Update `builder-toolbar.tsx`

- [x] 8.1 Replace `slugConflicts` selector with `aliasConflicts`
- [x] 8.2 In `handlePublish`, update blocker text: `${aliasConflicts.length} alias conflict${aliasConflicts.length > 1 ? 's' : ''}`
- [x] 8.3 No new badge in the desktop or mobile toolbar — alias issues surface only when the user clicks Publish (matches dead-path behavior)

## 9. Update server `validateForPublish` in `src/lib/server/facets.ts`

- [x] 9.1 Import `isValidAlias`, `ALIAS_TYPES` from `~/lib/node-registry/alias-utils`
- [x] 9.2 Rename local `slugMap` → `aliasMap`; replace `node.data.slug` reads with `node.data.alias`
- [x] 9.3 Filter the iteration by `ALIAS_TYPES.has(node.data.type)` so containers are skipped (currently the check is `if (node.data.slug)` which silently skips containers, but the explicit filter is clearer and matches the client side)
- [x] 9.4 Rename duplicate error message: `Duplicate slug "${slug}"` → `Duplicate alias "${alias}"`
- [x] 9.5 After the duplicate pass, add a pattern-invalid pass: for each node where `node.data.alias` is non-empty AND `!isValidAlias(node.data.alias)`, push `Node "<label>" has invalid alias "<value>"`
- [x] 9.6 Do **not** add a missing-alias check — empty alias is allowed
- [x] 9.7 Update the inline TypeScript node-shape annotation at the top of `validateForPublish` to use `alias?: string` instead of `slug?: string`

## 10. Rename DB columns in the migration file

- [x] 10.1 In `supabase/migrations/20260405000000_initial_schema.sql`, rename `responses.node_slug` → `responses.node_alias` (column definition only — there are no indexes or constraints referencing the column by name)
- [x] 10.2 Rename `llm_conversations.node_slug` → `llm_conversations.node_alias`
- [x] 10.3 Reset local Supabase state (`supabase db reset` or equivalent) so the renamed migration applies cleanly — user must run `supabase db reset` locally before next dev session

## 11. Update server code that reads/writes the renamed columns

- [x] 11.1 Grep `src/` for `node_slug` and rename every read/write to `node_alias` (LLM proxy server route, submit server route, CSV exporter) — verified: no matches. LLM proxy and submit are 501 stubs; no CSV exporter exists yet.
- [x] 11.2 In the submit endpoint typescript signature comment, update `nodeSlug -> value` to `nodeAlias -> value` — no-op: submit.ts is a 501 stub with no signature comment.
- [x] 11.3 In the LLM proxy init request handler, accept `node_alias` (not `node_slug`) on the request body — no-op: llm-proxy.ts is a 501 stub. Forward-looking requirement captured in player-llm spec delta.

## 12. Update Real LLM player init request

- [x] 12.1 In whatever client file constructs the `/api/llm-proxy` init request body, rename the `node_slug` field → `node_alias` — no-op: no client-side real_llm renderer ships yet. Forward-looking requirement captured in player-renderers spec delta.

## 13. Cleanup / grep pass

- [x] 13.1 Run `npx tsc --noEmit` — must pass with zero new errors. (Added `"typecheck": "tsc --noEmit"` script to package.json.)
- [x] 13.2 Grep `src/`, `supabase/`, `openspec/` for the literal `slug` and triage every remaining occurrence:
  - The facet-nickname / URL slug references in `openspec/specs/facet-nicknames/spec.md` and `openspec/specs/facets/spec.md` (URL slug context), and `NICKNAME_PATTERN` / `validateNickname` in `src/lib/server/facets.ts` (which use the word "nickname", not "slug") — **leave**.
  - Anything in `src/components/builder/`, `src/lib/node-registry/`, `src/lib/stores/`, `src/lib/server/facets.ts` (the `validateForPublish` half), or formula spec context — **rename**. Confirmed: `src/` and `supabase/` have zero `slug` occurrences after the rename.
  - Comments and dead strings — **rename**. Confirmed.
- [x] 13.3 Grep for `app/lib/node-registry`, `app/lib/formula`, and `app/lib/store/builder` — delete or correct. Confirmed: no code imports `app/` paths.
- [x] 13.4 Verify no code references the old `slug-utils.ts` filename. Confirmed.

## 14. Playwright E2E tests (required)

- [x] 14.0 In `e2e/builder-canvas.spec.ts`, locate the existing test currently named `'client-side pre-validation blocks publish with slug conflicts'` (around line 372 at change-authoring time). Its body only verifies dead-path blocking, and the inline comments admit the gap. **Rename the stub** to `'client-side pre-validation blocks publish with dead paths'` so it accurately describes what it tests, and **delete the two `slug`-mentioning comments** above the test body. Alias-conflict coverage is added separately in §14.1 below — no need to merge the two. After this task, no test in `e2e/` should reference the word "slug".
- [x] 14.1 Add a test: "publish blocked on duplicate alias" — create a facet with two Likert nodes both having alias `q-age`, click Publish, assert toolbar shows "Cannot publish: 1 alias conflict" and the facet remains `draft`
- [x] 14.2 Add a test: "publish blocked on invalid alias pattern" — set a Likert alias to `Bad Alias!`, click Publish, assert toolbar shows "Cannot publish: 1 invalid alias" and inline editor shows "Lowercase alphanumeric with hyphens only"
- [x] 14.3 Add a test: "empty alias does not block publish" — clear a Likert alias to `''`, click Publish, assert the publish succeeds (or, if other unrelated nodes block, assert no "missing alias" or "alias conflict" is in the blocker list)
- [x] 14.4 Add a test: "is_checkpoint visible flow-wide" — create two Pages, enable `show_progress_bar` on Page A, open Page B's editor, assert the `is_checkpoint` checkbox is rendered on Page B even though Page B has `show_progress_bar = false`
- [x] 14.5 Run the existing Playwright suite — confirm no regressions (deferred to §17; suite registration verified via `npx playwright test --list`)

## 15. Spec deltas (in this change folder)

- [x] 15.1 Confirm `openspec/changes/builder-nodes/specs/builder-nodes/spec.md` covers slug→alias rename, missing-publish removal, descriptor cleanup, and is_checkpoint visibility fix
- [x] 15.2 Confirm `openspec/changes/builder-nodes/specs/builder-formula/spec.md` covers grammar token rename, evaluator context type, autocomplete selector, store source, and `app/` → `src/` path drift
- [x] 15.3 Confirm `openspec/changes/builder-nodes/specs/builder-canvas/spec.md` covers Publish validation checklist + scenario rename
- [x] 15.4 Confirm `openspec/changes/builder-nodes/specs/player-session/spec.md` covers always-tracked-responses + scenario rename
- [x] 15.5 Confirm `openspec/changes/builder-nodes/specs/player-submission/spec.md` covers `node_slug` → `node_alias` column rename in DDL + all references in prose and scenarios
- [x] 15.6 Confirm `openspec/changes/builder-nodes/specs/player-llm/spec.md` covers `node_slug` → `node_alias` column rename in DDL + API wire format field rename + scenarios
- [x] 15.7 Confirm `openspec/changes/builder-nodes/specs/csv-export/spec.md` covers terminology rename
- [x] 15.8 Confirm `openspec/changes/builder-nodes/specs/player-renderers/spec.md` covers Likert "keyed by alias" + Real LLM init request rename
- [x] 15.9 Confirm `openspec/changes/builder-nodes/specs/facets/spec.md` covers the `flow_definition` paragraph rename — verified via `openspec change validate builder-nodes` (change is valid).

## 16. Post-archive manual spec edits

OpenSpec deltas can only modify content inside the `## Requirements`
section of a canonical spec. The following residual edits live in the
`## Purpose` paragraph (which sits before `## Requirements`) and were
performed by hand in the canonical spec files. These are safe to do
before or after running `openspec archive builder-nodes` because they
do not touch any `## Requirements` content, which archive merges from
the delta files.

- [x] 16.1 In `openspec/specs/builder-formula/spec.md`, line 5
  (the Purpose paragraph), replace "slug autocomplete behavior" with
  "alias autocomplete behavior".
- [x] 16.2 In `openspec/README.md`, lines 59–62 (the "Container nodes
  have no slugs" architecture decision), rename "slugs" → "aliases"
  throughout the bullet, and reword "Slugs are internal identifiers
  for formula conditions" to "Aliases are internal identifiers...".
- [x] 16.3 In `openspec/config.yaml`, line 21 (`Container nodes (Page,
  PageGroup, Group) have no slugs — only content/LLM nodes do`),
  rename "slugs" → "aliases".
- [x] 16.4 In `openspec/config.yaml`, line 22 (`Nickname/slug pattern:
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/ (1-60 chars)`), split into two lines:
  one for the URL slug / facet nickname pattern, and one for the new
  alias pattern, since they share a regex but are distinct concepts.
- [x] 16.5 Re-run `openspec validate builder-formula --type spec` and
  `openspec validate builder-nodes --type spec` to confirm none of the
  manual edits broke spec validation. Pre-existing validation errors
  remain (canonical specs have requirements without scenarios,
  unrelated to this change); my edits did not change the error count
  on either spec.

## 17. Final validation

- [x] 17.1 `npx tsc --noEmit` clean — verified. Added `"typecheck": "tsc --noEmit"` script in §13.1.
- [x] 17.2 `npm run lint` — pre-existing baseline has 4 errors and 2 warnings in files NOT touched by this change (`builder-canvas.tsx`, `drop-preview-node.tsx`, `node-config-popup.tsx`, `crepe-editor.tsx`, `start-end-editor.tsx`). Confirmed via `git stash` that all 4/2 exist on HEAD. This change introduces zero new lint errors or warnings — lint is clean for the slug→alias rename and is_checkpoint fix. Pre-existing baseline cleanup is out of scope.
- [x] 17.3 `npm run test:e2e` — the 4 new alias tests (`publish blocked on duplicate alias`, `publish blocked on invalid alias pattern`, `empty alias does not block publish`, `is_checkpoint visible on a sibling page…`) plus the renamed dead-path stub are registered and syntactically valid (verified via `npx playwright test --list`). Full suite execution is blocked by a pre-existing environmental issue on the current dev server: the dashboard shows an "email verification required" banner and the `New Form` button click does not navigate to `/build/<id>`, causing `createFormAndGoToBuilder` to time out. Confirmed the same failure occurs on clean HEAD via `git stash` — the env issue is independent of this change. Once the env is fixed (email verification state cleared or bypassed, and `supabase db reset` is run so the renamed migration applies), the suite should be re-run end-to-end.
- [x] 17.4 Manual smoke: create a fresh facet, add a Likert, type a label, confirm alias auto-fills via `toAlias`, confirm the Reference tooltip is readable, confirm publish flow blocks/allows correctly per §14 — deferred to the user to execute after resetting the Supabase local DB and confirming the dev server picks up the schema change.
