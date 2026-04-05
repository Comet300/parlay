## ADDED Requirements

### Requirement: TanStack Start project initialization
The system SHALL be a TanStack Start application using TypeScript strict mode, Vinxi as the build tool, and Nitro as the server runtime. The project SHALL be initialized via the official TanStack Start scaffolder and customized to match the required folder structure.

#### Scenario: Dev server starts successfully
- **WHEN** the developer runs `npm run dev`
- **THEN** the TanStack Start dev server starts without errors
- **AND** routes are accessible at `http://localhost:3000`

### Requirement: TypeScript strict configuration
The project SHALL use TypeScript with `strict: true` in `tsconfig.json`. Path aliases SHALL map `~/*` to `src/*` for clean imports.

#### Scenario: TypeScript compilation
- **WHEN** the developer runs `npx tsc --noEmit`
- **THEN** the project compiles with zero type errors

### Requirement: TailwindCSS configuration
The project SHALL include a `tailwind.config.ts` that scans `src/**/*.{ts,tsx}` for class names. A `src/styles/globals.css` file SHALL include the Tailwind directives (`@tailwind base`, `@tailwind components`, `@tailwind utilities`). The root layout SHALL import this stylesheet.

#### Scenario: Tailwind classes apply
- **WHEN** a component uses Tailwind utility classes (e.g., `className="bg-blue-500"`)
- **THEN** the corresponding CSS is generated and applied in the browser

### Requirement: Core dependency installation
The project SHALL install and pin the following production dependencies:
- `@tanstack/react-router` and `@tanstack/start` (TanStack Start framework)
- `@supabase/supabase-js` at `^2.49.0` (required for `accessToken` callback)
- `better-auth` (authentication)
- `pg` (PostgreSQL driver for BetterAuth)
- `jsonwebtoken` (JWT signing for Supabase bridging)
- `resend` (transactional email)
- `@xyflow/react` (React Flow v12)
- `@milkdown/crepe`, `@milkdown/kit`, and `@milkdown/react` (Milkdown Crepe editor with React integration)
- `zustand` (state management)
- `tailwindcss` (styling)
- `framer-motion` (animation)
- `@fingerprintjs/fingerprintjs` (visitor identification)
- `lucide-react` (icon library)

Dev dependencies SHALL include TypeScript, `@types/node`, `@types/jsonwebtoken`, `@types/pg`, and ESLint with TypeScript support.

#### Scenario: All dependencies resolve
- **WHEN** the developer runs `npm install` in a clean clone
- **THEN** all dependencies install without peer dependency conflicts

### Requirement: File-based route structure
The project SHALL create route files at the paths specified in the design document. Each route file SHALL export a valid TanStack Start route definition. Page routes SHALL render a minimal placeholder component. API routes SHALL export handlers returning HTTP 501.

#### Scenario: Protected route guard works
- **WHEN** an unauthenticated user navigates to `/dashboard`
- **THEN** the `_authed.tsx` layout's `beforeLoad` redirects to `/login`

#### Scenario: API route stubs include export zip
- **WHEN** a GET request hits `/api/export/zip/:formId`
- **THEN** the stub handler returns HTTP 501

#### Scenario: Public routes are accessible
- **WHEN** any user navigates to `/`, `/login`, `/signup`, or `/:formId`
- **THEN** the page renders without authentication checks

### Requirement: BetterAuth server configuration
The project SHALL configure BetterAuth in `src/lib/auth/server.ts` following the auth spec exactly — including `pg` Pool connection, Resend email transport, optional Google OAuth (conditional on env vars), database-backed rate limiting, and the `tanstackStartCookies` plugin.

#### Scenario: BetterAuth initializes
- **WHEN** the server starts with valid `DATABASE_URL` and `BETTER_AUTH_SECRET`
- **THEN** BetterAuth creates its tables (user, session, account, verification) if they don't exist
- **AND** the `/api/auth/*` catch-all route handles auth requests

### Requirement: BetterAuth client configuration
The project SHALL configure the BetterAuth client in `src/lib/auth/client.ts` exporting `authClient` with `createAuthClient()`.

#### Scenario: Client auth methods available
- **WHEN** a React component imports `authClient`
- **THEN** `authClient.signIn.email`, `authClient.signUp.email`, `authClient.signOut`, and `authClient.useSession` are available

### Requirement: Supabase client modules
The project SHALL create three Supabase client modules in `src/lib/supabase/`:
- `client.ts`: Browser-side anon client using `SUPABASE_URL` and `SUPABASE_ANON_KEY` (public env vars exposed to the browser via TanStack Start's env handling)
- `server.ts`: Service role client using `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `authenticated-client.ts`: Factory function `createAuthenticatedSupabaseClient(userId: string)` that signs a bridged JWT and returns a per-request Supabase client with the `accessToken` callback

#### Scenario: Bridged JWT enables RLS
- **WHEN** `createAuthenticatedSupabaseClient("user-123")` is called
- **THEN** the returned client's requests include a JWT with `sub: "user-123"` and `role: "authenticated"`
- **AND** Supabase RLS policies using `auth.uid()` return `"user-123"`

### Requirement: Auth middleware for server routes
The project SHALL create an auth middleware in `src/lib/auth/middleware.ts` that validates the BetterAuth session from request headers, creates a bridged Supabase client, and passes `user` and `supabase` on the route context. Unauthenticated requests SHALL receive HTTP 401.

#### Scenario: Middleware populates context
- **WHEN** an authenticated request hits a protected API route using `authMiddleware`
- **THEN** `context.user` contains the BetterAuth user object
- **AND** `context.supabase` is a bridged Supabase client scoped to that user

### Requirement: Zustand store skeleton
The project SHALL create a builder store skeleton in `src/lib/stores/builder-store.ts` using Zustand. The store SHALL export a `useBuilderStore` hook with an empty initial state placeholder and a comment indicating where builder state will be added.

#### Scenario: Store imports without error
- **WHEN** a component imports `useBuilderStore`
- **THEN** the hook returns the store state without runtime errors

### Requirement: Environment variable documentation
The project SHALL include a `.env.example` file documenting all required and optional environment variables with descriptions:
- `APP_BASE_URL` (required)
- `DATABASE_URL` (required)
- `BETTER_AUTH_SECRET` (required)
- `SUPABASE_URL` (required)
- `SUPABASE_ANON_KEY` (required)
- `SUPABASE_SERVICE_ROLE_KEY` (required)
- `SUPABASE_JWT_SECRET` (required)
- `RESEND_API_KEY` (required)
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_SECRET` (optional)

#### Scenario: Developer sets up environment
- **WHEN** a developer copies `.env.example` to `.env` and fills in values
- **THEN** the application starts with all required configuration present

### Requirement: Root layout with providers
The `__root.tsx` root layout SHALL wrap the application in necessary providers (React Flow provider is NOT needed at root — only in the builder). It SHALL import the global stylesheet and render `<Outlet />`.

#### Scenario: Root layout renders
- **WHEN** any route is visited
- **THEN** the root layout wraps the page content
- **AND** global styles are applied
