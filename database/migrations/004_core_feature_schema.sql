-- First-release schema for CF-05 to CF-20. Additive only: existing tables keep their
-- columns and data. Rules marked "provisional" are team assumptions for open customer
-- questions (Q-04, Q-06 to Q-13); change them through later migrations once clarified.
-- Services still enforce roles, ownership and transitions; triggers below only guard
-- invariants that concurrent requests could otherwise break.

-- CF-06/Q-04/Q-12 (provisional): later lifecycle states. Approval of the request stays
-- distinct from confirmation of a fully arranged event.
ALTER TABLE event_requests DROP CONSTRAINT event_requests_status_check;
ALTER TABLE event_requests ADD CONSTRAINT event_requests_status_check CHECK (status IN (
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'REJECTED',
  'CONFIRMED', 'CANCELLED', 'COMPLETED'
));
-- Draft saving accepts any interval, so ends_at > starts_at stays a service rule here.

-- CF-18/Q-10 (provisional): NULL capacity means no registration limit has been set.
ALTER TABLE event_requests
  ADD COLUMN registration_capacity integer CHECK (registration_capacity >= 0),
  ADD COLUMN registration_opens_at timestamptz,
  ADD COLUMN registration_closes_at timestamptz;

-- CF-06/Q-14: status audit trail. Services may run
-- SELECT set_config('app.actor_id', <app_users.id>, true) inside their transaction to
-- attribute the change; otherwise changed_by stays NULL.
CREATE TABLE event_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_request_id uuid NOT NULL REFERENCES event_requests(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_status_history_event_idx ON event_status_history (event_request_id, created_at);

CREATE FUNCTION record_event_status_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO event_status_history (event_request_id, from_status, to_status, changed_by)
  VALUES (
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END,
    NEW.status,
    NULLIF(current_setting('app.actor_id', true), '')::uuid
  );
  RETURN NULL;
END
$$;
CREATE TRIGGER event_requests_status_insert AFTER INSERT ON event_requests
  FOR EACH ROW EXECUTE FUNCTION record_event_status_change();
CREATE TRIGGER event_requests_status_update AFTER UPDATE OF status ON event_requests
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION record_event_status_change();

-- CF-05/Q-02: assignment history. event_requests.coordinator_id remains the current
-- assignment used for access checks; write both in one transaction.
CREATE TABLE coordinator_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_request_id uuid NOT NULL REFERENCES event_requests(id) ON DELETE CASCADE,
  coordinator_id uuid NOT NULL REFERENCES app_users(id),
  assigned_by uuid NOT NULL REFERENCES app_users(id),
  note text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz,
  CHECK (unassigned_at IS NULL OR unassigned_at >= assigned_at)
);
CREATE UNIQUE INDEX coordinator_assignments_one_active
  ON coordinator_assignments (event_request_id) WHERE unassigned_at IS NULL;
CREATE INDEX coordinator_assignments_coordinator_idx ON coordinator_assignments (coordinator_id);

-- CF-08/CF-10/CF-11/Q-08: catalogue fields used for search and suitability checks.
CREATE TABLE venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  location text,
  capacity integer NOT NULL CHECK (capacity > 0),
  layouts text[] NOT NULL DEFAULT '{}',
  facilities text[] NOT NULL DEFAULT '{}',
  accessibility_features text[] NOT NULL DEFAULT '{}',
  wheelchair_accessible boolean NOT NULL DEFAULT false,
  -- Q-07 (provisional): daily operating hours in Asia/Singapore; NULL means unrestricted.
  opens_at time,
  closes_at time,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (opens_at IS NULL OR closes_at IS NULL OR closes_at > opens_at)
);
CREATE UNIQUE INDEX venues_name_unique ON venues (lower(name));
CREATE INDEX venues_search_idx ON venues (is_active, capacity);
CREATE INDEX venues_facilities_idx ON venues USING gin (facilities);
CREATE INDEX venues_accessibility_idx ON venues USING gin (accessibility_features);

-- CF-09/Q-07: maintenance and other blocked periods shown on the availability calendar.
CREATE TABLE venue_unavailability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX venue_unavailability_calendar_idx ON venue_unavailability (venue_id, starts_at, ends_at);

