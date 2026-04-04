# player-llm Specification

## Purpose
Define the server-side LLM conversation orchestration that mediates between
the form player and the form owner's self-hosted LiteLLM instance. The server
acts as a middle-man: it pre-warms the conversation with the system prompt,
handles the first LLM exchange before showing anything to the user, and
proxies all subsequent turns.

## Requirements

### Requirement: Server-to-server authentication
The /api/llm-proxy route SHALL NOT require a respondent BetterAuth session.
Respondents are unauthenticated public users.
The system SHALL authenticate the request by validating the form_id:
1. Look up the form by form_id
2. Resolve the form owner's user_id from the form
3. Read litellm_base_url and litellm_api_keys from the owner's user_profiles
   record using the Supabase service role key
4. Decrypt the provider's API key by querying `vault.decrypted_secrets`
   using the api_key_secret_id for the matching provider (see settings spec)

### Requirement: Provider-based API key lookup
The system SHALL look up the API key by matching the real_llm node's
`provider` field against the owner's configured providers in
litellm_api_keys. This is an exact string match (e.g., node has
provider = "openai" → find the "openai" entry in litellm_api_keys →
decrypt its Vault secret).

If no matching provider is configured, the system SHALL return a 400
error with a message indicating the provider is not configured.

### Requirement: API route implementation
The /api/llm-proxy endpoint SHALL be implemented as a TanStack Start API
route using `createAPIFileRoute` from `@tanstack/start/api` at
`src/routes/api/llm-proxy.ts`. This provides full `Request`/`Response`
control needed for SSE streaming. The route SHALL export a POST handler.

### Requirement: Rate limiting
The /api/llm-proxy route SHALL enforce rate limiting to prevent abuse:
- Per visitor_id per form_id: max 60 requests per 10 minutes
- Per IP address: max 120 requests per 10 minutes

Rate limit state SHALL be stored in a Supabase `rate_limit_log` table:

```sql
CREATE TABLE rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_limit_key_time ON rate_limit_log (key, created_at);
```

Each request inserts a row with key = "llm:{visitor_id}:{form_id}" or
"llm:ip:{ip_address}". Rate check queries count rows within the window:
```sql
SELECT COUNT(*) FROM rate_limit_log
WHERE key = $1 AND created_at > now() - interval '10 minutes';
```

Stale rows SHALL be cleaned up by a daily pg_cron job (see below).

Exceeding the limit SHALL return HTTP 429 with a Retry-After header.
The player SHALL display a temporary "Please wait" message on 429.

### Requirement: Conversation initialization (pre-warming)
When a respondent reaches a real_llm node, the client SHALL send an
initialization request to the server BEFORE showing the chat UI.
The server SHALL:
1. Look up the real_llm node's data from the facet's flow_definition
   using form_id, facet_id, and node_slug
2. Construct the system context string entirely server-side:
   {setup_prompt}\n\n{ending_condition}\n\nWhen the conversation should end,
   output [END_CONVERSATION] as the last token of your response.
3. Look up the provider's API key from Vault (see provider-based lookup)
4. Send the system context to LiteLLM to get the first bot message
5. Store the conversation state in the llm_conversations table
6. Return the conversation_id and the first bot message to the client

The client SHALL display the first bot message as the opening of the chat.
The setup_prompt and ending_condition SHALL never be exposed to the client.

### Requirement: Request format
The route SHALL accept a POST request with body:

Initialization (start conversation):
  { form_id: string, facet_id: string, node_slug: string, action: "init", visitor_id: string }
Returns: { conversation_id: string, bot_message: string, ended: boolean }

Send message (subsequent turns):
  { conversation_id: string, message: string, visitor_id: string }
Returns: streaming response (SSE/ReadableStream)

### Requirement: LiteLLM proxying
The system SHALL proxy all requests to the form owner's LiteLLM instance
at their configured litellm_base_url.
The system SHALL pass the decrypted API key for the node's configured
provider in the request headers.
The system SHALL forward the request in the format expected by LiteLLM,
including the model identifier from the real_llm node's `model` field.

### Requirement: Streaming response
The system SHALL stream the LiteLLM response back to the client using
server-sent events or a ReadableStream.
The server SHALL buffer the stream to detect [END_CONVERSATION]:
- If [END_CONVERSATION] is found: strip it from the response, send the
  clean text to the client, and include an `ended: true` flag in the
  final SSE event.
- The client SHALL NOT be responsible for detecting [END_CONVERSATION].
  The server handles all end-token detection and stripping.

### Requirement: Conversation end behavior
The system SHALL end the Real LLM conversation when EITHER:
- The server detects [END_CONVERSATION] in the LLM response stream, OR
- The number of completed turns reaches maxTurns (hard limit)
Whichever condition is met first SHALL end the conversation.

When the conversation ends:
- The text input / option chips SHALL be disabled (user cannot respond)
- A Continue button SHALL appear at the bottom of the chat
- The system SHALL smooth-scroll to the Continue button
- The conversation row in llm_conversations SHALL be marked as is_ended = true

### Requirement: Conversation session storage
The server SHALL maintain conversation state in a Supabase
`llm_conversations` table:

