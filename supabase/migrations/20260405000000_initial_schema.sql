-- =============================================================================
-- Parlay: Initial Database Schema
-- =============================================================================
-- This migration creates all application tables, indexes, triggers, functions,
-- and RLS policies. BetterAuth tables (user, session, account, verification)
-- are NOT created here — BetterAuth auto-creates them on first run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "extensions";

-- ---------------------------------------------------------------------------
-- 1. user_profiles (FK to BetterAuth's "user" table)
-- ---------------------------------------------------------------------------
CREATE TABLE user_profiles (
  id                text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  litellm_base_url  text,
  litellm_api_keys  jsonb
);

-- Auto-create profile row when BetterAuth inserts a user
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_profiles (id) VALUES (NEW.id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_create_user_profile
  AFTER INSERT ON public."user"
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- ---------------------------------------------------------------------------
-- 2. forms
-- ---------------------------------------------------------------------------
CREATE TABLE forms (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               text NOT NULL REFERENCES public."user"(id),
  title                 text NOT NULL,
  round_robin_enabled   boolean NOT NULL DEFAULT false,
  round_robin_counter   integer NOT NULL DEFAULT 0,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. facets
-- ---------------------------------------------------------------------------
CREATE TABLE facets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id           uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  nickname          text NOT NULL,
  is_default        boolean NOT NULL DEFAULT false,
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'archived')),
  color_scheme      jsonb NOT NULL DEFAULT '{"primary":"#EA4C89","accent":"#C4307A","background":"#FFFFFF","theme":"default"}',
  flow_definition   jsonb NOT NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (form_id, nickname)
);

-- One default facet per form
CREATE UNIQUE INDEX idx_facets_one_default
  ON facets (form_id) WHERE is_default = true;

-- updated_at trigger for facets
CREATE OR REPLACE FUNCTION update_facet_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_facet_updated_at
  BEFORE UPDATE ON facets
  FOR EACH ROW EXECUTE FUNCTION update_facet_updated_at();

-- Propagate facet changes to parent form's updated_at
CREATE OR REPLACE FUNCTION update_form_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE forms SET updated_at = now() WHERE id = NEW.form_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_facet_update_form
  AFTER UPDATE ON facets
  FOR EACH ROW EXECUTE FUNCTION update_form_updated_at();

-- ---------------------------------------------------------------------------
-- 4. facet_nickname_history
-- ---------------------------------------------------------------------------
CREATE TABLE facet_nickname_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facet_id      uuid NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  old_nickname   text NOT NULL,
  changed_at    timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. round_robin_log
-- ---------------------------------------------------------------------------
CREATE TABLE round_robin_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  facet_id        uuid NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  facet_nickname   text NOT NULL,
  visitor_id      text NOT NULL,
  assigned_at     timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_round_robin_log_visitor_form
  ON round_robin_log (visitor_id, form_id);

-- ---------------------------------------------------------------------------
-- 6. submissions
-- ---------------------------------------------------------------------------
CREATE TABLE submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id          uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  facet_id         uuid NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  facet_nickname   text NOT NULL,
  visitor_id       text NOT NULL,
  is_complete      boolean NOT NULL DEFAULT false,
  submitted_at     timestamptz,
  respondent_email text,
  metadata         jsonb,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_submissions_form ON submissions(form_id);
CREATE INDEX idx_submissions_visitor ON submissions(visitor_id, form_id);
CREATE UNIQUE INDEX idx_submissions_once_per_visitor
  ON submissions(visitor_id, facet_id) WHERE is_complete = true;

-- ---------------------------------------------------------------------------
-- 7. responses
-- ---------------------------------------------------------------------------
CREATE TABLE responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  facet_id        uuid NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  node_alias      text NOT NULL,
  node_label      text NOT NULL,
  node_required   boolean NOT NULL,
  node_record     boolean NOT NULL,
  value           jsonb,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_responses_submission ON responses(submission_id);

-- ---------------------------------------------------------------------------
-- 8. llm_conversations
-- ---------------------------------------------------------------------------
CREATE TABLE llm_conversations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   text UNIQUE NOT NULL,
  form_id           uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  facet_id          uuid NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  node_alias        text NOT NULL,
  visitor_id        text NOT NULL,
  system_context    text NOT NULL,
  messages          jsonb NOT NULL DEFAULT '[]',
  is_ended          boolean NOT NULL DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_llm_conversation_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_llm_conversation_updated_at
  BEFORE UPDATE ON llm_conversations
  FOR EACH ROW EXECUTE FUNCTION update_llm_conversation_updated_at();

-- ---------------------------------------------------------------------------
-- 9. rate_limit_log
-- ---------------------------------------------------------------------------
CREATE TABLE rate_limit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_limit_key_time ON rate_limit_log (key, created_at);

-- ---------------------------------------------------------------------------
-- Postgres functions
-- ---------------------------------------------------------------------------

