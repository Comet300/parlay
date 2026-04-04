# auth Specification

## Purpose
Manage user authentication, session lifecycle, protected route access,
and account creation using BetterAuth with a PostgreSQL (Supabase) database
and Resend for transactional emails.

## Requirements

### Requirement: Supported auth methods
The system SHALL support email/password and Google OAuth for both signup
and login via BetterAuth.

### Requirement: BetterAuth server configuration
The system SHALL configure BetterAuth in app/lib/auth/server.ts:

```typescript
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  baseURL: process.env.APP_BASE_URL,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => { /* Resend */ },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => { /* Resend */ },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  rateLimit: {
    storage: "database",  // required: Vercel functions are stateless
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 10 },
      "/forget-password/*": { window: 60, max: 3 },
    },
  },
});
```

BetterAuth SHALL store its tables (user, session, account, verification)
in the Supabase public schema alongside application tables. Table and
field names may be customized via BetterAuth's schema configuration to
use snake_case (e.g., `user_id` instead of `userId`).

### Requirement: BetterAuth API route handler
The system SHALL mount BetterAuth's HTTP handler as a catch-all TanStack
Start API route at `src/routes/api/auth/$.ts`. This route forwards all
requests under `/api/auth/*` to BetterAuth's internal handler, which manages:
- OAuth callback URLs (e.g., `/api/auth/callback/google`)
- Sign-in and sign-out endpoints
- Email verification link handling
- Password reset link handling

```typescript
import { createAPIFileRoute } from "@tanstack/start/api";
import { auth } from "~/lib/auth/server";

export const APIRoute = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
});
```

The Google OAuth callback URL configured in Google Cloud Console SHALL
point to `{APP_BASE_URL}/api/auth/callback/google`.

### Requirement: BetterAuth client configuration
The system SHALL configure the BetterAuth client in app/lib/auth/client.ts
for use in React components (sign in, sign up, sign out, session access).

### Requirement: Email transport via Resend
The system SHALL use Resend (npm: `resend`) for all transactional emails:
- Email verification on signup
- Password reset emails
- Any future transactional emails

Configuration: RESEND_API_KEY environment variable.
The sender address SHALL use a verified domain configured in Resend
(e.g., `noreply@parlay.example.com`).

### Requirement: Account creation (signup)
The system SHALL provide a /signup page with:
- Email + password registration form (with password confirmation)
- Google OAuth "Sign up with Google" button
- Link to /login for existing users
On successful signup the system SHALL create the BetterAuth user record,
a corresponding user_profiles row, and redirect to /dashboard.

### Requirement: Email verification
The system SHALL send a verification email on signup for email/password users.
The system SHALL allow login before verification but SHALL show an inline
banner on /dashboard prompting the user to verify their email.
The system SHALL NOT restrict any functionality while unverified (soft gate).

### Requirement: Forgot password flow
The system SHALL provide a "Forgot password?" link on the /login page.
Clicking it SHALL navigate to a /forgot-password page with an email input.
On submit the system SHALL send a password reset email via BetterAuth +
Resend. The reset link SHALL navigate to a /reset-password page where
the user enters a new password (with confirmation).
On successful reset the system SHALL redirect to /login with a success message.

### Requirement: Protected routes
The system SHALL redirect unauthenticated users to /login when they attempt
to access /dashboard, /build/:facetId, or /settings.
After login the system SHALL redirect to the originally intended destination.

