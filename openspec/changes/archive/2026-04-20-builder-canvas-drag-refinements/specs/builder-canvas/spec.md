## ADDED Requirements

### Requirement: Selected edge styling
When the user clicks an edge on the canvas, the system SHALL render that edge with a brand-pink stroke (`#EA4C89`) at 3px width to indicate selection. Unselected edges SHALL retain the default slate-gray style. Only the edge `path` SHALL be restyled; the interaction hit area MUST remain transparent.

#### Scenario: Clicking an edge highlights it in pink
- **GIVEN** an edge between two page-tier nodes on the canvas
- **WHEN** the user clicks the edge
- **THEN** the edge path SHALL render with stroke color `#EA4C89`
- **AND** the stroke width SHALL be 3px
- **AND** clicking any other edge or empty canvas SHALL deselect and revert the stroke

## MODIFIED Requirements

### Requirement: Stacked child layout (Scratch-style)
Children inside Page, PageGroup, and Group containers SHALL NOT be freely positioned. They SHALL be laid out in a vertical top-to-bottom stack:

- Leaf (non-container) children SHALL fill 100% of their parent container's inner width — that is, `parent.width − 2 × STACK_PADDING_X`. They SHALL have fixed height 48px.
- 8px vertical gap between children.
- 44px top padding (container header area); 12px side and bottom padding.
- Container height auto-scales to fit all children — no scrolling.
- A container whose children include a Group SHALL widen so that the inner Group still has the base content width. Each enclosing container that holds a Group (directly or transitively) SHALL add `2 × STACK_PADDING_X` to its own width for that nesting level.
- `MAX_GROUP_NEST_DEPTH = 10` SHALL cap Group nesting depth defensively, even if future rule relaxations permit Group-in-Group.

Child order is determined by vertical position (topmost = first). Children are draggable for reorder: during drag, the node is detached from its parent (parentId removed, position converted to absolute) so it can move freely across the canvas. On drop:

- If dropped on a valid container: the node is reparented at the insertion index determined by the drop y-position.
- If dropped on an invalid target: a sonner toast is shown and the node snaps back to its original container and position.

