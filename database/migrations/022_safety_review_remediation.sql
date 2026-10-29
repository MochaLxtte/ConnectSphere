-- KAN-84 / PR #78 follow-up: upgrade the already-applied 021 without deleting review history.
-- Existing approval fingerprints remain unchanged and may become stale under the stronger rules.
-- No role, review, preparation or notification record is removed or rewritten.

CREATE OR REPLACE FUNCTION safety_arrangement_fingerprint(target uuid) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT md5(jsonb_build_object(
    'event', (SELECT jsonb_build_object('startsAt', e.starts_at, 'endsAt', e.ends_at,
        'attendance', e.expected_attendance, 'venueRequirements', e.venue_requirements,
        'accessibilityNeeds', e.accessibility_needs, 'equipmentRequirements', e.equipment_requirements,
        'equipmentPlan', e.equipment_plan_status)
      FROM event_requests e WHERE e.id = target),
    'venues', (SELECT coalesce(jsonb_agg(jsonb_build_object('booking', b.id, 'venue', b.venue_id,
        'status', b.status, 'startsAt', b.starts_at, 'endsAt', b.ends_at, 'layout', b.layout,
        'capacity', v.capacity, 'layouts', v.layouts, 'accessibility', v.accessibility_features,
        'wheelchair', v.wheelchair_accessible, 'active', v.is_active,
        -- Operating hours and buffers decide whether the booking is still usable (PR #78 review).
        'opensAt', v.opens_at, 'closesAt', v.closes_at,
        'setupMinutes', v.setup_minutes, 'turnaroundMinutes', v.turnaround_minutes,
        'recovery', EXISTS (SELECT 1 FROM venue_outage_impacts i
          WHERE i.venue_booking_id = b.id AND i.status = 'RECOVERY_REQUIRED')) ORDER BY b.id), '[]'::jsonb)
      FROM venue_bookings b JOIN venues v ON v.id = b.venue_id
      WHERE b.event_request_id = target AND b.status IN ('PENDING', 'HELD', 'APPROVED')),
    'equipment', (SELECT coalesce(jsonb_agg(jsonb_build_object('line', r.id, 'type', r.equipment_type_id,
        'quantity', r.quantity, 'status', r.status, 'startsAt', r.starts_at, 'endsAt', r.ends_at,
        'operational', CASE WHEN t.is_active
          THEN t.total_quantity - t.damaged_quantity - t.maintenance_quantity ELSE 0 END) ORDER BY r.id), '[]'::jsonb)
      FROM equipment_requests r JOIN equipment_types t ON t.id = r.equipment_type_id
      WHERE r.event_request_id = target AND r.status <> 'CANCELLED')
  )::text)
$$;

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
  -- KAN-84 Option A: a confirmed event may reserve again only while its latest safety round
  -- requested TECHNICAL changes; everything else keeps the KAN-26 rule from migration 015.
  IF event_state IS DISTINCT FROM 'APPROVED' AND NOT (event_state = 'CONFIRMED' AND EXISTS (
    SELECT 1 FROM safety_reviews s WHERE s.event_request_id = NEW.event_request_id
      AND s.status = 'CHANGES_REQUESTED' AND 'TECHNICAL' = ANY(s.requested_areas)
      AND s.round = (SELECT max(x.round) FROM safety_reviews x WHERE x.event_request_id = NEW.event_request_id))) THEN
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

-- KAN-84-AC7: compare only the planning area the officer asked to change. Safety notes,
-- ordinary names/descriptions and the other planning area cannot satisfy remediation.
CREATE FUNCTION safety_planning_area_fingerprint(target uuid, area text) RETURNS text
LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF area = 'VENUE' THEN
    RETURN (SELECT md5(jsonb_build_object(
      'event', (SELECT jsonb_build_object('startsAt', e.starts_at, 'endsAt', e.ends_at,
          'attendance', e.expected_attendance, 'venueRequirements', e.venue_requirements,
          'accessibilityNeeds', e.accessibility_needs)
        FROM event_requests e WHERE e.id = target),
      'venues', (SELECT coalesce(jsonb_agg(jsonb_build_object('booking', b.id, 'venue', b.venue_id,
          'status', b.status, 'startsAt', b.starts_at, 'endsAt', b.ends_at, 'layout', b.layout,
          'capacity', v.capacity, 'layouts', v.layouts, 'facilities', v.facilities,
          'accessibility', v.accessibility_features, 'wheelchair', v.wheelchair_accessible,
          'active', v.is_active, 'opensAt', v.opens_at, 'closesAt', v.closes_at,
          'setupMinutes', v.setup_minutes, 'turnaroundMinutes', v.turnaround_minutes,
          'recovery', EXISTS (SELECT 1 FROM venue_outage_impacts i
            WHERE i.venue_booking_id = b.id AND i.status = 'RECOVERY_REQUIRED')) ORDER BY b.id), '[]'::jsonb)
        FROM venue_bookings b JOIN venues v ON v.id = b.venue_id
        WHERE b.event_request_id = target AND b.status IN ('PENDING', 'HELD', 'APPROVED'))
    )::text));
  ELSIF area = 'TECHNICAL' THEN
    RETURN (SELECT md5(jsonb_build_object(
      'event', (SELECT jsonb_build_object('startsAt', e.starts_at, 'endsAt', e.ends_at,
          'equipmentRequirements', e.equipment_requirements, 'equipmentPlan', e.equipment_plan_status)
        FROM event_requests e WHERE e.id = target),
      'equipment', (SELECT coalesce(jsonb_agg(jsonb_build_object('line', r.id, 'type', r.equipment_type_id,
          'quantity', r.quantity, 'status', r.status, 'startsAt', r.starts_at, 'endsAt', r.ends_at,
          'operational', CASE WHEN t.is_active
            THEN t.total_quantity - t.damaged_quantity - t.maintenance_quantity ELSE 0 END) ORDER BY r.id), '[]'::jsonb)
        FROM equipment_requests r JOIN equipment_types t ON t.id = r.equipment_type_id
        WHERE r.event_request_id = target AND r.status <> 'CANCELLED')
    )::text));
  END IF;
  RAISE EXCEPTION 'Unknown safety planning area: %', area USING ERRCODE = 'invalid_parameter_value';
END
$$;

-- Keep the decision-time baseline separate from immutable review history. Every requested
-- area must change against this snapshot before the application permits a new review round.
CREATE TABLE safety_review_change_baselines (
  review_id uuid PRIMARY KEY REFERENCES safety_reviews(id),
  venue_fingerprint text NOT NULL CHECK (venue_fingerprint ~ '^[0-9a-f]{32}$'),
  technical_fingerprint text NOT NULL CHECK (technical_fingerprint ~ '^[0-9a-f]{32}$'),
  captured_at timestamptz NOT NULL DEFAULT now()
);

-- Historical decisions have no area-specific snapshot. Use current arrangements conservatively;
-- this does not assert earlier requested work was performed or rewrite the decided round.
INSERT INTO safety_review_change_baselines (review_id, venue_fingerprint, technical_fingerprint)
SELECT id, safety_planning_area_fingerprint(event_request_id, 'VENUE'),
  safety_planning_area_fingerprint(event_request_id, 'TECHNICAL')
FROM safety_reviews WHERE status = 'CHANGES_REQUESTED';

CREATE FUNCTION protect_safety_change_baseline() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'A safety remediation baseline cannot be changed or deleted.'
    USING ERRCODE = 'check_violation';
END
$$;
CREATE TRIGGER protect_safety_change_baseline BEFORE UPDATE OR DELETE ON safety_review_change_baselines
  FOR EACH ROW EXECUTE FUNCTION protect_safety_change_baseline();

DO $$
DECLARE
  application_schema text := current_schema();
  function_signature text;
  api_role text;
BEGIN
  EXECUTE format('ALTER TABLE %I.safety_review_change_baselines ENABLE ROW LEVEL SECURITY', application_schema);
  EXECUTE format('REVOKE ALL ON TABLE %I.safety_review_change_baselines FROM PUBLIC', application_schema);
  FOREACH function_signature IN ARRAY ARRAY['prevent_equipment_overbooking()', 'protect_decided_safety_review()',
    'safety_arrangement_fingerprint(uuid)', 'safety_planning_area_fingerprint(uuid,text)', 'protect_safety_change_baseline()'] LOOP
    EXECUTE format('ALTER FUNCTION %I.%s SET search_path = %I, pg_temp', application_schema,
      function_signature, application_schema);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%s FROM PUBLIC', application_schema, function_signature);
  END LOOP;
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE %I.safety_review_change_baselines FROM %I', application_schema, api_role);
      FOREACH function_signature IN ARRAY ARRAY['prevent_equipment_overbooking()', 'protect_decided_safety_review()',
        'safety_arrangement_fingerprint(uuid)', 'safety_planning_area_fingerprint(uuid,text)', 'protect_safety_change_baseline()'] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%s FROM %I', application_schema, function_signature, api_role);
      END LOOP;
    END IF;
  END LOOP;
END
$$;
