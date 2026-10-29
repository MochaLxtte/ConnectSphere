-- KAN-84 / CR-6: trusted Safety Officer role, revision-bound safety review rounds and an
-- explicit preparation gate. Safety is separate from KAN-36 initial approval and KAN-52
-- advisory suitability. Provision SAFETY_OFFICER only through trusted database setup;
-- no signup or profile endpoint may grant it.
ALTER TABLE app_users DROP CONSTRAINT app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN (
  'EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD',
  'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE', 'SAFETY_OFFICER'
));

-- One row per review round. A round records the arrangement fingerprint it was submitted
-- against, so an approval applies only while the live arrangements still match (KAN-84-AC9).
CREATE TABLE safety_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_request_id uuid NOT NULL REFERENCES event_requests(id),
  round integer NOT NULL CHECK (round > 0),
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
  arrangement_fingerprint text NOT NULL CHECK (length(arrangement_fingerprint) = 32),
  -- KAN-84-AC3: reviewable safety notes; NULL is shown as missing, never as checked.
  emergency_access text CHECK (emergency_access IS NULL OR length(trim(emergency_access)) BETWEEN 1 AND 2000),
  equipment_placement text CHECK (equipment_placement IS NULL OR length(trim(equipment_placement)) BETWEEN 1 AND 2000),
  crowd_movement text CHECK (crowd_movement IS NULL OR length(trim(crowd_movement)) BETWEEN 1 AND 2000),
  submitted_by uuid NOT NULL REFERENCES app_users(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES app_users(id),
  decided_at timestamptz,
  decision_notes text CHECK (decision_notes IS NULL OR length(trim(decision_notes)) BETWEEN 1 AND 2000),
  requested_areas text[] CHECK (requested_areas IS NULL OR (
    cardinality(requested_areas) > 0 AND requested_areas <@ ARRAY['VENUE', 'TECHNICAL']::text[])),
  UNIQUE (event_request_id, round),
  CHECK ((status = 'PENDING') = (decided_at IS NULL) AND (decided_at IS NULL) = (decided_by IS NULL)),
  -- KAN-84-AC4: Reject and Request Changes need an explanation.
  CHECK (status IN ('PENDING', 'APPROVED') OR decision_notes IS NOT NULL),
  -- KAN-84-AC6: Request Changes names the planning areas; other outcomes do not.
  CHECK ((status = 'CHANGES_REQUESTED') = (requested_areas IS NOT NULL))
);
-- KAN-84-AC10: one open round per event.
CREATE UNIQUE INDEX safety_reviews_one_pending ON safety_reviews (event_request_id) WHERE status = 'PENDING';

-- KAN-84-AC7/AC10: a decided round is history; nothing may rewrite or delete it.
CREATE FUNCTION protect_decided_safety_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'PENDING' THEN
    RAISE EXCEPTION 'A decided safety review round cannot be changed.' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW.event_request_id <> OLD.event_request_id OR NEW.round <> OLD.round
     OR NEW.arrangement_fingerprint <> OLD.arrangement_fingerprint OR NEW.submitted_by <> OLD.submitted_by
     OR NEW.submitted_at <> OLD.submitted_at
     OR NEW.emergency_access IS DISTINCT FROM OLD.emergency_access
     OR NEW.equipment_placement IS DISTINCT FROM OLD.equipment_placement
     OR NEW.crowd_movement IS DISTINCT FROM OLD.crowd_movement THEN
    RAISE EXCEPTION 'Only the decision of a safety review round can be recorded.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_decided_safety_review BEFORE UPDATE OR DELETE ON safety_reviews
  FOR EACH ROW EXECUTE FUNCTION protect_decided_safety_review();

-- KAN-84-AC8: preparation is an explicit action tied to the approved round it relied on.
ALTER TABLE event_requests
  ADD COLUMN preparation_started_at timestamptz,
  ADD COLUMN preparation_started_by uuid REFERENCES app_users(id),
  ADD COLUMN preparation_safety_review_id uuid REFERENCES safety_reviews(id),
  ADD CONSTRAINT event_requests_preparation_check CHECK (
    (preparation_started_at IS NULL) = (preparation_started_by IS NULL)
    AND (preparation_started_at IS NULL) = (preparation_safety_review_id IS NULL));

-- KAN-84-AC11: safety notices identify their round; Safety Officers see only those.
ALTER TABLE notifications ADD COLUMN safety_review_id uuid REFERENCES safety_reviews(id);

-- KAN-84-AC9: a stable digest of everything a safety approval depends on. Name, description,
-- purpose and the event revision are excluded, so ordinary edits do not invalidate approval.
CREATE FUNCTION safety_arrangement_fingerprint(target uuid) RETURNS text LANGUAGE sql STABLE AS $$
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

-- Safety review notes are internal workflow data; expose them only through the application API.
DO $$
DECLARE
  application_schema text := current_schema();
  api_role text;
BEGIN
  EXECUTE format('ALTER TABLE %I.safety_reviews ENABLE ROW LEVEL SECURITY', application_schema);
  EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.safety_reviews FROM PUBLIC', application_schema);
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.safety_reviews FROM %I', application_schema, api_role);
    END IF;
  END LOOP;
END
$$;
