-- KAN-81 / CR-2: which approved venue arrangements an operational outage affects, and their recovery state.
-- Flags live here rather than on venue_bookings: the venue_bookings_conflict trigger re-checks every
-- update to an APPROVED booking against blocks, so the affected booking row itself is left untouched.
-- The outage period and reason are copied so recovery history survives removal of the block.
CREATE TABLE venue_outage_impacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unavailability_id uuid REFERENCES venue_unavailability(id) ON DELETE SET NULL,
  venue_booking_id uuid NOT NULL REFERENCES venue_bookings(id),
  venue_id uuid NOT NULL REFERENCES venues(id),
  outage_starts_at timestamptz NOT NULL,
  outage_ends_at timestamptz NOT NULL,
  outage_reason text NOT NULL CHECK (length(trim(outage_reason)) > 0),
  -- RESOLVED is set by a later replacement workflow (KAN-81 phase 3); CLEARED when the outage is removed.
  status text NOT NULL DEFAULT 'RECOVERY_REQUIRED' CHECK (status IN ('RECOVERY_REQUIRED', 'RESOLVED', 'CLEARED')),
  recorded_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (outage_ends_at > outage_starts_at)
);
-- Reprocessing one outage never records the same booking twice (KAN-81-AC11).
CREATE UNIQUE INDEX venue_outage_impacts_once
  ON venue_outage_impacts (unavailability_id, venue_booking_id) WHERE unavailability_id IS NOT NULL;
CREATE INDEX venue_outage_impacts_open ON venue_outage_impacts (venue_booking_id)
  WHERE status = 'RECOVERY_REQUIRED';

-- Same Data API protection as the other application tables (migrations 002 and 004).
DO $$
DECLARE
  application_schema text := current_schema();
  api_role text;
BEGIN
  EXECUTE format('ALTER TABLE %I.venue_outage_impacts ENABLE ROW LEVEL SECURITY', application_schema);
  EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.venue_outage_impacts FROM PUBLIC', application_schema);
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.venue_outage_impacts FROM %I', application_schema, api_role);
    END IF;
  END LOOP;
END
$$;
