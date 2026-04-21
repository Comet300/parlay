## 1. Prerequisites

- [ ] 1.1 Confirm `design-system-rebrand` tasks §1 (tokens/typography) and §2.1 (Raised button) are merged. If not, pause implementation — this change references tokens defined there.
- [ ] 1.2 Verify `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` are in `package.json` (they should be, from the single-choice/multi-choice editors). Add if missing.

## 2. Canvas — `src/components/builder/canvas-nodes/card-node.tsx`

- [ ] 2.1 Replace the top-level `rounded-md border bg-white` classes with token-driven styles: `--r-md` radius, `--e1` resting shadow, `--border` border, Sora font inherited from body.
- [ ] 2.2 Selected state: swap `border-blue-500 ring-1 ring-blue-200` for 1px `--primary` border + `--primary-subtle` focus ring (2px outer).
- [ ] 2.3 Icon badge: swap `bg-orange-100 text-orange-700` for `--accent-subtle` / `--accent`.
- [ ] 2.4 Remove the current dot-handle loop (`!w-3.5 !h-3.5 !border-2 !border-white !bg-blue-500` etc.).
- [ ] 2.5 Add a right-aligned chip column. For each button:
  - Render a `<Handle type="source" id={"button-" + btn.id} position={Position.Right}>` wrapping a chip `<span>` that shows the truncated label.
  - Chip styles: `max-w-[88px]`, `truncate`, Sora 500 at 10–11px, `rounded-[6px]`, padding `3px 8px`.
  - Colors: connected → `bg-[var(--primary-subtle)] text-[var(--primary)]`; dead-path → `bg-[var(--error-subtle)] text-[var(--error)]` with a leading `AlertCircle` glyph.
  - Full label goes to the `title` attribute for overflow.
  - Ensure the Handle's effective hit target is ≥14px (add inner padding to the `<Handle>` or absolutely position a transparent 14px hit-area over the chip).
- [ ] 2.6 Visual QA: a Card with 1, 2, 3, and 4 buttons all render correctly within the stacked-child width constraint without overflowing the parent Page.

## 3. Side panel editor — `src/components/builder/node-editors/card-editor.tsx`

- [ ] 3.1 Wrap the Crepe editor in `EditorField label="Content"` (already there) — but verify the `EditorField` wrapper itself has been rebranded (task §2 of the rebrand). If not, add a small local wrapper using `1.5px` border, `--r`, focus ring `--primary-subtle`.
- [ ] 3.2 Replace the inline `<button>+ Add button</button>` with the rebrand's `.b-s` Raised secondary button component.
- [ ] 3.3 Replace the inline `<button><X/></button>` remove control with the rebrand's `.b-d` Raised destructive button. Disable (and visually dim) when `d.buttons.length === 1`.
- [ ] 3.4 Replace the `EditorInput` per-button with the rebrand's `.inp` component (should be the same component after rebrand task §2.2).
- [ ] 3.5 Wire up drag-to-reorder with `@dnd-kit/sortable`:
  - Wrap the button list in `<DndContext>` + `<SortableContext items={d.buttons.map(b => b.id)} strategy={verticalListSortingStrategy}>`.
  - Each button row becomes a `useSortable({ id: btn.id })` component; bind `attributes` + `listeners` to the `GripVertical` icon.
  - On `onDragEnd`, compute `arrayMove` and dispatch `updateNodeData(nodeId, { buttons: reordered } as any)`.
  - Edges keyed by `sourceHandle: "button-{id}"` are unaffected — verify via an e2e test.
- [ ] 3.6 Dead-path icon: swap `text-red-500` for `text-[var(--error)]` and use `--error-subtle` for the row background when dead.

## 4. Player renderer — new file

- [ ] 4.1 Create `src/components/player/renderers/` directory.
- [ ] 4.2 Create `src/components/player/renderers/card-renderer.tsx`:
  - Props: `{ node: FlowNode; onAnswer?: (...args: unknown[]) => void; preview?: boolean }` matching `NodeTypeDescriptor.rendererComponent` signature.
  - Render the Milkdown markdown as HTML (read-only mode — check how Start/End node renderers render markdown once they exist, or use `@milkdown/core` read-only preset).
  - Render each `CardButton` as a Raised primary button bound to `var(--color-primary)` (not `var(--primary)`). Vertical stack, `gap-3`, full-width below a max-width content container.
  - On click: call `session.recordResponse(alias || nodeId, btn.label)` synchronously (Zustand), then invoke the navigation engine with `sourceHandle: "button-{btn.id}"`. In `preview: true` mode, skip both.
- [ ] 4.3 Handle `record_response === false`: skip the record step but still route.
- [ ] 4.4 No Continue button: verify the parent player chrome doesn't render one for Card nodes (check `player-navigation` spec rendering).

## 5. Registry wiring — `src/lib/node-registry/index.ts`

- [ ] 5.1 Import `CardRenderer` from `~/components/player/renderers/card-renderer`.
- [ ] 5.2 Add `rendererComponent: CardRenderer` to the `card` registry descriptor.
- [ ] 5.3 `npx tsc --noEmit` — 0 errors.

## 6. Tests

- [ ] 6.1 Add `e2e/player-card.spec.ts`:
  - Seed a facet with a Start → Page(card with 2 buttons) → two End nodes.
  - Mount the player, assert markdown renders + two Raised buttons.
  - Click the second button; assert the response is recorded under the card's alias and the player navigates to the correct End.
- [ ] 6.2 Add a canvas e2e test (or extend existing builder-canvas test) verifying:
  - Reordering buttons in the editor updates chip order on the canvas.
  - Outgoing edges on `button-*` handles remain attached after reorder.
  - Dead-path chip appears with `--error-subtle` styling when a button has no outgoing edge.
- [ ] 6.3 `npm run test:e2e` — all passing.

## 7. Validation

- [ ] 7.1 `openspec validate builder-card-node --type change --strict` — valid.
- [ ] 7.2 `npm run lint` — 0 errors, 0 warnings.
- [ ] 7.3 `npx tsc --noEmit` — 0 errors.
- [ ] 7.4 Visual check on local dev: a Card canvas node with 3 buttons (1 connected, 1 connected, 1 dead) matches the spec at rest, on hover, and when selected.
- [ ] 7.5 Visual check in the player: Card renders with facet color scheme; Raised buttons respect `--color-primary` when facet uses a non-Default preset (e.g., Rose or Ember).

## 8. Archive

- [ ] 8.1 After merge, run `openspec archive builder-card-node` to sync the canonical `builder-card-node` and `player-renderers` specs with the deltas.
