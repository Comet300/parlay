# builder-llm-nodes Specification

## Purpose
Define the configuration schema and builder editor behavior for Scripted LLM
and Real LLM nodes, including the [END_CONVERSATION] token mechanism and
page-tier placement rules.

## Requirements

### Requirement: Page-tier placement
Both scripted_llm and real_llm are page-tier nodes. They exist at the
canvas root level (like Pages and PageGroups) and are connected by edges
in the flow graph. They do NOT live inside Page or PageGroup containers.
They cannot contain child nodes — all configuration is in their own data
fields, edited via the side panel.

### Requirement: Scripted LLM data schema
The scripted_llm node data SHALL include:
- label: string
- script: ScriptedLLMTurn[]
- startTurnId: string

```typescript
interface ScriptedLLMTurn {
  id: string;
  botMessage: string;
  options: {
    id: string;
    label: string;
    nextTurnId: string | null; // null = end of conversation
  }[];
}
```

### Requirement: Real LLM data schema
The real_llm node data SHALL include:
- label: string
- provider: string (LLM provider key matching a provider configured in
  settings, e.g. "openai", "anthropic", "google")
- model: string (model identifier for the selected provider,
  e.g. "gpt-4o", "claude-sonnet-4-20250514", "gemini-2.0-flash")
- setup_prompt: string
- ending_condition: string
- maxTurns: number

### Requirement: Server-side system prompt construction
The setup_prompt and ending_condition are configured in the builder and
stored in the facet's flow_definition. At runtime:
1. The server strips setup_prompt and ending_condition from the
   flow_definition before sending it to the client (see
   player-facet-resolution spec). The provider and model fields are NOT
   stripped — they are non-sensitive and the client needs them for display.
2. The /api/llm-proxy reads setup_prompt, ending_condition, provider, and
   model server-side from the original flow_definition to construct the
   system prompt, look up the API key, and proxy to LiteLLM.
The client NEVER receives or sends the system prompt.
The builder labels both setup_prompt and ending_condition as "Hidden from
respondents" to signal this to the form creator.

### Requirement: Conversation end conditions
The system SHALL end the Real LLM conversation when EITHER:
- The server detects [END_CONVERSATION] in the LLM response stream, OR
- The number of completed turns reaches maxTurns (hard limit)
Whichever condition is met first SHALL end the conversation.
The server strips [END_CONVERSATION] from the response before sending
to the client, and signals end via an ended: true flag.

### Requirement: Full-screen takeover
Both scripted_llm and real_llm SHALL take over the full viewport when
rendered in the player. All navigation chrome (progress bar, back button,
continue button) SHALL be hidden during the active LLM conversation.
When the conversation ends:
- The input mechanism is disabled (text input or option chips)
- A Continue button SHALL appear at the bottom of the chat
- The system SHALL smooth-scroll to the Continue button

### Requirement: Canvas node appearance
scripted_llm canvas node: wider block, displays turn count badge.
real_llm canvas node: displays provider, model name, and maxTurns values.
Both display at the canvas root level (same tier as Pages).

#### Scenario: Real LLM end by [END_CONVERSATION] token
- GIVEN a real_llm node with maxTurns = 20 and a suitable ending_condition
- WHEN the LLM responds "Thank you for your answers! [END_CONVERSATION]" on turn 6
- THEN the server detects [END_CONVERSATION], strips it
- AND sends "Thank you for your answers!" with ended: true to the client
- AND the text input is disabled
- AND the Continue button appears
- AND the system smooth-scrolls to the Continue button

#### Scenario: Real LLM end by maxTurns
- GIVEN a real_llm node with maxTurns = 5
- WHEN the 5th turn completes without [END_CONVERSATION]
- THEN the server marks the conversation as ended
- AND the text input is disabled
- AND the Continue button appears

#### Scenario: setup_prompt hidden from respondent
- GIVEN a real_llm node has setup_prompt "You are a research assistant..."
- WHEN the respondent interacts with the chat UI
- THEN they see only the bot messages and their own messages
- AND the setup_prompt text is never sent to or visible on the client
- AND the flow_definition received by the client has setup_prompt stripped

#### Scenario: Scripted LLM conversation end
- GIVEN a scripted_llm node reaches a turn where the user selects an option
  with nextTurnId = null
- WHEN the conversation ends
- THEN the option chips are removed
- AND the Continue button appears
- AND the system smooth-scrolls to the Continue button
