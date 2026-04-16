## MODIFIED Requirements

### Requirement: Always-tracked responses
The system SHALL store all response-bearing node responses in
`session.responses` regardless of the node's `record_response` flag.
The `record_response` flag SHALL control only whether the value is
written to Supabase (see player-submission spec) — not whether it is
tracked in the session, which it MUST be at all times for formula
condition evaluation.

Only response-bearing nodes with a non-empty `alias` SHALL produce
keyed entries in `session.responses` accessible to formulas. Container
nodes (Page, PageGroup, Group) and anchor nodes (Start, End) MUST NOT
produce response values.

A response-bearing node whose `alias` is empty MAY still be tracked
internally (so the player can render its value back to the user during
review), but it MUST NOT appear under any alias key in the formula
evaluation context.

#### Scenario: Likert response is tracked under its alias
- **GIVEN** a Likert node with `alias: "q-mood"` and `record_response: false`
- **WHEN** the respondent selects value 5
- **THEN** `session.responses["q-mood"]` SHALL equal 5
- **AND** subsequent formula evaluations SHALL see the value

#### Scenario: Empty-alias node is not formula-addressable
- **GIVEN** a Likert node with `alias: ""` and `record_response: true`
- **WHEN** the respondent answers it
- **THEN** the value MAY still be persisted to Supabase at submission time
- **AND** the formula evaluation context MUST NOT contain an entry for this node keyed by an empty string

#### Scenario: Scripted LLM mid-conversation session state
- **GIVEN** a scripted_llm node with `alias: "chat-intake"`
- **AND** the respondent has completed 2 turns
- **WHEN** `session.responses` is inspected
- **THEN** `session.responses["chat-intake"]` SHALL contain:
  ```
  [{"botMessage":"Welcome!","selectedOption":"Tell me more"},
   {"botMessage":"Sure!","selectedOption":"Technology"}]
  ```

### Requirement: Session clearing on completion
The system SHALL remove the `parlay_session_{formId}` key from
localStorage after a successful submission (all responses written to
Supabase and the submission row marked `is_complete = true`).

#### Scenario: Resume after browser close
- **WHEN** a respondent with an existing session returns to `/:formId`
- **THEN** Phase 2 SHALL resolve to the same facet via fingerprint
- **AND** the system SHALL find the localStorage session with matching `facetNickname`
- **AND** SHALL offer "Resume where you left off" vs "Start fresh"

#### Scenario: Facet mismatch discards session
- **WHEN** a session exists with `facetNickname = "horizon"`
- **AND** the visitor is now resolved to facet `"compass"`
- **THEN** the system SHALL discard the `"horizon"` session without prompting
- **AND** SHALL start fresh with facet `"compass"`

#### Scenario: Shuffle stability on resume
- **GIVEN** a respondent was on a page with a shuffled multi-choice question
- **AND** the shuffle seed `"nodeId_123" = 42` is stored in the session
- **WHEN** the respondent resumes the session
- **THEN** the multi-choice options SHALL appear in the same shuffled order as before

#### Scenario: Session creation timing
- **GIVEN** a respondent has completed Phase 2 and clicked Continue on the Start screen
- **WHEN** the first page-tier node is about to render
- **THEN** the system SHALL create the `RespondentSession` with empty `responses`, empty `visitedPageIds`, and pre-generated `shuffleSeeds`
- **AND** SHALL store it in localStorage under `parlay_session_{formId}`
