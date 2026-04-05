## 1. Project Initialization

- [x] 1.1 Run `npm create @tanstack/start@latest` to scaffold the TanStack Start project, then move output into the repo root (preserve existing `openspec/` directory)
- [x] 1.2 Configure `tsconfig.json` with `strict: true` and `~/*` path alias mapping to `src/*`
- [x] 1.3 Install all production dependencies: `@supabase/supabase-js@^2.49.0`, `better-auth`, `pg`, `jsonwebtoken`, `resend`, `@xyflow/react`, `@milkdown/crepe`, `@milkdown/kit`, `@milkdown/react`, `zustand`, `framer-motion`, `@fingerprintjs/fingerprintjs`, `lucide-react`
- [x] 1.4 Install dev dependencies: `typescript`, `@types/node`, `@types/jsonwebtoken`, `@types/pg`, `eslint` with TypeScript plugin
- [x] 1.5 Configure TailwindCSS: create `tailwind.config.ts` scanning `src/**/*.{ts,tsx}`, create `src/styles/globals.css` with Tailwind directives

## 2. Folder Structure & Route Stubs

- [x] 2.1 Create `src/routes/__root.tsx` root layout importing global styles and rendering `<Outlet />`
- [x] 2.2 Create public route stubs: `index.tsx` (/), `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `$formId.tsx` — each with minimal placeholder components
- [x] 2.3 Create `src/routes/_authed.tsx` layout with `beforeLoad` auth guard that redirects to `/login`
- [x] 2.4 Create protected route stubs under `src/routes/_authed/`: `dashboard.tsx`, `settings.tsx`, `build/$facetId.tsx` — each with placeholder components
- [x] 2.5 Create API route stubs: `src/routes/api/auth/$.ts` (BetterAuth catch-all), `api/submit.ts`, `api/llm-proxy.ts`, `api/export/$facetId.ts`, `api/export/zip/$formId.ts` — each returning 501

## 3. Auth & Supabase Wiring

- [x] 3.1 Research current BetterAuth and TanStack Start APIs via Context7 to verify config patterns before writing auth code
- [x] 3.2 Create `src/lib/auth/server.ts` — BetterAuth server config with pg Pool, Resend email transport, conditional Google OAuth, database rate limiting, tanstackStartCookies plugin
- [x] 3.3 Create `src/lib/auth/client.ts` — BetterAuth client exporting `authClient`
- [x] 3.4 Create `src/lib/auth/middleware.ts` — auth middleware that validates session, creates bridged Supabase client, passes `user` + `supabase` on context
- [x] 3.5 Create `src/lib/supabase/client.ts` — browser-side anon Supabase client
- [x] 3.6 Create `src/lib/supabase/server.ts` — server-side service role Supabase client
- [x] 3.7 Create `src/lib/supabase/authenticated-client.ts` — `createAuthenticatedSupabaseClient(userId)` with JWT signing and `accessToken` callback
- [x] 3.8 Wire the BetterAuth catch-all route at `src/routes/api/auth/$.ts` to forward to `auth.handler`

## 4. Zustand Store

- [x] 4.1 Create `src/lib/stores/builder-store.ts` — Zustand store skeleton exporting `useBuilderStore` with empty initial state

## 5. Database Migration

- [x] 5.1 Initialize Supabase CLI: run `supabase init` to create `supabase/` directory with `config.toml`
- [x] 5.2 Create initial migration file with all application tables in FK-safe order: `user_profiles`, `forms`, `facets`, `facet_nickname_history`, `round_robin_log`, `submissions`, `responses`, `llm_conversations`, `rate_limit_log`
- [x] 5.3 Add all indexes: `idx_submissions_form`, `idx_submissions_visitor`, `idx_submissions_once_per_visitor` (partial unique), `idx_responses_submission`, `idx_rate_limit_key_time`, `idx_round_robin_log_visitor_form` (unique), facets partial unique on `(form_id) WHERE is_default = true`, facets unique on `(form_id, nickname)`
- [x] 5.4 Add all trigger functions and triggers: `create_user_profile` (AFTER INSERT on `user`), `update_facet_updated_at` (BEFORE UPDATE on `facets`), `update_form_updated_at` (AFTER UPDATE on `facets` — propagates to parent `forms.updated_at`), `update_llm_conversation_updated_at` (BEFORE UPDATE on `llm_conversations`)
- [x] 5.5 Add the `increment_round_robin(p_form_id uuid)` Postgres function
- [x] 5.6 Enable RLS on all tables and create all policies per spec (owner access via `auth.uid()` chains, public SELECT on active facets, no public policies on service-role-only tables)
- [x] 5.7 Add pg_cron cleanup jobs: `cleanup-rate-limits` and `cleanup-llm-conversations`
- [x] 5.8 Create the `markdown-uploads` public Storage bucket via Supabase CLI config (`supabase/config.toml` storage bucket definition) or, if not supported by the CLI version, document manual creation in `.env.example` comments
- [x] 5.9 Verify migration applies cleanly with `supabase db reset`

## 6. Deployment & Environment

- [x] 6.1 Create `.env.example` documenting all required/optional env vars with descriptions
- [x] 6.2 Create `vercel.json` with per-route `maxDuration` settings (llm-proxy: 60s, submit: 30s, export: 30s, default: 10s) and build config
- [x] 6.3 Verify `npm run build` produces a clean production build
- [x] 6.4 Verify `npm run dev` starts the dev server and all routes respond
