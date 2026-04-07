## ADDED Requirements

### Requirement: Default flow state for new facets
The server already inserts a default flow_definition (Start → End with connecting edge) when creating a form or cloning a facet. The client SHALL treat this server-provided default as the canonical initial state.

As a fallback, if the client loads a facet whose flow_definition is null or empty (e.g., data corruption), it SHALL initialize the canvas with:
- A Start node anchored at position { x: 0, y: 200 }
- An End node anchored at position { x: 600, y: 200 }
- A single edge connecting Start to End
- The viewport centered to fit both nodes

#### Scenario: New facet opens with server-provided default flow
- **WHEN** a user navigates to the builder for a newly created facet
- **THEN** the canvas displays the server-provided Start and End nodes with their connecting edge
- **AND** the viewport is centered to show both nodes

#### Scenario: Existing flow loads unchanged
- **WHEN** a user navigates to the builder for a facet with an existing flow_definition
- **THEN** the canvas restores the saved nodes, edges, and viewport exactly as persisted
- **AND** no default nodes are injected

#### Scenario: Fallback for null flow_definition
- **WHEN** a user navigates to the builder for a facet with null flow_definition
- **THEN** the client generates the default Start → End flow client-side
- **AND** the first auto-save persists this default to the database

### Requirement: Canvas keyboard shortcuts
The system SHALL support the following keyboard shortcuts when the canvas has focus:
- **Delete** or **Backspace**: Delete selected node(s) and/or edge(s) and their connected edges (with confirmation dialog for containers with children, per builder-nodes spec)
- **Escape**: Deselect all nodes/edges and close any open node config popup
- **Ctrl/Cmd + A**: Select all nodes on the canvas
- **Ctrl/Cmd + Z**: Undo last canvas action (node move, edge add/remove, node add/delete)
- **Ctrl/Cmd + Shift + Z** or **Ctrl/Cmd + Y**: Redo last undone action
- **Ctrl/Cmd + C**: Copy selected nodes and their internal edges to a clipboard buffer
- **Ctrl/Cmd + V**: Paste copied nodes with new IDs and offset positions; content-tier nodes are only pasted if their parent container was also copied (otherwise rejected with toast)

Undo/redo SHALL maintain a stack of up to 50 canvas states. The stack SHALL be cleared when switching facets.

### Requirement: Edge selection and deletion
The system SHALL allow users to click an edge to select it (visual highlight).
Selected edges SHALL be deletable via Delete/Backspace.
When a node is deleted, all edges connected to that node SHALL be cascade-deleted.

#### Scenario: Delete node via keyboard
- **WHEN** a Page node with 2 child Likert nodes is selected on the canvas
- **AND** the user presses Delete
- **THEN** the system shows a confirmation dialog ("Delete Page and 2 child nodes?")
- **WHEN** the user confirms
- **THEN** the Page and both Likert nodes are removed from the canvas
- **AND** all edges connected to the Page are removed

#### Scenario: Undo node deletion
- **WHEN** the user deletes a Likert node from a Page
- **AND** presses Ctrl+Z
- **THEN** the Likert node reappears in its previous position inside the Page
- **AND** any edges that were connected to it are restored

#### Scenario: Escape closes popup
- **WHEN** a node config popup is open for a selected Likert node
- **AND** the user presses Escape
- **THEN** the popup closes
- **AND** the Likert node is deselected on the canvas

#### Scenario: Delete edge via keyboard
- **WHEN** a user clicks an edge between a Page and End
- **THEN** the edge is visually highlighted as selected
- **WHEN** the user presses Delete
- **THEN** the edge is removed from the canvas
- **AND** the Page now shows a dead-path warning (no outgoing edge)

#### Scenario: Copy and paste nodes
- **WHEN** a user selects a Page node containing 2 Likert children
- **AND** presses Ctrl+C then Ctrl+V
- **THEN** a new Page appears on the canvas with 2 new Likert children
- **AND** all pasted nodes have new unique IDs
- **AND** the pasted nodes are offset from the originals so they don't overlap

#### Scenario: Paste content-tier node without container
- **WHEN** a user copies a Likert node (without its parent Page)
- **AND** presses Ctrl+V
- **THEN** the system shows a toast: "Copied nodes must include their parent container"
- **AND** nothing is pasted