Container-finding SHALL use absolute canvas coordinates (walking the parentId chain to compute each container's absolute bounds) and SHALL return the deepest valid container that contains the pointer. Hysteresis SHALL be applied: once a container is targeted during a drag, the pointer must clearly leave its absolute bounds before a different container becomes the target, preventing visible jitter at shared container edges.

**Snap preview** SHALL be rendered as an Apple-subtle placeholder at the prospective insertion position inside the target container. The placeholder SHALL use a 1px solid hairline border in indigo at ~22% alpha, a ~6% indigo fill, 8px border radius, and MUST NOT animate or pulse. Siblings below the insertion point SHALL shift down to make room.

**Origin slot preservation** applies during cross-container drags: the system SHALL render a second placeholder at the origin slot while the pointer remains inside the source container, so the source container does not visibly shrink on drag-start. When the pointer enters a container different from the origin, the origin placeholder SHALL be released and the source container SHALL shrink to reflect the node's departure. During a same-container reorder (pointer still inside the origin container), only the drop-target placeholder SHALL render (showing a duplicate origin placeholder would double the visible gap).

**Ancestor size propagation**: while a placeholder is shown, the system SHALL propagate the resulting height/width changes up the container ancestry so that parent Pages/PageGroups widen and lengthen to fully contain the growing descendant, preventing overflow during the preview.

**External (sidebar) drag** SHALL trigger the same placeholder + make-room behavior. When the user drags a node-type from the Add Node panel and hovers over a valid container, a placeholder SHALL appear at the prospective insertion position and the container SHALL grow accordingly. On drop, the placeholder is removed and the real node replaces it.

Cross-container drag is supported: a child can be dragged from one Page to another Page/PageGroup/Group, subject to the container nesting rules.

#### Scenario: Leaf fills parent inner width
- **GIVEN** a Page at default width containing a Likert child
- **WHEN** the canvas renders
- **THEN** the Likert node's rendered width SHALL equal `Page.width − 2 × STACK_PADDING_X`

#### Scenario: Page widens when a Group is dropped inside
- **GIVEN** a Page with no children and default width
- **WHEN** the user drops a Group from the Add Node panel inside the Page
- **THEN** the Page's width SHALL grow by `2 × STACK_PADDING_X`
- **AND** the Group's inner content width SHALL equal the original Page content width

#### Scenario: Snap placeholder appears during sidebar drag
- **GIVEN** a Page with one Likert child
- **WHEN** the user drags a second Likert from the Add Node sidebar and hovers below the existing Likert
- **THEN** a soft indigo-hairline placeholder SHALL appear at the insertion slot
- **AND** the Page's height SHALL grow to contain the extra slot
- **AND** the placeholder MUST NOT pulse or animate

#### Scenario: Origin slot preserved on cross-container drag
- **GIVEN** two Pages (A and B), each containing one Likert, and the user drags the Likert out of Page A with the pointer over Page B
- **THEN** Page A SHALL retain a placeholder at the Likert's original slot so its height does not shrink
- **AND** Page B SHALL show a placeholder at the prospective drop slot
- **AND** when the user drags back into Page A, the two placeholders coincide and only one is shown

#### Scenario: Same-container reorder shows only target placeholder
- **GIVEN** a Page with three children A, B, C, and the user drags B
- **WHEN** the pointer remains inside the Page
- **THEN** the system SHALL render exactly one placeholder — at the current drop target — and no separate origin placeholder

#### Scenario: Container target hysteresis
- **GIVEN** a Page containing a Group, and the user is dragging a Likert whose cursor is over the Group
- **WHEN** the pointer moves to the exact shared edge between the Group and the Page (but still inside the Group's bounds)
- **THEN** the target container SHALL remain the Group
- **AND** the placeholder SHALL NOT flicker between the Group's and the Page's slot lists

### Requirement: Add Node panel behavior
The system SHALL show all node types (page-tier and content-tier) as always-available and always-draggable in the Add Node panel. Selection state does NOT gate which nodes are draggable — it only controls whether the node config popup is shown.

The Add Node panel SHALL render three visual category sections in top-to-bottom order: **Page-tier**, **Containers**, **Content-tier**. The Containers section SHALL contain the Group node type; this placement is a UI-only affordance. The underlying tier classification (see builder-nodes spec: Node tier classification) SHALL remain content-tier for Group, and all validation (`ALLOWED_CHILDREN`, drop checks) SHALL treat Group as content-tier.

The panel SHALL animate in from the left using a spring (Framer Motion: `stiffness: 340, damping: 34, mass: 0.9`) combined with a 180ms opacity fade using an Apple-style ease curve `cubic-bezier(0.32, 0.72, 0, 1)`. The floating "Add Node" trigger button (shown when the panel is closed) SHALL have its own softer spring (`stiffness: 380, damping: 34, mass: 0.7`) on enter and exit. The animation MUST NOT block interaction once the panel is open.

Drop validation is enforced on drop, not on drag:

- Content-tier nodes dropped on canvas root SHALL be rejected with a toast: "Content nodes must be placed inside a Page or Page Group".
- Content-tier nodes dropped on LLM nodes SHALL be rejected with a toast: "LLM nodes cannot contain child elements".
- Content-tier nodes dropped on a valid container SHALL be accepted and inserted into the container's stack at the drop position.

#### Scenario: Panel animates in with spring
- **GIVEN** the Add Node panel is closed and the user clicks the "Add Node" trigger
- **WHEN** the panel mounts
- **THEN** the panel SHALL translate from `x: -100%` to `x: 0` with a Framer Motion spring
- **AND** opacity SHALL transition from 0 to 1 over 180ms
- **AND** the panel SHALL be interactive once the enter animation completes

#### Scenario: Panel shows three categories
- **GIVEN** the Add Node panel is open
- **WHEN** the user scans the panel contents
- **THEN** sections SHALL appear in this order: Page-tier, Containers, Content-tier
- **AND** Group SHALL appear under Containers (not Content-tier)
- **AND** Group SHALL remain draggable only as a content-tier node (rejected on canvas root)

### Requirement: Container nesting rules enforcement
The system SHALL enforce the following parent -> allowed children:
- page:       group, card, likert, single_choice, multi_choice, email_collection
- page_group: group, card, likert, single_choice, multi_choice, email_collection
- group:      card, likert, single_choice, multi_choice, email_collection
              (NOT page, page_group, scripted_llm, real_llm, or other groups)

The system SHALL additionally enforce `MAX_GROUP_NEST_DEPTH = 10` as a defensive cap: any drop of a Group whose resulting depth (root Page = 1, each enclosing Group adds 1) exceeds 10 SHALL be rejected with a sonner toast: "Cannot nest Groups more than 10 levels deep". Given the current ALLOWED_CHILDREN rules, this cap is not reachable in practice, but it bounds layout widths if Group-in-Group is ever permitted.

The system SHALL reject invalid drops with a sonner toast error (see Node containment constraint requirement for the exact messages).

#### Scenario: Group cannot contain another Group
- **GIVEN** an existing Group on the canvas
- **WHEN** the user drags a Group from the Add Node panel and drops it inside the existing Group
- **THEN** the drop SHALL be rejected with a toast
- **AND** the new Group MUST NOT appear as a child of the existing Group
