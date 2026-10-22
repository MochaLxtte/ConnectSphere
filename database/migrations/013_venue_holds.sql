-- KAN-83 / CR-4: temporary venue holds with a visible deadline and automatic release.
-- A hold is an explicit Venue Staff action on an existing PENDING venue booking request.
-- Ordinary PENDING requests still never reserve a venue. A live hold is a HELD row whose
-- deadline is still in the future; at or after the deadline it no longer occupies the venue,
-- even before expire_venue_holds() has marked it EXPIRED.
-- Additive only: existing rows, statuses, decisions and migrations 001-012 are unchanged.
-- Numbered 008, then 011, on its branch; renumbered 013 when integrated after KAN-81 (010, 011)
-- and KAN-78 (012). A live hold reserves the same buffered occupied interval as an approved
-- booking, so this migration extends KAN-78's trigger rather than replacing it.

ALTER TABLE venue_bookings DROP CONSTRAINT venue_bookings_status_check;
ALTER TABLE venue_bookings ADD CONSTRAINT venue_bookings_status_check CHECK (status IN (
  'PENDING', 'HELD', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'
));

ALTER TABLE venue_bookings
  ADD COLUMN hold_expires_at timestamptz,
  ADD COLUMN held_by uuid REFERENCES app_users(id),
  ADD COLUMN held_at timestamptz,
  ADD COLUMN expired_at timestamptz,
  ADD COLUMN cancelled_by uuid REFERENCES app_users(id),
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN cancellation_reason text,
  -- Hold details are kept after approval, expiry, rejection or cancellation as history.
  ADD CONSTRAINT venue_bookings_hold_fields_check CHECK (
    (hold_expires_at IS NULL) = (held_by IS NULL) AND (held_by IS NULL) = (held_at IS NULL)
  ),
  ADD CONSTRAINT venue_bookings_held_has_deadline_check CHECK (
    status <> 'HELD' OR hold_expires_at IS NOT NULL
  ),
  ADD CONSTRAINT venue_bookings_expired_check CHECK (
    (status = 'EXPIRED') = (expired_at IS NOT NULL) AND (status <> 'EXPIRED' OR hold_expires_at IS NOT NULL)
  ),
  ADD CONSTRAINT venue_bookings_cancellation_check CHECK (
    (cancelled_at IS NULL) = (cancelled_by IS NULL)
    AND (cancelled_at IS NULL OR length(trim(cancellation_reason)) > 0)
  );

CREATE INDEX venue_bookings_live_hold_idx ON venue_bookings (hold_expires_at) WHERE status = 'HELD';

-- KAN-78's view expanded b.* when it was created, so rebuild it to expose the hold columns.
-- Same definition as migration 012; venue_booking_warnings() reads it by name and is unchanged.
DROP VIEW venue_booking_intervals;
CREATE VIEW venue_booking_intervals AS
SELECT b.*,
  venue_occupied_start(b.starts_at, CASE WHEN b.ends_at > now() AND e.status <> 'COMPLETED'
    THEN v.setup_minutes ELSE b.reserved_setup_minutes END) AS occupied_starts_at,
  venue_occupied_end(b.ends_at, CASE WHEN b.ends_at > now() AND e.status <> 'COMPLETED'
    THEN v.turnaround_minutes ELSE b.reserved_turnaround_minutes END) AS occupied_ends_at
FROM venue_bookings b JOIN venues v ON v.id = b.venue_id
JOIN event_requests e ON e.id = b.event_request_id;

-- CF-14 + KAN-78 + KAN-83: an APPROVED booking or a live HELD row may not have its buffered
-- occupied interval outside opening hours, or overlapping another APPROVED booking, another live
-- hold or an operational block. clock_timestamp() is read after the venue lock, so a hold that
-- expired while this writer waited no longer counts. As in migration 012, an unchanged APPROVED
-- row is not re-judged, so a buffer edit never forces a historical booking to be cancelled.
CREATE OR REPLACE FUNCTION prevent_venue_booking_conflict() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v venues%ROWTYPE; occupied_start timestamptz; occupied_end timestamptz;
BEGIN
  SELECT * INTO v FROM venues WHERE id = NEW.venue_id FOR UPDATE;
  IF TG_OP = 'UPDATE' AND OLD.status = 'APPROVED'
    AND (NEW.venue_id, NEW.starts_at, NEW.ends_at) IS NOT DISTINCT FROM
        (OLD.venue_id, OLD.starts_at, OLD.ends_at) THEN
    NEW.reserved_setup_minutes := OLD.reserved_setup_minutes;
    NEW.reserved_turnaround_minutes := OLD.reserved_turnaround_minutes;
    RETURN NEW;
  END IF;
  NEW.reserved_setup_minutes := v.setup_minutes;
  NEW.reserved_turnaround_minutes := v.turnaround_minutes;
  occupied_start := venue_occupied_start(NEW.starts_at, v.setup_minutes);
  occupied_end := venue_occupied_end(NEW.ends_at, v.turnaround_minutes);
  IF NOT venue_interval_within_hours(occupied_start, occupied_end, v.opens_at, v.closes_at) THEN
    RAISE EXCEPTION 'Occupied time is outside valid venue operating hours; restricted cross-day windows are unsupported.'
      USING ERRCODE = 'exclusion_violation', CONSTRAINT = 'venue_bookings_within_hours';
  END IF;
  IF EXISTS(SELECT 1 FROM venue_booking_intervals b
    WHERE b.venue_id = NEW.venue_id AND b.id <> NEW.id
      AND (b.status = 'APPROVED' OR (b.status = 'HELD' AND b.hold_expires_at > clock_timestamp()))
      AND b.occupied_starts_at < occupied_end AND b.occupied_ends_at > occupied_start) THEN
    RAISE EXCEPTION 'Venue already has an approved booking or live hold in this occupied interval.'
      USING ERRCODE = 'exclusion_violation', CONSTRAINT = 'venue_bookings_no_overlap';
  END IF;
  IF EXISTS(SELECT 1 FROM venue_unavailability u WHERE u.venue_id = NEW.venue_id
    AND u.starts_at < occupied_end AND u.ends_at > occupied_start) THEN
    RAISE EXCEPTION 'Venue occupied interval overlaps an operational block.'
      USING ERRCODE = 'exclusion_violation', CONSTRAINT = 'venue_bookings_not_blocked';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER venue_bookings_conflict ON venue_bookings;
