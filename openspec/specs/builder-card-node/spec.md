# builder-card-node Specification

## Purpose
Define the Card node — a generic full-screen content block with WYSIWYG
markdown and N labeled buttons that act as branching handles in the flow graph.

## Requirements

### Requirement: Card node data schema
The card node data SHALL include:
- label: string
- markdownContent: string (Milkdown WYSIWYG content)
- buttons: Array<{ id: string, label: string }>

Each button id SHALL correspond to a unique sourceHandle on the canvas node.
Each button MUST have exactly one outgoing edge in the flow graph (enforced
by dead path validation — see builder-canvas spec).

### Requirement: Canvas representation
The card canvas node SHALL display:
- A wider block compared to question nodes
- A truncated preview of the markdownContent (first 80 chars)
- A button count badge (e.g. "2 buttons")
- One labeled output handle per button, on the right side of the canvas node,
  labeled with the button's label text (truncated)
- A red warning indicator per button handle that has no outgoing edge

### Requirement: Side panel editor
The card node config popup SHALL include:
- A Milkdown Crepe editor for markdownContent (with image/file upload support)
- A button list manager with:
  - Add button control
  - Remove button control per button
  - Drag-to-reorder per button
  - Label text input per button

### Requirement: Card placement
Card nodes are content-tier nodes and MUST be placed inside a Page or
PageGroup container. They render inline with other content nodes on the page.

### Requirement: Routing in the player
When a respondent clicks a card button:
- The system SHALL follow the outgoing edge from that button's sourceHandle
- This overrides the parent container's default outgoing edge
- If the Card is inside a PageGroup and is on a virtual page that is NOT
  the last virtual page, clicking a Card button skips all remaining virtual
  pages and follows the Card's edge target immediately
- The system SHALL record the clicked button's label as the response value
  if record_response = true on the card node
- Card buttons ARE the Continue mechanism — no separate Continue button is
  shown for Card nodes in the player

### Requirement: No per-option routing for question nodes
The system SHALL NOT support per-option outgoing edges on likert,
single_choice, or multi_choice nodes.
Branching in the flow graph is exclusively accomplished via Card nodes.
Question nodes always follow their single outgoing edge.

### Requirement: Dead path validation for buttons
If a card button has no outgoing edge drawn from its sourceHandle, the
system SHALL show a red warning indicator on the canvas node and in the
node config popup. Dead path warnings SHALL block publishing (see builder-canvas
spec dead path validation requirement).

#### Scenario: Card with two routing buttons
- GIVEN a Card node has buttons:
    { id: "btn_yes", label: "Yes, continue" }
    { id: "btn_skip", label: "Skip this section" }
- AND btn_yes edge targets PageNode A
- AND btn_skip edge targets PageNode B
- WHEN a respondent clicks "Skip this section"
- THEN the system follows the btn_skip edge to PageNode B
- AND records "Skip this section" as the card node response value
- AND navigates to PageNode B (client-side state change, no URL update)

#### Scenario: Card as Continue mechanism
- GIVEN a Card node with one button "Got it"
- WHEN the respondent reads the card content and clicks "Got it"
- THEN the system proceeds to the next node
- AND no separate Continue button is shown below the card content
