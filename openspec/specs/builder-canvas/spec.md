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

Start -> End directly (with no Pages between) is NOT a valid flow.
The system SHALL show a warning if the only path is Start -> End.

### Requirement: Node containment constraint
The system SHALL require all content-tier nodes (card, likert, single_choice,
multi_choice, email_collection) and Group nodes to be children of a Page
or PageGroup node via React Flow parentId. All child nodes SHALL have
`extent: 'parent'` set to prevent them from being dragged outside their
container's boundaries.
LLM nodes (scripted_llm, real_llm) are page-tier and exist at the
canvas root level — they are NOT placed inside containers.
The system SHALL reject any attempt to place a content-tier node on the
canvas root with a toast error: "All nodes must be inside a Page or Page Group."

### Requirement: Add Node panel behavior
The system SHALL show page-tier node types (Page, PageGroup, Scripted LLM,
Real LLM) as always-available in the Add Node panel.
The system SHALL show content-tier node types (and Group) only when a Page,
PageGroup, or Group node is currently selected or active on the canvas.
This prevents content-tier nodes from being added to the canvas root.

### Requirement: Container nesting rules enforcement
The system SHALL enforce the following parent -> allowed children:
- page:       group, card, likert, single_choice, multi_choice, email_collection
- page_group: group, card, likert, single_choice, multi_choice, email_collection
- group:      card, likert, single_choice, multi_choice, email_collection
              (NOT page, page_group, scripted_llm, real_llm, or other groups)
The system SHALL reject invalid drops with a visible inline error indicator.

### Requirement: Start node edge constraint
The system SHALL allow exactly one outgoing edge from the Start node.
If the user draws a second edge from Start, the system SHALL show a warning
in the node editor panel.

### Requirement: End node edge constraint
The system SHALL allow zero outgoing edges from the End node.
The system SHALL allow multiple incoming edges to End from any page-tier node.

### Requirement: Dead path validation
The system SHALL validate that every page-tier node except the End node
has at least one outgoing edge. Nodes without outgoing edges SHALL display
a red warning indicator on the canvas node and in the side panel.
For Card nodes: every button's sourceHandle SHALL have an outgoing edge.
Buttons without edges SHALL display a warning indicator.
The system SHALL show a summary warning in the builder toolbar if any
dead paths exist (e.g., "2 nodes have no outgoing edges").
Dead path warnings SHALL NOT block saving but SHALL block publishing
(draft -> active transition).

### Requirement: Auto-save mechanics
The system SHALL debounce-save the complete React Flow state (nodes, edges,
viewport) and color_scheme to facets.flow_definition and facets.color_scheme
2 seconds after any change. The system SHALL display an unsaved indicator
dot in the toolbar. The indicator SHALL clear on successful save.

### Requirement: Concurrent editing (last write wins)
If the same facet is open in multiple browser tabs, each tab auto-saves
independently using a last-write-wins strategy. No optimistic locking or
conflict detection is implemented.

### Requirement: Right panel tab structure
The system SHALL display a tabbed right panel with two tabs:
- "Node" tab (default): context-sensitive editor for the currently selected node
- "Form Settings" tab: color scheme, component gallery carousel, round-robin toggle

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
  Publish is blocked if dead paths exist (shows error tooltip).

### Requirement: Canvas node visual indicators
Every canvas node (except Start/End) SHALL display:
- Type badge (colored pill)
- Label (2-line truncated)
- Slug (muted small text) — only for nodes that have slugs
- Funnel icon if a condition formula is set on the node
- Database-off icon (muted) if record_response = false on the node

#### Scenario: Content node dropped outside container
- GIVEN the user drags a Likert node from the Add Node panel
- WHEN they release it on the canvas root (outside any Page or PageGroup)
- THEN the system rejects the drop
- AND displays a toast: "All nodes must be inside a Page or Page Group"
- AND the node does not appear on the canvas

#### Scenario: LLM node added to canvas root
- GIVEN the user drags a Real LLM node from the Add Node panel
- WHEN they release it on the canvas root
- THEN the Real LLM node appears at the root level (page-tier)
- AND it can be connected via edges to other page-tier nodes

#### Scenario: Valid drop into container
- GIVEN the user has a Page node on the canvas
- WHEN they drag a Likert node and drop it inside the Page
- THEN the Likert node appears as a child of the Page
- AND the Page visually expands to contain it

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
