# builder-canvas Specification

## Purpose
Define the visual flow builder canvas layout, node placement rules,
edge routing model, dead-path validation, and save mechanics using React Flow v12.

## Requirements

### Requirement: Canvas orientation and anchors
The system SHALL render the canvas in a horizontal left-to-right orientation.
The Start node SHALL be anchored to the left side of the canvas.
The End node SHALL be anchored to the right side of the canvas.
Start and End are semantic anchor nodes for visual representation only.
Start and End SHALL NOT be deletable or repositionable off their anchor sides.

### Requirement: Edge routing model
Edges define the directed flow between page-tier nodes. The valid edge
connections are:

- **Start** -> Page, PageGroup, scripted_llm, real_llm
- **Page** -> Page, PageGroup, scripted_llm, real_llm, End
- **PageGroup** -> Page, PageGroup, scripted_llm, real_llm, End
- **scripted_llm** -> Page, PageGroup, scripted_llm, real_llm, End
- **real_llm** -> Page, PageGroup, scripted_llm, real_llm, End
- **Card button handle** -> Page, PageGroup, scripted_llm, real_llm, End
  (Card buttons create branch points; their edges override the parent
  container's default outgoing edge for routing purposes)
- **End** -> nothing (zero outgoing edges)

Content-tier nodes (likert, single_choice, multi_choice, email_collection,
card, group) do NOT have their own edges. They exist as children inside
Page/PageGroup containers. The only exception is Card button handles,
which create sourceHandle edges from within a Page/PageGroup.

Start -> End directly (with no Pages between) is a valid flow. It
renders only the Start screen (if it has WYSIWYG content) followed by the
End screen. No warning is shown for this configuration.

### Requirement: Node containment constraint
The system SHALL require all content-tier nodes (card, likert, single_choice,
multi_choice, email_collection) and Group nodes to be children of a Page
or PageGroup node via React Flow parentId.
LLM nodes (scripted_llm, real_llm) are page-tier and exist at the
canvas root level — they are NOT placed inside containers.
Toast notifications (via sonner) SHALL appear for invalid drops:
- Canvas root: "Content nodes must be placed inside a Page or Page Group"
- LLM node: "LLM nodes cannot contain child elements"
- Invalid nesting: "Cannot place {type} inside a {container}"

### Requirement: Stacked child layout (Scratch-style)
Children inside Page, PageGroup, and Group containers SHALL NOT be
freely positioned. They SHALL be laid out in a vertical top-to-bottom
stack with fixed dimensions:
- Fixed child width (176px) and height (48px)
- 8px vertical gap between children
- 44px top padding (container header area), 12px side and bottom padding
- Container height auto-scales to fit all children — no scrolling

Child order is determined by vertical position (topmost = first).
Children are draggable for reorder: during drag, the node is detached
from its parent (parentId removed, position converted to absolute) so
it can move freely across the canvas. On drop:
- If dropped on a valid container: the node is reparented at the
  insertion index determined by the drop y-position
- If dropped on an invalid target: a toast is shown and the node
  snaps back to its original container and position

During drag, a skeleton placeholder (dashed blue border, pulse
animation) SHALL appear at the prospective insertion position inside
the target container, and siblings below SHALL shift down to make room.

Cross-container drag is supported: a child can be dragged from one
Page to another Page/PageGroup/Group, subject to nesting rules.

### Requirement: Add Node panel behavior
The system SHALL show all node types (page-tier and content-tier) as
always-available and always-draggable in the Add Node panel. Selection
state does NOT gate which nodes are draggable — it only controls
whether the node config popup is shown.
Drop validation is enforced on drop, not on drag:
- Content-tier nodes dropped on canvas root SHALL be rejected with a
  toast: "Content nodes must be placed inside a Page or Page Group"
- Content-tier nodes dropped on LLM nodes SHALL be rejected with a
  toast: "LLM nodes cannot contain child elements"
- Content-tier nodes dropped on a valid container SHALL be accepted
  and inserted into the container's stack at the drop position

### Requirement: Container nesting rules enforcement
The system SHALL enforce the following parent -> allowed children:
- page:       group, card, likert, single_choice, multi_choice, email_collection
- page_group: group, card, likert, single_choice, multi_choice, email_collection
- group:      card, likert, single_choice, multi_choice, email_collection
              (NOT page, page_group, scripted_llm, real_llm, or other groups)
The system SHALL reject invalid drops with a sonner toast error
(see Node containment constraint requirement for the exact messages).

### Requirement: Start node edge constraint
The system SHALL allow exactly one outgoing edge from the Start node.
If the user draws a second edge from Start, the system SHALL show a warning
in the node config popup.

### Requirement: End node edge constraint
The system SHALL allow zero outgoing edges from the End node.
The system SHALL allow multiple incoming edges to End from any page-tier node.

### Requirement: Dead path validation
The system SHALL validate that every page-tier node except the End node
has at least one outgoing edge. Nodes without outgoing edges SHALL display
a red warning indicator on the canvas node and in the node config popup.
For Card nodes: every button's sourceHandle SHALL have an outgoing edge.
Buttons without edges SHALL display a warning indicator.
The system SHALL show a summary warning in the builder toolbar if any
dead paths exist (e.g., "2 nodes have no outgoing edges").
Dead path warnings SHALL NOT block saving but SHALL block publishing
(draft -> active transition).

### Requirement: Publish validation checklist
The system SHALL block the draft -> active transition if ANY of the
following conditions are true:
- Dead paths exist (page-tier nodes without outgoing edges, Card buttons
  without outgoing edges)
- Slug conflicts exist (two or more content nodes share the same slug)
- A real_llm node references a provider not configured in the form owner's
  LiteLLM settings (the system SHALL validate provider availability at
  publish time; if LiteLLM accepts the provider, Parlay accepts it)

The system SHALL NOT require Pages between Start and End. A valid flow
may consist of just Start (with WYSIWYG content) -> End (with WYSIWYG
content) and no intermediate nodes. This allows simple intro/thank-you
forms.

### Requirement: Auto-save mechanics
The system SHALL debounce-save the complete React Flow state (nodes, edges,
viewport) and color_scheme to facets.flow_definition and facets.color_scheme
2 seconds after any change. The system SHALL display an unsaved indicator
dot in the toolbar. The indicator SHALL clear on successful save.

### Requirement: Concurrent editing (last write wins)
If the same facet is open in multiple browser tabs, each tab auto-saves
independently using a last-write-wins strategy. No optimistic locking or
conflict detection is implemented.

### Requirement: Node config popup
When a node is selected on the canvas (single-click or tap), the system
SHALL center the canvas on the selected node (fitView with maxZoom: 1)
and open a centered popup with a semi-transparent backdrop showing the
context-sensitive editor for that node.

On desktop, the popup SHALL start at 420px width and support a
maximize/minimize toggle. Maximized mode expands to 680px width.
Width and height animate smoothly on toggle (200ms ease).
On mobile (<768px), the popup SHALL render as a bottom sheet.

The popup SHALL be dismissible via: clicking the backdrop, Escape key,
or the close button. Deselecting the node on the canvas SHALL also
close the popup.

Interactions inside the popup (typing in inputs, editing markdown
content in Crepe editors, clicking action buttons) SHALL NOT close the
popup. Specifically, the builder store's onNodesChange handler SHALL
ignore deselect-all changes when the active element is an input,
textarea, or contentEditable descendant of the popup. This prevents
React Flow's focus-loss-triggered deselections from closing the popup
while the user is editing its fields.

The popup SHALL include a delete button (for all nodes except Start
and End) in the header bar alongside the maximize/minimize and close
buttons.

### Requirement: Form Settings access
The builder toolbar SHALL include a "Form Settings" button that opens a
side panel (desktop) or slide-over menu (mobile) containing:
- Color scheme configuration (theme picker, color pickers)
- Component gallery carousel

The round-robin toggle and default facet selector live in the FacetSwitcher
dropdown (see builder-facet-switcher spec), not in the Form Settings panel.

### Requirement: Mobile builder layout
On mobile viewports (< 768px), the builder SHALL:
- Render the React Flow canvas as the primary view with standard
  touch pan/zoom gestures (pinch-to-zoom, drag-to-pan)
- Move all non-canvas content (toolbar actions, Form Settings, facet
  switcher) into slide-over side menus accessible via toolbar icons,
  preventing collision between side panel scrolling and canvas pan/zoom
- Open node config as a bottom sheet (slides up from the bottom)
- Show a compact toolbar at the top with essential actions only
  (back, form title, menu icon for additional actions)

### Requirement: Builder toolbar
The builder toolbar (top of the builder page) SHALL contain, in order:
- Back to dashboard link/button (left side)
- Form title (inline editable, debounce-save on blur)
- Facet switcher dropdown (see builder-facet-switcher spec)
- Unsaved indicator dot (appears when changes are pending)
- Dead path warning badge (e.g., "2 dead paths" — clickable to highlight them)
- Publish/Unpublish button:
  - Draft facet: "Publish" button (primary style)
  - Active facet: "Unpublish" button (secondary style) + copy public URL button
  - Archived facet: "Re-activate" button
  Publish is blocked if any publish validation fails (see publish
  validation checklist requirement). Shows an error tooltip listing all blockers.
- Form actions kebab menu (rightmost) with:
  - Archive form: sets all non-archived facets to status 'archived'
    (with confirmation dialog) and navigates to /dashboard

### Requirement: Canvas node visual indicators
Content-tier canvas nodes (stacked inside containers) SHALL display a
compact row layout: type icon badge (colored square), truncated label,
and type name subtitle. Likert, single_choice, multi_choice, and
email_collection nodes SHALL additionally display inline icons for
condition (funnel) and record_response=false (database-off). Card
nodes omit the inline condition/record icons because the right edge
of the row is reserved for button source handles (see builder-card-node
spec). Group nodes display only their header bar (label + shuffle
indicator), since children are rendered inside the group container.

Page-tier nodes (Page, PageGroup, LLM) SHALL display a header bar with
icon, label, and relevant metadata (e.g. maxQuestionsPerPage for
PageGroup, provider/model/maxTurns for Real LLM, turn count for
Scripted LLM).

Start and End nodes SHALL display a plain-text preview (up to 50 chars)
of their markdownContent with all markdown syntax stripped.

#### Scenario: Content node dropped outside container
- GIVEN the user drags a Likert node from the Add Node panel
- WHEN they release it on the canvas root (outside any Page or PageGroup)
- THEN the system rejects the drop
- AND displays a sonner toast: "Content nodes must be placed inside a Page or Page Group"
- AND the node does not appear on the canvas

#### Scenario: Content node dropped on LLM node
- GIVEN the user drags a Likert node from the Add Node panel
- WHEN they release it on a Real LLM node
- THEN the system rejects the drop
- AND displays a sonner toast: "LLM nodes cannot contain child elements"

#### Scenario: LLM node added to canvas root
- GIVEN the user drags a Real LLM node from the Add Node panel
- WHEN they release it on the canvas root
- THEN the Real LLM node appears at the root level (page-tier)
- AND it can be connected via edges to other page-tier nodes

#### Scenario: Valid drop into container
- GIVEN the user has a Page node on the canvas
- WHEN they drag a Likert node and drop it inside the Page
- THEN the Likert node appears in the Page's vertical stack
- AND the Page auto-expands its height to fit the new child
- AND a skeleton placeholder appears at the drop position during drag

#### Scenario: Cross-container drag
- GIVEN a Likert node is inside Page A
- WHEN the user drags the Likert node and drops it inside Page B
- THEN the Likert is removed from Page A's stack (A shrinks)
- AND the Likert appears in Page B's stack at the drop position (B grows)
- AND a skeleton placeholder showed the insertion point during drag

#### Scenario: Cross-container drag to invalid target
- GIVEN a Likert node is inside Page A
- WHEN the user drags the Likert node and drops it on the canvas root
- THEN the system shows a toast: "Content nodes must be placed inside a Page or Page Group"
- AND the Likert snaps back to its original position in Page A

#### Scenario: Auto-save after edit
- GIVEN the user modifies a node label
- WHEN 2 seconds pass with no further changes
- THEN the system saves flow_definition and color_scheme to Supabase
- AND the unsaved indicator dot disappears

#### Scenario: Dead path blocks publish
- GIVEN a Page node has no outgoing edge
- WHEN the user attempts to publish the facet
- THEN the system blocks the transition with an error
- AND highlights the Page node with a red warning indicator

#### Scenario: Invalid edge connection
- GIVEN the user tries to draw an edge from a Likert node
- WHEN they drag from the Likert's handle
- THEN the system rejects the edge (content-tier nodes cannot have edges)
- AND shows a toast: "Only pages and LLM nodes can be connected by edges"

#### Scenario: Publish blocked by slug conflict
- GIVEN two content nodes both have slug "q-age"
- WHEN the user attempts to publish the facet
- THEN the system blocks the transition with an error listing the conflict
- AND both nodes are highlighted with a warning indicator

#### Scenario: Publish blocked by missing provider
- GIVEN a real_llm node references provider "anthropic"
- AND the form owner has not configured an "anthropic" provider in settings
- WHEN the user attempts to publish
- THEN the system blocks the transition with an error:
  "LLM node '{label}' references unconfigured provider 'anthropic'"

#### Scenario: Mobile builder canvas interaction
- GIVEN the user is on /build/:facetId at 375px width
- WHEN the page renders
- THEN the React Flow canvas fills the viewport with touch pan/zoom
- AND the toolbar is compact with a menu icon for overflow actions
- WHEN the user taps a node on the canvas
- THEN a node config popup opens over the canvas
- WHEN the user taps the Form Settings toolbar icon
- THEN a slide-over menu appears from the side with color scheme and settings

#### Scenario: Node config popup on desktop
- GIVEN the user is on /build/:facetId at 1280px width
- WHEN the user clicks a Likert node on the canvas
- THEN the canvas animates to center the selected node (fitView, maxZoom: 1)
- AND a centered popup with a semi-transparent backdrop opens showing
  the Likert editor fields
- WHEN the user clicks the backdrop (outside the popup)
- THEN the popup closes and the node is deselected
