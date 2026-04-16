## Why

Two reasons drove this change:

1. **Naming clash.** The current `slug` field on response-bearing nodes shares a name with URL slugs (facet nicknames at `/:formId?v={slug}`), which are immutable and behave nothing like a node identifier in formula conditions. Talking about "slug" without a qualifier is ambiguous, and that ambiguity has already produced bugs and review confusion.
2. **Audit drift.** A targeted audit of the shipped builder-canvas code against `openspec/specs/builder-nodes/spec.md` surfaces four behavior/typing drifts: a duplicated slug regex, a publish gate that doesn't honor the spec's pattern rule, an `is_checkpoint` toggle gated on the wrong condition, and a spec descriptor signature + path that no longer match the code.

This change renames `slug` → `alias` everywhere it refers to the formula-time node identifier, closes the four audit gaps, and brings the affected specs (builder-nodes plus eight downstream specs that reference the field) into agreement with the shipped code.

## What Changes

### Rename: `slug` → `alias`

The field stored on response-bearing nodes (`card`, `likert`, `single_choice`, `multi_choice`, `email_collection`, `scripted_llm`, `real_llm`) is renamed from `slug` to `alias`. The rename is end-to-end:

- **Code**: `node.data.slug` → `node.data.alias`; `slug-utils.ts` → `alias-utils.ts`; `slugify` → `toAlias`; `SlugInfo`/`SlugConflict` → `AliasInfo`/`AliasConflict`; store `slugs`/`slugConflicts` → `aliases`/`aliasConflicts`; `SLUG_TYPES` → `ALIAS_TYPES`.
- **Database columns**: `responses.node_slug` → `responses.node_alias`; `llm_conversations.node_slug` → `llm_conversations.node_alias`. Edited in place in the existing `supabase/migrations/20260405000000_initial_schema.sql` (no separate migration — the project is pre-launch with no production data).
- **API wire format**: `/api/llm-proxy` init request body field `node_slug` → `node_alias`.
- **Specs**: every spec that talks about the formula-time node identifier (9 capabilities) gets a `MODIFIED Requirements` delta.

The formula DSL syntax does not change. `q-age > 18` still parses the same way — the variable name `q-age` is now stored under `data.alias` instead of `data.slug`, and the parser grammar token is renamed `SLUG → ALIAS`, but the surface syntax respondents and form authors see is identical.

### Validation tightening (centralization, not new behavior)

- Add `alias-utils.ts` exports `ALIAS_PATTERN`, `ALIAS_MAX_LENGTH`, `isValidAlias`, `toAlias`, and `ALIAS_TYPES` (the set of node types that may carry an alias). Single source of truth for both client and server validators.
- Replace the inline regex in `base-content-fields.tsx` with `isValidAlias`.
- Server `validateForPublish` imports `isValidAlias` and `ALIAS_TYPES` from the same module.

### Publish gate (alias is optional)

- Alias is **optional** on every node type that accepts one. Empty alias does **not** block publish.
- Publish remains blocked on **duplicate** alias and **pattern-invalid** alias (both client preflight and server `validateForPublish`).
- Inline editor errors still flag duplicate and invalid; no "alias is required" error.

### `is_checkpoint` visibility fix

