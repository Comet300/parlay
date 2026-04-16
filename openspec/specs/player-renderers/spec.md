# player-renderers Specification

## Purpose
Define the runtime rendering behavior of each node type in the form player,
including color scheme application and page header content.
All rendering happens within the single-page application.
## Requirements
### Requirement: Start node renderer
If the Start node has non-empty markdownContent, the player SHALL render
it as a centered card displaying the Milkdown markdown content with a
Continue button at the bottom. The Start card uses the facet's color scheme.
If the Start node has no markdownContent, the Start screen is skipped
(see player-navigation spec).

### Requirement: End node renderer
After submission, the player SHALL render the End node's markdownContent
as a centered card. If the End node has no markdownContent, the system
SHALL show a minimal "Thank you" message.
The Continue button SHALL be absent on the End node — there is nowhere
to proceed. The End screen is the terminal state.

### Requirement: Color scheme application
The system SHALL apply the facet's color_scheme as CSS custom properties
on the player root element at load time:
  --color-primary: {color_scheme.primary}
  --color-accent:  {color_scheme.accent}
  --color-background: {color_scheme.background}
All player renderer components SHALL reference these CSS variables.
No Parlay app-shell styles SHALL bleed into the player.

### Requirement: Page header content
When a Page has non-empty headerContent, the player SHALL render the
Milkdown markdown content at the top of the page, above all child nodes.
When a PageGroup has non-empty headerContent:
- If headerOnAllPages = false: show headerContent only on the first virtual page
- If headerOnAllPages = true: show headerContent on every virtual page
Header content SHALL use the facet's color scheme CSS variables.

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

### Requirement: Single choice renderer
The system SHALL render a styled radio button group showing each option's label.
If shuffleOptions = true, options SHALL appear in the order determined by
the session shuffle seed (stable across resume).
Selecting an option SHALL record the selected option label in the session.

### Requirement: Multi choice renderer
The system SHALL render a styled checkbox group showing each option's label.
If shuffleOptions = true, options SHALL appear in shuffled seed order.
Selecting/deselecting options SHALL update the session response
(array of selected option labels).

### Requirement: Email collection renderer
The system SHALL render an email text input with browser format validation.
The field is required by default (required = true).
The entered value SHALL be recorded in the session on change.

### Requirement: Card renderer
The system SHALL render the full Milkdown markdownContent as HTML.
Below the content, the system SHALL render N styled buttons (one per CardButton).
Clicking a button records the button label as the response value
(if record_response = true) and routes to the button's target via the
graph traversal engine (client-side state change, no URL update).
No separate Continue button is shown.

### Requirement: Scripted LLM renderer
The system SHALL render a full-screen chat UI.
All navigation chrome (progress bar, back button, continue button) SHALL be hidden.
Bot messages SHALL appear as chat bubbles with a simulated typing delay of
300-800ms (random per message) preceded by a typing indicator animation.
User responses SHALL be presented as styled option chips.
The system SHALL follow the script decision tree from startTurnId, advancing
through options and nextTurnIds until nextTurnId = null.
When the conversation ends (nextTurnId = null):
- The option chips SHALL be removed (user can no longer select)
- A Continue button SHALL appear at the bottom of the chat
- The system SHALL smooth-scroll to the Continue button

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

### Requirement: Technical Issue page renderer
The system SHALL render a Technical Issue page when a real_llm streaming
error aborts the form session (see player-llm spec). The page SHALL:
- Display a centered card with a message: "Something went wrong. Please
  try again later."
- Use the facet's color scheme CSS variables
- NOT show a Continue button — the form session is terminated
- NOT show the progress bar, Back button, or any navigation chrome

This is distinct from the FormUnavailable page (form-level status) — the
Technical Issue page handles runtime errors during an active session.

### Requirement: Preview mode
All renderer components SHALL accept a preview?: boolean prop.
When preview = true, the renderer SHALL render a static non-interactive mockup
with no session hooks, no API calls, and no effects.
This is used by the component gallery carousel in the builder.

#### Scenario: Page header content
- GIVEN a Page has headerContent "Please answer honestly."
- WHEN the player renders the Page
- THEN "Please answer honestly." renders as markdown at the top
- AND child question nodes render below it

#### Scenario: PageGroup header on first page only
- GIVEN a PageGroup with headerContent "Section 2: Preferences"
  and headerOnAllPages = false
- AND the PageGroup splits into 3 virtual pages
- WHEN virtual page 1 renders
- THEN the header "Section 2: Preferences" is shown
- WHEN virtual page 2 renders
- THEN the header is NOT shown

#### Scenario: Likert selection
- GIVEN a Likert node with min=1, max=7, minLabel="Disagree", maxLabel="Agree"
- WHEN the respondent clicks button 5
- THEN button 5 is visually highlighted
- AND the session records { q-satisfaction: 5 }

#### Scenario: Scripted LLM typing simulation
- GIVEN a scripted_llm node with botMessage "Welcome! How can I help?"
- WHEN the turn is about to display
- THEN a typing indicator (three animated dots) appears for 300-800ms
- AND then the message appears as a chat bubble

#### Scenario: Real LLM pre-warmed start
- GIVEN a respondent reaches a real_llm node
- WHEN the renderer mounts
- THEN it sends an init request to the server
- AND the server returns the first bot message (pre-warmed via LLM)
- AND the chat UI displays the first bot message immediately
- AND the text input is enabled for the respondent to reply

#### Scenario: Real LLM conversation end
- GIVEN the server detects [END_CONVERSATION] and sends ended: true
- WHEN the client receives the final streamed response
- THEN the text input is disabled
- AND a Continue button appears at the bottom
- AND the system smooth-scrolls to the Continue button

