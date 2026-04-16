## MODIFIED Requirements

### Requirement: Conversation initialization (pre-warming)
When a respondent reaches a real_llm node, the client SHALL send an
initialization request to the server BEFORE showing the chat UI. The
server SHALL:

1. Look up the real_llm node's data from the facet's `flow_definition`
   using `form_id`, `facet_id`, and `node_alias`. When the source node
   has an empty `data.alias`, the client SHALL pass the node's internal
   React Flow id in the `node_alias` field instead so the lookup
   remains stable.
2. Construct the system context string entirely server-side as
   `{setup_prompt}\n\n{ending_condition}\n\nWhen the conversation
   should end, output [END_CONVERSATION] as the last token of your
   response.`
3. Look up the provider's API key from Vault (see provider-based
   lookup).
4. Send the system context to LiteLLM to obtain the first bot message.
5. Store the conversation state in the `llm_conversations` table.
6. Return the `conversation_id` and the first bot message to the
   client.

The client SHALL display the first bot message as the opening of the
chat. The `setup_prompt` and `ending_condition` MUST never be exposed
to the client.

#### Scenario: Init lookup uses node_alias
- **GIVEN** a respondent reaches a real_llm node with `alias: "chat-intake"` and provider `"openai"`
- **WHEN** the client sends an init request with `node_alias: "chat-intake"`
- **THEN** the server SHALL look up the node in `flow_definition` by alias
- **AND** SHALL pre-warm the LLM and return the first bot message

#### Scenario: Init lookup falls back to internal id when alias is empty
- **GIVEN** a real_llm node with `alias: ""`
- **WHEN** the client sends an init request with `node_alias` set to the node's internal React Flow id
- **THEN** the server SHALL still locate the node in `flow_definition`
- **AND** SHALL pre-warm the conversation successfully

### Requirement: Request format
The route SHALL accept POST requests with one of the following body
shapes.

Initialization (start conversation):

```
{ form_id: string, facet_id: string, node_alias: string, action: "init", visitor_id: string }
```

The endpoint SHALL return:

```
{ conversation_id: string, bot_message: string, ended: boolean }
```

The `node_alias` field MUST carry the real_llm node's `data.alias`
when non-empty, otherwise the node's internal React Flow id. The
server SHALL use it as a lookup key into `flow_definition` and as
part of the conversation row identity.

Send message (subsequent turns):

```
{ conversation_id: string, message: string, visitor_id: string }
```

The endpoint SHALL return a streaming response (SSE/ReadableStream).

#### Scenario: Init request must include node_alias
- **WHEN** a client POSTs to `/api/llm-proxy` with `action: "init"` but no `node_alias` field
- **THEN** the server SHALL return a 400 response
- **AND** no row SHALL be inserted into `llm_conversations`

### Requirement: Conversation session storage
The server SHALL maintain conversation state in a Supabase
`llm_conversations` table:

```sql
CREATE TABLE llm_conversations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   text UNIQUE NOT NULL,
  form_id           uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  facet_id          uuid NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  node_alias        text NOT NULL,
  visitor_id        text NOT NULL,
  system_context    text NOT NULL,
  messages          jsonb NOT NULL DEFAULT '[]',
  is_ended          boolean NOT NULL DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
```

The system SHALL maintain `updated_at` via a Postgres trigger:

```sql
CREATE OR REPLACE FUNCTION update_llm_conversation_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_llm_conversation_updated_at
  BEFORE UPDATE ON llm_conversations
  FOR EACH ROW EXECUTE FUNCTION update_llm_conversation_updated_at();
```

The `node_alias` column SHALL store the value the client sent in the
init request body. The column MUST be named `node_alias` rather than
`node_slug` because the value it carries is a node alias (with the
internal node id as fallback when the alias is empty), not a URL slug.

The `conversation_id` SHALL be a random UUID generated on
initialization. Conversations SHALL be considered expired after 1
hour of inactivity (`updated_at < now() - interval '1 hour'`). When a
conversation lookup finds an expired row, the server SHALL return a
410 Gone error so the player can show a "session expired" message
with a Continue button. The `updated_at` trigger SHALL ensure active
conversations (with messages being appended) do not expire
prematurely.

#### Scenario: Init creates an llm_conversations row keyed by node_alias
- **GIVEN** the server processes an init request with `node_alias: "chat-intake"`
- **WHEN** the row is inserted
- **THEN** `llm_conversations.node_alias` SHALL equal `"chat-intake"`
- **AND** `conversation_id` SHALL be a unique UUID

