## MODIFIED Requirements

### Requirement: Responses table schema
The system SHALL persist responses with the following Postgres schema:

```sql
CREATE TABLE responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  facet_id        uuid NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  node_alias      text NOT NULL,
  node_label      text NOT NULL,
  node_required   boolean NOT NULL,
  node_record     boolean NOT NULL,
  value           jsonb,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_responses_submission ON responses(submission_id);
```

The `node_alias` column SHALL store the value of the source node's
`data.alias` field at submission time. When the source node had
`data.alias = ""`, the column SHALL store the node's internal React
Flow id (UUID) instead, so the row remains uniquely identifiable for
export. The column MUST be named `node_alias` rather than `node_slug`
because the value it carries is a node alias, not a URL slug.

RLS SHALL be enabled on the table with NO public INSERT policy. All
writes MUST be performed via the Supabase service role key in the
`/api/submit` server route alongside the parent submission row. Owner
SELECT SHALL be permitted via `submission_id → submissions.form_id →
forms.user_id` for dashboard and export access.

#### Scenario: Likert response row uses alias as key
- **GIVEN** a Likert node with `alias: "q-mood"`, `record_response: true`
- **AND** the respondent selected value 5
- **WHEN** the submission is created
- **THEN** a `responses` row SHALL exist with `node_alias = "q-mood"` and `value = 5`

#### Scenario: Empty alias falls back to internal node id
- **GIVEN** a Likert node with `alias: ""`, `record_response: true`
- **AND** the respondent answered it
- **WHEN** the submission is created
- **THEN** a `responses` row SHALL exist with `node_alias` set to the node's internal React Flow id (UUID)
- **AND** the row SHALL still be selectable by the form owner

### Requirement: Submission API endpoint
The system SHALL implement a POST endpoint at `/api/submit` as a
TanStack Start server route using `createFileRoute` with
`server.handlers` at `src/routes/api/submit.ts`. The endpoint SHALL
accept a JSON body of the following shape:

```typescript
{
  form_id: string;
  facet_id: string;
  visitor_id: string;
  responses: Record<string, unknown>;  // nodeAlias (or internal node id when alias is empty) -> value
  metadata: { browser: string; locale: string; userAgent: string };
}
```

The endpoint SHALL:

1. Validate that `form_id` and `facet_id` exist.
2. Enforce rate limiting (see rate limiting requirement below).
3. Read the facet's `flow_definition` server-side to determine which
   nodes have `record_response = true` and to populate `node_label`,
   `node_required`, and `node_record`. The `node_alias` column SHALL
   be populated from `data.alias` when non-empty, otherwise from the
   internal React Flow node id as a stable fallback.
4. Check for duplicate submission (`visitor_id` + `facet_id` already
   completed).
5. Insert the `submissions` row and all `responses` rows in a single
   transaction.
6. Return `{ success: true }` on success, or appropriate error
   responses otherwise.

The endpoint MUST NOT require a BetterAuth session (respondents are
unauthenticated). It SHALL use the Supabase service role key to
insert rows into the `submissions` and `responses` tables (no public
RLS policies — all writes go through the service role key).

#### Scenario: Endpoint rejects body missing required fields
- **WHEN** a client POSTs to `/api/submit` without a `form_id` field
- **THEN** the endpoint SHALL return a 400 response
- **AND** no rows SHALL be inserted

#### Scenario: Endpoint accepts a valid responses payload
- **GIVEN** a facet with two response-bearing nodes, aliases `q-age` and `q-mood`
- **WHEN** the client POSTs `responses: { "q-age": 25, "q-mood": 5 }`
- **THEN** the endpoint SHALL insert one `submissions` row and two `responses` rows
- **AND** the `node_alias` column on each response row SHALL match the alias from the request body

### Requirement: Response rows
The system SHALL insert one `responses` row per response-bearing node
in the facet's flow definition where the node was visited AND
`record_response = true`. For unvisited nodes (not reached due to
graph routing) with `record_response = true`, the system SHALL insert
a row with `value = null`. For visited nodes with
`record_response = false`, the system MUST NOT insert a row.

Each row SHALL include:

- `node_alias` — the source node's `data.alias` if non-empty,
  otherwise the internal React Flow node id (UUID) as a fallback so
  the row remains uniquely identifiable.
- `node_label` — the question text.
- `node_required` — the source node's `required` flag value.
- `node_record` — the source node's `record_response` flag value.
- `value` — the recorded response, or `null` for unvisited nodes.

