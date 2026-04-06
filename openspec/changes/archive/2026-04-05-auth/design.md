## Context

The scaffold change created all auth infrastructure: BetterAuth server config (`src/lib/auth/server.ts`), client (`src/lib/auth/client.ts`), middleware with JWT bridging (`src/lib/auth/middleware.ts`), the API catch-all route (`src/routes/api/auth/$.ts`), and the Supabase authenticated client factory. The `_authed.tsx` layout route already guards `/dashboard` and `/settings` with session checks.

However, the four auth pages (`/login`, `/signup`, `/forgot-password`, `/reset-password`) are placeholder stubs rendering plain text. No forms, no BetterAuth client calls, no error handling, no conditional Google OAuth.

## Goals / Non-Goals

**Goals:**
- Fully functional login, signup, forgot-password, and reset-password pages using the BetterAuth client SDK
- Conditional Google OAuth buttons driven by a server function
- Proper error display (invalid credentials, rate limiting, network errors)
- Post-login redirect via `?redirect` search param
- Email verification soft-gate banner on the dashboard
- Consistent styling using the design system primitives (Card, Button, Input)

**Non-Goals:**
- Modifying BetterAuth server config, middleware, or JWT bridging (already correct)
- Adding new auth methods beyond email/password and Google OAuth
- Hard-gating features behind email verification (spec says soft gate only)
- Admin/role-based access control

## Decisions

### 1. Server function for Google OAuth flag

Expose a `getGoogleOAuthEnabled` server function that returns a boolean. Auth pages call this in their `loader` to get the flag at render time. This avoids exposing env vars to the client.

**Alternative considered:** Passing the flag through route context from `_authed` layout — rejected because auth pages are public routes outside `_authed`.

### 2. Form state management

Use React `useState` for form state (email, password, errors, loading). No need for a form library — the forms are simple with 2-3 fields each.

**Alternative considered:** React Hook Form — overkill for these simple forms, adds a dependency.

### 3. Auth page layout

All four auth pages share a centered card layout (vertically and horizontally centered, max-width ~400px). Extract a shared `AuthLayout` wrapper component to avoid duplication. This is a presentational wrapper only — not a route layout.

### 4. Reset password token handling

BetterAuth sends a reset link with a token as a URL parameter. The `/reset-password` page reads the token from `search` params (`?token=...`) and passes it to `authClient.resetPassword()`.

### 5. Email verification banner

Add a banner to the dashboard that checks `session.user.emailVerified`. The `_authed` layout already provides `user` via route context. The banner is a dismissible info bar — not blocking.

### 6. Error mapping

Map BetterAuth error codes to user-friendly messages:
- `INVALID_CREDENTIALS` → "Invalid email or password"
- `USER_ALREADY_EXISTS` → "An account with this email already exists"
- `TOO_MANY_REQUESTS` / HTTP 429 → "Too many attempts, please try again later"
- Network/unknown → "Something went wrong. Please try again."

## Risks / Trade-offs

- **BetterAuth client API surface** → Mitigated by checking Context7 docs for current `authClient` method signatures before implementation.
- **Reset password token format** → BetterAuth controls the token format and URL structure. If it changes, only the search param parsing needs updating.
- **Google OAuth redirect URI** → Requires manual Google Cloud Console config. Documented in the spec but not automated.
