## Context

The original framing of this change was a small audit cleanup against `openspec/specs/builder-nodes/spec.md`: centralize a duplicated regex, fix a checkbox visibility bug, and correct three stale paragraphs in the spec. Mid-design the scope expanded after a user-driven decision to **rename `slug` → `alias`** end-to-end so the formula-time node identifier stops sharing a name with URL slugs (facet nicknames).

The rename is *not* cosmetic. It crosses 8 specs (excluding the new `builder-nodes` delta), changes 2 database column names, and changes 1 API wire format field. The project is pre-launch with no production data, so we are doing a clean cutover with no migration shim. The formula DSL surface syntax (`q-age > 18`) is preserved; the rename is internal to data shapes, types, columns, and prose.

A second, larger feature — *dependency-aware ordering* — was discussed and explicitly **postponed** to its own change because it touches the runtime player (shuffle ordering, traversal) and the formula parser (reference extraction), neither of which fit the audit-cleanup framing.

## Goals / Non-Goals

**Goals:**
- Eliminate the `slug` ↔ "URL slug" naming clash by renaming the field everywhere it refers to the formula-time node identifier.
- Single source of truth for alias validation in `alias-utils.ts`; both client and server import from it.
- Publish gate honors duplicate + pattern-invalid (per spec) on both client preflight and server `validateForPublish`. Empty alias does **not** block publish (alias is optional).
- `is_checkpoint` checkbox visibility matches the spec's "any Page/PageGroup in the flow" rule.
- Bring the `builder-nodes` spec into agreement with the shipped `src/`-based layout, the `{ nodeId }` editor signature, and the optional `rendererComponent` reality.
- Provide a tooltip on the new Reference field so a first-time builder user understands what it does.

**Non-Goals:**
- Rebuilding or redesigning any existing editor, canvas node, registry entry, or Crepe integration.
- Any work on player-side renderers or the component gallery carousel beyond renaming `node_slug` to `node_alias` in their wire format and prose.
- Adding aliases to container nodes (Page, PageGroup, Group) or to Start/End. Containers consume aliases in `condition`; they do not produce values.
- **Dependency-aware ordering** of shuffled children based on formula references — postponed to its own change.
- Backwards compatibility with existing `data.slug` keys in `flow_definition` JSONB or with existing `node_slug` columns. Pre-launch reset, no compat shim.
- Renaming the `builder-formula` capability files themselves (`parser.ts`, `evaluator.ts`) — only the spec paragraphs that reference them need the `app/` → `src/` correction.

## Decisions

### D1: The new field name is `alias`, not `reference` or `nodeId`