-- CF-12/CF-13/CF-14/Q-06 (provisional): an event may hold several bookings; only APPROVED
-- bookings consume availability. Intervals are half-open, so back-to-back bookings are allowed.
CREATE TABLE venue_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_request_id uuid NOT NULL REFERENCES event_requests(id),
  venue_id uuid NOT NULL REFERENCES venues(id),
  requested_by uuid NOT NULL REFERENCES app_users(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
  )),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  layout text,
  notes text,
  decided_by uuid REFERENCES app_users(id),
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK ((status IN ('APPROVED', 'REJECTED')) = (decided_by IS NOT NULL AND decided_at IS NOT NULL)
    OR status = 'CANCELLED')
);
CREATE INDEX venue_bookings_event_idx ON venue_bookings (event_request_id);
CREATE INDEX venue_bookings_calendar_idx ON venue_bookings (venue_id, status, starts_at, ends_at);

-- CF-14: reject an approval that overlaps another approved booking or a blocked period.
-- Locking the venue row serializes competing approvals for the same venue.
CREATE FUNCTION prevent_venue_booking_conflict() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM venues WHERE id = NEW.venue_id FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM venue_bookings b
    WHERE b.venue_id = NEW.venue_id AND b.id <> NEW.id AND b.status = 'APPROVED'
      AND b.starts_at < NEW.ends_at AND b.ends_at > NEW.starts_at
  ) THEN
    RAISE EXCEPTION 'Venue already has an approved booking in this period.'
      USING ERRCODE = 'exclusion_violation', CONSTRAINT = 'venue_bookings_no_overlap';
  END IF;
  IF EXISTS (
    SELECT 1 FROM venue_unavailability u
    WHERE u.venue_id = NEW.venue_id
      AND u.starts_at < NEW.ends_at AND u.ends_at > NEW.starts_at
  ) THEN
    RAISE EXCEPTION 'Venue is unavailable in this period.'
      USING ERRCODE = 'exclusion_violation', CONSTRAINT = 'venue_bookings_not_blocked';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER venue_bookings_conflict BEFORE INSERT OR UPDATE ON venue_bookings
  FOR EACH ROW WHEN (NEW.status = 'APPROVED')
  EXECUTE FUNCTION prevent_venue_booking_conflict();

-- CF-15/CF-16/Q-09 (provisional): equipment is pooled by type with a total quantity.
CREATE TABLE equipment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  category text,
  description text,
  total_quantity integer NOT NULL CHECK (total_quantity >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX equipment_types_name_unique ON equipment_types (lower(name));

-- CF-15/CF-17: a request becomes a reservation when Technical Support marks it RESERVED.
CREATE TABLE equipment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_request_id uuid NOT NULL REFERENCES event_requests(id),
  equipment_type_id uuid NOT NULL REFERENCES equipment_types(id),
  requested_by uuid NOT NULL REFERENCES app_users(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN (
    'REQUESTED', 'RESERVED', 'REJECTED', 'CANCELLED'
  )),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  notes text,
  decided_by uuid REFERENCES app_users(id),
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK ((status IN ('RESERVED', 'REJECTED')) = (decided_by IS NOT NULL AND decided_at IS NOT NULL)
    OR status = 'CANCELLED')
);
CREATE INDEX equipment_requests_event_idx ON equipment_requests (event_request_id);
CREATE INDEX equipment_requests_availability_idx
  ON equipment_requests (equipment_type_id, status, starts_at, ends_at);

-- CF-16/CF-17: reservations overlapping the period may not exceed the pooled quantity.
CREATE FUNCTION prevent_equipment_overbooking() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  pool_size integer;
  reserved integer;
BEGIN
  SELECT total_quantity INTO pool_size FROM equipment_types
    WHERE id = NEW.equipment_type_id FOR UPDATE;
  SELECT COALESCE(sum(r.quantity), 0) INTO reserved FROM equipment_requests r
    WHERE r.equipment_type_id = NEW.equipment_type_id AND r.id <> NEW.id
      AND r.status = 'RESERVED'
      AND r.starts_at < NEW.ends_at AND r.ends_at > NEW.starts_at;
  IF reserved + NEW.quantity > pool_size THEN
    RAISE EXCEPTION 'Not enough equipment available in this period.'
      USING ERRCODE = 'exclusion_violation', CONSTRAINT = 'equipment_requests_within_pool';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER equipment_requests_overbooking BEFORE INSERT OR UPDATE ON equipment_requests
  FOR EACH ROW WHEN (NEW.status = 'RESERVED')
  EXECUTE FUNCTION prevent_equipment_overbooking();

