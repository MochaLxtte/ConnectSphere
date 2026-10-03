-- CF-16/CF-17: migration 005 summed every RESERVED request overlapping the period, which
-- refused reservations that never coincide with each other. Compare the pooled quantity
-- with the peak simultaneous load instead, matching the availability API.
CREATE OR REPLACE FUNCTION prevent_equipment_overbooking() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  pool_size integer;
  reserved_peak integer;
BEGIN
  SELECT total_quantity INTO pool_size FROM equipment_types
    WHERE id = NEW.equipment_type_id FOR UPDATE;
  -- The load only rises where a reservation starts, so checking those instants is enough.
  WITH overlapping AS (
    SELECT r.starts_at, r.ends_at, r.quantity FROM equipment_requests r
    WHERE r.equipment_type_id = NEW.equipment_type_id AND r.id <> NEW.id
      AND r.status = 'RESERVED'
      AND r.starts_at < NEW.ends_at AND r.ends_at > NEW.starts_at
  ), instants AS (
    SELECT NEW.starts_at AS at
    UNION
    SELECT starts_at FROM overlapping WHERE starts_at > NEW.starts_at
  )
  SELECT COALESCE(max(load), 0) INTO reserved_peak FROM (
    SELECT (SELECT COALESCE(sum(o.quantity), 0) FROM overlapping o
            WHERE o.starts_at <= i.at AND o.ends_at > i.at) AS load
    FROM instants i
  ) loads;
  IF reserved_peak + NEW.quantity > pool_size THEN
    RAISE EXCEPTION 'Not enough equipment available in this period.'
      USING ERRCODE = 'exclusion_violation', CONSTRAINT = 'equipment_requests_within_pool';
  END IF;
  RETURN NEW;
END
$$;

-- Replacing a function discards its configuration, so pin the search_path again.
DO $$
BEGIN
  EXECUTE format('ALTER FUNCTION %I.prevent_equipment_overbooking() SET search_path = %I, pg_temp',
    current_schema(), current_schema());
END
$$;
