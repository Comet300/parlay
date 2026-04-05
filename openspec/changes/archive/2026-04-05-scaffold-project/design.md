## Context

Parlay has a complete specification suite (24 specs) but no codebase. This design covers bootstrapping the full-stack project structure so that feature implementation can begin immediately. The tech stack is fixed: TanStack Start (Vinxi/Nitro), TypeScript strict, Supabase (Postgres + RLS + Storage + Vault), BetterAuth, Resend, TailwindCSS, Zustand, React Flow v12, Milkdown Crepe, Framer Motion, FingerprintJS v5.1. Deployment target is Vercel free tier.

## Goals / Non-Goals

**Goals:**
- Working `npm run dev` with TanStack Start serving routes and API handlers
- Full Supabase migration covering every table, index, RLS policy, trigger, function, and pg_cron job defined across all 24 specs
- BetterAuth wired up with Supabase JWT bridging, Resend email transport, and optional Google OAuth
- Folder structure that matches the route conventions required by the specs (protected `_authed` layout, public player routes, API routes)
- TailwindCSS configured and producing output
- Zustand store skeleton
- `.env.example` documenting every required/optional env var
- `vercel.json` with per-route maxDuration settings
- All core dependencies installed at the versions required by the specs

**Non-Goals:**
- Implementing any feature (no builder canvas, no player, no dashboard UI, no LLM proxy logic)
- Writing tests (no code to test yet)
- Setting up CI/CD pipelines
- Populating seed data
- Design system tokens or component library (covered by a future design-system change)

## Decisions

### 1. TanStack Start project initialization

**Decision:** Use `npm create @tanstack/start@latest` then customize, rather than building from scratch.

**Why:** The scaffolder sets up Vinxi, Nitro, and file-based routing correctly. Manual setup risks misconfiguring the build pipeline. We customize on top (add Tailwind, adjust tsconfig, add route stubs).

**Alternative considered:** Manual Vite + Vinxi setup — rejected because TanStack Start's internal config is not well-documented and the scaffolder is authoritative.

### 2. Folder layout

**Decision:** Follow TanStack Start conventions with Parlay-specific organization:

```
src/
├── routes/
│   ├── __root.tsx              # Root layout (providers, global styles)
│   ├── index.tsx               # Landing page (/)
│   ├── login.tsx               # Public
│   ├── signup.tsx              # Public
│   ├── forgot-password.tsx     # Public
│   ├── reset-password.tsx      # Public
│   ├── $formId.tsx             # Player (/:formId) — public
│   ├── _authed.tsx             # Auth guard layout
│   ├── _authed/
│   │   ├── dashboard.tsx       # /dashboard
│   │   ├── settings.tsx        # /settings
│   │   └── build/
│   │       └── $facetId.tsx    # /build/:facetId
│   └── api/
│       ├── auth/
│       │   └── $.ts            # BetterAuth catch-all handler
│       ├── submit.ts           # POST /api/submit
│       ├── llm-proxy.ts        # POST /api/llm-proxy
│       └── export/
│           ├── $facetId.ts     # GET /api/export/:facetId
│           └── zip/
│               └── $formId.ts  # GET /api/export/zip/:formId
├── lib/
│   ├── auth/
│   │   ├── server.ts           # BetterAuth server config
│   │   ├── client.ts           # BetterAuth client
│   │   └── middleware.ts       # Auth middleware for server routes
│   ├── supabase/
│   │   ├── client.ts           # Anon client (browser/player)
│   │   ├── server.ts           # Service role client
│   │   └── authenticated-client.ts  # Bridged JWT client factory
│   └── stores/
│       └── builder-store.ts    # Zustand store skeleton
├── components/                 # Shared components (empty for now)
└── styles/
    └── globals.css             # Tailwind directives
```

**Why:** Matches the route paths required by auth spec (`_authed` layout, API routes at exact paths). The `lib/` directory separates infrastructure from routes.

### 3. Single Supabase migration file

**Decision:** Ship one comprehensive initial migration rather than one-per-table.

**Why:** This is a greenfield project — there's no existing schema to migrate from. A single migration is simpler to reason about and ensures correct foreign key ordering. Future changes will add incremental migrations.

**Alternative considered:** One migration per spec domain — rejected because cross-table dependencies (forms → facets → submissions) make ordering complex across separate files, and there's no benefit when starting from zero.

### 4. BetterAuth + Supabase JWT bridge approach

**Decision:** Use `jsonwebtoken` to sign Supabase-compatible JWTs in the auth middleware, as specified in the auth spec. Create per-request Supabase clients via the `accessToken` callback.

**Why:** This is the approach mandated by the specs and is the official Supabase pattern for third-party auth. It enables `auth.uid()` in RLS policies to return the BetterAuth user ID.

### 5. Route stubs vs. empty files

**Decision:** Each route file will export a valid TanStack Start route with a minimal placeholder component (e.g., `<div>Dashboard</div>`). API routes will export handlers that return `501 Not Implemented`.

**Why:** This ensures the dev server starts without errors and routes are navigable. Feature changes will replace the placeholders with real implementations.

### 6. Package manager

**Decision:** Use npm (not pnpm/yarn). Single `package.json` at root (no monorepo workspaces).

**Why:** Simplest setup for Vercel deployment. The project is a single TanStack Start app, not a monorepo. This avoids workspace configuration complexity.

### 7. Supabase local development

**Decision:** Include `supabase/` directory with config for `supabase start` (local Postgres + Studio). Migration files live in `supabase/migrations/`.

**Why:** Developers need a local database. Supabase CLI's local dev stack provides Postgres, Studio, and Vault locally — matching production capabilities.

## Risks / Trade-offs

**[TanStack Start breaking changes]** → TanStack Start is pre-1.0. Pin exact versions in package.json. Research current API via Context7 before generating config files during implementation.

**[Supabase JS v2 minimum version]** → The `accessToken` callback requires >=2.49.0. Pin `@supabase/supabase-js` to `^2.49.0` explicitly.

**[BetterAuth table schema conflicts]** → BetterAuth auto-creates tables (user, session, account, verification) on first run. Our migration must not create these tables — let BetterAuth handle them. The migration creates only application tables.

**[Vault availability locally]** → Supabase local dev includes Vault. No special handling needed, but note that `vault.create_secret()` requires the `supabase_admin` role locally.

**[Large migration file]** → One file with all tables/policies/triggers will be ~300-400 lines of SQL. This is acceptable for an initial migration and is easier to review than 10+ fragments.
