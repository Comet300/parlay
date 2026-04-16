## MODIFIED Requirements

### Requirement: flow_definition structure
The `flow_definition` jsonb field SHALL store the serialized React
Flow state using the structure returned by
`reactFlowInstance.toObject()`:

```typescript
interface FlowDefinition {
  nodes: FlowNode[];   // React Flow Node[] with custom data per node type
                       // IMPORTANT: parent nodes must appear before their
                       // children in this array (React Flow requirement).
                       // reactFlowInstance.toObject() maintains this order
                       // automatically. Any server-side manipulation of
                       // flow_definition must preserve this invariant.
  edges: FlowEdge[];   // React Flow Edge[] defining directed connections
  viewport: {          // Canvas viewport state for restore
    x: number;
    y: number;
    zoom: number;
  };
}
```

Each node in the `nodes` array SHALL follow the React Flow Node
interface extended with Parlay-specific data fields defined in the
builder-nodes spec:

- `node.type` — the `NodeTypeName` (e.g., `"page"`, `"likert"`,
  `"real_llm"`).
- `node.data` — the node-type-specific data object containing fields
  like `label`, `alias`, `condition`, `record_response`, etc. The
  `alias` field on response-bearing nodes SHALL be the formula-time
  identifier (see builder-nodes spec for the full schema). Container
  nodes (Page, PageGroup, Group) and anchor nodes (Start, End) MUST
  NOT have an `alias` field.
- `node.parentId` — the parent container node id (for content-tier
  nodes).
- `node.position` — `{ x, y }` canvas coordinates, relative to parent
  for child nodes and absolute for root nodes. Child nodes inside
  containers SHALL use the stacked layout positions computed by the
  builder store (see builder-canvas spec: Stacked child layout) and
  MUST NOT be freely positionable.

The initial `flow_definition` for a new facet SHALL contain a Start
node positioned at `{ x: 0, y: 200 }` and an End node positioned at
`{ x: 600, y: 200 }` with a default viewport of
`{ x: 0, y: 0, zoom: 1 }`.

#### Scenario: Persisting a flow round-trips alias on response-bearing nodes
- **GIVEN** a builder session contains a Likert node with `alias: "q-age"`
- **WHEN** the auto-save writes `flow_definition` to Supabase
- **AND** the same facet is later loaded
- **THEN** the loaded Likert node's `data.alias` SHALL equal `"q-age"`

#### Scenario: Container node has no alias field
- **GIVEN** a Page node persisted in `flow_definition`
- **WHEN** the spec is inspected
- **THEN** `node.data` MUST NOT contain an `alias` key
