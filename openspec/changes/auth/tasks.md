## 1. Shared Utilities

- [x] 1.1 Create `getGoogleOAuthEnabled` server function in `src/lib/auth/google-oauth.ts` (separate file to avoid bundling server-only deps) that returns `!!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET`
- [x] 1.2 Create `src/components/auth/auth-layout.tsx` — centered card wrapper used by all auth pages (vertically/horizontally centered, max-w-md, Card with padding)

## 2. Login Page

- [x] 2.1 Implement `/login` route with `loader` that calls `getGoogleOAuthEnabled` and reads `redirect` search param
- [x] 2.2 Build login form: email input, password input, "Log in" Button, error display, loading state
- [x] 2.3 Wire `authClient.signIn.email()` on submit — on success redirect to `redirect` param or `/dashboard`; on error display mapped message (invalid credentials, 429 rate limit, network error)
- [x] 2.4 Add conditional Google OAuth button calling `authClient.signIn.social({ provider: "google" })`
- [x] 2.5 Add "Forgot password?" link to `/forgot-password` and "Don't have an account? Sign up" link to `/signup`

## 3. Signup Page

- [x] 3.1 Implement `/signup` route with `loader` that calls `getGoogleOAuthEnabled`
- [x] 3.2 Build signup form: email, password, confirm password inputs, "Sign up" Button, error display, loading state
- [x] 3.3 Wire `authClient.signUp.email()` on submit — validate password match client-side, on success redirect to `/dashboard`, on error display mapped message (user exists, 429, network)
- [x] 3.4 Add conditional Google OAuth button and "Already have an account? Log in" link to `/login`

## 4. Forgot Password Page

- [x] 4.1 Implement `/forgot-password` with email input form
- [x] 4.2 Wire `authClient.requestPasswordReset()` on submit — show success message ("Check your email") regardless of whether email exists, handle 429 and network errors

## 5. Reset Password Page

- [x] 5.1 Implement `/reset-password` route that reads `token` from search params
- [x] 5.2 Build new password + confirmation form, wire `authClient.resetPassword()` with token
- [x] 5.3 On success redirect to `/login` with success message; on error (invalid/expired token) display error

## 6. Email Verification Banner

- [x] 6.1 Add email verification banner to `_authed/dashboard.tsx` — check `user.emailVerified` from route context, show dismissible info banner if unverified

## 7. Verification

- [x] 7.1 Verify `npm run build` succeeds with all auth page changes
- [x] 7.2 Verify `/login`, `/signup`, `/forgot-password`, `/reset-password` render correctly with design system styling
