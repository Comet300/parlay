## 1. Implementation (already shipped — verify)

- [x] 1.1 `src/lib/stores/builder-store.ts` implements a 3-pass `stackChildren` (width bottom-up, height bottom-up, position/size top-down) with leaf children sized to parent's inner width.
- [x] 1.2 `MAX_GROUP_NEST_DEPTH = 10` exported from `builder-store.ts`.
- [x] 1.3 `src/components/builder/builder-canvas.tsx` computes absolute bounds via `absolutePosition` and uses it in `findContainerAtPosition` (sorted by depth) and all insert-index calculations.
- [x] 1.4 `onNodeDragStart` records an `originPreview`; `onNodeDrag` releases it when the pointer enters a different container; `onNodeDragStop` clears it.
- [x] 1.5 `displayNodes` injects skeletons for origin + target (deduped when same container) and propagates size bottom-up so ancestor containers widen/lengthen.
- [x] 1.6 `onDragOver` (external sidebar drag) sets `dropPreview` so the same skeleton + make-room appears for sidebar drops.
- [x] 1.7 Hysteresis via `lastTargetRef` in `onNodeDrag`.
- [x] 1.8 Group-depth cap enforced in `onDrop`; shows toast on violation.
- [x] 1.9 `src/components/builder/add-node-panel.tsx` uses Framer Motion springs for entry/exit and renders three sections (Page-tier, Containers, Content-tier).
- [x] 1.10 `src/components/builder/canvas-nodes/group-node.tsx` restyled with Page-like visuals (rounded-xl border-2, Layers icon, blue palette).
- [x] 1.11 `src/components/builder/canvas-nodes/drop-preview-node.tsx` returns `null`; `.react-flow__node-drop_preview` carries the visible styling.
- [x] 1.12 `src/styles/globals.css` contains the pink selected-edge rule and the soft-indigo skeleton wrapper style.

## 2. Spec deltas (this change)

- [x] 2.1 `specs/builder-canvas/spec.md` — MODIFIED `Stacked child layout (Scratch-style)`, `Add Node panel behavior`, `Container nesting rules enforcement`; ADDED `Selected edge styling`.
- [x] 2.2 `specs/builder-nodes/spec.md` — MODIFIED `Group canvas node`.

## 3. Validation

- [x] 3.1 `npm run lint` — 0 errors, 0 warnings.
- [x] 3.2 `npx tsc --noEmit` — 0 errors.
- [x] 3.3 `npm run test:e2e` — 113 / 113 passing.
- [x] 3.4 `openspec validate builder-canvas-drag-refinements --type change --strict` — valid.

## 4. Archive

- [ ] 4.1 Run `openspec archive builder-canvas-drag-refinements` after merge to update canonical specs.
