-- KAN-18 / CF-16: Technical Support Staff maintain pooled equipment stock and its operational losses.
-- Additive only: existing equipment types and reservations are untouched, and every type starts at
-- revision 0 with no recorded change.
--
-- stock_revision is the version a stock form must quote (KAN-18-AC103). It rises by one on every
-- accepted change, so a stale form cannot overwrite newer totals, even after the quantities return
-- to earlier values.
ALTER TABLE equipment_types
  ADD COLUMN stock_revision integer NOT NULL DEFAULT 0 CHECK (stock_revision >= 0);

-- One row per accepted change, retaining actor, time and reason (KAN-18-AC101).
CREATE TABLE equipment_stock_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type_id uuid NOT NULL REFERENCES equipment_types(id),
  revision integer NOT NULL CHECK (revision >= 1),
  changed_by uuid NOT NULL REFERENCES app_users(id),
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text NOT NULL CHECK (length(trim(reason)) > 0 AND length(reason) <= 500),
  previous_total_quantity integer NOT NULL CHECK (previous_total_quantity >= 0),
  previous_damaged_quantity integer NOT NULL CHECK (previous_damaged_quantity >= 0),
  previous_maintenance_quantity integer NOT NULL CHECK (previous_maintenance_quantity >= 0),
  new_total_quantity integer NOT NULL CHECK (new_total_quantity >= 0),
  new_damaged_quantity integer NOT NULL CHECK (new_damaged_quantity >= 0),
  new_maintenance_quantity integer NOT NULL CHECK (new_maintenance_quantity >= 0),
  CONSTRAINT equipment_stock_changes_new_within_total
    CHECK (new_damaged_quantity::bigint + new_maintenance_quantity::bigint <= new_total_quantity::bigint),
  UNIQUE (equipment_type_id, revision)
);
CREATE INDEX equipment_stock_changes_type_idx ON equipment_stock_changes (equipment_type_id, revision DESC);

-- A recorded change is history: it can be added to but never edited or removed.
CREATE FUNCTION equipment_stock_changes_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Equipment stock history cannot be changed.'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'equipment_stock_changes_append_only';
END
$$;
CREATE TRIGGER equipment_stock_changes_append_only BEFORE UPDATE OR DELETE ON equipment_stock_changes
  FOR EACH ROW EXECUTE FUNCTION equipment_stock_changes_append_only();

-- Stock history is internal workflow data; expose it only through the authenticated application
-- API, not the Supabase Data API roles.
DO $$
DECLARE
  application_schema text := current_schema();
  api_role text;
BEGIN
  EXECUTE format('ALTER TABLE %I.equipment_stock_changes ENABLE ROW LEVEL SECURITY', application_schema);
  EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.equipment_stock_changes FROM PUBLIC', application_schema);
  EXECUTE format('REVOKE ALL ON FUNCTION %I.equipment_stock_changes_append_only() FROM PUBLIC', application_schema);
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.equipment_stock_changes FROM %I', application_schema, api_role);
      EXECUTE format('REVOKE ALL ON FUNCTION %I.equipment_stock_changes_append_only() FROM %I', application_schema, api_role);
    END IF;
  END LOOP;
END
$$;
