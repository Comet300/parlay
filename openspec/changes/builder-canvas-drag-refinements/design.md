## Context

The canvas already had a Scratch-style stacked child layout with fixed-width children (176px) and a pulsing dashed skeleton during internal drags. The refinement pass landed a series of UX improvements — Apple-style animations, native-feeling snap preview, nested-Group support — that altered several invariants the specs document. This change brings the specs back into sync without any behavior changes beyond what's already shipped.

## Goals / Non-Goals

**Goals:**
- Keep `builder-canvas` and `builder-nodes` specs an accurate description of the shipped builder behavior.
- Document the origin-slot preservation rule so future contributors don't accidentally remove it.
- Document the Group-depth cap so it's discoverable outside of code comments.

**Non-Goals:**
- No new features. No changes to persisted data shape. No changes to the canonical tier classification of Group (still content-tier).
- No edge-selection keyboard shortcut changes (the Delete-on-selected-edge behavior was spec'd in an earlier change and is unchanged).

## Decisions

### D1: 100% leaf width + bottom-up container widening

Leaves (non-container children) size to `parent.width − 2 × STACK_PADDING_X` on every layout pass. Containers compute their width bottom-up: `requiredWidth = CONTAINER_MIN_W` for any container without Group descendants; each enclosing container that contains a Group adds `2 × STACK_PADDING_X` to the width so inner content is never squeezed.

**Why:** When a Group is nested in a Page, the Group content width must match the outer Page content width (so Likert labels don't re-wrap on nesting). Widening the enclosing container, rather than narrowing children, was the user's requested model.

**Trade-off:** Deep nesting produces wide containers. Mitigated by `MAX_GROUP_NEST_DEPTH = 10`.

### D2: Dual-skeleton preview (origin + target)

During a cross-container drag, the source container keeps a skeleton at the origin slot for the duration of the drag. This prevents the visible "shrink-then-grow" flicker as the node detaches. A second skeleton appears at the drop target. If the user drags back into the origin container, the two coincide and a single skeleton is shown.

When the pointer crosses from origin into a different container, the origin skeleton is released — the source container shrinks. This signals to the user that the node is leaving.

In same-container reorder, only the target skeleton appears (showing a preserved origin slot would double the gap).

**Why:** Users complained about the source container collapsing on drag-start. Preserving the slot matches how Finder/Keynote handle drag-reorder.

### D3: Apple-subtle placeholder styling

Previous placeholder: dashed 2px blue border with pulse animation. Replaced with a 1px solid hairline border in indigo at 22% alpha, a 6% fill, rounded-8 corners, and no animation. A faint inset white highlight adds depth.

The placeholder is rendered by CSS on the React Flow node wrapper itself (`.react-flow__node-drop_preview`) rather than by the inner component. The inner `DropPreviewNode` component returns `null`. This avoids a measurement feedback loop: a skeleton with a ResizeObserver-measured inner element triggered dimension changes that re-ran `displayNodes` on every frame, preventing the skeleton from settling to paint.

**Trade-off:** Pre-populating `measured: { width, height }` on the skeleton node object is a defensive second line of defense — even if the styling moved back inside a component, React Flow won't run its ResizeObserver.

### D4: Hysteresis at container boundaries

`onNodeDrag` remembers the previously-targeted container in a ref. On each pointer move, `findContainerAtPosition` returns the innermost container under the cursor (sorted by `parentId` depth descending). If the innermost container differs from the last target, we check whether the pointer is still inside the last target's bounds — if it is, we keep the last target.

**Why:** Without hysteresis, the target flipped between Page and a nested Group whenever the cursor approached the Group's edge, producing visible skeleton jitter.

### D5: Apple-style Add Node panel animation

Panel slides in from the left using a Framer Motion spring (`stiffness: 340, damping: 34, mass: 0.9`) with a short opacity fade using Apple's signature ease curve `[0.32, 0.72, 0, 1]`. The "Add Node" floating trigger button has its own softer spring for enter/exit.

The panel now renders three visual category sections in order: **Page-tier**, **Containers**, **Content-tier**. Group is placed in the Containers section purely for UI clarity — `Group.tier` in the registry remains `'content'`, and the validation (`ALLOWED_CHILDREN`, drop checks) treats Group as content-tier.

### D6: Edge selection pink outline

`.react-flow__edge.selected .react-flow__edge-path` receives `stroke: #EA4C89` and `stroke-width: 3px`. The brand pink is the Parlay primary (same as action buttons). No change to the edge geometry or default (unselected) styling.

### D7: Group-in-Group depth cap at 10

On any drop of a `group` node, the canvas walks the target container's parent chain; if the resulting Group depth would exceed 10, the drop is rejected with a sonner toast ("Cannot nest Groups more than 10 levels deep"). The cap exists to keep the required container width bounded (each level adds `2 × STACK_PADDING_X = 24px`). At depth 10, the outermost Page is ~440px wide, still reasonable on-canvas.

### D8: Group visual redesign as "nested Page"

Group now uses `rounded-xl border-2` with `bg-blue-50/40` and `border-blue-200` (selected: `border-blue-500`), a header bar with the `Layers` icon and label, plus optional `⚡` (condition) and `🔀` (shuffle) indicators. This mirrors the Page node's look but with lighter tints.

**Why:** The user asked for the Group to "look like a page inside a page" so the canvas reads as nested containers.

## Risks / Trade-offs

- **Cross-container UX edge cases**: If the user drags a node outside any container and back into origin, there's a single frame where the skeleton disappears and reappears. Acceptable; matches OS-level DnD conventions.
- **Depth cap is arbitrary**: 10 is a guess. If users hit it, we can raise or compute dynamically based on viewport width. No data migration needed.
- **Measurement ergonomics**: Pre-populating `measured` on skeletons works with React Flow v12 but is loosely coupled to the internals. If React Flow changes the measurement contract, we may need to adapt.