The system SHALL use TanStack Start's layout route pattern with a
`_authed` layout at `src/routes/_authed.tsx` that checks authentication
via `beforeLoad`:

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    const user = await getAuthenticatedUser(); // BetterAuth server-side check
    if (!user) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    return { user };
  },
});
```

Protected pages SHALL be nested under `src/routes/_authed/`:
- `src/routes/_authed/dashboard.tsx`
- `src/routes/_authed/build/$facetId.tsx`
- `src/routes/_authed/settings.tsx`

Child routes access the authenticated user via `Route.useRouteContext()`.

### Requirement: Server-side identity validation
The system SHALL validate user identity server-side using the BetterAuth
session on all protected server functions and API routes.
BetterAuth provides server-side session validation via `auth.api.getSession()`.

### Requirement: BetterAuth database connection
BetterAuth connects directly to PostgreSQL via `pg` Pool using the
DATABASE_URL connection string. This bypasses Supabase's PostgREST layer
and RLS entirely — BetterAuth manages its own tables (user, session,
account, verification) with direct SQL. RLS policies SHALL NOT be added
to BetterAuth's tables. Application code uses Supabase JS client
(with bridged JWT or service role key) for all other tables.

### Requirement: BetterAuth to Supabase JWT bridging
BetterAuth manages its own user and session tables in the Supabase public
schema but does NOT use Supabase's native auth system. Supabase's built-in
RLS helpers (`auth.uid()`, `auth.jwt()`) only work with Supabase-native JWTs.

To bridge BetterAuth sessions into Supabase RLS, the system SHALL:
1. On each authenticated server-side request, validate the BetterAuth
   session and extract the user's ID
2. Sign a Supabase-compatible JWT using the SUPABASE_JWT_SECRET environment
   variable with payload: `{ sub: betterAuthUserId, role: "authenticated" }`
3. Create a per-request Supabase client using the `accessToken` callback

The system SHALL implement this JWT bridging as a shared utility in
`app/lib/supabase/authenticated-client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export function createAuthenticatedSupabaseClient(betterAuthUserId: string) {
  const token = jwt.sign(
    { sub: betterAuthUserId, role: 'authenticated' },
    process.env.SUPABASE_JWT_SECRET!,
    { expiresIn: '1h' }
  );

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { accessToken: async () => token }
  );
}
```

A new client must be created per request since different requests have
different user IDs. The `accessToken` callback is the official Supabase
approach for third-party JWT integration (setting custom `Authorization`
headers is deprecated).

This allows `auth.uid()` in RLS policies to return the BetterAuth user ID.
The `forms.user_id` column SHALL store the BetterAuth user ID (from
`public.user.id`), and all RLS policies SHALL use `auth.uid()` to
match against it.

### Requirement: RLS ownership model
All Supabase queries in authenticated contexts SHALL use the bridged JWT
(not the service role key) so that Row Level Security policies enforce
data access. The forms table's user_id field is the ownership anchor —
RLS policies on forms, facets, submissions, and responses SHALL chain
ownership through form_id → forms.user_id.

### Requirement: Public routes
The system SHALL NOT require authentication for /, /login, /signup,
/forgot-password, /reset-password, or /:formId (the form player).
The form player SHALL use the Supabase anon key with RLS for any
client-side reads it performs.

### Requirement: User profiles table
The system SHALL maintain a user_profiles table linked 1:1 to the
BetterAuth user table with fields:
- id: uuid pk fk -> public.user(id) ON DELETE CASCADE
- litellm_base_url: text nullable
- litellm_api_keys: jsonb nullable — encrypted via Supabase Vault

RLS: owner read/write via `auth.uid() = id`.

The user_profiles row SHALL be created automatically via a Postgres
trigger on BetterAuth's user table:

```sql
CREATE FUNCTION create_user_profile() RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (id) VALUES (NEW.id);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_user_profile
  AFTER INSERT ON "user" FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
```

This covers all signup paths (email/password, Google OAuth, any future methods).

### Requirement: Auth endpoint rate limiting
The system SHALL use BetterAuth's built-in rate limiting (configured in
the `rateLimit` section of the auth server config — see above).
Because Vercel functions are stateless, `storage: "database"` is required
so rate limit state persists across function invocations. BetterAuth
creates its own `rateLimit` table for this purpose.

Custom rules per endpoint:
- `/sign-in/email`: max 10 requests per 60 seconds per IP
- `/sign-up/email`: max 10 requests per 60 seconds per IP
- `/forget-password/*`: max 3 requests per 60 seconds per IP

Exceeding the limit SHALL return HTTP 429. The login/signup pages SHALL
display a "Too many attempts, please try again later" message.

Note: This is separate from the `rate_limit_log` table used by the LLM
proxy and submission endpoints (those are custom endpoints outside
BetterAuth).

### Requirement: Environment variables
The system SHALL require the following environment variables:

Auth & application:
- APP_BASE_URL: Application base URL (for OAuth callbacks, email links)
- BETTER_AUTH_SECRET: BetterAuth's internal signing secret
- GOOGLE_CLIENT_ID: Google OAuth client ID
- GOOGLE_CLIENT_SECRET: Google OAuth client secret
- RESEND_API_KEY: Resend API key for transactional emails

Supabase:
- DATABASE_URL: Direct PostgreSQL connection string (used by BetterAuth)
- SUPABASE_URL: Supabase project PostgREST URL (used by Supabase JS client)
- SUPABASE_ANON_KEY: Supabase anon key (client-side/public player queries)
- SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (facet resolution,
  LLM proxy, submissions, Vault decryption)
- SUPABASE_JWT_SECRET: For signing bridged JWTs


#### Scenario: Unauthenticated dashboard access
- GIVEN a user is not signed in
- WHEN they navigate to /dashboard
- THEN the system redirects to /login
- AND preserves the intended destination for post-login redirect

#### Scenario: Post-login redirect
- GIVEN an unauthenticated user was redirected to /login from /build/abc-123
- WHEN they successfully log in
- THEN the system redirects them to /build/abc-123

#### Scenario: Authenticated server function call
- GIVEN a user has a valid BetterAuth session
- WHEN they invoke a protected server function (e.g., save flow_definition)
- THEN the system validates the session via BetterAuth server-side
- AND creates a Supabase client with a bridged JWT
- AND uses it for the Supabase query (RLS enforces ownership)

#### Scenario: Forgot password flow
- GIVEN a user clicks "Forgot password?" on /login
- WHEN they enter their email on /forgot-password and submit
- THEN BetterAuth triggers sendResetPassword which sends via Resend
- AND the user follows the link to /reset-password
- AND enters a new password
- THEN the system resets the password and redirects to /login

#### Scenario: Google OAuth signup
- GIVEN a new user clicks "Sign up with Google" on /signup
- WHEN they complete the Google OAuth flow
- THEN BetterAuth creates a user record and account record
- AND a user_profiles row is created
- AND the user is redirected to /dashboard
