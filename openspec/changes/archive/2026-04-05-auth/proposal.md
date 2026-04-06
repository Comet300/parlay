## Why

The scaffold created auth infrastructure (BetterAuth server/client config, middleware, JWT bridging, API route handler) and stub route files, but the actual auth pages are placeholder `<div>` elements with no forms, no logic, and no integration with BetterAuth. Users cannot sign up, log in, reset passwords, or see email verification prompts. This change implements the full auth UI and flow wiring so the app is usable end-to-end.

## What Changes

- Implement `/login` page with email/password form, conditional Google OAuth button, error handling, post-login redirect, and link to forgot-password/signup
- Implement `/signup` page with email/password+confirmation form, conditional Google OAuth button, error handling, and redirect to dashboard
- Implement `/forgot-password` page with email input form that triggers BetterAuth password reset via Resend
- Implement `/reset-password` page with new password + confirmation form, token handling from URL, and redirect to login on success
- Add `googleOAuthEnabled` server function to expose OAuth availability to client pages
- Add email verification banner on `/dashboard` for unverified users (soft gate)
- Wire 429 rate-limit error display on login/signup forms

## Capabilities

### New Capabilities

_(none — all auth capabilities are already specified)_

### Modified Capabilities

_(none — implementing existing spec as-is)_

## Impact

- **Routes**: `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx` — full rewrites from stubs
- **Dashboard**: `_authed/dashboard.tsx` — add email verification banner
- **Server functions**: New `getGoogleOAuthEnabled` server function
- **Dependencies**: No new packages — uses existing `better-auth/client`, design system components, and lucide-react icons
