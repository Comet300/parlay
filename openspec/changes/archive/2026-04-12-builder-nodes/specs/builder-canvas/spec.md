## MODIFIED Requirements

### Requirement: Publish validation checklist
The system SHALL block the draft → active transition if ANY of the
following conditions are true:

- Dead paths exist (page-tier nodes without outgoing edges, or Card
  buttons without outgoing edges).
- Alias conflicts exist — two or more response-bearing nodes share the
  same non-empty alias within the facet.
- Alias pattern violations exist — a response-bearing node has a
  non-empty alias that does not match `ALIAS_PATTERN` or that exceeds
  `ALIAS_MAX_LENGTH`.
- A real_llm node references a provider that is not configured in the
  form owner's LiteLLM settings. The system SHALL validate provider
  availability at publish time; if LiteLLM accepts the provider,
  Parlay SHALL accept it.

An empty alias on a response-bearing node MUST NOT be a publish
blocker — alias is optional on every node type that accepts one.

The system MUST NOT require Pages between Start and End. A valid flow
MAY consist of just `Start` (with WYSIWYG content) → `End` (with
WYSIWYG content) and no intermediate nodes. This permits simple
intro/thank-you forms.

#### Scenario: Publish blocked by alias conflict
- **GIVEN** two response-bearing nodes both have `alias: "q-age"`
- **WHEN** the user attempts to publish the facet
- **THEN** the system SHALL block the transition with an error listing the conflict
- **AND** both nodes SHALL be highlighted with a warning indicator

#### Scenario: Publish blocked by invalid alias pattern
- **GIVEN** a Likert node has `alias: "Q Age!"`
- **WHEN** the user attempts to publish the facet
- **THEN** the system SHALL block the transition
- **AND** the server SHALL return an error of the form `Node "<label>" has invalid alias "Q Age!"`

#### Scenario: Publish allowed with empty aliases
- **GIVEN** a facet has 5 response-bearing nodes, all with `alias = ""`
- **AND** no dead paths or other blockers exist
- **WHEN** the user clicks Publish
- **THEN** the transition SHALL succeed and the facet status SHALL become `active`

#### Scenario: Dead path blocks publish
- **GIVEN** a Page node has no outgoing edge
- **WHEN** the user attempts to publish the facet
- **THEN** the system SHALL block the transition with an error
- **AND** SHALL highlight the Page node with a red warning indicator

### Requirement: Canvas node visual indicators
Content-tier canvas nodes (stacked inside containers) SHALL display a
compact row layout: type icon badge (colored square), truncated label,
and type name subtitle. Likert, single_choice, multi_choice, and
email_collection nodes SHALL additionally display inline icons for
condition (funnel) and `record_response = false` (database-off). Card
nodes omit the inline condition/record icons because the right edge of
the row is reserved for button source handles (see builder-card-node
spec). Group nodes display only their header bar (label + shuffle
indicator), since children are rendered inside the group container.

Page-tier nodes (Page, PageGroup, LLM) SHALL display a header bar with
icon, label, and relevant metadata (e.g. `maxQuestionsPerPage` for
PageGroup, provider/model/maxTurns for Real LLM, turn count for
Scripted LLM).

Start and End nodes SHALL display a plain-text preview (up to 50
chars) of their `markdownContent` with all markdown syntax stripped.

#### Scenario: Content node dropped outside container
- **GIVEN** the user drags a Likert node from the Add Node panel
- **WHEN** they release it on the canvas root (outside any Page or PageGroup)
- **THEN** the system SHALL reject the drop
- **AND** SHALL display a sonner toast: "Content nodes must be placed inside a Page or Page Group"
- **AND** the node MUST NOT appear on the canvas

#### Scenario: Content node dropped on LLM node
- **GIVEN** the user drags a Likert node from the Add Node panel
- **WHEN** they release it on a Real LLM node
- **THEN** the system SHALL reject the drop
- **AND** SHALL display a sonner toast: "LLM nodes cannot contain child elements"

#### Scenario: LLM node added to canvas root
- **GIVEN** the user drags a Real LLM node from the Add Node panel
- **WHEN** they release it on the canvas root
- **THEN** the Real LLM node SHALL appear at the root level (page-tier)
- **AND** it SHALL be connectable via edges to other page-tier nodes

#### Scenario: Valid drop into container
- **GIVEN** the user has a Page node on the canvas
- **WHEN** they drag a Likert node and drop it inside the Page
- **THEN** the Likert node SHALL appear in the Page's vertical stack
- **AND** the Page SHALL auto-expand its height to fit the new child
- **AND** a skeleton placeholder SHALL appear at the drop position during drag

#### Scenario: Cross-container drag
- **GIVEN** a Likert node is inside Page A
- **WHEN** the user drags the Likert node and drops it inside Page B
- **THEN** the Likert SHALL be removed from Page A's stack (A shrinks)
- **AND** the Likert SHALL appear in Page B's stack at the drop position (B grows)
- **AND** a skeleton placeholder SHALL show the insertion point during drag

#### Scenario: Cross-container drag to invalid target
- **GIVEN** a Likert node is inside Page A
- **WHEN** the user drags the Likert node and drops it on the canvas root
- **THEN** the system SHALL show a toast: "Content nodes must be placed inside a Page or Page Group"
- **AND** the Likert SHALL snap back to its original position in Page A

#### Scenario: Auto-save after edit
- **GIVEN** the user modifies a node label
- **WHEN** 2 seconds pass with no further changes
- **THEN** the system SHALL save `flow_definition` and `color_scheme` to Supabase
- **AND** the unsaved indicator dot SHALL disappear

#### Scenario: Invalid edge connection
- **GIVEN** the user tries to draw an edge from a Likert node
- **WHEN** they drag from the Likert's handle
- **THEN** the system SHALL reject the edge (content-tier nodes cannot have edges)
- **AND** SHALL show a toast: "Only pages and LLM nodes can be connected by edges"

#### Scenario: Publish blocked by missing provider
- **GIVEN** a real_llm node references provider "anthropic"
- **AND** the form owner has not configured an "anthropic" provider in settings
- **WHEN** the user attempts to publish
- **THEN** the system SHALL block the transition with an error: `LLM node '{label}' references unconfigured provider 'anthropic'`

#### Scenario: Mobile builder canvas interaction
- **GIVEN** the user is on `/build/:facetId` at 375px width
- **WHEN** the page renders
- **THEN** the React Flow canvas SHALL fill the viewport with touch pan/zoom
- **AND** the toolbar SHALL be compact with a menu icon for overflow actions
- **WHEN** the user taps a node on the canvas
- **THEN** a node config popup SHALL open over the canvas
- **WHEN** the user taps the Form Settings toolbar icon
- **THEN** a slide-over menu SHALL appear from the side with color scheme and settings

#### Scenario: Node config popup on desktop
- **GIVEN** the user is on `/build/:facetId` at 1280px width
- **WHEN** the user clicks a Likert node on the canvas
- **THEN** the canvas SHALL animate to center the selected node (fitView, maxZoom: 1)
- **AND** a centered popup with a semi-transparent backdrop SHALL open showing the Likert editor fields
- **WHEN** the user clicks the backdrop (outside the popup)
- **THEN** the popup SHALL close and the node SHALL be deselected
