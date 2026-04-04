# player-submission Specification

## Purpose
Define the submission flow triggered when a respondent reaches the End node,
including submission record creation, response row insertion, and cleanup.

## Requirements

### Requirement: Submissions table schema
The system SHALL persist submissions with the following Postgres schema:

```sql
CREATE TABLE submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id          uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  facet_id         uuid NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  facet_nickname   text NOT NULL,
  visitor_id       text NOT NULL,
  is_complete      boolean NOT NULL DEFAULT false,
  submitted_at     timestamptz,
  respondent_email text,
  metadata         jsonb,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_submissions_form ON submissions(form_id);
CREATE INDEX idx_submissions_visitor ON submissions(visitor_id, form_id);
CREATE UNIQUE INDEX idx_submissions_once_per_visitor
  ON submissions(visitor_id, facet_id) WHERE is_complete = true;
```

RLS: public INSERT (respondents create rows), owner SELECT via
form_id -> forms.user_id.

The partial unique index on (visitor_id, facet_id) WHERE is_complete = true
enforces once-per-visitor at the database level.

### Requirement: Responses table schema
The system SHALL persist responses with the following Postgres schema:

```sql
CREATE TABLE responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  facet_id        uuid NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  node_slug       text NOT NULL,
  node_label      text NOT NULL,
  node_required   boolean NOT NULL,
  node_record     boolean NOT NULL,
  value           jsonb,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_responses_submission ON responses(submission_id);
```

RLS: public INSERT, owner SELECT via submission_id -> submissions.form_id
-> forms.user_id.

### Requirement: Submission rate limiting
The submission endpoint SHALL enforce rate limiting to prevent spam:
- Per IP address: max 10 submissions per 10 minutes

Rate limit state SHALL be stored in the Supabase `rate_limit_log` table
(shared with the LLM proxy — see player-llm spec for schema).
Each submission attempt inserts a row with key = "submit:ip:{ip_address}".
The rate check counts rows within the 10-minute window.
Exceeding the limit SHALL return HTTP 429.

### Requirement: Submission API endpoint
The system SHALL implement a POST endpoint at /api/submit as a TanStack
Start API route using `createAPIFileRoute` from `@tanstack/start/api`
at `src/routes/api/submit.ts`. The endpoint SHALL accept a JSON body:

```typescript
{
  form_id: string;
  facet_id: string;
  visitor_id: string;
  responses: Record<string, unknown>;  // nodeSlug -> value
  metadata: { browser: string; locale: string; userAgent: string };
}
```

The endpoint SHALL:
1. Validate form_id and facet_id exist
2. Enforce rate limiting (see rate limiting requirement below)
3. Read the facet's flow_definition server-side to determine which nodes
   have record_response = true and to populate node_label, node_required,
   and node_record fields
4. Check for duplicate submission (visitor_id + facet_id already completed)
5. Insert the submissions row and all responses rows in a single transaction
6. Return { success: true } on success, or appropriate error responses

The endpoint SHALL NOT require an BetterAuth session (respondents are
unauthenticated). It SHALL use the Supabase service role key to insert
rows into submissions and responses tables (which have public INSERT RLS).

### Requirement: Submission record
When the respondent reaches the End node and clicks Continue (or the End
node is rendered after the final page), the system SHALL insert a row into
the submissions table with:
- form_id: the resolved form ID
- facet_id: the resolved facet ID
- facet_nickname: snapshot of the facet nickname at submission time
- visitor_id: the visitor_id determined during Phase 2
- is_complete: true
- submitted_at: now()
- respondent_email: value from the email_collection node if answered
  (first answered email_collection node if multiple exist in the flow)
- metadata: { browser, locale, userAgent }

### Requirement: Response rows
The system SHALL insert one responses row per content node (nodes with slugs)
in the facet's flow definition where the node was visited AND record_response = true.
For unvisited nodes (not reached due to graph routing) with record_response = true:
the system SHALL insert a row with value = null.
For visited nodes with record_response = false: NOT inserted.
Each row SHALL include:
- node_slug
- node_label (the question text)
- node_required
- node_record (the record_response flag value)
- value (the recorded response, or null for unvisited)

### Requirement: record_response = false handling
Nodes with record_response = false SHALL have their responses tracked in
the session (for formula evaluation) but SHALL NOT produce a responses row
in Supabase. The CSV exporter uses this distinction (see csv-export spec).

### Requirement: LLM conversation storage formats
For real_llm nodes with record_response = true, the /api/submit endpoint
SHALL read the conversation data server-side from the `llm_conversations`
table by querying for the matching (visitor_id, facet_id, node_slug) row.
The `messages` jsonb field (excluding the system_context) SHALL be written
as the response value:
  [{ role: "user" | "assistant", content: string }]

The client SHALL NOT submit real_llm conversation content in the request
body. The server is the sole source of truth for real_llm conversations
(prevents tampering with conversation records).

For scripted_llm nodes with record_response = true, the conversation
SHALL be submitted by the client and written at submission time as:
  [{ botMessage: string, selectedOption: string }]
in chronological order of turns. Scripted conversations are deterministic
and client-side only, so client submission is acceptable.

### Requirement: Session cleanup
After a successful submission (submissions row created and all responses
rows inserted), the system SHALL remove parlay_session_{formId} from
localStorage.

### Requirement: End node rendering
After submission, the system SHALL render the End node's markdownContent
using Milkdown as the completion/thank-you screen.
The Continue button SHALL be absent or disabled on the End node.

### Requirement: Once-per-visitor database enforcement
The partial unique index on submissions (visitor_id, facet_id) WHERE
is_complete = true SHALL prevent duplicate completed submissions at the
database level. If the INSERT violates this constraint, the system SHALL
catch the error gracefully and show the End node content (the respondent
has already submitted).

#### Scenario: Successful form submission
- GIVEN a respondent has completed all required pages and clicked Continue
  on the last page
- WHEN the graph traverser reaches the End node
- THEN the system inserts a submissions row with is_complete = true
- AND inserts responses rows for all visited nodes with record_response = true
- AND inserts responses rows with value = null for unvisited nodes with record_response = true
- AND clears parlay_session_{formId} from localStorage
- AND renders the End node markdown content

#### Scenario: Unvisited node in responses
- GIVEN a flow has nodes A, B (condition: q-a = "skip"), C
- AND the respondent answered q-a = "continue" (so B was never shown)
- WHEN the submission is created
- THEN node B produces a responses row with value = null
- AND node A and node C produce rows with their actual response values

#### Scenario: record_response = false node
- GIVEN a node with slug "q-screening" has record_response = false
- AND the respondent answered it during the session
- WHEN the submission is created
- THEN NO responses row is inserted for q-screening
- AND the value is available in the session for formula evaluation
  (but not persisted to Supabase)

#### Scenario: Email collection in submission
- GIVEN the form has one email_collection node
- AND the respondent entered "test@example.com"
- WHEN the submission is created
- THEN submissions.respondent_email = "test@example.com"

#### Scenario: Scripted LLM conversation in response
- GIVEN a scripted_llm node with 3 turns completed
- WHEN the submission is created
- THEN the response value is:
  [{"botMessage":"Welcome!","selectedOption":"Tell me more"},
   {"botMessage":"Sure! What topic?","selectedOption":"Technology"},
   {"botMessage":"Great choice!","selectedOption":"Done"}]

#### Scenario: Duplicate submission prevented
- GIVEN visitor_id "abc123" has already submitted for facet "horizon"
- WHEN the system attempts to insert another completed submission
- THEN the partial unique index rejects the INSERT
- AND the system shows the End node content gracefully
