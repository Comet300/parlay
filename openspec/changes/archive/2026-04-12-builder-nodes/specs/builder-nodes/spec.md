## RENAMED Requirements

- FROM: `### Requirement: Container node data fields (no slug)`
- TO: `### Requirement: Container and anchor node data fields (no alias)`

- FROM: `### Requirement: Slug purpose and visibility`
- TO: `### Requirement: Alias purpose and visibility`

- FROM: `### Requirement: Slug auto-generation`
- TO: `### Requirement: Alias auto-generation and validation`

## MODIFIED Requirements

### Requirement: Base content node data fields
The system SHALL ensure every response-bearing node type (card, likert, single_choice, multi_choice, email_collection, scripted_llm, real_llm) stores at minimum the following fields:

- `alias: string` (optional) — pattern `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`,
  max 60 chars, unique within the facet when non-empty. Lowercase
  alphanumeric segments separated by single hyphens, no leading or
  trailing hyphens. The alias is the identifier used to reference the
  node from formula `condition` expressions (e.g. `q-age > 18`). It is
  OPTIONAL: a node MAY have `alias = ""`, in which case the node is
  fully functional but cannot be referenced from any formula.
- `condition: string` (optional) — formula expression; absent value
  SHALL be treated as "always render".
- `record_response: boolean` (default `true`).

Content-tier response-bearing nodes (card, likert, single_choice,
multi_choice, email_collection) SHALL NOT have their own edges; they
are children of Page or PageGroup containers and SHALL be rendered
within them. Page-tier response-bearing nodes (scripted_llm, real_llm)
DO have their own edges and exist at the canvas root.

#### Scenario: Fresh response-bearing node has empty alias
- **GIVEN** the user adds a new Likert node to a Page
- **WHEN** the node first appears on the canvas
- **THEN** its `data.alias` SHALL be the empty string
- **AND** the publish gate SHALL NOT flag the empty alias as a blocker
- **AND** the inline editor SHALL NOT show an "alias is required" error

#### Scenario: Card node stores buttons alongside its alias
- **GIVEN** the user adds a Card node inside a Page
- **WHEN** the user types a label and presses Tab
- **THEN** the system SHALL auto-fill `data.alias` with the result of `toAlias(label)`
- **AND** the Card data SHALL still contain its `buttons` array, `markdownContent`, and `record_response = true`

### Requirement: Container and anchor node data fields (no alias)
Page, PageGroup, Group, Start, and End nodes SHALL NOT have an `alias`
field. They are virtual containers and semantic anchors that do not
produce values consumable by formula expressions.

Containers (Page, PageGroup, Group) MAY consume aliases inside their
`condition` field — for example a Page with `condition: "q-age > 18"`
is valid. When the condition evaluates to `false`, the entire container
and all of its children SHALL be skipped, regardless of any per-child
condition. Container-level skip MUST take absolute precedence over
per-child conditions.

Start and End nodes SHALL NOT have a `condition` field at all and
SHALL always be rendered when reached by graph traversal.

#### Scenario: Page consumes a child node's alias in its condition
- **GIVEN** a Page has `condition: "q-consent = \"yes\""`
- **AND** the previous Page contains a single_choice node with alias `q-consent`
- **WHEN** the respondent answers `q-consent = "no"`
- **THEN** the conditioned Page SHALL be skipped entirely
- **AND** all of that Page's children SHALL be skipped without evaluating their own conditions

#### Scenario: Containers do not appear in alias-based formulas
- **GIVEN** a flow contains a Page with `label: "Intro"` and no alias field
- **WHEN** the user opens the formula autocomplete inside another node's `condition`
- **THEN** the autocomplete SHALL NOT list the Intro Page as a referenceable identifier

### Requirement: Alias purpose and visibility
Aliases SHALL be internal identifiers used exclusively for referencing
nodes in formula `condition` expressions (e.g., `q-age > 18`). Aliases
MUST NOT be displayed to respondents in the player UI. They SHALL only
appear in the builder node config popup for the form creator, where the
input MUST be labeled "Reference" and accompanied by a help tooltip
explaining the field's purpose.

