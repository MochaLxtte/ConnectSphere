-- KAN-66: revision-checked planning edits and their audit trail.
-- event_requests.revision is a whole-number version that increases on every UPDATE of the row,
-- whichever service makes it (edits, status changes, assignment). Clients send the revision they
-- read; a writer compares it under the row lock, so a stale page cannot overwrite newer data or
-- decide on information the reviewer has not seen. updated_at is not used for this because
-- JavaScript dates drop PostgreSQL's microseconds.
-- event_request_edits records who changed which fields after submission, with old and new values.
-- Additive only: existing rows start at revision 1 and migrations 001-013 are unchanged.

ALTER TABLE event_requests
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1);

CREATE FUNCTION advance_event_request_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Ignore any client-supplied value; the stored row is the only source of the next revision.
  NEW.revision := OLD.revision + 1;
  RETURN NEW;
END
$$;
CREATE TRIGGER event_requests_advance_revision BEFORE UPDATE ON event_requests
  FOR EACH ROW EXECUTE FUNCTION advance_event_request_revision();

CREATE TABLE event_request_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_request_id uuid NOT NULL REFERENCES event_requests(id) ON DELETE CASCADE,
  -- The revision produced by this edit.
  revision integer NOT NULL CHECK (revision >= 2),
  edited_by uuid NOT NULL REFERENCES app_users(id),
  editor_role text NOT NULL CHECK (editor_role IN ('EVENT_ORGANISER', 'EVENT_COORDINATOR')),
  -- Status at the time of the edit; edits never change it.
  event_status text NOT NULL,
  -- { "<apiField>": { "from": <previous>, "to": <new> } } for each changed field.
  changes jsonb NOT NULL CHECK (jsonb_typeof(changes) = 'object' AND changes <> '{}'::jsonb),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_request_id, revision)
);
CREATE INDEX event_request_edits_event_idx ON event_request_edits (event_request_id, created_at);

-- Same Data API protection as the other application tables (migrations 002, 004 and 010).
DO $$
DECLARE
  application_schema text := current_schema();
  api_role text;
BEGIN
  EXECUTE format('ALTER TABLE %I.event_request_edits ENABLE ROW LEVEL SECURITY', application_schema);
  EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.event_request_edits FROM PUBLIC', application_schema);
  EXECUTE format('ALTER FUNCTION %I.advance_event_request_revision() SET search_path = %I, pg_temp',
    application_schema, application_schema);
  EXECUTE format('REVOKE ALL ON FUNCTION %I.advance_event_request_revision() FROM PUBLIC', application_schema);
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.event_request_edits FROM %I', application_schema, api_role);
      EXECUTE format('REVOKE ALL ON FUNCTION %I.advance_event_request_revision() FROM %I', application_schema, api_role);
    END IF;
  END LOOP;
END
$$;
