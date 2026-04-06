-- =============================================================================
-- BetterAuth: Bootstrap tables
-- =============================================================================
-- BetterAuth auto-creates these tables on first app start, but Supabase
-- migrations run before the app. Create them here so subsequent migrations
-- can reference public."user". BetterAuth's runtime migration uses
-- CREATE TABLE IF NOT EXISTS, so this is safe — it becomes a no-op.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public."user" (
  id          text NOT NULL PRIMARY KEY,
  name        text NOT NULL,
  email       text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image       text,
  "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."session" (
  id          text NOT NULL PRIMARY KEY,
  "expiresAt" timestamp NOT NULL,
  token       text NOT NULL UNIQUE,
  "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" text,
  "userAgent" text,
  "userId"    text NOT NULL REFERENCES public."user"(id)
);

CREATE TABLE IF NOT EXISTS public."account" (
  id                      text NOT NULL PRIMARY KEY,
  "accountId"             text NOT NULL,
  "providerId"            text NOT NULL,
  "userId"                text NOT NULL REFERENCES public."user"(id),
  "accessToken"           text,
  "refreshToken"          text,
  "idToken"               text,
  "accessTokenExpiresAt"  timestamp,
  "refreshTokenExpiresAt" timestamp,
  scope                   text,
  password                text,
  "createdAt"             timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."verification" (
  id          text NOT NULL PRIMARY KEY,
  identifier  text NOT NULL,
  value       text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp,
  "updatedAt" timestamp
);
