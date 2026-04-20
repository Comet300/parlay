## MODIFIED Requirements

### Requirement: Group canvas node
Group nodes SHALL render as a nested-Page-style container inside their parent Page or PageGroup, using the same stacked child layout (see builder-canvas spec: Stacked child layout). Visual language SHALL mirror the Page node:

- `rounded-xl border-2` wrapper with a soft blue-50 fill at ~40% alpha.
- When unselected: `border-blue-200`; when selected: `border-blue-500` with a soft drop shadow.
- Header bar with a `Layers` icon, the Group's label (fallback "Group"), and optional small icons for condition (⚡) and shuffle (🔀).
- No React Flow `Handle` components — Group nodes have zero handles and are not connected by edges.

The shuffle toggle SHALL be visible in the node config popup editor.

#### Scenario: Group renders as a nested Page
- **GIVEN** a Group is rendered inside a Page
- **WHEN** the canvas paints
- **THEN** the Group SHALL display a `rounded-xl border-2` container with the Layers icon and its label in the header bar
- **AND** the Group MUST NOT render any connection handles
- **AND** unselected Group borders SHALL use `border-blue-200`; selected Group borders SHALL use `border-blue-500`