-- Round-robin atomic counter
CREATE OR REPLACE FUNCTION increment_round_robin(p_form_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_counter integer;
  v_facet_count integer;
BEGIN
  SELECT COUNT(*) INTO v_facet_count
  FROM facets WHERE form_id = p_form_id AND status = 'active';

  UPDATE forms SET round_robin_counter = round_robin_counter + 1
  WHERE id = p_form_id RETURNING round_robin_counter INTO v_counter;

  RETURN (v_counter - 1) % GREATEST(v_facet_count, 1);
END; $$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

-- user_profiles: owner read/write
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_owner_select" ON user_profiles
  FOR SELECT USING (id = auth.jwt()->>'sub');
CREATE POLICY "user_profiles_owner_update" ON user_profiles
  FOR UPDATE USING (id = auth.jwt()->>'sub');

-- forms: owner CRUD
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forms_owner_select" ON forms
  FOR SELECT USING (user_id = auth.jwt()->>'sub');
CREATE POLICY "forms_owner_insert" ON forms
  FOR INSERT WITH CHECK (user_id = auth.jwt()->>'sub');
CREATE POLICY "forms_owner_update" ON forms
  FOR UPDATE USING (user_id = auth.jwt()->>'sub');
CREATE POLICY "forms_owner_delete" ON forms
  FOR DELETE USING (user_id = auth.jwt()->>'sub');

-- facets: owner full access + public SELECT on active
ALTER TABLE facets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facets_owner_select" ON facets
  FOR SELECT USING (
    form_id IN (SELECT id FROM forms WHERE user_id = auth.jwt()->>'sub')
  );
CREATE POLICY "facets_public_select" ON facets
  FOR SELECT USING (status = 'active');
CREATE POLICY "facets_owner_insert" ON facets
  FOR INSERT WITH CHECK (
    form_id IN (SELECT id FROM forms WHERE user_id = auth.jwt()->>'sub')
  );
CREATE POLICY "facets_owner_update" ON facets
  FOR UPDATE USING (
    form_id IN (SELECT id FROM forms WHERE user_id = auth.jwt()->>'sub')
  );
CREATE POLICY "facets_owner_delete" ON facets
  FOR DELETE USING (
    form_id IN (SELECT id FROM forms WHERE user_id = auth.jwt()->>'sub')
  );

-- facet_nickname_history: owner INSERT/SELECT via chain
ALTER TABLE facet_nickname_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fnh_owner_select" ON facet_nickname_history
  FOR SELECT USING (
    facet_id IN (
      SELECT f.id FROM facets f
      JOIN forms fo ON fo.id = f.form_id
      WHERE fo.user_id = auth.jwt()->>'sub'
    )
  );
CREATE POLICY "fnh_owner_insert" ON facet_nickname_history
  FOR INSERT WITH CHECK (
    facet_id IN (
      SELECT f.id FROM facets f
      JOIN forms fo ON fo.id = f.form_id
      WHERE fo.user_id = auth.jwt()->>'sub'
    )
  );

-- round_robin_log: no public INSERT, owner SELECT
ALTER TABLE round_robin_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rrl_owner_select" ON round_robin_log
  FOR SELECT USING (
    form_id IN (SELECT id FROM forms WHERE user_id = auth.jwt()->>'sub')
  );

-- submissions: no public INSERT, owner SELECT
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_owner_select" ON submissions
  FOR SELECT USING (
    form_id IN (SELECT id FROM forms WHERE user_id = auth.jwt()->>'sub')
  );

-- responses: no public INSERT, owner SELECT via chain
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "responses_owner_select" ON responses
  FOR SELECT USING (
    submission_id IN (
      SELECT s.id FROM submissions s
      WHERE s.form_id IN (SELECT id FROM forms WHERE user_id = auth.jwt()->>'sub')
    )
  );

-- llm_conversations: no public policies, owner SELECT
ALTER TABLE llm_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "llm_conversations_owner_select" ON llm_conversations
  FOR SELECT USING (
    form_id IN (SELECT id FROM forms WHERE user_id = auth.jwt()->>'sub')
  );

-- rate_limit_log: no public policies (service role only)
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Storage policies for markdown-uploads bucket
-- ---------------------------------------------------------------------------

CREATE POLICY "Authenticated users can upload markdown assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'markdown-uploads');

CREATE POLICY "Authenticated users can delete markdown assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'markdown-uploads');

-- ---------------------------------------------------------------------------
-- pg_cron cleanup jobs
-- ---------------------------------------------------------------------------

-- Clean up rate limit entries older than 1 hour (daily at 03:00 UTC)
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 3 * * *',
  $$DELETE FROM rate_limit_log WHERE created_at < now() - interval '1 hour'$$
);

-- Clean up expired LLM conversations older than 24 hours (daily at 03:00 UTC)
SELECT cron.schedule(
  'cleanup-llm-conversations',
  '0 3 * * *',
  $$DELETE FROM llm_conversations WHERE updated_at < now() - interval '24 hours'$$
);
