-- KAN-78 foundation shared with KAN-77's separately delivered buffer editor.
ALTER TABLE venues
  ADD COLUMN setup_minutes integer NOT NULL DEFAULT 0 CHECK (setup_minutes BETWEEN 0 AND 1440),
  ADD COLUMN turnaround_minutes integer NOT NULL DEFAULT 0 CHECK (turnaround_minutes BETWEEN 0 AND 1440);

-- Freeze the buffers used for each reservation's history. Live, non-ended bookings use
-- current venue durations; an ended/completed booking retains these approval snapshots.
ALTER TABLE venue_bookings
  ADD COLUMN reserved_setup_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN reserved_turnaround_minutes integer NOT NULL DEFAULT 0;

CREATE FUNCTION venue_occupied_start(event_start timestamptz, setup integer)
RETURNS timestamptz LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT event_start - make_interval(mins => setup)
$$;
CREATE FUNCTION venue_occupied_end(event_end timestamptz, turnaround integer)
RETURNS timestamptz LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT event_end + make_interval(mins => turnaround)
$$;

-- Null bounds mean midnight/day-end. Restricted daily hours cannot host a
-- continuous cross-day occupied interval; an exclusive midnight end is allowed.
CREATE FUNCTION venue_interval_within_hours(s timestamptz, e timestamptz, opens time, closes time)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT s IS NOT NULL AND e IS NOT NULL AND e > s
    AND COALESCE(closes, time '24:00') > COALESCE(opens, time '00:00')
    AND (COALESCE(opens, time '00:00') = time '00:00'
         AND COALESCE(closes, time '24:00') = time '24:00'
      OR (s AT TIME ZONE 'Asia/Singapore')::date =
         ((e - interval '1 microsecond') AT TIME ZONE 'Asia/Singapore')::date
        AND (s AT TIME ZONE 'Asia/Singapore') >=
          (s AT TIME ZONE 'Asia/Singapore')::date + COALESCE(opens, time '00:00')
        AND (e AT TIME ZONE 'Asia/Singapore') <=
          (s AT TIME ZONE 'Asia/Singapore')::date + COALESCE(closes, time '24:00'))
$$;

CREATE VIEW venue_booking_intervals AS
SELECT b.*,
  venue_occupied_start(b.starts_at, CASE WHEN b.ends_at > now() AND e.status <> 'COMPLETED'
    THEN v.setup_minutes ELSE b.reserved_setup_minutes END) AS occupied_starts_at,
  venue_occupied_end(b.ends_at, CASE WHEN b.ends_at > now() AND e.status <> 'COMPLETED'
    THEN v.turnaround_minutes ELSE b.reserved_turnaround_minutes END) AS occupied_ends_at
FROM venue_bookings b JOIN venues v ON v.id = b.venue_id
JOIN event_requests e ON e.id = b.event_request_id;

-- Computed on every authorised read: a buffer edit immediately re-evaluates both
-- sides of each overlap, without changing or cancelling any booking record.
CREATE FUNCTION venue_booking_warnings(booking_id uuid) RETURNS text[] LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN b.ends_at <= now() OR e.status = 'COMPLETED'
      OR b.status NOT IN ('APPROVED', 'PENDING') THEN ARRAY[]::text[] ELSE
    array_remove(ARRAY[
      CASE WHEN EXISTS(SELECT 1 FROM venue_booking_intervals other
        WHERE other.venue_id = b.venue_id AND other.id <> b.id AND other.status = 'APPROVED'
          AND other.occupied_starts_at < b.occupied_ends_at
          AND other.occupied_ends_at > b.occupied_starts_at) THEN 'APPROVED_BOOKING_OVERLAP' END,
      CASE WHEN EXISTS(SELECT 1 FROM venue_unavailability u WHERE u.venue_id = b.venue_id
        AND u.starts_at < b.occupied_ends_at AND u.ends_at > b.occupied_starts_at)
        THEN 'OPERATIONAL_BLOCK_OVERLAP' END,
      CASE WHEN NOT venue_interval_within_hours(b.occupied_starts_at, b.occupied_ends_at,
        v.opens_at, v.closes_at) THEN 'OUTSIDE_OPERATING_HOURS' END
    ], NULL) END
  FROM venue_booking_intervals b JOIN venues v ON v.id = b.venue_id
  JOIN event_requests e ON e.id = b.event_request_id WHERE b.id = booking_id
$$;

CREATE OR REPLACE FUNCTION prevent_venue_booking_conflict() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v venues%ROWTYPE; occupied_start timestamptz; occupied_end timestamptz;
BEGIN
  SELECT * INTO v FROM venues WHERE id = NEW.venue_id FOR UPDATE;
  -- Do not re-judge unchanged historical reservations or force their cancellation
  -- merely because a buffer edit has exposed a conflict.
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
    WHERE b.venue_id = NEW.venue_id AND b.id <> NEW.id AND b.status = 'APPROVED'
      AND b.occupied_starts_at < occupied_end AND b.occupied_ends_at > occupied_start) THEN
    RAISE EXCEPTION 'Venue occupied intervals overlap.'
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

-- Match the application lock protocol even for other block writers.
CREATE FUNCTION prevent_blocking_occupied_booking() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM venues WHERE id = NEW.venue_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM venue_booking_intervals b WHERE b.venue_id = NEW.venue_id
    AND b.status = 'APPROVED' AND b.occupied_starts_at < NEW.ends_at
    AND b.occupied_ends_at > NEW.starts_at) THEN
    RAISE EXCEPTION 'Operational block overlaps an approved occupied interval.'
      USING ERRCODE = 'exclusion_violation', CONSTRAINT = 'venue_blocks_not_booked';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER venue_blocks_conflict BEFORE INSERT OR UPDATE ON venue_unavailability
FOR EACH ROW EXECUTE FUNCTION prevent_blocking_occupied_booking();

-- These are internal SQL helpers/views, not a Supabase Data API surface.
REVOKE ALL ON venue_booking_intervals FROM PUBLIC;
REVOKE ALL ON FUNCTION venue_booking_warnings(uuid) FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON venue_booking_intervals FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON FUNCTION venue_booking_warnings(uuid) FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
