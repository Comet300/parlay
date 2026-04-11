## Why

The builder page currently renders an empty canvas area with only the toolbar and auto-save hook in place. To make the builder functional, the React Flow canvas needs to be wired up so form creators can visually compose flows by placing nodes, drawing edges, and configuring node properties through a popup editor.

## What Changes

- Integrate `@xyflow/react` v12 canvas into the builder page with horizontal LTR layout, Start/End anchor nodes, and touch-friendly pan/zoom
- Implement the Add Node panel that enforces page-tier vs content-tier placement rules and container nesting constraints
- Implement drag-and-drop onto the canvas with containment validation (content-tier nodes must land inside a Page or PageGroup)
- Build the node config popup system that opens context-sensitive editors when a node is selected
- Wire canvas state (nodes, edges, viewport) through the existing Zustand builder-store and auto-save hook
- Add dead-path validation with warning badges in the toolbar
- Add publish validation (dead paths, slug conflicts, unconfigured LLM providers) that blocks the draft-to-active transition
- Implement the Form Settings side panel (color scheme picker, component gallery)
- Build responsive mobile layout with slide-over menus and compact toolbar

## Capabilities

### New Capabilities
(none — the builder-canvas spec already exists and is comprehensive)

### Modified Capabilities
- `builder-canvas`: Adding requirements for client-side fallback when flow_definition is null, canvas keyboard shortcuts (including copy/paste), edge selection and deletion, and smooth bezier edge styling

## Impact

- **New files**: Canvas component, Add Node panel, node config popup shell, Form Settings panel, canvas node components (Start, End, Page, PageGroup, content nodes, LLM nodes), publish validation utilities
- **Modified files**: `src/routes/_authed/build/$facetId.tsx` (mount canvas), `src/lib/stores/builder-store.ts` (typed flow state), `src/components/builder/builder-toolbar.tsx` (dead-path badge, publish gating)
- **Dependencies**: `@xyflow/react` (already installed), `@milkdown/crepe` + `@milkdown/react` (already installed)
- **Database**: No schema changes — uses existing `facets.flow_definition` JSONB column