CREATE TRIGGER venue_bookings_conflict BEFORE INSERT OR UPDATE ON venue_bookings
  FOR EACH ROW WHEN (NEW.status IN ('APPROVED', 'HELD'))
  EXECUTE FUNCTION prevent_venue_booking_conflict();

-- KAN-83-AC6/AC8: mark every overdue hold EXPIRED once and notify the event's current
-- coordinator once, in the same statement. Restart- and replay-safe: a second run finds no
-- overdue HELD rows. A competing approval holds the row lock; this UPDATE then re-reads the
-- row and skips it if the approval committed first. It never approves anything.
CREATE FUNCTION expire_venue_holds() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  expired_count integer;
BEGIN
  WITH expired AS (
    UPDATE venue_bookings b
    SET status = 'EXPIRED', expired_at = clock_timestamp(), updated_at = clock_timestamp()
    WHERE b.status = 'HELD' AND b.hold_expires_at <= clock_timestamp()
    RETURNING b.id, b.event_request_id, b.venue_id, b.hold_expires_at
  ), notified AS (
    INSERT INTO notifications (recipient_id, event_request_id, type, title, message)
    SELECT e.coordinator_id, x.event_request_id, 'VENUE_HOLD_EXPIRED', 'Venue hold expired',
      format('The hold on %s for %s expired at %s (Singapore time). The venue period has been released; submit a new request to try again.',
        v.name, coalesce(e.name, 'your event'),
        to_char(x.hold_expires_at AT TIME ZONE 'Asia/Singapore', 'DD Mon YYYY HH24:MI'))
    FROM expired x
    JOIN event_requests e ON e.id = x.event_request_id
    JOIN venues v ON v.id = x.venue_id
    WHERE e.coordinator_id IS NOT NULL
    RETURNING 1
  )
  SELECT count(*) INTO expired_count FROM expired;
  RETURN expired_count;
END
$$;

DO $$
DECLARE
  application_schema text := current_schema();
BEGIN
  EXECUTE format('ALTER FUNCTION %I.prevent_venue_booking_conflict() SET search_path = %I, pg_temp',
    application_schema, application_schema);
  EXECUTE format('ALTER FUNCTION %I.expire_venue_holds() SET search_path = %I, pg_temp',
    application_schema, application_schema);
  EXECUTE format('REVOKE ALL ON FUNCTION %I.prevent_venue_booking_conflict() FROM PUBLIC', application_schema);
  EXECUTE format('REVOKE ALL ON FUNCTION %I.expire_venue_holds() FROM PUBLIC', application_schema);
  -- The rebuilt view keeps migration 012's Data API restriction.
  EXECUTE format('REVOKE ALL ON %I.venue_booking_intervals FROM PUBLIC', application_schema);
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE format('REVOKE ALL ON %I.venue_booking_intervals FROM anon', application_schema);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE format('REVOKE ALL ON %I.venue_booking_intervals FROM authenticated', application_schema);
  END IF;

  -- KAN-83-AC8 production schedule: where pg_cron is enabled (Supabase: Database -> Extensions),
  -- run expiry every minute using the database clock. Environments without pg_cron (local tests,
  -- CI) skip this; the API also runs the same function periodically (see database/README.md).
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    EXECUTE format(
      'SELECT cron.schedule(%L, %L, %L)',
      'connectsphere-expire-venue-holds', '* * * * *',
      format('SELECT %I.expire_venue_holds()', application_schema));
  ELSE
    RAISE NOTICE 'pg_cron is not enabled; venue hold expiry relies on the API scheduler.';
  END IF;
END
$$;
