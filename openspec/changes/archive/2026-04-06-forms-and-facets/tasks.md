## 1. Server Functions — Form CRUD

- [x] 1.1 Create `src/lib/server/forms.ts` with `createForm` server function — inserts a `forms` row with title "Untitled Form", then inserts a default `facets` row (nickname "default", is_default true, status "draft", default color_scheme, flow_definition with Start node at {x:0, y:200} and End node at {x:600, y:200} with viewport {x:0, y:0, zoom:1}), returns the new facet ID
- [x] 1.2 Add `updateFormTitle` server function — debounce-friendly update of `forms.title` by form ID, with RLS ownership enforcement
- [x] 1.3 Add `updateFormRoundRobin` server function — toggles `forms.round_robin_enabled` by form ID, with RLS ownership enforcement
- [x] 1.4 Add `deleteForm` server function — deletes the form row (CASCADE handles facets, submissions, responses, etc.), preceded by Storage cleanup of `markdown-uploads/{facetId}/` for each facet using service-role client (best-effort)

## 2. Server Functions — Facet CRUD

- [x] 2.1 Create `src/lib/server/facets.ts` with `createFacet` server function — validates nickname pattern and uniqueness (against siblings + facet_nickname_history), deep-copies source facet's flow_definition and color_scheme, inserts new facets row with is_default false and status "draft", returns new facet ID
- [x] 2.2 Add `renameFacet` server function — validates new nickname pattern, checks uniqueness against siblings and history, inserts old nickname into facet_nickname_history, updates facets.nickname
- [x] 2.3 Add `deleteFacet` server function — cleans up Storage files in `markdown-uploads/{facetId}/` (service-role, best-effort), handles last-facet-deletes-form case, handles auto-promote of is_default to oldest remaining facet, deletes facet row
- [x] 2.4 Add `updateFacetStatus` server function — enforces valid transitions (draft->active, active->draft, active->archived, archived->active), updates facets.status
- [x] 2.5 Add `setDefaultFacet` server function — runs two-step transaction: clear is_default on all form facets, set is_default on target facet
- [x] 2.6 Add `saveFacetData` server function — updates flow_definition and/or color_scheme on a facet row (used by auto-save)

## 3. Server Functions — Data Loading

- [x] 3.1 Create `src/lib/server/loaders.ts` with `loadDashboardForms` server function — fetches forms with embedded facets using `supabase.from('forms').select('*, facets(*)')`, supports pagination via `.range()`, search via `.ilike('title', ...)`, and sort options (updated_at, created_at, title)
- [x] 3.2 Add `loadBuilderFacet` server function — fetches a single facet by ID with its parent form data (title, round_robin_enabled) and sibling facets (id, nickname, is_default, status), for the builder page loader

## 4. Dashboard Page

- [x] 4.1 Implement dashboard route loader calling `loadDashboardForms` with default pagination (page 1, 12 per page), sort (updated_at DESC), and no filters
- [x] 4.2 Build `FormCard` component — displays thumbnail placeholder, form title (clickable link to `/build/{defaultFacetId}`), facet status chips (draft=muted gray at reduced opacity, active=primary pink, archived=dimmed), per-facet action menu trigger, form-level kebab menu, "Draft" watermark overlay when ALL facets are draft
- [x] 4.3 Build dashboard toolbar — search input (debounced 300ms, updates loader via search params), status filter buttons (All, Has Active, All Draft, Has Archived), sort dropdown (Last updated, Newest, Oldest, A-Z)
- [x] 4.4 Build pagination controls — previous/next buttons, page number display, wired to search params driving the loader's `.range()` offset
- [x] 4.5 Build facet chip action menu — Edit (navigate to /build/{facetId}), View Live (open /:formId?v={nickname} in new tab, disabled for archived), Export CSV (disabled placeholder — deferred to csv-export change), status transition actions shown conditionally per current facet status: draft shows Publish (draft→active), active shows Unpublish (active→draft) and Archive (active→archived, with confirmation), archived shows Re-activate (archived→active) — all call `updateFacetStatus`, Delete facet (calls `deleteFacet` with confirmation dialog)
- [x] 4.6 Build form-level action menu — Delete form (calls `deleteForm` with confirmation dialog)
- [x] 4.7 Build "New Form" button — calls `createForm` server function, redirects to `/build/{newFacetId}` on success
- [x] 4.8 Build empty state — shown when user has no forms, with "Create your first form" CTA button
- [x] 4.9 Wire round-robin toggle on form cards — visible when >1 facet, calls `updateFormRoundRobin` server function, shows inline default-facet selector prompt when toggling OFF
- [x] 4.10 Wire default facet selector dropdown on form cards — visible when round_robin_enabled=false and >1 facet, calls `setDefaultFacet` on change

## 5. Builder — Facet Switcher & Toolbar

- [x] 5.1 Update builder route loader to call `loadBuilderFacet`, providing facet data, parent form, and sibling facets to the component
- [x] 5.2 Build facet switcher dropdown component — lists all sibling facets by nickname with active highlight, click navigates to `/build/{facetId}`, shows "Set as default" action for non-default facets when round_robin_enabled=false
- [x] 5.3 Add "+ Create facet" option to switcher — inline nickname input, pattern validation, calls `createFacet` with current facet as source, navigates to new facet on success
- [x] 5.4 Add rename capability to switcher — inline edit on nickname, calls `renameFacet`, shows validation errors inline
- [x] 5.5 Build builder toolbar — facet switcher dropdown, inline-editable form title (debounce-save on blur via `updateFormTitle`), unsaved indicator dot, Publish button (calls `updateFacetStatus` draft→active, then displays public URL `/:formId?v={nickname}` with copy button)

## 6. Builder — Auto-Save

- [x] 6.1 Expand builder Zustand store with `flowDefinition`, `colorScheme`, `isDirty`, `facetId`, and setter actions (`setFlowDefinition`, `setColorScheme`, `initializeFromServer`)
- [x] 6.2 Implement auto-save `useEffect` — watches store for dirty state, debounces 2s with setTimeout/clearTimeout, calls `saveFacetData` server function, clears `isDirty` on success
- [x] 6.3 Wire unsaved indicator in toolbar — small dot visible when `isDirty` is true, clears on save success
