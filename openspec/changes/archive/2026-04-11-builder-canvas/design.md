## Context

The builder page at `/build/:facetId` currently has a working toolbar (title editing, facet switcher, publish/unpublish, archive), a Zustand store (`builder-store.ts`) that tracks `flowDefinition`, `colorScheme`, and `isDirty`, and an auto-save hook that debounce-writes to Supabase every 2 seconds. The canvas area is an empty `<div>` with a comment placeholder.

`@xyflow/react` v12 is already installed. The builder-canvas spec defines all behavioral requirements. Related specs (builder-nodes, builder-card-node, builder-llm-nodes, builder-formula, builder-color-scheme) define node schemas and editors. This design covers how to wire it all together.

## Goals / Non-Goals

**Goals:**
- Mount the React Flow canvas with horizontal LTR orientation and Start/End anchors
- Implement drag-and-drop from an Add Node panel with containment validation
- Build the node config popup system triggered by node selection
- Wire canvas state through the existing Zustand store and auto-save hook
- Implement dead-path and publish validation
- Implement the Form Settings side panel
- Support mobile layout with slide-over menus

**Non-Goals:**
- Formula parser/evaluator — covered by builder-formula spec (this change builds the slug autocomplete UI but not the parser itself)
- Color scheme logic — covered by builder-color-scheme spec. This change mounts the `ColorSchemeEditor` inside the Form Settings panel (task 7.2), but the component itself is built separately. If builder-color-scheme is not yet implemented, task 7.2 should mount a placeholder
- Player rendering — unrelated to builder canvas
- Renderer preview components — task 7.3 mounts renderers in `preview={true}` mode for the gallery carousel. These renderer components are defined by builder-nodes and related specs. If not yet implemented, task 7.3 should mount placeholder cards
- Node editor polish — this change implements all node editors as minimal working versions (tasks 5.3–5.10). Full polish (drag-to-reorder options, advanced Likert styling, etc.) is deferred to the builder-nodes change
- Milkdown editor configurations beyond upload — the upload plumbing (`src/lib/milkdown/upload.ts`) is included in this change (task 5.11), but node-specific editor polish is builder-nodes scope

## Decisions

### D1: Canvas state lives in Zustand, React Flow reads from it

**Decision**: The Zustand `builder-store` is the source of truth for nodes, edges, and viewport. React Flow is a controlled component: `<ReactFlow nodes={nodes} edges={edges} onNodesChange={...} onEdgesChange={...}>`. Every mutation flows through the store, which marks `isDirty = true`, triggering the existing auto-save hook.

**Why not uncontrolled React Flow with `useReactFlow()`?**: Controlled mode gives us a single Zustand store that the toolbar (dead-path badge), publish validation, slug autocomplete, and auto-save all read from. With uncontrolled mode, we'd need to sync React Flow's internal state back to the store, which adds complexity and race conditions.

**Trade-off**: Controlled mode means every node drag emits `onNodesChange` events that go through Zustand. For flows under ~200 nodes (well above typical form sizes), this is fine. React Flow v12's change events are efficient diffs, not full snapshots.

### D2: Node config popup via positioned floating popover

**Decision**: Use a positioned `<div>` (or Radix `Popover`) anchored near the selected node's screen coordinates, rendered as a portal outside the React Flow viewport. The popover renders the context-sensitive editor from the NodeTypeRegistry's `editorComponent`. On desktop, it appears adjacent to the selected node. On mobile (<768px), it renders as a bottom sheet.

**Why not `<NodeToolbar>`?**: React Flow's `NodeToolbar` is designed for small action buttons (delete, duplicate). The node editors here are complex forms — Milkdown WYSIWYG, button list managers, multi-turn script editors — that need significant space. A `NodeToolbar` would be cramped and clip on dense canvases.

**Why not a global side panel?**: The spec explicitly says "floating popup" on both desktop and mobile. A positioned popover follows the node on the canvas, which matches the spec's popup pattern. It also avoids collisions with the Form Settings side panel.

**Alternative considered**: A detached modal (`<Dialog>`) that opens on node click. Rejected because it blocks the canvas and prevents seeing the node in context while editing.

**Positioning**: Use `reactFlowInstance.flowToScreenPosition()` to convert the selected node's flow coordinates to screen coordinates, then position the popover adjacent (below or to the right, whichever has more space). Reposition on canvas pan/zoom via `onViewportChange`.

### D3: Add Node panel as a collapsible sidebar

**Decision**: Render the Add Node panel as a left-edge sidebar overlaying the canvas, toggled by a "+" button in the toolbar. The panel lists node types organized by tier: page-tier (always visible) and content-tier (visible only when a Page/PageGroup/Group is selected).

Drag-from-panel uses React Flow's `onConnectStart`/`onDragOver`/`onDrop` pattern. On drop, the system:
1. Checks if the drop target is the canvas root or inside a container
2. Validates tier rules (content-tier must be inside a container)
3. If valid: creates the node via Zustand store with `parentId` set if inside a container
4. If invalid: shows a toast and rejects the drop

### D4: Containment via React Flow's `parentId` and `extent: 'parent'`