-- CF-18/Q-10 (provisional): one row per attendee and event; withdrawing keeps the row and
-- re-registering reuses it. Services decide which events are open for registration.
CREATE TABLE event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_request_id uuid NOT NULL REFERENCES event_requests(id),
  attendee_id uuid NOT NULL REFERENCES app_users(id),
  status text NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'WITHDRAWN')),
  registered_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  UNIQUE (event_request_id, attendee_id),
  CHECK ((status = 'WITHDRAWN') = (withdrawn_at IS NOT NULL))
);
CREATE INDEX event_registrations_attendee_idx ON event_registrations (attendee_id);

CREATE FUNCTION prevent_registration_overflow() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  capacity integer;
  registered integer;
BEGIN
  SELECT registration_capacity INTO capacity FROM event_requests
    WHERE id = NEW.event_request_id FOR UPDATE;
  IF capacity IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO registered FROM event_registrations r
    WHERE r.event_request_id = NEW.event_request_id AND r.id <> NEW.id
      AND r.status = 'REGISTERED';
  IF registered >= capacity THEN
    RAISE EXCEPTION 'Event registration is full.'
      USING ERRCODE = 'exclusion_violation', CONSTRAINT = 'event_registrations_within_capacity';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER event_registrations_capacity BEFORE INSERT OR UPDATE ON event_registrations
  FOR EACH ROW WHEN (NEW.status = 'REGISTERED')
  EXECUTE FUNCTION prevent_registration_overflow();

-- CF-19/Q-05/Q-11: proposed_changes maps event_requests field names to proposed values.
-- Services apply an approved change and any booking/reservation consequences in one transaction.
CREATE TABLE event_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_request_id uuid NOT NULL REFERENCES event_requests(id),
  requested_by uuid NOT NULL REFERENCES app_users(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'
  )),
  proposed_changes jsonb NOT NULL CHECK (
    jsonb_typeof(proposed_changes) = 'object' AND proposed_changes <> '{}'::jsonb
  ),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  decided_by uuid REFERENCES app_users(id),
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status IN ('APPROVED', 'REJECTED')) = (decided_by IS NOT NULL AND decided_at IS NOT NULL))
);
CREATE INDEX event_change_requests_event_idx ON event_change_requests (event_request_id, status);

-- CF-20/Q-13 (provisional): in-app notifications with read state; no delivery retries.
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  event_request_id uuid REFERENCES event_requests(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (length(trim(type)) > 0),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_inbox_idx ON notifications (recipient_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications (recipient_id) WHERE read_at IS NULL;

-- Foreign keys left unindexed above that list pages and joins will use.
CREATE INDEX event_clarifications_event_idx ON event_clarifications (event_request_id);
CREATE INDEX event_reviews_event_idx ON event_reviews (event_request_id);

-- Same Data API boundary as migration 002, and a fixed search_path for trigger functions.
DO $$
DECLARE
  application_schema text := current_schema();
  application_table text;
  trigger_function text;
  api_role text;
BEGIN
  FOREACH application_table IN ARRAY ARRAY[
    'event_status_history', 'coordinator_assignments', 'venues', 'venue_unavailability',
    'venue_bookings', 'equipment_types', 'equipment_requests', 'event_registrations',
    'event_change_requests', 'notifications'
  ] LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      application_schema, application_table);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC',
      application_schema, application_table);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM %I',
          application_schema, application_table, api_role);
      END IF;
    END LOOP;
  END LOOP;

  FOREACH trigger_function IN ARRAY ARRAY[
    'record_event_status_change', 'prevent_venue_booking_conflict',
    'prevent_equipment_overbooking', 'prevent_registration_overflow'
  ] LOOP
    EXECUTE format('ALTER FUNCTION %I.%I() SET search_path = %I, pg_temp',
      application_schema, trigger_function, application_schema);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I() FROM PUBLIC',
      application_schema, trigger_function);
  END LOOP;
END
$$;
