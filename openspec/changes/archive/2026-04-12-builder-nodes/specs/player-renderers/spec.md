## MODIFIED Requirements

### Requirement: Likert renderer
The system SHALL render a horizontal row of numbered buttons between
`minLabel` (left) and `maxLabel` (right), spanning from `min` to `max`
values.

Selecting a value SHALL immediately record it in `session.responses`.
The session key SHALL be the node's `data.alias` when non-empty,
otherwise the node's internal React Flow id as a stable fallback so
the value can still be located by other parts of the player.

The selected value SHALL be visually highlighted in the rendered UI.

#### Scenario: Likert value recorded under alias
- **GIVEN** a Likert node with `alias: "q-mood"`, `min: 1`, `max: 7`
- **WHEN** the respondent taps the "5" button
- **THEN** `session.responses["q-mood"]` SHALL equal `5`
- **AND** the "5" button SHALL be visually highlighted

#### Scenario: Likert value recorded under internal id when alias is empty
- **GIVEN** a Likert node with `alias: ""` and internal id `node-abc`
- **WHEN** the respondent taps a value
- **THEN** the value SHALL be stored in `session.responses` under the key `node-abc`
- **AND** the formula evaluation context MUST NOT contain an entry keyed by an empty string

### Requirement: Real LLM renderer
The system SHALL render a full-screen chat UI with a free-text input.
All navigation chrome SHALL be hidden during the active conversation.

On mount, the client SHALL send an init request to `/api/llm-proxy`
with `form_id`, `facet_id`, `node_alias`, and `visitor_id`. The
`node_alias` field SHALL carry the real_llm node's `data.alias` if
non-empty, otherwise the node's internal React Flow id as a fallback
so the server can still locate the node in the facet's
`flow_definition`.

The server SHALL return the `conversation_id` and the first bot
message (pre-warmed). The client SHALL display the first bot message
as the opening chat bubble. Each subsequent user message SHALL be
POSTed to `/api/llm-proxy` with the `conversation_id` and `message`.
The client MUST NOT send `setup_prompt`, `ending_condition`, or any
system context.

The streamed response SHALL render as a chat bubble. When the server
sends `ended: true`:

- The text input SHALL be disabled (the user can no longer type).
- A Continue button SHALL appear at the bottom of the chat.
- The system SHALL smooth-scroll to the Continue button.

`maxTurns` SHALL act as the hard fallback limit and is enforced by
the server.

#### Scenario: Real LLM init sends node_alias
- **GIVEN** the player mounts a real_llm node with `alias: "chat-intake"`
- **WHEN** the client builds the init request body
- **THEN** the body SHALL contain `node_alias: "chat-intake"`
- **AND** the body MUST NOT contain a field named `node_slug`

#### Scenario: Real LLM init falls back to internal id when alias is empty
- **GIVEN** a real_llm node with `alias: ""` and internal React Flow id `node-xyz`
- **WHEN** the client builds the init request body
- **THEN** the body SHALL contain `node_alias: "node-xyz"`
- **AND** the server SHALL still locate the node in `flow_definition`