```sql
CREATE TABLE llm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text UNIQUE NOT NULL,
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  facet_id uuid NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  node_slug text NOT NULL,
  visitor_id text NOT NULL,
  system_context text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  is_ended boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
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

The conversation_id SHALL be a random UUID generated on initialization.
Conversations SHALL be considered expired after 1 hour of inactivity
(updated_at < now() - interval '1 hour'). When a conversation lookup
finds an expired row, it SHALL return a 410 Gone error so the player
can show a "session expired" message with a Continue button.
The `updated_at` trigger ensures active conversations (with messages
being appended) do not expire prematurely.

### Requirement: Database cleanup via pg_cron
The system SHALL use the Supabase `pg_cron` extension to schedule daily
cleanup of ephemeral tables:

```sql
-- Clean up rate limit entries older than 1 hour (runs daily at 03:00 UTC)
SELECT cron.schedule('cleanup-rate-limits', '0 3 * * *',
  $$DELETE FROM rate_limit_log WHERE created_at < now() - interval '1 hour'$$
);

-- Clean up expired LLM conversations older than 24 hours (runs daily at 03:00 UTC)
SELECT cron.schedule('cleanup-llm-conversations', '0 3 * * *',
  $$DELETE FROM llm_conversations WHERE updated_at < now() - interval '24 hours'$$
);
```

RLS: public INSERT/UPDATE (respondents create and append messages),
owner SELECT via form_id -> forms.user_id.

### Requirement: Conversation data for submission
The full conversation (excluding the system prompt) SHALL be stored on
form completion as an array:
  [{ role: "user" | "assistant", content: string }]
This value is written to the responses table when record_response = true
on the real_llm node (see player-submission spec).

### Requirement: Error handling
If the LiteLLM base URL is not configured for the form owner, the system
SHALL return a 400 error and the player SHALL display a graceful error state.
If the provider's API key is not configured, the system SHALL return a 400
with a message indicating the specific provider is not set up.

Configuration errors (missing base URL, missing provider key) SHALL show
an inline error in the chat UI with a Continue button so the respondent
is not stuck, and the system SHALL smooth-scroll to it.

### Requirement: Streaming error — abort to technical issue page
If a streaming error occurs during a real_llm conversation (e.g., the
LiteLLM upstream returns a 5xx, the connection drops mid-stream, or
the response times out), the system SHALL abort the form session and
redirect the respondent to a dedicated Technical Issue page.

The server SHALL:
1. Detect the stream failure (network error, non-2xx chunk, timeout)
2. Send an `error: true` flag in the final SSE event with a reason string
3. Mark the llm_conversations row as is_ended = true

The client SHALL:
1. On receiving `error: true` in the SSE stream, immediately stop rendering
2. Navigate to the Technical Issue page (a client-side route, no URL change)
3. The Technical Issue page SHALL display a message such as:
   "Something went wrong. Please try again later."
4. The Technical Issue page SHALL NOT offer a Continue button — the form
   session is aborted and cannot be resumed
5. The session in localStorage SHALL be cleared

This is distinct from FormUnavailable (which is a form-level status issue).
The Technical Issue page is a runtime error during an active session.

#### Scenario: Conversation initialization (pre-warming)
- GIVEN a respondent reaches a real_llm node with provider = "openai"
- WHEN the client sends an init request with form_id, facet_id, node_slug
- THEN the server reads setup_prompt and ending_condition from the facet's
  flow_definition (server-side, never from the client)
- AND looks up the "openai" API key from Vault via the owner's config
- AND sends the system context to LiteLLM to get the first bot message
- AND stores the conversation in llm_conversations
- AND returns conversation_id + first bot message to the client
- AND the client displays the first bot message as the chat opener

#### Scenario: Subsequent turn
- GIVEN a conversation is active with conversation_id "conv-123"
- WHEN the respondent sends "Tell me about Romania"
- THEN the server appends the message to llm_conversations.messages
- AND POSTs to {litellm_base_url} with system context + full history
- AND streams the LLM response back to the player
- AND the player appends it as a new chat bubble

#### Scenario: End token detected by server
- GIVEN the LLM streams tokens: "Thank", " you", ".", " [END", "_CONVERS", "ATION", "]"
- WHEN the server reconstructs the stream
- THEN it detects [END_CONVERSATION] in the assembled text
- AND strips it, sending only "Thank you." to the client
- AND sends an ended: true flag in the final SSE event
- AND the client disables the text input
- AND shows the Continue button
- AND smooth-scrolls to the Continue button

#### Scenario: End by maxTurns
- GIVEN a real_llm node with maxTurns = 5
- WHEN the 5th turn completes without [END_CONVERSATION]
- THEN the server marks the conversation as ended
- AND sends an ended: true flag
- AND the client shows the Continue button and smooth-scrolls to it

#### Scenario: Missing provider config
- GIVEN a real_llm node has provider = "anthropic"
- AND the form owner has not configured an "anthropic" API key
- WHEN a respondent reaches the node and init is called
- THEN the system returns a 400 from /api/llm-proxy
- AND the player shows "This provider is not configured" in the chat UI
- AND a Continue button is shown so the respondent is not stuck

#### Scenario: Rate limit exceeded
- GIVEN a visitor_id has sent 60 requests in the last 10 minutes
- WHEN they send another message
- THEN the system returns HTTP 429 with Retry-After header
- AND the player shows "Please wait a moment before sending another message"

#### Scenario: Streaming error aborts form
- GIVEN a real_llm conversation is streaming a response
- WHEN the LiteLLM upstream returns a 5xx or the connection drops
- THEN the server sends an error: true flag in the final SSE event
- AND marks the llm_conversations row as is_ended = true
- AND the client stops rendering and navigates to the Technical Issue page
- AND the session in localStorage is cleared
- AND the form cannot be resumed
