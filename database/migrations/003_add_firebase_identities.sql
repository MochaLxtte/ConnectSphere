-- Firebase owns credentials; this table links a verified Firebase UID to the
-- application-owned profile and role in app_users.
CREATE TABLE app_user_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  firebase_uid text NOT NULL UNIQUE CHECK (length(trim(firebase_uid)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_user_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE app_user_identities FROM PUBLIC;

DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE app_user_identities FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