- Add a derived `anyPageHasProgressBar: boolean` to the builder store, computed inside `withDerived`.
- `page-editor.tsx` and `page-group-editor.tsx` read it via a selector and render the `is_checkpoint` checkbox when it is true (regardless of the current node's own `show_progress_bar`). Matches the spec's *"only visible when show_progress_bar is enabled on any Page/PageGroup in the flow"* rule.

### Spec descriptor cleanup

- `NodeTypeRegistry` registry path: `app/lib/node-registry/index.ts` → `src/lib/node-registry/index.ts` (project is Vite/TanStack Start with `src/`, not Next.js `app/`).
- `editorComponent` signature: `React.ComponentType<{ node: FlowNode }>` → `React.ComponentType<{ nodeId: string }>` (every shipping editor uses `{ nodeId }` so it can re-subscribe to the store and stay fresh across undo/redo, drag, and reparenting).
- `rendererComponent` is marked optional and explicitly delegated to the `player-renderers` capability.
- `builder-formula` spec also has the same `app/` → `src/` drift on its parser/evaluator/store paths. Fixed in the same pass.

### Tooltip on the alias input

- The Reference field in the node config popup gets a `?` tooltip: *"Optional identifier used to reference this question in formula conditions, e.g. `q-age > 18`. Lowercase letters, numbers, and hyphens. Not visible to respondents."*

### Containers and Start/End — explicitly no alias

- Page, PageGroup, Group, Start, and End do **not** gain an alias field. They can still consume aliases inside their `condition` field (Page may have `condition: "q-age > 18"`), but they do not produce values that other nodes can reference. The "Container node data fields" requirement is renamed and reworded to make this asymmetry explicit.

### Out of scope (postponed to a separate change)

- **Dependency-aware ordering**: detecting that node B's condition references node A and constraining shuffles so A always evaluates first. This is a separate feature touching `builder-formula`, `player-session`, and `player-navigation`, and will land in its own change.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities

- `builder-nodes` — rename `slug` → `alias`, drop missing-alias publish blocker, fix `is_checkpoint` visibility, correct registry path/signature/optional renderer.
- `builder-formula` — rename `SLUG` token → `ALIAS` in grammar; rename evaluator context type, autocomplete selector, and store source to alias terminology; correct `app/` → `src/` paths.
- `builder-canvas` — rename "slug conflict" → "alias conflict" in publish validation checklist and scenarios.
- `player-session` — rename "slug" → "alias" in always-tracked-responses requirement and one scenario.
- `player-submission` — rename `responses.node_slug` column → `node_alias`; rename "node slug" terminology in response-row, API endpoint, and LLM conversation requirements; rename in scenarios.
- `player-llm` — rename `llm_conversations.node_slug` column → `node_alias`; rename `node_slug` field in `/api/llm-proxy` init request; rename terminology in conversation initialization, request format, and scenarios.
- `csv-export` — rename "node slugs" → "node aliases" in single-facet generation requirement; rename "branch ordering tiebreaker" wording.
- `player-renderers` — rename "keyed by slug" → "keyed by alias" in Likert renderer; rename `node_slug` → `node_alias` in Real LLM renderer init request.
- `facets` — rename "slug" mention in `flow_definition` structure paragraph.

## Impact

### Modified files (code)

- `src/lib/node-registry/slug-utils.ts` → renamed to `alias-utils.ts`; add `ALIAS_PATTERN`, `ALIAS_MAX_LENGTH`, `isValidAlias`, `ALIAS_TYPES`; rename `slugify` → `toAlias`
- `src/lib/node-registry/types.ts` — rename `slug: string` field to `alias: string` on 7 `*NodeData` interfaces; rename `SlugInfo` → `AliasInfo`
- `src/lib/node-registry/index.ts` — rename `slug: ''` → `alias: ''` in 7 `defaultData()` factories
- `src/lib/stores/builder-store.ts` — rename `SLUG_TYPES`, `SlugConflict`, `computeSlugs`, `computeSlugConflicts`, `slugs`/`slugConflicts` state fields, `prevSlugs`/`prevSlugConflicts` caches; add `anyPageHasProgressBar` derived flag
- `src/components/builder/node-editors/base-content-fields.tsx` — relabel "Slug" → "Reference" with tooltip; swap inline regex for `isValidAlias`; rename local variables
- `src/components/builder/node-editors/condition-input.tsx` — rename `allSlugs` → `allAliases`, `insertSlug` → `insertAlias`, the `s.slug` reads → `s.alias`
- `src/components/builder/node-editors/page-editor.tsx` — read `anyPageHasProgressBar` for checkpoint visibility
- `src/components/builder/node-editors/page-group-editor.tsx` — same
- `src/components/builder/builder-toolbar.tsx` — read `aliasConflicts` from store, blocker text "alias conflict"
- `src/lib/server/facets.ts` — rename `slugMap` → `aliasMap`; import `isValidAlias`/`ALIAS_TYPES`; add pattern-invalid pass; emit "Duplicate alias" / "invalid alias" errors
- `e2e/builder-canvas.spec.ts` — rename the existing stub test that mentions "slug conflicts" so it accurately describes the dead-path behavior it actually tests; add four new alias tests per the Playwright section in `tasks.md §14`
- Forward-looking: when the server LLM proxy (`src/routes/api/llm-proxy.ts`), submit endpoint (`src/routes/api/submit.ts`), and CSV export route are implemented (currently 501 stubs), they MUST use `node_alias` instead of `node_slug` per the player-llm, player-submission, and csv-export spec deltas in this change. No rename work in those files today.

### Modified files (database / migrations)

- `supabase/migrations/20260405000000_initial_schema.sql` — rename `responses.node_slug` → `responses.node_alias` and `llm_conversations.node_slug` → `llm_conversations.node_alias` in the existing CREATE TABLE statements (no new migration file; pre-launch reset)

### Modified specs (delta files in this change)

- `openspec/changes/builder-nodes/specs/builder-nodes/spec.md`
- `openspec/changes/builder-nodes/specs/builder-formula/spec.md`
- `openspec/changes/builder-nodes/specs/builder-canvas/spec.md`
- `openspec/changes/builder-nodes/specs/player-session/spec.md`
- `openspec/changes/builder-nodes/specs/player-submission/spec.md`
- `openspec/changes/builder-nodes/specs/player-llm/spec.md`
- `openspec/changes/builder-nodes/specs/csv-export/spec.md`
- `openspec/changes/builder-nodes/specs/player-renderers/spec.md`
- `openspec/changes/builder-nodes/specs/facets/spec.md`

### No new dependencies. No new files (the rename of `slug-utils.ts` → `alias-utils.ts` is a move, not an addition).

### Non-impact

- `facet-nicknames` spec is untouched: its "slug" references mean URL slug (facet nickname), which is a different concept and keeps its name.
- The formula DSL surface syntax is unchanged. Existing condition strings like `q-age > 18` continue to parse and evaluate identically.
