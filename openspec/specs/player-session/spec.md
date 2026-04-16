# player-session Specification

## Purpose
Define respondent session persistence in localStorage for resume support,
shuffle seed stability, and in-progress response tracking within the
single-page form player.
## Requirements
### Requirement: Session storage key and structure
The system SHALL store respondent session in localStorage under the key
parlay_session_{formId} with the following structure:

```typescript
interface RespondentSession {
  facetNickname: string;
  visitedPageIds: string[];                        // ordered IDs of page-tier nodes visited (Page, PageGroup, scripted_llm, real_llm)
  currentVirtualPageIndex: Record<string, number>; // pageGroupId -> current virtual page index
  responses: Record<string, unknown>;              // nodeSlug -> value (always tracked for content nodes)
  shuffleSeeds: Record<string, number>;            // nodeId/groupId -> random seed
  checkpointsPassed: number;                       // count of checkpoint pages entered
}
```

### Requirement: Session initialization timing
The system SHALL create the RespondentSession when the respondent lands on
the first page-tier node (after the Start screen, if shown, or directly
after Phase 2 if Start has no content). At creation time the system SHALL
populate shuffleSeeds for all nodes/groups that require them, initialize
visitedPageIds as empty, responses as empty, checkpointsPassed as 0, and
currentVirtualPageIndex as empty. This ensures shuffle seeds are available
before any shuffled content is rendered.

### Requirement: Shuffle seed generation
On session initialization, the system SHALL generate a random integer seed
for each Group node with shuffle = true, each PageGroup with shuffle = true,
and each question node with shuffleOptions = true.
The system SHALL use these seeds with a seeded shuffle function to produce
the same child/option order on resume as on initial visit.
Seeds SHALL be stored in shuffleSeeds in the session.

### Requirement: Resume prompt
The system SHALL offer a "Resume where you left off" vs "Start fresh" prompt when:
- A parlay_session_{formId} entry exists in localStorage, AND
- The stored facetNickname matches the currently resolved facet nickname

Choosing "Resume" SHALL restore visitedPageIds, currentVirtualPageIndex,
responses, shuffleSeeds, and checkpointsPassed, then navigate to the last
visited position.
Choosing "Start fresh" SHALL clear the session and begin from the Start node.

When the resolved facet nickname does NOT match the stored session's
facetNickname (e.g., visitor was re-assigned to a different facet), the
system SHALL silently discard the stale session and start fresh without
prompting. This covers the case where a facet was archived and the visitor
is resolved to a different facet on their next visit.

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

### Requirement: LLM conversation in-session response format
For real_llm nodes, the session response value SHALL be the full
conversation array accumulated so far:
  [{ role: "user" | "assistant", content: string }]
Updated after each completed turn (both user message and assistant reply).

For scripted_llm nodes, the session response value SHALL be the full
conversation array accumulated so far:
  [{ botMessage: string, selectedOption: string }]
Updated after each user option selection.

Both formats match their respective submission formats (see player-submission
spec). The in-session value is the partial conversation during the LLM
interaction, and the final value at submission time is the complete
conversation. If record_response = true on the LLM node, the full
conversation is available in session.responses for formula evaluation
by other nodes.

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