#### Scenario: Unvisited recorded node produces a null row
- **GIVEN** a flow has nodes A, B (`condition: q-a = "skip"`), C, all with `record_response: true` and aliases `q-a`, `q-b`, `q-c`
- **AND** the respondent answered `q-a = "continue"` so B was never shown
- **WHEN** the submission is created
- **THEN** the `responses` table SHALL contain a row for `q-b` with `value = null`
- **AND** rows for `q-a` and `q-c` SHALL contain their actual values

#### Scenario: record_response = false node is not persisted
- **GIVEN** a Likert node with `alias: "q-screening"` and `record_response: false`
- **AND** the respondent answered it during the session
- **WHEN** the submission is created
- **THEN** no `responses` row SHALL be inserted for `q-screening`
- **AND** the value MAY still be available in `session.responses` for formula evaluation

### Requirement: LLM conversation storage formats
The `/api/submit` endpoint SHALL read real_llm conversation data server-side from the `llm_conversations` table when `record_response = true`, querying by `(visitor_id, facet_id, node_alias)` and writing the `messages` jsonb field (excluding `system_context`) as the response value:

```
[{ role: "user" | "assistant", content: string }]
```

The client MUST NOT submit real_llm conversation content in the
request body. The server SHALL be the sole source of truth for
real_llm conversations to prevent tampering with conversation records.

For scripted_llm nodes with `record_response = true`, the conversation
SHALL be submitted by the client and written at submission time as:

```
[{ botMessage: string, selectedOption: string }]
```

in chronological order of turns. Scripted conversations are
deterministic and client-side only, so client submission MAY be
accepted.

#### Scenario: Real LLM conversation read from server-side row
- **GIVEN** a real_llm node with `alias: "chat-intake"` and `record_response: true`
- **AND** the respondent completed 3 turns and the row in `llm_conversations` has `node_alias = "chat-intake"`
- **WHEN** the submission is created
- **THEN** the server SHALL query `llm_conversations` by `(visitor_id, facet_id, node_alias)`
- **AND** SHALL write the resulting `messages` array (without `system_context`) as the `value` of the corresponding `responses` row

#### Scenario: Scripted LLM conversation submitted by client
- **GIVEN** a scripted_llm node with `alias: "intake-script"` and `record_response: true`
- **AND** the respondent completed 3 turns
- **WHEN** the client submits the form
- **THEN** the request body's `responses["intake-script"]` SHALL contain an array of `{ botMessage, selectedOption }` objects
- **AND** the server SHALL persist that array as the response value

### Requirement: Once-per-visitor database enforcement
The partial unique index on `submissions(visitor_id, facet_id) WHERE is_complete = true` SHALL prevent duplicate completed submissions at the database level. If the INSERT violates this constraint, the system SHALL catch the error gracefully and SHALL show the End node content (the respondent has already submitted).

#### Scenario: Successful form submission
- **GIVEN** a respondent has completed all required pages and clicked Continue on the last page
- **WHEN** the graph traverser reaches the End node
- **THEN** the system SHALL insert a `submissions` row with `is_complete = true`
- **AND** SHALL insert `responses` rows for all visited nodes with `record_response = true`
- **AND** SHALL insert `responses` rows with `value = null` for unvisited nodes with `record_response = true`
- **AND** SHALL clear `parlay_session_{formId}` from localStorage
- **AND** SHALL render the End node markdown content

#### Scenario: Unvisited node in responses
- **GIVEN** a flow has nodes A, B (`condition: q-a = "skip"`), C
- **AND** the respondent answered `q-a = "continue"` so B was never shown
- **WHEN** the submission is created
- **THEN** node B SHALL produce a `responses` row with `value = null`
- **AND** node A and node C SHALL produce rows with their actual response values

#### Scenario: Email collection in submission
- **GIVEN** the form has one email_collection node
- **AND** the respondent entered "test@example.com"
- **WHEN** the submission is created
- **THEN** `submissions.respondent_email` SHALL equal "test@example.com"

#### Scenario: Scripted LLM conversation in response
- **GIVEN** a scripted_llm node with 3 turns completed
- **WHEN** the submission is created
- **THEN** the response value SHALL equal:
  ```
  [{"botMessage":"Welcome!","selectedOption":"Tell me more"},
   {"botMessage":"Sure! What topic?","selectedOption":"Technology"},
   {"botMessage":"Great choice!","selectedOption":"Done"}]
  ```

#### Scenario: Duplicate submission prevented
- **GIVEN** `visitor_id "abc123"` has already submitted for facet "horizon"
- **WHEN** the system attempts to insert another completed submission
- **THEN** the partial unique index SHALL reject the INSERT
- **AND** the system SHALL show the End node content gracefully
