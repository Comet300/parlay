## Why

The Card node is scaffolded but incomplete. On the canvas it renders as a generic stacked row with per-button handles whose labels live only in `title` tooltips — invisible on mobile and unscannable on desktop. The side-panel editor uses plain ad-hoc inputs that don't match the rebrand. And the player-side Card renderer does not exist at all: `CardNodeData` has no `rendererComponent` registered, so respondents can't actually *run* a Card today. The canonical `builder-card-node` spec already defines the contract — this change is about closing the gap so the whole vertical (canvas → editor → player) is built, branded, and consistent with `design-system-rebrand`.

## What Changes

### Canvas (`src/components/builder/canvas-nodes/card-node.tsx`)
- Align surface to brand tokens: `--r-md` radius, `--e1` resting elevation, stone-neutral border, `--primary` selected ring (replace current `bg-orange-100 / border-blue-500 ring-blue-200`).
- Icon badge recolors to `--accent-subtle` / `--accent` to reflect brand usage (accent = warm orange).
- **Expose button labels on the canvas.** Replace the column of bare colored-dot handles with a right-aligned column of **button label chips**, one per button. Each chip is the handle (click-to-connect) and shows a truncated label. Dead-path buttons render in `--error-subtle` / `--error` instead of red-hex literals. This is the first time button labels are legible without hovering.

### Editor (`src/components/builder/node-editors/card-editor.tsx`)
- Swap ad-hoc `EditorInput` usage for rebrand form-control primitives (`.inp`, Raised "+ Add button", destructive `.b-d` remove).
- Replace the decorative `GripVertical` with a working drag-to-reorder per the canonical spec requirement (dnd-kit, consistent with `single-choice` / `multi-choice` editors).
- Dead-path indicator uses `--error` token + `--e-toast` shadow on the row.

### Player renderer (**new:** `src/components/player/renderers/card-renderer.tsx`)
- Implement the Card renderer already specified in `player-renderers › Card renderer`: full Milkdown-rendered markdown + N Raised buttons, no separate Continue.
- Primary button uses `--color-primary` facet token (not app `--primary`) so the facet color scheme is respected.
- Register `rendererComponent: CardRenderer` in `src/lib/node-registry/index.ts` for the `card` descriptor.
- Handles button click → records label (if `record_response = true`) → invokes navigation engine with the button's sourceHandle.

### Registry (`src/lib/node-registry/types.ts` / `index.ts`)
- Populate `rendererComponent` for `card`. No type changes to `CardNodeData`.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `builder-card-node` — Canvas representation requirement gains button-label-chip handles; references brand tokens instead of raw color names.
- `player-renderers` — Card renderer requirement gains Raised-button styling reference and clarifies token scope (facet `--color-*`, not app `--primary`).

## Impact

### Files to modify / add (implementation, not this change)
- `src/components/builder/canvas-nodes/card-node.tsx` — rewrite handle column as label chips
- `src/components/builder/node-editors/card-editor.tsx` — rebrand primitives, dnd-kit reorder
- `src/components/player/renderers/card-renderer.tsx` — **new file**
- `src/lib/node-registry/index.ts` — register renderer
- e2e: new `e2e/player-card.spec.ts` covering button click → route + response record

### New dependencies
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` if not already present (check — single-choice editor may already install these).

### Dependencies on other changes
- **Depends on `design-system-rebrand`** landing first. This change references `--r-md`, `--e1`, `--primary`, `--accent`, `.b-p`, `.b-s`, `.inp`, `--e-toast`, Sora, etc. — all defined there. If the rebrand slips, this change waits.

### No schema changes. No API changes.
