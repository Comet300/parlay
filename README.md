# Parlay

A visual interview and survey flow builder. Design research flows on a canvas, publish them to a public URL, and analyze responses from your dashboard.

> **Status:** Pre-implementation. The full specification lives in [`openspec/`](./openspec/).

## What it does

- **Visual flow builder** — drag-and-drop canvas (like n8n) for designing interview flows with pages, conditional logic, branching cards, and LLM conversation nodes
- **Multi-facet A/B testing** — run multiple variants of the same form with automatic round-robin distribution across respondents
- **LLM conversations** — embed scripted decision-tree chats or real AI-powered conversations (via LiteLLM) directly in the flow
- **Conditional logic** — Excel-like formula language for showing/hiding questions based on prior answers (`AND(q-age > 18, q-consent = "yes")`)
- **Single-page player** — respondents fill out forms at `/:formId?v={facet}`, fully client-side after initial load with localStorage session persistence and resume support
- **CSV export** — sparse-matrix export with per-facet downloads or a ZIP of all variants
- **Once-per-visitor** — FingerprintJS-based respondent identification prevents retakes

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start, TypeScript strict |
| Database | Supabase (Postgres + RLS + Storage + Vault) |
| Auth | BetterAuth (email/password + optional Google OAuth) |
| Email | Resend |
| Canvas | React Flow v12 |
| Markdown | Milkdown Crepe |
| LLM proxy | LiteLLM (self-hosted, user provides API keys) |
| Styling | TailwindCSS |
| Animation | Framer Motion |
| State | Zustand |
| Respondent ID | FingerprintJS v5.1 (MIT) |
| Deployment | Vercel (free tier compatible) |

## Project structure

```
openspec/           # Full specification suite (25 specs)
  config.yaml       # Tech stack context for spec tooling
  README.md         # Spec index, architecture decisions, core concepts
  specs/
    auth/           # BetterAuth, JWT bridging, protected routes
    forms/          # Form CRUD, ownership
    facets/         # Facet schema, status lifecycle, auto-save
    builder-*/      # Canvas, nodes, formula, color scheme, facet switcher
    player-*/       # Fingerprint, resolution, session, navigation, renderers, LLM, submission
    dashboard/      # Form cards, search, pagination, actions
    settings/       # LiteLLM provider config, Vault encryption
    csv-export/     # Sparse matrix CSV, ZIP download
    ...
```

## Getting started

Not yet implemented. See [`openspec/`](./openspec/) for the complete specification.

## License

TBD
