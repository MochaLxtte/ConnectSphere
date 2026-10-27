-- KAN-26: keep the request row as the reservation; stock is derived from RESERVED rows.
-- Existing decisions and legacy cancellations remain untouched. NULL release metadata means
-- the old action was not recorded, never an invented actor or timestamp.
ALTER TABLE equipment_requests
  ADD COLUMN released_at timestamptz,
  ADD COLUMN released_by uuid REFERENCES app_users(id),
  ADD COLUMN release_reason text,
  ADD COLUMN release_cause text,
  ADD CONSTRAINT equipment_release_metadata CHECK (
    (released_at IS NULL AND released_by IS NULL AND release_reason IS NULL AND release_cause IS NULL)
    OR (status = 'CANCELLED' AND released_at IS NOT NULL
      AND release_reason IS NOT NULL AND length(trim(release_reason)) > 0
      AND release_cause IS NOT NULL
      AND release_cause IN ('MANUAL_CANCELLATION', 'EVENT_CANCELLED', 'EVENT_COMPLETED')
      AND (release_cause <> 'MANUAL_CANCELLATION' OR released_by IS NOT NULL))
  );

ALTER TABLE notifications ADD COLUMN equipment_request_id uuid REFERENCES equipment_requests(id);
CREATE INDEX notifications_equipment_request_idx ON notifications(equipment_request_id)
  WHERE equipment_request_id IS NOT NULL;

CREATE FUNCTION protect_equipment_reservation_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'RESERVED' AND NEW.status = 'CANCELLED' AND
    (NEW.released_at IS NULL OR NEW.release_cause IS NULL OR NEW.release_reason IS NULL) THEN
    RAISE EXCEPTION 'Record the equipment release time, cause and reason.'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'equipment_release_required';
  END IF;
  IF (NEW.event_request_id, NEW.equipment_type_id, NEW.quantity, NEW.starts_at, NEW.ends_at,
      NEW.decided_by, NEW.decided_at, NEW.decision_reason)
    IS DISTINCT FROM (OLD.event_request_id, OLD.equipment_type_id, OLD.quantity, OLD.starts_at, OLD.ends_at,
      OLD.decided_by, OLD.decided_at, OLD.decision_reason) THEN
    RAISE EXCEPTION 'Preserve the original equipment reservation decision and allocation.'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'equipment_reserved_allocation_immutable';
  END IF;
  IF (OLD.status = 'RESERVED' AND NEW.status NOT IN ('RESERVED', 'CANCELLED'))
    OR (OLD.status = 'CANCELLED' AND NEW.status <> 'CANCELLED') THEN
    RAISE EXCEPTION 'A released reservation cannot be reused.'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'equipment_reservation_state_transition';
  END IF;
  IF OLD.release_cause IS NOT NULL AND
    (NEW.released_at, NEW.released_by, NEW.release_reason, NEW.release_cause)
    IS DISTINCT FROM (OLD.released_at, OLD.released_by, OLD.release_reason, OLD.release_cause) THEN
    RAISE EXCEPTION 'Preserve the original equipment release record.'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'equipment_release_immutable';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER equipment_requests_preserve_reservation BEFORE UPDATE ON equipment_requests
  FOR EACH ROW WHEN (OLD.status IN ('RESERVED', 'CANCELLED'))
  EXECUTE FUNCTION protect_equipment_reservation_history();

