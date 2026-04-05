## ADDED Requirements

### Requirement: Supabase project structure
The project SHALL include a `supabase/` directory at the repository root with Supabase CLI configuration (`supabase/config.toml`) and a `supabase/migrations/` directory containing SQL migration files.

#### Scenario: Local Supabase starts
- **WHEN** the developer runs `supabase start` from the project root
- **THEN** a local Postgres instance starts with Studio accessible at `http://localhost:54323`

### Requirement: Initial migration — application tables
The project SHALL include an initial migration file that creates all application tables defined across the spec suite. The tables SHALL be created in foreign-key-safe order:

1. `user_profiles` (FK to BetterAuth's `user` table)
2. `forms` (FK to `user` via `user_id`)
3. `facets` (FK to `forms`)
4. `facet_nickname_history` (FK to `facets`)
5. `round_robin_log` (FK to `forms`, `facets`)
6. `submissions` (FK to `forms`, `facets`)
7. `responses` (FK to `submissions`, `facets`)
8. `llm_conversations` (FK to `forms`, `facets`)
9. `rate_limit_log` (standalone)

The migration SHALL NOT create BetterAuth-managed tables (`user`, `session`, `account`, `verification`) — those are auto-created by BetterAuth on first run.

#### Scenario: Migration applies cleanly
- **WHEN** `supabase db reset` is run against a fresh local database
- **THEN** all tables, indexes, triggers, functions, and RLS policies are created without errors

### Requirement: forms table DDL
The migration SHALL create the `forms` table with columns: `id` (uuid pk default `gen_random_uuid()`), `user_id` (uuid not null FK to `public."user"(id)`), `title` (text not null), `round_robin_enabled` (boolean not null default false), `round_robin_counter` (integer not null default 0), `created_at` (timestamptz default `now()`), `updated_at` (timestamptz default `now()`).

#### Scenario: forms table exists after migration
- **WHEN** the migration completes
- **THEN** the `forms` table exists with all specified columns and constraints

### Requirement: facets table DDL
The migration SHALL create the `facets` table with columns: `id` (uuid pk default `gen_random_uuid()`), `form_id` (uuid not null FK to `forms` ON DELETE CASCADE), `nickname` (text not null), `is_default` (boolean not null default false), `status` (text not null default 'draft' CHECK in ('draft','active','archived')), `color_scheme` (jsonb not null with default theme), `flow_definition` (jsonb not null), `created_at` (timestamptz default `now()`), `updated_at` (timestamptz default `now()`). A UNIQUE constraint on `(form_id, nickname)` SHALL be included. A partial unique index `CREATE UNIQUE INDEX ON facets (form_id) WHERE is_default = true` SHALL enforce one default per form.

#### Scenario: facets constraints enforce
- **WHEN** an INSERT attempts a duplicate `(form_id, nickname)` pair
- **THEN** the database rejects the insert with a unique violation

### Requirement: user_profiles table DDL
The migration SHALL create the `user_profiles` table with columns: `id` (uuid pk FK to `public."user"(id)` ON DELETE CASCADE), `litellm_base_url` (text nullable), `litellm_api_keys` (jsonb nullable). The migration SHALL also create the trigger function `create_user_profile()` and attach it as an AFTER INSERT trigger on BetterAuth's `"user"` table to auto-create profile rows.

#### Scenario: Profile auto-created on signup
- **WHEN** BetterAuth inserts a new row into the `user` table
- **THEN** the trigger inserts a corresponding `user_profiles` row

### Requirement: submissions and responses tables DDL
The migration SHALL create the `submissions` table (as defined in player-submission spec) with indexes `idx_submissions_form`, `idx_submissions_visitor`, and the partial unique index `idx_submissions_once_per_visitor`. The migration SHALL create the `responses` table with index `idx_responses_submission`.

#### Scenario: Once-per-visitor constraint
- **WHEN** a duplicate `(visitor_id, facet_id)` INSERT is attempted with `is_complete = true`
- **THEN** the partial unique index rejects it

### Requirement: llm_conversations table DDL
The migration SHALL create the `llm_conversations` table (as defined in player-llm spec) with a unique constraint on `conversation_id` and an `updated_at` trigger.

#### Scenario: Conversation tracking works
- **WHEN** a conversation row is updated
- **THEN** `updated_at` is automatically set to `now()`

### Requirement: rate_limit_log table DDL
The migration SHALL create the `rate_limit_log` table with columns `id` (uuid pk), `key` (text not null), `created_at` (timestamptz default `now()`), and an index on `(key, created_at)`.

#### Scenario: Rate limit entries indexed
- **WHEN** a rate check query runs `SELECT COUNT(*) FROM rate_limit_log WHERE key = $1 AND created_at > now() - interval '10 minutes'`
- **THEN** the query uses the `idx_rate_limit_key_time` index

### Requirement: facet_nickname_history table DDL
The migration SHALL create the `facet_nickname_history` table with columns `id` (uuid pk), `facet_id` (uuid not null FK to `facets` ON DELETE CASCADE), `old_nickname` (text not null), `changed_at` (timestamptz default `now()`).

#### Scenario: History tracks renames
- **WHEN** a facet is renamed and the old nickname is inserted into history
- **THEN** the row persists and is queryable for 3xx redirect resolution

### Requirement: round_robin_log table DDL
The migration SHALL create the `round_robin_log` table with columns `id` (uuid pk), `form_id` (uuid FK to `forms` ON DELETE CASCADE), `facet_id` (uuid FK to `facets` ON DELETE CASCADE), `facet_nickname` (text not null), `visitor_id` (text not null), `assigned_at` (timestamptz default `now()`). A unique index on `(visitor_id, form_id)` SHALL prevent duplicate assignments.

#### Scenario: Duplicate assignment prevented
- **WHEN** a concurrent request tries to insert a duplicate `(visitor_id, form_id)`
- **THEN** the unique index rejects the second insert

### Requirement: Postgres functions
The migration SHALL create the `increment_round_robin(p_form_id uuid)` function as defined in the round-robin spec. The migration SHALL create the `update_facet_updated_at()` trigger function and the `update_form_updated_at()` trigger function as defined in the facets and forms specs. The migration SHALL create the `update_llm_conversation_updated_at()` trigger function. The migration SHALL create the `create_user_profile()` trigger function.

#### Scenario: Round-robin function works
- **WHEN** `SELECT increment_round_robin('some-form-id')` is called
- **THEN** it returns a zero-based facet index and increments the counter

### Requirement: RLS policies
The migration SHALL enable RLS on all application tables and create policies matching the spec requirements:
- `forms`: owner SELECT/INSERT/UPDATE/DELETE where `user_id = auth.uid()`
- `facets`: owner full access via `form_id` join to `forms.user_id`; public SELECT where `status = 'active'`
- `user_profiles`: owner read/write where `id = auth.uid()`
- `submissions`: owner SELECT via `form_id` join; no public INSERT (service role only)
- `responses`: owner SELECT via submission join chain; no public INSERT
- `llm_conversations`: no public policies (service role only); owner SELECT via `form_id` join
- `rate_limit_log`: no public policies (service role only)
- `round_robin_log`: no public INSERT; owner SELECT via `form_id` join
- `facet_nickname_history`: owner INSERT/SELECT via facet join chain

#### Scenario: RLS blocks unauthorized access
- **WHEN** a user queries `forms` with a bridged JWT for user "A"
- **THEN** only forms where `user_id = "A"` are returned

### Requirement: pg_cron cleanup jobs
The migration SHALL schedule two pg_cron jobs:
- `cleanup-rate-limits`: runs daily at 03:00 UTC, deletes `rate_limit_log` rows older than 1 hour
- `cleanup-llm-conversations`: runs daily at 03:00 UTC, deletes `llm_conversations` rows with `updated_at` older than 24 hours

#### Scenario: Stale rate limit entries cleaned
- **WHEN** the daily cleanup job runs
- **THEN** rate_limit_log entries older than 1 hour are deleted
- **AND** expired llm_conversations rows are deleted

### Requirement: Supabase Storage bucket
The migration or Supabase config SHALL ensure a `markdown-uploads` public bucket exists in Supabase Storage for WYSIWYG image/file uploads. If Supabase CLI config supports bucket creation, it SHALL be configured there; otherwise, the README SHALL document manual creation.

#### Scenario: Upload bucket accessible
- **WHEN** a file upload targets the `markdown-uploads` bucket
- **THEN** the bucket exists and accepts uploads (subject to storage policies)
