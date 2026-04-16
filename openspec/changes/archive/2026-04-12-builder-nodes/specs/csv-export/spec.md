## MODIFIED Requirements

### Requirement: Single facet CSV generation
The exporter SHALL generate one CSV per facet at the filename
`parlay-{facetNickname}-{facetId}.csv`. The sparse matrix SHALL be
built as follows:

1. The exporter SHALL fetch all response-bearing nodes' aliases (from
   `data.alias`) and labels from the current `facets.flow_definition`
   where `record_response = true`. This list (NOT the `responses`
   table) MUST be the authoritative column list. Nodes with
   `record_response = false` SHALL be excluded from the CSV entirely
   (no column generated). Nodes whose alias is empty SHALL still be
   included as columns; the column header SHALL use the node's
   `label` and the column key SHALL use the internal React Flow node
   id (matching the `node_alias` fallback recorded by the submission
   endpoint). Column headers SHALL use the latest `node_label` from
   `flow_definition`. It is the form owner's responsibility to manage
   label changes between respondents.
2. The exporter SHALL fetch all `submissions` and `responses` rows
   for this facet.
3. For each submission, for each included node, the exporter SHALL:
   - Use the corresponding `responses.value` if such a row exists and
     its value is not null.
   - Otherwise (unvisited or null value) use `N/A`.

Columns SHALL appear in this order: `submission_id`, `submitted_at`,
`is_complete`, `respondent_email`, `facet_nickname`, then one column
per response-bearing node (with `record_response = true`) ordered by
position in the interview flow. Nodes that appear earlier in the
respondent's journey SHALL produce columns that appear earlier in the
CSV.

Ordering rules:

- The exporter SHALL traverse the directed graph starting from the
  Start node.
- Within each page-tier container, children SHALL appear in canvas
  position order (top-to-bottom).
- When the graph branches (e.g., via Card button edges), each
  branch's columns SHALL be grouped together contiguously.
- Branch ordering tiebreaker: alphabetical by the alias of the first
  response-bearing node on each branch. When that node has an empty
  alias, the exporter SHALL fall back to alphabetical-by-label as a
  stable secondary key.
- Column headers SHALL use the current `node_label` from
  `flow_definition`.

Value formatting:

- Multi-choice values SHALL be joined with semicolon (`;`) separators.
- LLM conversation values SHALL be serialized as JSON strings.
- Skipped or unvisited values SHALL be rendered as `N/A`.

#### Scenario: Sparse matrix for conditional nodes
- **GIVEN** a facet has nodes A (always shown), B (`condition: q-a = "yes"`), C (always shown), all with non-empty aliases
- **AND** respondent 1 answered `A = "yes"` (so B was shown) and C
- **AND** respondent 2 answered `A = "no"` (so B was not shown) and C
- **WHEN** the CSV is generated
- **THEN** the column headers SHALL include `A_label`, `B_label`, `C_label`
- **AND** respondent 1's row SHALL have values for A, B, and C
- **AND** respondent 2's row SHALL have values for A, `N/A` for B, and a value for C

#### Scenario: Empty-alias node included as a column
- **GIVEN** a Likert node with `alias: ""`, `label: "How do you feel?"`, `record_response: true`
- **WHEN** the CSV is generated
- **THEN** a column SHALL be present with header `How do you feel?`
- **AND** the column key SHALL be the node's internal React Flow id (matching the `node_alias` fallback in `responses`)