-- All writers coordinate event -> equipment pools (UUID order) -> request rows (UUID order).
-- The pool row serializes stock edits and competing reservations. The subsequent SELECT sees
-- newly committed reservations after a lock wait under READ COMMITTED.
CREATE OR REPLACE FUNCTION prevent_equipment_overbooking() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  pool_size bigint;
  reserved_peak bigint;
  event_state text;
  event_start timestamptz;
  event_end timestamptz;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'RESERVED' THEN
    IF (NEW.event_request_id, NEW.equipment_type_id, NEW.quantity, NEW.starts_at, NEW.ends_at)
      IS DISTINCT FROM (OLD.event_request_id, OLD.equipment_type_id, OLD.quantity, OLD.starts_at, OLD.ends_at) THEN
      RAISE EXCEPTION 'Cancel and replace a reservation to change its allocation.'
        USING ERRCODE = 'check_violation', CONSTRAINT = 'equipment_reserved_allocation_immutable';
    END IF;
    -- Operational losses retain existing reservations; harmless metadata updates do not create stock.
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status <> 'REQUESTED' THEN
    RAISE EXCEPTION 'Only a requested line can become reserved.'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'equipment_reservation_requested_only';
  END IF;
  SELECT status, starts_at, ends_at INTO event_state, event_start, event_end
    FROM event_requests WHERE id = NEW.event_request_id FOR UPDATE;
  IF event_state IS DISTINCT FROM 'APPROVED' THEN
    RAISE EXCEPTION 'Only an approved event may receive a new equipment reservation.'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'equipment_reservation_event_approved';
  END IF;
  IF NEW.starts_at IS DISTINCT FROM event_start OR NEW.ends_at IS DISTINCT FROM event_end THEN
    RAISE EXCEPTION 'Equipment reservation dates must match the current event.'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'equipment_reservation_event_period';
  END IF;
  SELECT CASE WHEN is_active THEN total_quantity::bigint - damaged_quantity - maintenance_quantity ELSE 0 END
    INTO pool_size FROM equipment_types WHERE id = NEW.equipment_type_id FOR UPDATE;
  WITH overlapping AS (
    SELECT starts_at, ends_at, quantity FROM equipment_requests r
    WHERE r.equipment_type_id = NEW.equipment_type_id AND r.id <> NEW.id
      AND r.status = 'RESERVED' AND r.starts_at < NEW.ends_at AND r.ends_at > NEW.starts_at
  ), instants AS (
    SELECT NEW.starts_at AS at
    UNION SELECT starts_at FROM overlapping WHERE starts_at > NEW.starts_at
  )
  SELECT COALESCE(max(load), 0) INTO reserved_peak FROM (
    SELECT (SELECT COALESCE(sum(o.quantity::bigint), 0) FROM overlapping o
      WHERE o.starts_at <= i.at AND o.ends_at > i.at) AS load FROM instants i
  ) loads;
  IF reserved_peak + NEW.quantity::bigint > pool_size THEN
    RAISE EXCEPTION 'Not enough operational equipment is available in this period.'
      USING ERRCODE = 'exclusion_violation', CONSTRAINT = 'equipment_requests_within_pool';
  END IF;
  RETURN NEW;
END
$$;

-- A real terminal event transition releases only live reservations, once. Keeping original
-- decision fields and allocation details gives a record of what was reserved and why it ended.
CREATE FUNCTION release_terminal_event_equipment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  released_time timestamptz;
  release_actor uuid;
BEGIN
  PERFORM t.id FROM equipment_types t WHERE EXISTS (
    SELECT 1 FROM equipment_requests r WHERE r.event_request_id = NEW.id
      AND r.status = 'RESERVED' AND r.equipment_type_id = t.id
  ) ORDER BY t.id FOR UPDATE;
  PERFORM id FROM equipment_requests WHERE event_request_id = NEW.id AND status = 'RESERVED'
    ORDER BY id FOR UPDATE;
  released_time := clock_timestamp();
  release_actor := NULLIF(current_setting('app.actor_id', true), '')::uuid;
  UPDATE equipment_requests SET status = 'CANCELLED', released_at = released_time,
    released_by = release_actor,
    release_cause = CASE WHEN NEW.status = 'COMPLETED' THEN 'EVENT_COMPLETED' ELSE 'EVENT_CANCELLED' END,
    release_reason = CASE WHEN NEW.status = 'COMPLETED' THEN 'Event completed.' ELSE 'Event cancelled.' END,
    updated_at = released_time
    WHERE event_request_id = NEW.id AND status = 'RESERVED';
  RETURN NULL;
END
$$;

CREATE TRIGGER event_requests_release_equipment AFTER UPDATE OF status ON event_requests
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('CANCELLED', 'COMPLETED'))
  EXECUTE FUNCTION release_terminal_event_equipment();

DO $$
DECLARE
  application_schema text := current_schema();
  function_name text;
BEGIN
  FOREACH function_name IN ARRAY ARRAY['prevent_equipment_overbooking', 'release_terminal_event_equipment',
    'protect_equipment_reservation_history'] LOOP
    EXECUTE format('ALTER FUNCTION %I.%I() SET search_path = %I, pg_temp',
      application_schema, function_name, application_schema);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I() FROM PUBLIC', application_schema, function_name);
  END LOOP;
END
$$;
