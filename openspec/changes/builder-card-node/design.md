## Context

Card is the only content-tier node that branches — every click is a routing decision, which makes it the most interactive node in the builder *and* in the player. Today, 70% of that experience is unfinished:

- **Canvas**: surface exists but visuals predate the rebrand. Per-button routing handles are colored dots whose labels are only in `title` tooltips. A user with three "Yes / No / Maybe" buttons sees three identical dots and has to hover each to know which is which. On mobile, `title` never fires.
- **Editor**: built from generic ad-hoc primitives (`bg-white rounded-md border-gray-200 text-blue-500`), inconsistent with the rebrand's form-control conventions. The `GripVertical` handle is decorative — drag-to-reorder isn't wired.
- **Player**: does not exist. The `card` registry entry has no `rendererComponent`, so a facet containing a Card cannot be published end-to-end. `player-renderers › Card renderer` specifies the behavior but no code implements it.

The rebrand (`design-system-rebrand`, in-flight) is the natural moment to close all three gaps because we're already touching tokens, buttons, and form controls across the app. Doing Card alongside the rebrand avoids two passes over the same components.

## Goals / Non-Goals

**Goals:**
1. Make button labels legible on the canvas — no tooltip dependence, no hover requirement.
2. Ship the Card player renderer per `player-renderers › Card renderer`, using Raised buttons and the facet's `--color-*` tokens (not app brand tokens).
3. Bring the editor up to rebrand parity — Raised "+ Add button", real drag-to-reorder, token-driven inputs.
4. Token discipline: specs reference `--primary`/`--accent`/`--r-md`/`--e1`, never hex literals.

**Non-Goals:**
- Redesigning the Card data schema (`CardNodeData` stays as-is).
- Branching on non-Card nodes. Per-option routing on likert/single/multi remains out of scope (enforced elsewhere).
- Milkdown editor chrome changes — Crepe is unchanged; we just place it inside a rebranded field wrapper.
- Dark mode for the player. Facets pick their own background; that's orthogonal.

## Decisions

### 1. Right-side label chips instead of dots
**Options considered**
- A. Keep dot handles, add labels below the card (multi-line). Problem: breaks the compact stacked-row layout (canonical `Stacked child layout`) — every Card becomes two rows tall.
- B. Show labels only when node is `selected`. Problem: hover/scan still fails; labels are the #1 thing a flow-reader wants to see.
- C. Right-aligned column of truncated label chips, each chip *is* the handle. Takes the space already reserved for dots, adds legibility.

**Choice: C.** The chip sits flush with the right edge (where handles live today), max-width ~88px with ellipsis truncation, `title` still carries the full label for very long ones. Chip colors use the existing 8-color cycle converted to `--primary-subtle` / `--primary` (not raw `!bg-blue-500`/etc.) so the palette is token-driven. Dead-path chips use `--error-subtle` / `--error` with a small `AlertCircle` glyph. Handle target-area stays ≥14px for fat-finger tolerance on mobile.

### 2. Player Raised buttons bind to facet tokens, not app tokens
**Rule:** in `CardRenderer`, primary CTAs use `--color-primary` (set per-facet on the player root) — **not** the app's `--primary` (`#0EA5E9`). Rationale: `player-renderers › Color scheme application` already mandates this isolation for likert/single/multi; Card must match. A facet using the "Rose" preset should see rose-pink Raised buttons, not sky blue.

**Implementation:** the `.b-p` Raised-button recipe from the rebrand uses `--primary` — in the player, we wrap Card buttons in a small inline-styled variant that references `var(--color-primary)` + computed hover/active tones. If the facet renderer root already injects these tokens, no prop drilling required.

### 3. Drag-to-reorder with dnd-kit, not manual state-swap
The canonical spec calls for drag-to-reorder and the existing `GripVertical` lies — it's decorative. dnd-kit is already the de-facto library for reorder across other editors (single-choice options, multi-choice options). Reuse the same pattern: `SortableContext` with `verticalListSortingStrategy`, `arrayMove` on drag end, IDs from `button.id`.

### 4. Where "Card" lives in the player file tree
**Options**
- A. `src/components/player/card-renderer.tsx` — flat, alongside `form-unavailable.tsx`.
- B. `src/components/player/renderers/card-renderer.tsx` — nested folder for all node renderers.

**Choice: B.** Every node type needs a renderer eventually. A `renderers/` subfolder sets the pattern so the next renderer (likert, single-choice, etc.) doesn't require a refactor. One-line cost, clear intent.

### 5. Click handling: record-then-route vs route-then-record
If we route first and the session-record promise rejects, the response is lost. If we record first and the navigation engine rejects, the user sees a stuck card with a recorded response they can't undo.

**Choice: record synchronously in local session state, then call the navigation engine.** Session state is in-memory Zustand (no async), so the record is effectively atomic; navigation errors bubble up as a toast and the card stays on screen. This matches how likert/single-choice already work.

## Risks / Trade-offs

- **Long button labels overflow the chip.** → Truncate with ellipsis; full label stays on `title` + in the editor. Accept that ultra-long labels aren't fully visible on the canvas.
- **Chip column widens the Card node.** → Node width is already bounded by the stacked-child layout (`100% of parent inner width`). Chips push content to the left but don't change outer width. If chip + icon + label exceed width on 4-btn cards, chips stack in two micro-columns before word-wrapping.
- **Card renderer doubles the player bundle size** (Milkdown render + button styling + navigation plumbing). → Keep the renderer lazy-loadable; only ship when a facet contains a Card node. Not critical in v1.
- **Facet color scheme is applied late** (phase-2 client resolve). → The renderer already waits for the facet to resolve before mounting; no extra work needed, but confirm with a visual test.
- **Drag-to-reorder could conflict with canvas pan on mobile editor.** → The editor runs in a side panel (popup), not on the canvas, so no conflict. Same pattern as single-choice editor.

## Migration Plan

1. **Gate on `design-system-rebrand` merge.** If rebrand tokens don't exist, chips and Raised buttons can't reference them. Sequence this change *after* rebrand tasks §1 (tokens) and §2.1 (Raised buttons) complete.
2. Land the canvas chip redesign first — unblocks flow-readability immediately.
3. Land the editor refresh second — cosmetic, additive, drag-reorder net-new.
4. Land the player renderer last — unblocks end-to-end publishing of Card-containing facets. Ship behind no flag; it's strictly additive (facets with Cards are unpublishable today).

## Open Questions

- Should the chip show a tiny icon of the button's terminal node (e.g., Page icon if it routes to a Page)? Nice-to-have, not critical. Deferred.
- Keyboard navigation across chips (arrow keys between buttons for connect-by-keyboard)? Out of scope; canvas-wide a11y is a separate concern.
