## Context

The database migration (`supabase/migrations/20260405000000_initial_schema.sql`) already creates all tables (`forms`, `facets`, `facet_nickname_history`, `round_robin_log`, etc.), triggers (`update_facet_updated_at`, `update_form_updated_at`), RLS policies, and functions (`increment_round_robin`). The `_authed` layout route guards `/dashboard` and `/build/$facetId` with session checks and provides `user` via route context. Both page components are placeholder stubs. The Supabase authenticated client factory (`src/lib/supabase/authenticated-client.ts`) bridges BetterAuth sessions to Supabase JWTs for RLS. The service-role client exists at `src/lib/supabase/server.ts`. The builder Zustand store (`src/lib/stores/builder-store.ts`) is an empty shell.

## Goals / Non-Goals

**Goals:**
- Server functions for form CRUD (create with default facet, update title, delete)
- Server functions for facet CRUD (create/duplicate, rename with history, delete with auto-promote, status transitions, set default)
- Dashboard page with form card grid, search, filtering, sorting, pagination, "New Form" button, and per-form/per-facet action menus
- Builder facet switcher dropdown (list, create, rename, set default)
- Auto-save for flow_definition and color_scheme with debounce and unsaved indicator
- Inline form title editing in the builder toolbar with debounce-save

**Non-Goals:**
- Building the React Flow canvas or node system (builder-canvas, builder-nodes specs)
- Player-facing routes or submission logic
- Round-robin assignment logic (round-robin spec)
- CSV export (csv-export spec)
- Color scheme editor UI (builder-color-scheme spec)
- WYSIWYG editor integration (Milkdown)
- Settings page functionality

## Decisions

### 1. Server functions via TanStack Start `createServerFn`

All form/facet mutations use `createServerFn` with the authenticated Supabase client. The `_authed` layout already resolves the session — server functions receive the BetterAuth user ID from the request headers, create a bridged JWT, and call Supabase with RLS enforcement.

**Alternative considered:** tRPC — adds a dependency and router layer that's unnecessary when TanStack Start server functions are available natively.

### 2. Dashboard data loading via route loader

The dashboard route's `loader` fetches forms with their facets in a single query using Supabase's foreign table embedding: `supabase.from('forms').select('*, facets(*)').order('updated_at', { ascending: false })`. Pagination uses `.range(offset, offset + pageSize - 1)`. Search uses `.ilike('title', '%query%')`. This keeps all filtering server-side.

**Alternative considered:** Client-side filtering after fetching all forms — doesn't scale and wastes bandwidth.

### 3. Facet status filtering via form-level aggregation

The status filter ("Has Active", "All Draft", "Has Archived") operates on the facets nested within each form. Since Supabase foreign table embedding returns facets inline, the filter applies as a post-fetch filter on the loader result. For the "All Draft" case, all facets must be draft. For "Has Active"/"Has Archived", at least one facet matches.

**Alternative considered:** Custom Postgres function for status filtering — over-engineered for the expected data volume (< 1000 forms per user).

### 4. Atomic form + facet creation

"New Form" creates a form and default facet in a single server function using two sequential Supabase inserts. The form insert returns the new `id`, which feeds the facet insert. RLS `WITH CHECK` policies validate ownership on both inserts. If the facet insert fails, the form row is orphaned — but this is an edge case that can be cleaned up manually. A Postgres function could make this truly atomic, but adds migration complexity for minimal gain.

**Alternative considered:** Postgres stored procedure wrapping both inserts in a transaction — would guarantee atomicity but adds a migration dependency for every schema change to creation logic.

### 5. Facet deletion with auto-promote

Facet deletion is a server function that:
1. Cleans up Supabase Storage files in `markdown-uploads/{facetId}/` (service-role client, best-effort)
2. Checks if this is the last facet on the form — if so, deletes the form (CASCADE handles the rest)
3. If not the last, deletes the facet row. If it was `is_default`, promotes the oldest remaining facet via `UPDATE facets SET is_default = true WHERE form_id = $1 ORDER BY created_at, id LIMIT 1`

### 6. Builder auto-save with Zustand + debounce

The builder store holds `flowDefinition`, `colorScheme`, and a `isDirty` flag. A `useEffect` in the builder page watches the store for changes and debounces saves at 2 seconds using `setTimeout`/`clearTimeout`. On successful save, `isDirty` resets. The unsaved indicator is a dot in the toolbar driven by `isDirty`.

**Alternative considered:** Using `useMutation` with debounce — Zustand is simpler since the store is already the source of truth for builder state.

### 7. Facet switcher as a dropdown in the builder toolbar

The facet switcher lists all facets for the current form. It fetches the sibling facets via a server function or loader data. "Create facet" shows an inline input within the dropdown. "Rename" uses an inline edit mode on the nickname. Navigation is a client-side route change to `/build/{facetId}`.

### 8. Nickname validation co-located with server functions

Nickname validation (pattern match, uniqueness within form, not in history) runs server-side in the rename/create server functions. The client does a quick pattern check for instant feedback, but the server is authoritative for uniqueness checks against siblings and history.

## Risks / Trade-offs

- **Non-atomic form + facet creation** — If the facet insert fails after the form insert succeeds, an orphaned form row is left in the database. Mitigation: the dashboard only shows forms that have at least one facet (via the join), so orphans are invisible to the user. A periodic cleanup could remove them.
- **Post-fetch status filtering** — Filtering happens after fetching all forms for a page. For users with many forms, this could return fewer results than the page size. Mitigation: acceptable for initial launch; can move to a Postgres function if users report issues.
- **Last-write-wins on auto-save** — Concurrent editing across tabs can lose data silently. Mitigation: this is a known spec decision (not a bug). No conflict detection or optimistic locking is in scope.
- **Storage cleanup is best-effort** — If Supabase Storage deletion fails, orphaned files remain. Mitigation: acceptable per spec; the database row is the source of truth.
