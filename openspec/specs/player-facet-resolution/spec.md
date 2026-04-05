# player-facet-resolution Specification

## Purpose
Define the complete server-side decision tree for resolving which facet
to serve when a respondent visits /:formId, executed during Phase 2
of the two-phase load after the visitor_id is received from the client.
After resolution, the URL is set to /:formId?v={nickname} once and
never changes again — all subsequent navigation is client-side state.

## Requirements

### Requirement: Resolution decision tree
The system SHALL resolve the facet using the following exact decision tree,
all executed server-side after receiving visitor_id from the client:

```
1. If ?v= query param is present:
   a. Look up active facet with that nickname in this form.
   b. If found -> serve that facet.
   c. If not found -> check facet_nickname_history for a 301 redirect:
      - If history match found -> 301 redirect to /:formId?v={currentNickname}
      - If not found -> 404

2. If no ?v= param:
   a. Check round_robin_log for existing (visitor_id + form_id) assignment.
   b. If found:
      - Look up the assigned facet's current status
      - If the facet is active -> set URL to ?v={facet's current nickname}
        (use the facet row's current nickname, NOT the round_robin_log
        snapshot — the facet may have been renamed since assignment)
      - If the facet is archived -> render FormUnavailable page
   c. If not found:
      i. If round_robin_enabled = false:
         - set URL to ?v={default facet nickname where is_default=true AND status='active'}
         - If no active default found -> render FormUnavailable page
      ii. If round_robin_enabled = true:
         - Count active facets (status = 'active')
         - 0 active facets -> render FormUnavailable page
         - 1 active facet -> set URL to ?v={that nickname}, log assignment
         - N>1 active facets -> call increment_round_robin(formId),
           pick facets[index] ordered by created_at ASC, id ASC,
           INSERT into round_robin_log (visitor_id, facet),
           set URL to ?v={nickname}
```

### Requirement: Once-per-visitor submission enforcement
After resolution, the system SHALL check the submissions table for an
existing completed submission (is_complete = true) for this visitor_id +
facet_id combination.
If a completed submission exists: the system SHALL render the End node
content directly (the thank-you/completion screen) instead of starting
the form. The respondent SHALL NOT be able to retake the form.
If no completed submission exists: the system SHALL proceed with the
normal form flow (including resume prompt if a session exists).

### Requirement: Single URL update
After the resolution decision tree completes, the system SHALL set the
browser URL to /:formId?v={resolvedNickname} exactly once. This is the
only URL change during the entire form session. All subsequent page
navigation, LLM conversations, and submission happen as client-side
state transitions without URL changes.

### Requirement: Sensitive field stripping
Before returning the resolved facet's flow_definition to the client,
the server SHALL strip the following fields from all real_llm nodes:
- setup_prompt
- ending_condition
These fields are used server-side only by the /api/llm-proxy endpoint.
The client receives a sanitized flow_definition that does not contain
any hidden-from-respondent data.

### Requirement: Service role key for resolution queries
The system SHALL use the Supabase service role key for facet resolution
queries only. The form player is public but the server needs to read
across the active-facets RLS boundary to resolve assignments.
This is one of the limited contexts where the service role key is used.

### Requirement: FormUnavailable conditions
The system SHALL render the FormUnavailable page when:
- round_robin_enabled = true and zero active facets exist, OR
- round_robin_enabled = false and no active default facet exists, OR
- The ?v= nickname belongs to a facet with status = 'archived', OR
- A return visitor's previously assigned facet has been archived

#### Scenario: Direct nickname, active facet
- GIVEN a form has an active facet with nickname "compass"
- WHEN a respondent visits /:formId?v=compass (with any visitor_id)
- THEN the system serves the compass facet directly
- AND does NOT increment the round-robin counter

#### Scenario: No param, first visit, round-robin off
- GIVEN round_robin_enabled = false
- AND the form has one active facet "control" with is_default = true
- AND no round_robin_log entry for this visitor_id
- WHEN the respondent visits /:formId
- THEN the system sets the URL to /:formId?v=control

#### Scenario: Return visitor, already submitted
- GIVEN visitor_id "abc123" previously completed the form for facet "horizon"
- AND submissions contains a row with visitor_id "abc123", facet_id matching
  "horizon", and is_complete = true
- WHEN visitor "abc123" visits /:formId again
- THEN the system finds the completed submission
- AND renders the End node content (thank-you screen) directly
- AND does NOT allow retaking the form

#### Scenario: Return visitor, assigned facet archived
- GIVEN visitor_id "abc123" was previously assigned to facet "horizon"
- AND facet "horizon" has since been archived
- WHEN the same visitor loads /:formId
- THEN the system finds the round_robin_log entry for "abc123"
- AND detects the assigned facet is archived
- AND renders the FormUnavailable page

#### Scenario: Sensitive fields stripped
- GIVEN a facet's flow_definition contains a real_llm node with
  setup_prompt "You are a research assistant" and ending_condition "End after 5 topics"
- WHEN the server returns the flow_definition to the client
- THEN setup_prompt and ending_condition are stripped from the real_llm node
- AND the client receives a sanitized version without those fields

#### Scenario: Archived facet access via ?v=
- GIVEN facet "pilot" has status = 'archived'
- WHEN a respondent visits /:formId?v=pilot
- THEN the system renders the FormUnavailable page

#### Scenario: No active facets
- GIVEN all facets of a form are archived
- AND round_robin_enabled = true
- WHEN any respondent visits /:formId
- THEN the system renders the FormUnavailable page
