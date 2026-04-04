# Parlay — OpenSpec Repository

## Product
Parlay is a SaaS visual interview/survey flow builder. Users sign up, build
research flows on a canvas (like n8n), publish them to a public URL, and
analyze responses from their dashboard.

## Tech Stack
- Framework: TanStack Start, TypeScript strict mode
- Database: Supabase (Postgres + RLS + Storage + Vault)
- Auth: BetterAuth (email/password + Google OAuth)
- Email: Resend (verification, password reset)
- Canvas: React Flow v12
- Markdown Editor: Milkdown Crepe (Start, End, Card, Page/PageGroup headers)
- LLM: LiteLLM (self-hosted; user provides API keys per provider)
- Styling: TailwindCSS
- Animation: Framer Motion
- State: Zustand (builder global state)
- Respondent ID: FingerprintJS v5.1 open-source (fallback: cookies + localStorage)
- Deployment: Vercel (free tier compatible)

## Pre-implementation Research
Before writing any code, use the Context7 MCP to research current APIs for:
TanStack Start, Supabase JS v2, BetterAuth, React Flow v12, Milkdown Crepe,
Zustand, FingerprintJS v5.1 (https://github.com/fingerprintjs/fingerprintjs),
Resend.
Adjust any implementation detail that conflicts with current APIs before writing code.

## Core Concepts
- **Form**: top-level research instrument; groups one or more Facets
- **Facet**: a concrete, independently editable version of a Form with its
  own flow definition, color scheme, and status
- **Flow**: a directed graph of page-tier nodes connected by edges; all
  question/content nodes must live inside a Page or PageGroup container;
  Start and End are semantic anchor nodes
- **Page**: a container node that renders all its children on a single screen,
  with optional header markdown content
- **PageGroup**: a container that splits children into virtual pages of
  maxQuestionsPerPage items, with optional shuffle and header content
- **Round-robin**: sequential distribution of respondents across active
  Facets using FingerprintJS visitor IDs for identification (no cookies)
- **Single-page player**: the form player lives at /:formId?v={nickname};
  the URL is set once during facet resolution and never changes again —
  all navigation is client-side state

## Architecture Decisions
- **BetterAuth to Supabase JWT bridging**: BetterAuth stores user/session
  tables in the public schema. Server-side code signs a Supabase-compatible
  JWT (using SUPABASE_JWT_SECRET) containing the BetterAuth user ID,
  enabling `auth.uid()` in RLS policies. See auth spec.
- **RLS with bridged JWT**: All authenticated Supabase queries use the
  bridged JWT so that Row Level Security enforces ownership. The service
  role key is used only for facet resolution (public player reads), LLM
  proxy (reading form owner's config + Vault decryption), and submissions.
- **Node tiers**: Page-tier nodes (Start, End, Page, PageGroup, scripted_llm,
  real_llm) exist at the canvas root and are connected by edges. Content-tier
  nodes (card, likert, single_choice, multi_choice, email_collection, group)
  are children of Page/PageGroup containers and do NOT have their own edges.
- **Container nodes have no slugs**: Page, PageGroup, and Group are virtual
  containers that don't produce response data. Only content nodes and LLM
  nodes have slugs. Slugs are internal identifiers for formula conditions,
  not visible to respondents.
- **Server-side LLM orchestration**: The server acts as middle-man between
  client and LLM. It pre-warms conversations with the system prompt (getting
  the first bot message before showing anything to the user), strips sensitive
  fields from client payloads, and detects end tokens server-side.
- **LLM provider selection**: Form owners configure providers (openai,
  anthropic, etc.) with API keys in settings. Each real_llm node specifies
  a provider + model. The server looks up the matching API key from Vault.
- **Sensitive field stripping**: setup_prompt and ending_condition are stripped
  from flow_definition before sending to the client.
- **Checkpoint progress bar**: Progress is opt-in per Page/PageGroup via
  is_checkpoint. The End node is a virtual checkpoint. Respondents never
  see 100% during the form.
- **Once-per-visitor**: Submissions are enforced once per visitor_id per facet
  via a partial unique index. Returning visitors see the End screen directly.
- **Last write wins**: Concurrent editing uses last-write-wins with no
  optimistic locking.
- **Rate limiting in Supabase**: Both LLM proxy and submission rate limits
  use a shared rate_limit_log table in Supabase (no Vercel KV dependency).
- **Conversation sessions in Supabase**: LLM conversation state is stored
  in an llm_conversations table (not in-memory or KV).
- **flow_definition shape**: Serialized React Flow state via `toObject()`:
  `{ nodes: FlowNode[], edges: FlowEdge[], viewport: { x, y, zoom } }`.
  See facets spec for full definition.
- **Condition re-evaluation**: Formula conditions on the current page are
  re-evaluated with a 1.5s debounce after any response change.
- **Start node optional content**: Start node renders a centered card with
  Continue if it has markdownContent; otherwise skipped entirely.
- **No back to LLM nodes**: Respondents cannot navigate back to or re-enter
  completed LLM conversations.
- **WYSIWYG uploads**: Milkdown Crepe editors support image/file uploads
  to Supabase Storage ('markdown-uploads' public bucket).

## Spec Index
| Spec | Description |
|------|-------------|
| design-system | Brand tokens, component conventions, sidebar navigation |
| auth | BetterAuth, session, protected routes, signup, email via Resend |
| forms | Form CRUD, title editing, creation flow, deletion |
| facets | Facet schema, status transitions, duplication, auto-save, deletion |
| facet-nicknames | Nickname history, 3xx redirects, swap prevention, URL pattern |
| round-robin | Atomic counter, assignment logging, toggle behavior |
| builder-canvas | Canvas layout, edge routing model, dead-path validation, save mechanics |
| builder-nodes | Node schemas (all types), tier classification, registry, deletion |
| builder-card-node | Card node schema, routing, multi-handle edges |
| builder-llm-nodes | Scripted and Real LLM schemas, provider + model config |
| builder-formula | Formula language, parser, evaluator, autocomplete |
| builder-color-scheme | Themes, color pickers, component gallery carousel |
| builder-facet-switcher | Facet navigation, creation, default selection |
| player-fingerprint | FingerprintJS v5.1, fallback ID, once-per-visitor, two-phase load |
| player-facet-resolution | Decision tree, once-per-visitor check, field stripping |
| player-session | localStorage persistence, shuffle seeds, resume, checkpoints |
| player-navigation | Continue button, back button, checkpoint progress bar, graph traversal |
| player-renderers | All node type renderers, page headers, color scheme |
| player-llm | LLM proxy, server-side prompt, pre-warming, Supabase sessions |
| player-submission | Submission record, response rows, table DDL, /api/submit |
| csv-export | CSV generation, sparse matrix, ZIP download |
| dashboard | Form cards, thumbnails, actions, pagination, search, deletion |
| settings | LiteLLM config (provider + model + API key), account management |
| landing-page | Navbar, hero, demo, features, CTA sections |
| form-unavailable | Archived form / no active facets page |