**Decision**: Content-tier nodes set `parentId` to their container's ID and `extent: 'parent'`. React Flow v12 natively enforces that children stay within parent boundaries. Container nodes (Page, PageGroup) are custom node types (NOT the built-in `type: 'group'`, which lacks handles). They render a bordered container with explicit `<Handle>` components. Since React Flow does not auto-resize parents, custom logic recalculates container dimensions when children are added, moved, or removed.

**Node ordering**: React Flow requires parent nodes to appear before their children in the `nodes` array. All store mutations (add, paste, undo/redo) must maintain this invariant.

**Drag between containers**: When a content node is dragged from one Page to another, the `onNodeDrag` handler detects the new parent via hit-testing against container bounds, and updates `parentId` in the store. If dropped outside all containers, the drop is rejected and the node snaps back.

### D5: Undo/redo via state snapshot stack

**Decision**: Maintain an undo stack of serialized `{ nodes, edges }` snapshots (max 50) in the Zustand store. Snapshots are pushed on discrete actions (node add, node delete, edge add, edge delete, node reparent). Continuous actions like dragging are debounced — a snapshot is pushed when drag starts, not on every pixel move.

**Why not a command pattern?**: Snapshot-based undo is simpler and more reliable for a graph editor where a single user action can cascade (e.g., deleting a container removes children and their edges). Command inversion for cascading deletes is error-prone.

**Trade-off**: 50 snapshots of a typical flow (~20 nodes) is ~100KB. Acceptable for in-memory storage.

### D6: Dead-path validation as a derived selector

**Decision**: Implement `getDeadPaths()` as a Zustand derived selector that scans nodes and edges on every state change. It returns an array of node IDs (and card button handle IDs) that violate the dead-path rules. The toolbar reads this to show the warning badge count. The canvas reads it to apply red warning indicators to affected nodes.

This runs synchronously on every change. For typical form sizes (<100 nodes), graph traversal is sub-millisecond.

### D7: Publish validation as a server function

**Decision**: Publish validation runs server-side in the existing `updateFacetStatus` function (which already handles draft->active). Before allowing the transition, it:
1. Reads the current `flow_definition` from the database
2. Checks dead paths (same logic as client, but authoritative)
3. Checks slug uniqueness across all content nodes
4. Checks LLM provider configuration against the form owner's settings

**Why server-side?**: The client validation is for real-time UX feedback. The server is the gate. A malicious client could skip client validation, so the server must enforce it.

The toolbar still does client-side pre-validation to show blockers before the user clicks Publish. The server function returns structured errors that the toolbar displays.

### D8: Form Settings panel as a right-edge drawer

**Decision**: The Form Settings panel slides in from the right edge as a drawer overlay. On desktop (>=768px), it's a side panel (~320px wide) that overlays the canvas. On mobile (<768px), it's a full-width slide-over. Opened via a toolbar icon. Uses Framer Motion for slide animation.

The panel mounts the `ColorSchemeEditor` component (from builder-color-scheme) and the component gallery carousel. The round-robin sub-section is also mounted here when the form has multiple facets.

**Round-robin sync**: The round-robin toggle and default facet selector also exist in the FacetSwitcher dropdown (per builder-facet-switcher spec). Both controls read from and write to the same server state. The Form Settings panel toggle and the FacetSwitcher toggle SHALL be perfectly in sync — toggling one must immediately reflect in the other. Implementation: both read `roundRobinEnabled` from the shared route data / query cache, and both mutate via the same server function. After mutation, invalidate the shared query so both UIs update.

### D9: Mobile layout — toolbar collapses, canvas fills viewport

**Decision**: On mobile (<768px):
- The toolbar shows only: back button, form title, hamburger menu icon
- The hamburger opens a slide-over with all overflow actions (facet switcher, publish, form settings, archive)
- The React Flow canvas fills the remaining viewport with standard touch gestures
- Node config popup opens as a bottom sheet (instead of a floating popover, which would be awkward on small screens)

**Breakpoint detection**: Use a `useMediaQuery('(min-width: 768px)')` hook. The canvas component receives an `isMobile` flag that switches between positioned popover (desktop) and bottom sheet (mobile) for node config.

## Risks / Trade-offs

**[Controlled React Flow performance with many nodes]** → The Zustand store dispatches on every node drag pixel. Mitigation: React Flow v12's `onNodesChange` sends efficient position diffs, not full arrays. For forms with <200 nodes, no measurable lag. If it becomes an issue later, we can batch position updates.

**[Undo stack memory]** → 50 snapshots in memory. Mitigation: Typical flows are small. If flows grow very large, we can reduce the stack size or switch to delta-based undo.

**[Last-write-wins on concurrent tabs]** → Two tabs editing the same facet will overwrite each other's changes. This is explicitly a non-goal per spec (no optimistic locking). Mitigation: The auto-save indicator helps users notice when they have multiple tabs open.

**[Mobile canvas usability]** → Complex flow editing on small screens is inherently challenging. Mitigation: We optimize for viewing and simple edits (node config, edge drawing) rather than full flow construction. The mobile layout prioritizes canvas visibility over panel access.

**[Popover positioning on dense canvases]** → The popup could overlap adjacent nodes. Mitigation: The positioned popover uses `flowToScreenPosition()` and picks the side (below or right) with the most available space. For dense canvases, users can zoom in before selecting a node.