#### Scenario: Expired conversation returns 410
- **GIVEN** an `llm_conversations` row with `updated_at` older than 1 hour
- **WHEN** the client sends a follow-up message referencing the row's `conversation_id`
- **THEN** the server SHALL return a 410 Gone response
- **AND** the player SHALL show a "session expired" message with a Continue button

### Requirement: Streaming error — abort to technical issue page
The system SHALL abort the form session and redirect the respondent to a dedicated Technical Issue page if a streaming error occurs during a real_llm conversation (e.g., the LiteLLM upstream returns a 5xx, the connection drops mid-stream, or the response times out).

The server SHALL:

1. Detect the stream failure (network error, non-2xx chunk, timeout).
2. Send an `error: true` flag in the final SSE event with a reason string.
3. Mark the `llm_conversations` row as `is_ended = true`.

The client SHALL:

1. On receiving `error: true` in the SSE stream, immediately stop rendering.
2. Navigate to the Technical Issue page (a client-side route, no URL change).
3. Display a message such as: "Something went wrong. Please try again later."
4. NOT offer a Continue button — the form session is aborted and cannot be resumed.
5. Clear the session in localStorage.

This is distinct from FormUnavailable (which is a form-level status issue). The Technical Issue page handles a runtime error during an active session.

#### Scenario: Subsequent turn
- **GIVEN** a conversation is active with `conversation_id "conv-123"`
- **WHEN** the respondent sends "Tell me about Romania"
- **THEN** the server SHALL append the message to `llm_conversations.messages`
- **AND** SHALL POST to `{litellm_base_url}` with system context + full history
- **AND** SHALL stream the LLM response back to the player
- **AND** the player SHALL append it as a new chat bubble

#### Scenario: End token detected by server
- **GIVEN** the LLM streams tokens: `"Thank"`, `" you"`, `"."`, `" [END"`, `"_CONVERS"`, `"ATION"`, `"]"`
- **WHEN** the server reconstructs the stream
- **THEN** it SHALL detect `[END_CONVERSATION]` in the assembled text
- **AND** SHALL strip it, sending only `"Thank you."` to the client
- **AND** SHALL send an `ended: true` flag in the final SSE event
- **AND** the client SHALL disable the text input
- **AND** SHALL show the Continue button
- **AND** SHALL smooth-scroll to the Continue button

#### Scenario: End by maxTurns
- **GIVEN** a real_llm node with `maxTurns = 5`
- **WHEN** the 5th turn completes without `[END_CONVERSATION]`
- **THEN** the server SHALL mark the conversation as ended
- **AND** SHALL send an `ended: true` flag
- **AND** the client SHALL show the Continue button and smooth-scroll to it

#### Scenario: Missing provider config
- **GIVEN** a real_llm node has `provider: "anthropic"`
- **AND** the form owner has not configured an "anthropic" API key
- **WHEN** a respondent reaches the node and init is called
- **THEN** the system SHALL return a 400 from `/api/llm-proxy`
- **AND** the player SHALL show "This provider is not configured" in the chat UI
- **AND** a Continue button SHALL be shown so the respondent is not stuck

#### Scenario: Rate limit exceeded
- **GIVEN** a `visitor_id` has sent 60 requests in the last 10 minutes
- **WHEN** they send another message
- **THEN** the system SHALL return HTTP 429 with a `Retry-After` header
- **AND** the player SHALL show "Please wait a moment before sending another message"

#### Scenario: Resume after browser close mid-conversation
- **GIVEN** a respondent was on a real_llm node and closed the browser mid-conversation
- **AND** the localStorage session has the LLM node in `visitedPageIds`
- **WHEN** the respondent returns and resumes the session
- **THEN** the player SHALL navigate back to the LLM node's position in the flow
- **AND** the client SHALL send a fresh `action: "init"` request to `/api/llm-proxy`
- **AND** the server SHALL create a new conversation row (the old one is abandoned)
- **AND** the respondent SHALL start the LLM conversation from scratch
- **AND** the previous incomplete conversation SHALL be cleaned up by the daily pg_cron job

#### Scenario: Streaming error aborts form
- **GIVEN** a real_llm conversation is streaming a response
- **WHEN** the LiteLLM upstream returns a 5xx or the connection drops
- **THEN** the server SHALL send an `error: true` flag in the final SSE event
- **AND** SHALL mark the `llm_conversations` row as `is_ended = true`
- **AND** the client SHALL stop rendering and navigate to the Technical Issue page
- **AND** the session in localStorage SHALL be cleared
- **AND** the form MUST NOT be resumable
