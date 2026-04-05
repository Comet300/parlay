## Why

The Parlay specification suite is complete but there is no codebase yet. Before any feature can be implemented, we need a working project skeleton — TanStack Start app, Supabase database schema, BetterAuth wiring, Tailwind styling, and Vercel deployment config. This scaffold establishes the foundation that every subsequent change builds on.

## What Changes

- Initialize a TanStack Start project with TypeScript strict mode, Vinxi/Nitro server, and file-based routing
- Configure TailwindCSS, Zustand, Framer Motion, and all core dependencies
- Create Supabase migration(s) with the full database schema (tables, indexes, RLS policies, Vault secrets) derived from existing specs
- Wire up BetterAuth (email/password + Google OAuth) with Supabase JWT bridging for RLS
- Set up Resend email transport for BetterAuth verification and password reset
- Add vercel.json with per-route maxDuration settings
- Provide a `.env.example` and local development scripts (Supabase CLI, dev server)
- Establish folder conventions: routes, API handlers, components, lib/utilities, Zustand stores

## Capabilities

### New Capabilities
- `project-scaffold`: Project initialization — TanStack Start config, TypeScript, Tailwind, package.json, folder structure, linting, dev scripts, and environment setup
- `database-schema`: Full Supabase migration covering all tables, indexes, RLS policies, and Vault usage defined across existing specs
- `deployment`: Vercel configuration, environment variables, and production build pipeline

### Modified Capabilities
_None — existing specs define feature requirements; this change creates the structural foundation without altering any feature spec._

## Impact

- **New files**: Entire project tree — `package.json`, `app.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `vercel.json`, `.env.example`, route stubs, Supabase migrations, auth config, shared types
- **Dependencies**: TanStack Start, @supabase/supabase-js v2, better-auth, resend, react-flow, milkdown, zustand, tailwindcss, framer-motion, @fingerprintjs/fingerprintjs, lucide-react, plus dev tooling (TypeScript, ESLint, Prettier)
- **External systems**: Supabase project (database + storage + Vault), Vercel project, Resend account, OAuth provider (Google)
- **Risk**: Low — greenfield scaffold with no existing code to break
