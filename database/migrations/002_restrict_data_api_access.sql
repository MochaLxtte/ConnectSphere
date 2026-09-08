-- Business data is accessed through Express using the server's database connection.
-- Keep these tables unavailable to Supabase's browser-facing Data API roles.
-- The table owner can still run migrations, seed data and serve backend queries.
DO $$
DECLARE
  application_schema text := current_schema();
  application_table text;
  api_role text;
BEGIN
  FOREACH application_table IN ARRAY ARRAY[
    'schema_migrations',
    'scaffold_metadata',
    'app_users',
    'event_requests',
    'event_clarifications',
    'event_reviews'
  ] LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      application_schema, application_table);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC',
      application_schema, application_table);

    -- Plain PostgreSQL environments (including CI) do not have these roles.
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM %I',
          application_schema, application_table, api_role);
      END IF;
    END LOOP;
  END LOOP;
END
$$;