Two candidates were considered before settling: `reference` (verbose, neutral) and `nodeId` (collides with React Flow's `node.id`, which is the internal UUID). The user picked `alias`.

`alias` is short, exactly describes what the field does (a human-readable name that aliases the node in formula expressions), and has zero collision with either React Flow's `node.id` or the URL-slug terminology. It also reads naturally in code (`node.data.alias`, `aliasConflicts`, `isValidAlias`).

### D2: `slugify()` is renamed to `toAlias()`

The old function name is a term-of-art for "produce a URL-safe lowercase-hyphen string." But once we've decided that "slug" is the wrong name for what the field stores, keeping a function called `slugify` that produces the value of the `alias` field is just a different version of the same naming clash. `toAlias` describes what the function produces; the transform inside (lowercase, strip non-alphanumeric, collapse hyphens, truncate) is unchanged.

### D3: Single source of truth: `alias-utils.ts` exports the regex, the length cap, the type set, the validator, and the transformer

The pattern `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, the 60-character cap, and the set of node types that may carry an alias all live in `src/lib/node-registry/alias-utils.ts` (renamed from `slug-utils.ts`). The exports are:

```ts
export const ALIAS_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const ALIAS_MAX_LENGTH = 60
export const ALIAS_TYPES: ReadonlySet<NodeTypeName> = new Set([
  'card', 'likert', 'single_choice', 'multi_choice',
  'email_collection', 'scripted_llm', 'real_llm',
])
export function isValidAlias(alias: string): boolean { ... }
export function toAlias(text: string): string { ... }
```

`base-content-fields.tsx`, `builder-store.ts` (`computeAliases`, `computeAliasConflicts`), and the server `validateForPublish` all import from this one file. No second regex anywhere in the codebase.

### D4: Alias is optional. Publish blocks on duplicate and pattern-invalid only.

A node may have `alias: ''`. The publish gate does **not** treat an empty alias as a blocker — only as "this node cannot be referenced from formulas." Two reasons:

1. The user explicitly asked for it: aliases are an opt-in feature for nodes you actually need to reference. Forcing every freshly added node to receive an alias before publish is friction without value.
2. Default-data factories initialize alias to `''` for ergonomic reasons (the user types a label first, then `toAlias(label)` auto-fills the alias on first label-keystroke). Treating that intermediate state as a publish blocker would tick the blocker count up and down on every node add, which is noise.

**What is blocked:** duplicate alias (two nodes share the same non-empty alias) and pattern-invalid alias (non-empty value that doesn't match `ALIAS_PATTERN` or exceeds `ALIAS_MAX_LENGTH`). Both client preflight and server `validateForPublish` enforce both conditions, importing the same `isValidAlias` so they cannot drift.

### D5: Extend store-derived state instead of inventing a parallel slice

The store already computes `slugs: SlugInfo[]` and `slugConflicts: SlugConflict[]` on every mutation via `withDerived`. After the rename, these become `aliases: AliasInfo[]` and `aliasConflicts: AliasConflict[]`. Add one new derived value: `anyPageHasProgressBar: boolean`, computed inside the same `withDerived` pass by scanning Page/PageGroup nodes. Editors read it via a shallow selector. This keeps the single-derived-state pattern and the existing `stableArray` re-render guards.

**Why a store-level boolean and not a React context?** The builder store is already the single source of truth for every other derived slice (dead paths, alias info), and page editors already import `useBuilderStore`. A context would be a parallel system for one boolean.

### D6: Pre-launch reset for the database column rename

The `responses.node_slug` and `llm_conversations.node_slug` columns are renamed to `node_alias` by editing the existing migration file `supabase/migrations/20260405000000_initial_schema.sql` in place. No `ALTER TABLE` migration file is added. Justification: the project has no production users at this point (the user confirmed); local environments are reset by re-running migrations. This keeps the schema history clean and avoids carrying a rename migration forever.

If this turns out to be wrong (i.e., there is in fact production data), the alternative is to add a forward-only `ALTER TABLE responses RENAME COLUMN node_slug TO node_alias;` migration, which is a small, reversible follow-up.

### D7: API wire format change is in scope

`/api/llm-proxy` accepts a JSON body field `node_slug` on the init action. After the rename, it becomes `node_alias`. The player code that constructs this body (the Real LLM renderer's init request) is updated in lockstep. There is no compat layer to accept both spellings; pre-launch.

### D8: `is_checkpoint` data is not retroactively cleared

When a Page has `is_checkpoint = true` and the user later turns off `show_progress_bar` on every page, the checkbox disappears from the editor (because `anyPageHasProgressBar` flips to false), but the underlying data still has `is_checkpoint = true`. We do not clear it. Justification: if the user re-enables progress on any page, the previous checkpoint configuration is restored automatically — that's the more useful behavior, and clearing on flip-off would be silent data loss. The runtime player ignores `is_checkpoint` when `anyPageHasProgressBar` is false anyway, so the stale data has no observable effect.

### D9: Spec deltas use MODIFIED (and RENAMED for heading changes), never REMOVED + ADDED

For each affected requirement in each affected spec, the change file uses `## MODIFIED Requirements` with the full requirement text rewritten. When the requirement *heading itself* changes (e.g. `Slug auto-generation` → `Alias auto-generation and validation`), the delta uses `## RENAMED Requirements` with the OpenSpec `- FROM: \`### Requirement: …\`` / `- TO: \`### Requirement: …\`` syntax, followed by a `## MODIFIED Requirements` block under the *new* name (the OpenSpec apply order is RENAMED → REMOVED → MODIFIED → ADDED, so MODIFIED must reference the post-rename heading).

No requirements are removed and no new requirements are added — every change is a revision of an existing rule. This keeps the diff reviewable: a reader can read the new requirement in full without cross-referencing the original.

### D11: Persistence is gated by `record_response`, not by alias presence

The canonical `player-submission` "Response rows" requirement says *"insert one responses row per content node (nodes with slugs) … where the node was visited AND record_response = true"*. The parenthetical `(nodes with slugs)` was historically a clarification listing the node types that have a slug field — every content/LLM node had slug populated, so the qualifier was effectively a no-op.

Once alias becomes optional, that qualifier becomes ambiguous. We resolve it as follows: **persistence is gated by `record_response`, not by alias presence.** A response-bearing node with `alias = ""` and `record_response = true` SHALL still produce a `responses` row at submission time, with `node_alias` populated by the node's internal React Flow id (UUID) as a stable fallback. Reasoning:

1. `record_response: true` is the form creator's explicit "persist this" signal. Silently dropping it because they didn't bother to type an alias would be data loss.
2. The CSV export uses `node_label` for the column header, so a human reading the export still sees a meaningful name even when the column key is an opaque UUID.
3. The opaque-UUID column key is stable across submissions for the same node, so downstream tooling can still match it across rows.

Trade-off: form creators who want a stable, human-readable column key in CSV exports MUST type an alias. The tooltip on the Reference field doesn't currently surface that nuance — and we're choosing not to surface it in the tooltip because it would over-explain a 1% concern. Form creators who care about CSV column keys will figure it out from the export itself.

This shows up in the spec deltas as:

- `player-submission "Response rows"`: dropped the `(nodes with slugs)` qualifier; the rule is now `record_response = true` only.
- `player-submission "Responses table schema"`: explicit fallback rule for the `node_alias` column.
- `csv-export "Single facet CSV generation"`: empty-alias nodes still get a CSV column (header = label, key = internal id).
- `player-renderers "Likert renderer"`: session key falls back to internal id when alias is empty.
- `player-session "Always-tracked responses"`: empty-alias nodes MAY be tracked internally but MUST NOT appear in the formula evaluation context.

### D10: Containers stay alias-less; "produces vs consumes" wording is made explicit

The existing requirement `Container node data fields (no slug)` becomes `Container and anchor node data fields (no alias)` and the body is reworded to make the asymmetry explicit:

> Page, PageGroup, Group, Start, and End SHALL NOT have an `alias` field. They are virtual containers and anchors that do not produce values consumable by formula expressions. Their `condition` field MAY consume aliases produced by descendant or earlier nodes (e.g. a Page with `condition: "q-age > 18"` is valid).

This codifies the consume-not-produce rule in one place so future contributors don't add an alias field to containers thinking it would be useful for "Page X visited" semantics.

## Risks / Trade-offs

- **[Rename touches a lot of files at once.]** The rename spans 8 `src/` files, 1 `e2e/` test file, 9 spec deltas, 1 migration file, and (forward-looking) 1 API wire format field plus 2 DB columns. A bad rename leaves the build broken everywhere. Mitigation: do the rename in a tight sequence (alias-utils.ts first → types.ts → store → registry default-data → editors → toolbar → server → migration → e2e test rename), running `npx tsc --noEmit` between major steps to catch any missed usage (note: `package.json` has no `typecheck` script today — invoke `tsc` directly or add the script as part of §13.1). The compiler is the main safety net.
- **[Pre-launch reset assumption.]** The database column rename assumes no production data. If that assumption is wrong, the consequence is dropped data on environments that re-run the migration. Mitigation: confirm with the user before merging that no production environment has been seeded. Fallback is a forward-only `ALTER TABLE ... RENAME COLUMN` migration.
- **[Spec drift if a new contributor writes code calling the old name.]** There is a brief window where the codebase still has stale `slug` strings in comments, dead code, or test fixtures. Mitigation: a final grep pass for `slug` (filtered to exclude the URL-slug usage in `facet-nicknames` / `facets` / `csv-export`-the-modal-text) is a task in `tasks.md`.
- **[Tooltip wording locks in user-facing terminology.]** The tooltip in the editor will be the first place most users encounter the word "alias." If the wording is unclear, every new user is confused. Mitigation: tooltip text is reviewed below and is editable in a follow-up if it doesn't land.
- **[Spec-only edits don't round-trip through `openspec archive` cleanly without `MODIFIED` deltas.]** OpenSpec treats modifying an existing requirement block as a delta; we must author each spec edit as a proper `MODIFIED Requirements` block, not as a direct edit to `openspec/specs/<capability>/spec.md`. The 9 delta files in `openspec/changes/builder-nodes/specs/...` are all written this way.

## Tooltip text

The Reference field in the node config popup gets a help tooltip with this exact text:

> Optional identifier used to reference this question in formula conditions, e.g. `q-age > 18`. Lowercase letters, numbers, and hyphens. Not visible to respondents.

If you'd rather word it differently, change it in `base-content-fields.tsx` — it's not in any spec.
