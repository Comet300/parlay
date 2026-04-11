## 1. Zustand Store & Types

- [x] 1.1 Define TypeScript types for flow state: `FlowNode` (extending React Flow's `Node` with typed `data` per node type), `FlowEdge`, `NodeTypeName` enum, tier classification, and the `NodeTypeDescriptor` registry interface in `src/lib/node-registry/types.ts`
- [x] 1.2 Expand `builder-store.ts` to store typed `nodes: FlowNode[]`, `edges: FlowEdge[]`, `viewport: Viewport`, and expose `onNodesChange` (using `applyNodeChanges` from `@xyflow/react`), `onEdgesChange` (using `applyEdgeChanges` from `@xyflow/react`), `setViewport`, plus the `getDeadPaths()` and `getAllSlugs()` derived selectors. Zustand v5: use `useShallow` from `zustand/shallow` in component selectors that return objects/arrays to prevent infinite re-renders (v5 no longer supports the v4 `shallow` second argument to `create`). All store mutations that add or reorder nodes MUST maintain the invariant that parent nodes appear before their children in the `nodes` array — React Flow requires this ordering for correct sub-flow rendering
- [x] 1.3 Add undo/redo to the store: `undoStack`, `redoStack` (max 50 snapshots), `pushSnapshot`, `undo`, `redo` actions — snapshots pushed on discrete events (add/delete node, add/delete edge, reparent), debounced for drags. Note: undo/redo correctly sets `isDirty = true` because the canvas state has diverged from the last persisted save — this intentionally triggers auto-save
- [x] 1.4 Add `getDefaultFlow()` helper that returns the initial Start → End nodes and connecting edge with default positions — used as a client-side fallback when flow_definition is null (the server already provides this default at creation time). Called inside the store's `initializeFromServer()`: if the provided `flowDefinition` is null/empty, substitute with `getDefaultFlow()` before populating `nodes`, `edges`, `viewport`

## 2. Node Type Registry

- [x] 2.1 Create `src/lib/node-registry/index.ts` with the `NodeTypeRegistry` map and registration for all node types: `start`, `end`, `page`, `page_group`, `group`, `likert`, `single_choice`, `multi_choice`, `email_collection`, `card`, `scripted_llm`, `real_llm`. Each registration includes a `defaultData()` factory with sensible defaults — notably: `real_llm` defaults `maxTurns` to 10, `scripted_llm` defaults `startTurnId` to the first turn's ID, `card` generates button `id`s as UUIDs via `crypto.randomUUID()`
- [x] 2.2 Implement canvas node components for Start and End anchor nodes in `src/components/builder/canvas-nodes/` — fixed anchor styling, markdown content preview. Handle config: Start has 1 source handle (right side), 0 target handles; End has 0 source handles, 1 target handle (left side)
- [x] 2.3 Implement canvas node components for Page and PageGroup as custom container node types (NOT the built-in `type: 'group'` which has no handles). Each renders a visible border, label, and explicit `<Handle>` components. Handle config: 1 target handle (left side), 1 source handle (right side). Children use `extent: 'parent'` to stay within bounds. Since React Flow does NOT auto-resize parents, implement custom resize logic: on child add/move/remove, recalculate the container's `style.width` and `style.height` to fit all children with padding, and update the node in the store
- [x] 2.4 Implement canvas node component for Group (lighter bordered subgraph nested inside Page/PageGroup). Handle config: 0 handles (Group is a visual container only, not connected by edges)
- [x] 2.5 Implement canvas node components for content-tier nodes (likert, single_choice, multi_choice, email_collection) — type badge, truncated label, slug, funnel icon if condition set, database-off icon if record_response=false. Handle config: 0 handles (content-tier nodes have no edges)
- [x] 2.6 Implement canvas node component for Card — wider block, markdown preview (80 chars), button count badge. Handle config: 0 target handles (content-tier, no incoming edges), N source handles on right side (1 per button, labeled with button text, red warning indicator on handles with no outgoing edge)
- [x] 2.7 Implement canvas node components for scripted_llm (turn count badge) and real_llm (provider, model, maxTurns display). Handle config for both: 1 target handle (left side), 1 source handle (right side) — these are page-tier nodes connected by edges

## 3. Canvas Core

- [x] 3.1 Create `src/components/builder/builder-canvas.tsx` — mount `<ReactFlow>` in controlled mode reading nodes/edges from the Zustand store, horizontal LTR layout, `fitView` on initial load and on facet switch, edge type `smoothstep` (right-angle paths with rounded corners — conventional for horizontal flow charts), pass `nodeTypes` from registry
- [x] 3.2 Implement edge connection validation via React Flow's `isValidConnection` prop (provides real-time visual feedback during drag) and `onConnect` callback (adds the validated edge to the store). Enforce the allowed edge routing model (Start→Page-tier, Page-tier→Page-tier/End, Card button handles→Page-tier/End, End→nothing, content-tier→nothing); reject invalid connections with a toast in `onConnect`. Card button handles are distinguished from regular content-tier nodes by handle ID convention: Card buttons use `button-{buttonId}` as their sourceHandle ID — the validator checks for this prefix to allow edges from Card buttons while blocking edges from other content-tier nodes
- [x] 3.3 Implement Start node edge constraint: allow exactly one outgoing edge, show warning in node config popup if a second is drawn
- [x] 3.4 Wire `onNodesChange`, `onEdgesChange`, and `onViewportChange` to the Zustand store so every mutation sets `isDirty = true` and triggers the existing auto-save debounce; call `fitView` when the active facetId changes in the store
- [x] 3.5 Mount `<BuilderCanvas>` in `src/routes/_authed/build/$facetId.tsx` replacing the empty placeholder div, passing facetId. Wrap with `<ReactFlowProvider>` so that `useReactFlow()` hooks (needed for `screenToFlowPosition`, `flowToScreenPosition`, `fitView`) are available to the canvas and its children
- [x] 3.6 Update `use-auto-save.ts` to work with the new store shape: reconstruct a `flowDefinition` object from the store's `nodes`, `edges`, and `viewport` before passing to `saveFacetData`; keep the existing 2-second debounce and `isDirty` trigger unchanged

## 4. Drag-and-Drop & Containment

- [x] 4.1 Create `src/components/builder/add-node-panel.tsx` — collapsible left-edge sidebar listing page-tier types (always) and content-tier types (only when a container is selected). Toggled by two entry points: (a) a "+" button in the main toolbar between the Facet Switcher and the Unsaved indicator dot, and (b) a floating "+" button pinned to the left edge of the canvas (always visible when the panel is collapsed). Both buttons toggle the same panel; on mobile the toolbar "+" moves into the hamburger overflow menu
- [x] 4.2 Implement drag-from-panel using React Flow's `onDragOver`/`onDrop` pattern: on drop, convert browser event coordinates to flow coordinates via `screenToFlowPosition({ x: event.clientX, y: event.clientY })` from `useReactFlow()`, then hit-test container bounds to determine parent, validate tier rules, create node in store at the converted position with `parentId` set if inside a container
- [x] 4.3 Implement drop rejection: if a content-tier node is dropped on the canvas root, show toast "All nodes must be inside a Page or Page Group" and reject; if an invalid child type is dropped into a container, show inline error
- [x] 4.4 Implement inter-container drag: on `onNodeDrag`, detect when a content node crosses container boundaries, update `parentId` on drop; reject drop-outside-container by snapping back
- [x] 4.5 Enforce container nesting rules: page → group/content, page_group → group/content, group → content only (no nested groups, no page-tier inside groups)

## 5. Node Config Popup

- [x] 5.1 Create `src/components/builder/node-config-popup.tsx` — renders as a positioned floating popover (portal `<div>` anchored near the selected node's screen coordinates via `flowToScreenPosition`) on desktop, bottom sheet on mobile (via `useMediaQuery`); repositions on canvas pan/zoom; looks up the selected node's `editorComponent` from the registry and mounts it
- [x] 5.2 Implement popup lifecycle: opens on node selection (`onSelectionChange`), closes on deselect / click-outside / Escape, dismissible via close button. Coexistence with Form Settings panel: on desktop, the popup renders above the panel (higher z-index) and auto-repositions to the left side of the node if the right-edge drawer would overlay it; on mobile, opening the Form Settings slide-over dismisses the popup (and deselects the node)
- [x] 5.3 Implement stub editor components for the 4 question-type nodes (likert, single_choice, multi_choice, email_collection) — each renders the base fields (label, slug with validation, condition, record_response, required) plus type-specific fields (e.g., min/max for Likert, options list for choice types) writing back to the Zustand store on change. These are minimal working editors, not placeholders — full polish is deferred to the builder-nodes change
- [x] 5.4 Implement slug validation in the editor: auto-generate from label on creation (lowercase, strip non-alphanumeric except hyphens, replace spaces with hyphens, collapse consecutive hyphens, truncate to 60 chars), inline error for duplicate or invalid-pattern slugs, prevent save while conflict exists. On slug rename, scan all other nodes' condition formulas for references to the old slug and show a warning listing affected nodes (do not auto-rewrite — let the user decide)
- [x] 5.5 Implement the Start/End node editor: Milkdown Crepe WYSIWYG for markdownContent with image upload to Supabase Storage
- [x] 5.6 Implement the Card node editor: Milkdown Crepe for markdownContent, button list manager (add/remove/reorder/label edit); show a red warning badge next to each button that has no outgoing edge (read from `getDeadPaths()` selector matching the button's sourceHandle ID)
- [x] 5.7 Implement Page/PageGroup container editors: condition, allow_back, show_progress_bar, is_checkpoint, headerContent (Milkdown Crepe); PageGroup adds maxQuestionsPerPage, shuffle, headerOnAllPages
- [x] 5.8 Implement Group editor: condition, shuffle toggle
- [x] 5.9 Implement Scripted LLM editor: decision-tree script editor (turn list with bot message, options with label + nextTurnId dropdown, add/remove turn); include a startTurnId selector (dropdown of all turn IDs, defaults to the first turn's ID on node creation). On turn deletion: if the deleted turn is the current startTurnId, auto-reassign startTurnId to the first remaining turn; also clear any option `nextTurnId` references pointing to the deleted turn (set to null, meaning conversation end)
- [x] 5.10a Create a `getLiteLLMSettings` server function in `src/lib/server/settings.ts` that reads the current user's `user_profiles.litellm_api_keys` and returns the list of configured provider names; returns an empty array if no providers are configured
- [x] 5.10b Implement Real LLM editor: provider dropdown populated by calling `getLiteLLMSettings` (if no providers are configured, show a warning with a link to /settings), model input, setup_prompt textarea (labeled "Hidden from respondents"), ending_condition textarea (labeled "Hidden from respondents — instruct the LLM when to output [END_CONVERSATION]"), maxTurns number input
- [x] 5.11 Implement Milkdown upload handler in `src/lib/milkdown/upload.ts`: on image/file insert, upload to Supabase Storage bucket `markdown-uploads` at path `{facetId}/{randomId}.{ext}`, replace the blob URL with the permanent public URL; wire this handler into all Milkdown Crepe editors (Start/End, Card, Page/PageGroup headerContent) via `featureConfigs: { [Crepe.Feature.ImageBlock]: { onUpload: async (file) => ... } }`
- [x] 5.12 Implement slug autocomplete dropdown for the condition formula field: when the user types in a condition input, show a filtered dropdown of all content node slugs (from the store's `getAllSlugs()` selector) with labels and types, insert the selected slug at cursor position

## 6. Validation & Publish Gating

- [x] 6.1 Implement `getDeadPaths()` selector in the Zustand store: scan all page-tier nodes (except End) for missing outgoing edges, scan all Card button handles for missing outgoing edges, return affected node/handle IDs
- [x] 6.2 Add dead-path warning badge to `builder-toolbar.tsx`: show count from `getDeadPaths()`, clickable to highlight affected nodes on the canvas (via React Flow `fitView` on the affected node IDs)
- [x] 6.3 Implement slug conflict detection: `getSlugConflicts()` selector that returns pairs of nodes sharing the same slug
- [x] 6.4 Extend the existing `updateFacetStatus` server function to add publish validation: expand the existing query to also select `flow_definition` and join through `form_id → forms.user_id → user_profiles` to access the owner's LiteLLM settings; before allowing draft→active, check dead paths, slug uniqueness, and LLM provider configuration (each real_llm node's provider must exist in the owner's configured providers); return structured errors on failure
- [x] 6.5 Update the Publish button in `builder-toolbar.tsx` to run client-side pre-validation (dead paths + slug conflicts) before calling the server, show error tooltip listing all blockers when validation fails
- [x] 6.6 Implement node deletion: Delete/Backspace key when selected, "Delete" button in popup, cascade-delete children and connected edges for containers, confirmation dialog for containers with children. Start and End nodes MUST be excluded from all deletion paths — Delete/Backspace is a no-op when only Start/End are selected, and the "Delete" button must not appear in their config popup
- [x] 6.7 Implement edge deletion: clicking an edge selects it (visual highlight), Delete/Backspace removes the selected edge from the store; node deletion also cascades to remove all edges connected to the deleted node(s)

## 7. Form Settings Panel

- [x] 7.1 Create `src/components/builder/form-settings-panel.tsx` — right-edge drawer (320px on desktop, full-width slide-over on mobile) opened via toolbar icon, animated with Framer Motion
- [x] 7.2 Mount the `ColorSchemeEditor` component (from builder-color-scheme spec) inside the panel — theme picker dropdown, three color pickers, auto-save on same debounce
- [x] 7.3 Mount the component gallery carousel inside the panel — horizontally scrollable, all renderable node types in `preview={true}` mode with live color scheme CSS custom properties
- [x] 7.4 Mount the round-robin sub-section (visible when form has >1 facet): toggle for round_robin_enabled with the toggle-OFF default facet prompt. This duplicates the toggle in FacetSwitcher — both MUST read from and write to the same server state via the same mutation function and shared query cache invalidation, so toggling in either location immediately reflects in the other

## 8. Keyboard Shortcuts & Undo/Redo

- [x] 8.1 Wire keyboard shortcuts on the canvas: Delete/Backspace (delete selected nodes/edges), Escape (deselect + close popup), Ctrl/Cmd+A (select all), Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y (redo), Ctrl/Cmd+C (copy selected nodes), Ctrl/Cmd+V (paste copied nodes with offset position and new IDs, preserving internal edges)
- [x] 8.2 Connect undo/redo actions to the Zustand store's snapshot stack, verify stack clears on facet switch
- [x] 8.3 Implement copy/paste buffer in the Zustand store: `clipboard: { nodes, edges } | null`. Copy serializes selected nodes and their internal edges. Paste deserializes with new UUIDs, offset positions (+20px x/y), and re-mapped parentIds and edge references. Pasted content-tier nodes must land inside their original container (or reject with toast if the container was not copied)

## 9. Mobile Layout

- [x] 9.1 Implement responsive toolbar: on mobile (<768px) show only back button, form title, hamburger menu icon; hamburger opens a slide-over with all overflow actions (facet switcher, publish, form settings, archive)
- [x] 9.2 Switch node config popup from positioned popover to bottom sheet on mobile viewports
- [x] 9.3 Verify React Flow canvas touch gestures (pinch-to-zoom, drag-to-pan) work correctly with the slide-over menus without gesture conflicts

## 10. E2E Tests

- [x] 10.1 Write Playwright E2E test: builder opens with default Start→End flow for a new facet, nodes and edge visible
- [x] 10.2 Write Playwright E2E test: add a Page node via the Add Node panel, drop it on the canvas, draw an edge from Start to the Page and from the Page to End
- [x] 10.3 Write Playwright E2E test: drop a Likert node inside a Page (valid), attempt to drop a Likert on the canvas root (rejected with toast)
- [x] 10.4 Write Playwright E2E test: select a node, verify node config popup opens with correct fields, edit a field, verify auto-save triggers
- [x] 10.5 Write Playwright E2E test: create a dead path (Page with no outgoing edge), verify toolbar badge shows warning, attempt publish and verify it's blocked with error message
