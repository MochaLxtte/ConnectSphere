-- KAN-62 / KAN-63: lifecycle cancellation and equipment request/review workflow.
ALTER TABLE equipment_requests
  ADD COLUMN technical_requirements text,
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision > 0);

ALTER TABLE event_registrations ADD COLUMN cancellation_outcome_at timestamptz;
ALTER TABLE event_registrations DROP CONSTRAINT event_registrations_status_check;
ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_status_check
  CHECK (status IN ('REGISTERED', 'WITHDRAWN', 'CANCELLED'));
ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_cancelled_at_check
  CHECK ((status = 'CANCELLED') = (cancellation_outcome_at IS NOT NULL));

ALTER TABLE event_requests ADD COLUMN equipment_plan_status text NOT NULL DEFAULT 'REQUIRED'
  CHECK (equipment_plan_status IN ('REQUIRED', 'NOT_REQUIRED'));

CREATE TABLE event_cancellations (
  event_request_id uuid PRIMARY KEY REFERENCES event_requests(id),
  cancelled_by uuid NOT NULL REFERENCES app_users(id),
  cancelled_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  affected_venue_bookings integer NOT NULL CHECK (affected_venue_bookings >= 0),
  affected_equipment_requests integer NOT NULL CHECK (affected_equipment_requests >= 0),
  affected_registrations integer NOT NULL CHECK (affected_registrations >= 0)
);

ALTER TABLE event_status_history ADD COLUMN reason text;

-- Event cancellation reasons are internal workflow data; expose them only through the
-- authenticated application API, not the Supabase Data API roles.
DO $$
DECLARE
  application_schema text := current_schema();
  api_role text;
BEGIN
  EXECUTE format('ALTER TABLE %I.event_cancellations ENABLE ROW LEVEL SECURITY', application_schema);
  EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.event_cancellations FROM PUBLIC', application_schema);
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.event_cancellations FROM %I', application_schema, api_role);
    END IF;
  END LOOP;
END
$$;

