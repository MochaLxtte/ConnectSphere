-- Supabase credentials map to an existing application-owned profile and role.
-- Keep migration 003 unchanged for databases that have already applied it.
-- Existing users stay unmapped until their verified Supabase user ID is provisioned.
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS supabase_user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_supabase_user_id_unique
  ON app_users (supabase_user_id);
