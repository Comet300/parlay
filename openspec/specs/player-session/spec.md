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
  visitedPageIds: string[];                        // ordered IDs of Pages/PageGroups visited
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

### Requirement: Always-tracked responses
The system SHALL store all content node responses in session.responses
regardless of the node's record_response flag.
The record_response flag controls only whether the value is written to
Supabase (see player-submission spec) — not whether it is tracked in the
session (it is always tracked for formula condition evaluation).
Only content nodes with slugs produce response values — container nodes
(Page, PageGroup, Group) do not.

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
The system SHALL remove the parlay_session_{formId} key from localStorage
after a successful submission (all responses written to Supabase and the
submission row is marked is_complete = true).

#### Scenario: Resume after browser close
- GIVEN a respondent completed pages 1 and 2 of a 5-page form and closed the browser
- WHEN they reopen /:formId
- AND Phase 2 resolves to the same facet via fingerprint
- THEN the system finds the localStorage session with matching facetNickname
- AND offers "Resume where you left off" vs "Start fresh"
- WHEN they choose "Resume"
- THEN the player navigates directly to page 3 (client-side state, no URL change)

#### Scenario: Different facet in session
- GIVEN a session exists in localStorage with facetNickname = "horizon"
- AND the current visitor_id is now assigned to facet "compass"
- WHEN the player loads
- THEN the system does NOT offer to resume (facet mismatch)
- AND starts fresh with facet "compass"

#### Scenario: Shuffle stability on resume
- GIVEN a respondent was on a page with a shuffled multi-choice question
- AND the shuffle seed "nodeId_123" = 42 is stored in the session
- WHEN the respondent resumes the session
- THEN the multi-choice options appear in the same shuffled order as before

#### Scenario: Session creation timing
- GIVEN a respondent has completed Phase 2 and clicked Continue on the Start screen
- WHEN the first page-tier node is about to render
- THEN the system creates the RespondentSession with empty responses,
  empty visitedPageIds, and pre-generated shuffleSeeds
- AND stores it in localStorage under parlay_session_{formId}

#### Scenario: Scripted LLM mid-conversation session state
- GIVEN a scripted_llm node with slug "chat-intake"
- AND the respondent has completed 2 turns
- WHEN the session.responses is inspected
- THEN "chat-intake" contains:
  [{"botMessage":"Welcome!","selectedOption":"Tell me more"},
   {"botMessage":"Sure!","selectedOption":"Technology"}]