The alias field SHALL remain optional. A node with an empty alias is
fully functional but cannot be referenced by other nodes' condition
formulas.

#### Scenario: Respondent never sees an alias
- **GIVEN** a Likert node with `alias: "q-age"` and `label: "How old are you?"`
- **WHEN** the player renders the Likert question
- **THEN** the rendered DOM SHALL contain the label text "How old are you?"
- **AND** the rendered DOM MUST NOT contain the literal string "q-age"

#### Scenario: Builder shows the Reference label and tooltip
- **GIVEN** the form creator selects a Likert node in the builder
- **WHEN** the node config popup opens
- **THEN** the alias input SHALL be labeled "Reference"
- **AND** a help icon next to the label SHALL reveal a tooltip describing the field's purpose on hover or focus

### Requirement: Alias auto-generation and validation
The system SHALL auto-generate the alias from the node label on creation
when the user has not yet typed an alias of their own. The transform
SHALL lowercase the label, strip non-alphanumeric characters except
hyphens, replace spaces with hyphens, collapse consecutive hyphens,
trim leading and trailing hyphens, and truncate the result to 60
characters.

The pattern `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, the 60-character maximum,
the validator, the type set, and the `toAlias` transform routine SHALL
all live in a single source of truth at
`src/lib/node-registry/alias-utils.ts`, which SHALL export `toAlias`,
`isValidAlias`, `ALIAS_PATTERN`, `ALIAS_MAX_LENGTH`, and `ALIAS_TYPES`.
All client and server consumers SHALL import from this module and MUST
NOT redefine the pattern inline.

The system SHALL show an inline validation error in the node config
popup for each of the following:

- a duplicate alias (another response-bearing node already uses the
  same non-empty alias within the facet),
- a pattern-invalid alias (a non-empty value that does not match
  `ALIAS_PATTERN` or that exceeds `ALIAS_MAX_LENGTH`).

The system MUST NOT show a "missing alias" error when the field is
empty; an empty alias is a valid state.

The publish gate (draft → active) SHALL block the transition when any
response-bearing node has either a duplicate alias OR a pattern-invalid
alias. Both the client-side preflight in the builder toolbar and the
server-side `validateForPublish` function SHALL enforce both conditions
using `isValidAlias` from `alias-utils.ts`, so the two validators
cannot drift.

Auto-save SHALL continue to run while alias errors are present — only
the publish transition is blocked. This lets a user fix an alias
without losing in-progress edits.

#### Scenario: Duplicate alias blocks publish
- **GIVEN** a facet has two response-bearing nodes with `alias: "q-age"`
- **WHEN** the user clicks Publish
- **THEN** the toolbar SHALL show "Cannot publish: 1 alias conflict"
- **AND** the server `updateFacetStatus` call MUST NOT be made

#### Scenario: Empty alias does not block publish
- **GIVEN** a Likert node whose alias field has been cleared to `""`
- **AND** no other publish blockers exist on the facet
- **WHEN** the user clicks Publish
- **THEN** the publish SHALL succeed and the facet status SHALL become `active`
- **AND** the inline editor SHALL show no error on the alias field

#### Scenario: Invalid alias pattern blocks publish
- **GIVEN** a single_choice node with `alias: "Q Age!"`
- **WHEN** the user clicks Publish
- **THEN** the toolbar SHALL show "Cannot publish: 1 invalid alias"
- **AND** the editor SHALL display "Lowercase alphanumeric with hyphens only" inline

#### Scenario: Server publish validator rejects pattern-invalid aliases
- **GIVEN** a malicious client bypasses the toolbar preflight
- **WHEN** the client calls `updateFacetStatus({ newStatus: 'active' })` for a facet whose flow contains a Likert node with `alias: "Q Age!"`
- **THEN** the server SHALL return a `publish_validation` error listing `Node "<label>" has invalid alias "Q Age!"`
- **AND** the facet status SHALL remain `draft`

### Requirement: Side panel common fields
The node config popup SHALL show the following fields for response-bearing
nodes (not containers, not Start/End):

- A Reference field — labeled exactly "Reference" with a help tooltip
  describing its purpose ("Optional identifier used to reference this
  question in formula conditions, e.g. `q-age > 18`. Lowercase letters,
  numbers, and hyphens. Not visible to respondents."), backed by
  `data.alias`, validated with `isValidAlias`.
- A "Show if" field with formula condition input and autocomplete.
- A "Record response" checkbox (default `true`).

Additionally for question nodes (likert, single_choice, multi_choice)
and email_collection, the popup SHALL show:

- A "Required" checkbox (default `true`).

For Page (container popup), the popup SHALL show:

- A "Show if" field (formula condition input).
- An "Allow back navigation" checkbox (default `false`).
- A "Show progress bar" checkbox (default `false`).
- An "Is checkpoint" checkbox (default `false`). The checkbox SHALL
  only be visible when `show_progress_bar` is enabled on ANY Page or
  PageGroup in the flow. Visibility MUST be derived from a flow-wide
  `anyPageHasProgressBar: boolean` flag computed in the builder store,
  NOT from the current node's own `show_progress_bar`.
- A "Header content" Milkdown WYSIWYG editor backed by `headerContent`.

For PageGroup (container popup), the popup SHALL show all Page fields
above, plus:

- A "Max questions per page" number input.
- A "Shuffle children" checkbox (default `false`).
- A "Show header on all pages" checkbox (default `false`), only
  visible when `headerContent` is non-empty.

For Group, the popup SHALL show:

- A "Show if" field.
- A "Shuffle children" checkbox (default `false`).

For scripted_llm and real_llm (page-tier), the popup SHALL show the
base content fields (Reference, Show if, Record response) plus the
LLM-specific configuration fields defined in the builder-llm-nodes spec.

#### Scenario: Is checkpoint visible on a sibling page
- **GIVEN** a flow has Page A and Page B, both with `show_progress_bar = false`
- **WHEN** the user enables `show_progress_bar` on Page A
- **AND** opens the node config popup for Page B
- **THEN** the "Is checkpoint" checkbox SHALL be visible in Page B's editor
- **AND** Page B's `show_progress_bar` SHALL remain `false`

#### Scenario: Reference field shows tooltip on hover
- **GIVEN** the user opens a Likert node's config popup
- **WHEN** the user hovers over the help icon next to the "Reference" label
- **THEN** a tooltip SHALL appear with the help text describing the alias's purpose

### Requirement: Node type registry
The system SHALL implement a `NodeTypeRegistry` map in
`src/lib/node-registry/index.ts` mapping each `NodeTypeName` to a
`NodeTypeDescriptor`:

```typescript
interface NodeTypeDescriptor {
  typeName: NodeTypeName;
  label: string;
  icon: string;                // lucide-react icon name
  tier: 'page' | 'content';    // determines valid placement
  defaultData: () => FlowNodeData;
  editorComponent: React.ComponentType<{ nodeId: string }>;
  canvasComponent: React.ComponentType<NodeProps<FlowNode>>;
  rendererComponent?: React.ComponentType<{
    node: FlowNode;
    onAnswer?: (...args: unknown[]) => void;
    preview?: boolean;
  }>;
  isContainer?: boolean;
  allowedChildren?: NodeTypeName[];
}
```

`editorComponent` SHALL receive only the `nodeId` so the editor can
subscribe to the Zustand store and always read fresh node data; it
MUST NOT receive the node object directly (which risks stale captures
across undo/redo, drag, and reparent).

`rendererComponent` SHALL be optional on the descriptor because
renderer components are owned by the `player-renderers` capability.
When a `rendererComponent` is present, it SHALL honor the Preview mode
contract (accept `preview?: boolean`, render a static non-interactive
mockup when true). The builder-nodes capability MUST NOT require any
node type to ship a renderer on its own.

The project uses Vite + TanStack Start with a `src/` layout; there is
no Next.js `app/` directory.

#### Scenario: Editor receives nodeId, not node object
- **GIVEN** a Likert node is selected on the canvas
- **WHEN** the node config popup mounts the registered `editorComponent`
- **THEN** the popup SHALL pass only `{ nodeId }` as props
- **AND** the editor SHALL re-read the node from `useBuilderStore` on every render

#### Scenario: Registry lookup powers the popup
- **GIVEN** the user selects a Card node on the canvas
- **WHEN** the node config popup renders
- **THEN** the system SHALL look up the Card `NodeTypeDescriptor` from `NodeTypeRegistry` at `src/lib/node-registry/index.ts`
- **AND** SHALL render the Card `editorComponent` inside the popup body

#### Scenario: Optional renderer unblocks builder-nodes
- **GIVEN** the player-renderers capability has not yet shipped any renderer for Likert
- **WHEN** the builder is loaded
- **THEN** the `NodeTypeRegistry` entry for Likert SHALL omit `rendererComponent`
- **AND** the builder canvas, node config popup, and publish flow SHALL all work unchanged

### Requirement: Start and End node data schema
Each Start and End node SHALL store the following field:

- `markdownContent: string` (optional) — Milkdown Crepe WYSIWYG markdown content.

Start and End nodes are semantic anchor nodes. They MUST NOT have an
`alias`, `condition`, or `record_response` field. They are not
response-bearing nodes and do not produce response data.

#### Scenario: Start node has no alias
- **GIVEN** a freshly created Start node
- **WHEN** the spec is inspected
- **THEN** `node.data` MUST NOT contain an `alias` key
- **AND** `node.data` MUST NOT contain a `condition` key
- **AND** `node.data` MUST NOT contain a `record_response` key

#### Scenario: End node has no alias
- **GIVEN** a freshly created End node
- **WHEN** the spec is inspected
- **THEN** `node.data` MUST NOT contain an `alias` key
- **AND** `node.data` MUST NOT contain a `condition` key
- **AND** `node.data` MUST NOT contain a `record_response` key

### Requirement: Real LLM node config popup
The real_llm node config popup SHALL show:
- Provider dropdown (populated from the owner's configured providers in
  settings — e.g. "openai", "anthropic", "google"). If no providers are
  configured, show a warning linking to /settings.
- Model text input (e.g. "gpt-4o") — the model identifier for the
  selected provider
- setup_prompt textarea labeled "Hidden from respondents"
- ending_condition textarea labeled "Hidden from respondents — instruct the
  LLM when to output [END_CONVERSATION]"
- maxTurns number input

#### Scenario: Node type registry dynamic panel
- **GIVEN** the user selects a Likert node on the canvas
- **WHEN** the node config popup renders
- **THEN** the system SHALL look up the Likert NodeTypeDescriptor from the registry
- **AND** SHALL render the Likert editorComponent in the Node tab

#### Scenario: PageGroup virtual page splitting
- **GIVEN** a PageGroup with `maxQuestionsPerPage = 3` and 7 child nodes
- **AND** `shuffle = false`
- **WHEN** the player renders the PageGroup
- **THEN** it SHALL create 3 virtual pages: [3 nodes], [3 nodes], [1 node]
- **AND** navigating Continue SHALL advance through virtual pages before leaving the PageGroup

#### Scenario: Delete container with children
- **GIVEN** a Page contains 3 Likert nodes and 1 Card node
- **WHEN** the user selects the Page and presses Delete
- **THEN** the system SHALL show a confirmation dialog
- **WHEN** the user confirms
- **THEN** the Page and all 4 child nodes SHALL be deleted
- **AND** all edges connected to the Page SHALL be removed

#### Scenario: Page header content
- **GIVEN** a Page has `headerContent: "Please answer the following questions about your experience."`
- **WHEN** the player renders the Page
- **THEN** the markdown content SHALL appear at the top of the page
- **AND** the child question nodes SHALL render below it

#### Scenario: PageGroup header on first page only
- **GIVEN** a PageGroup with `headerContent` and `headerOnAllPages = false`
- **AND** the PageGroup splits into 3 virtual pages
- **WHEN** the player renders virtual page 1
- **THEN** the header SHALL be shown above the questions
- **WHEN** the player navigates to virtual page 2
- **THEN** the header MUST NOT be shown
