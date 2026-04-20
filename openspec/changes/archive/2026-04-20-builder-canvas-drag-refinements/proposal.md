## Why

A round of builder-canvas refinements landed to make drag-and-drop feel native (Apple-style) and to better support nested Groups. The canonical specs now diverge from the shipped behavior in seven places: fixed-width children, pulsing skeleton, missing origin-slot preservation, Add Node panel animation, Group visual redesign, selected-edge styling, and the Group-in-Group depth cap. This change updates `builder-canvas` and `builder-nodes` to match the shipped code.

## What Changes

### `builder-canvas` — Stacked child layout
- Drop the fixed 176px leaf width. Leaves now fill 100% of their parent's inner width (`parent.width − 2 × STACK_PADDING_X`).
- Document the bottom-up widening: when a container holds Groups, its width widens by `2 × STACK_PADDING_X` per nesting level so the innermost content keeps the base width.
- Replace the "dashed blue border, pulse animation" skeleton with the Apple-subtle placeholder: 1px solid indigo hairline at 22% alpha, soft indigo fill at 6%, no animation.
- Add behavior: during **cross-container** drag, a skeleton preserves the *origin* slot so the source container doesn't shrink, AND a skeleton appears at the drop target. During **same-container** reorder, only the drop-target skeleton appears.
- Add: hysteresis at container boundaries. Once a container is targeted, the pointer must clearly leave its bounds before a different container is targeted.
- Add: bottom-up size propagation during drag preview so ancestor containers widen/lengthen to contain the growing descendant.
- Add: when the pointer crosses from the origin container into a different container, the origin skeleton is released (source container shrinks), so the user sees the node leaving.
- Add: the same skeleton + make-room behavior applies to drags from the Add Node sidebar (external DnD), not only to internal moves.

### `builder-canvas` — Add Node panel behavior
- Document the Apple-style entrance animation: slide in from the left with a spring (stiffness 340, damping 34, mass 0.9) and a 180ms ease-out opacity fade; the trigger button has a softer spring on enter/exit.
- Document the three visual categories in the panel: **Page-tier**, **Containers** (currently Group), **Content-tier**. The "Containers" grouping is a UI-only affordance; Group remains content-tier in the data model (no tier classification change).

### `builder-canvas` — New requirement: Selected edge styling
- Clicking an edge selects it. Selected edges render with a brand-pink stroke (`#EA4C89`) at 3px width, overriding the default gray edge style. No change to the default edge style.

### `builder-canvas` — Container nesting rules enforcement
- Cap Group-in-Group nesting at `MAX_GROUP_NEST_DEPTH = 10`. Drops that would exceed the cap are rejected with a sonner toast.

### `builder-nodes` — Group canvas node
- Group now uses the same visual language as Page: `rounded-xl border-2`, blue palette at lighter tints, header bar with a Layers icon + label + optional condition/shuffle indicators. It reads as a "nested Page" rather than the previous lighter bordered subgraph.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `builder-canvas` — stacked-child width/skeleton behavior, Add Node panel animation + categories, edge selection styling, Group-depth cap.
- `builder-nodes` — Group canvas node visual style.

## Impact

### Modified files (already shipped)
- `src/components/builder/add-node-panel.tsx` — Framer Motion entrance/exit + three-category layout.
- `src/components/builder/builder-canvas.tsx` — 3-pass layout, absolute-coord container lookup, origin+target skeleton, hysteresis, depth cap.
- `src/components/builder/canvas-nodes/group-node.tsx` — Page-like redraw.
- `src/components/builder/canvas-nodes/drop-preview-node.tsx` — Apple-subtle placeholder (returns null; wrapper CSS renders).
- `src/lib/stores/builder-store.ts` — 3-pass `stackChildren`, `MAX_GROUP_NEST_DEPTH`, 100%-width leaves.
- `src/styles/globals.css` — pink edge selection, soft skeleton wrapper style.

### Modified specs (delta files in this change)
- `openspec/changes/builder-canvas-drag-refinements/specs/builder-canvas/spec.md`
- `openspec/changes/builder-canvas-drag-refinements/specs/builder-nodes/spec.md`

### No new dependencies. No schema changes. No API changes.
