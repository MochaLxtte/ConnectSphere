-- KAN-84-AC8/AC9/AC10: a changed approved arrangement requires a new review,
-- even when values are restored before anybody reads it. Decided rounds stay immutable.
CREATE TABLE safety_approval_invalidations (
  review_id uuid PRIMARY KEY REFERENCES safety_reviews(id),
  invalidated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  source text NOT NULL
);

-- Extend version checking without changing the historical fingerprint format or decisions.
-- These two safety-relevant details were absent from the original fingerprint.
CREATE FUNCTION safety_context_fingerprint(target uuid) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT md5(jsonb_build_object(
    'facilities', (SELECT coalesce(jsonb_agg(jsonb_build_object('booking', b.id, 'facilities', v.facilities)
      ORDER BY b.id), '[]'::jsonb) FROM venue_bookings b JOIN venues v ON v.id = b.venue_id
      WHERE b.event_request_id = target AND b.status IN ('PENDING', 'HELD', 'APPROVED')),
    'technicalRequirements', (SELECT coalesce(jsonb_agg(jsonb_build_object('line', r.id,
      'requirements', r.technical_requirements) ORDER BY r.id), '[]'::jsonb)
      FROM equipment_requests r WHERE r.event_request_id = target AND r.status <> 'CANCELLED')
  )::text)
$$;
CREATE TABLE safety_review_context_baselines (
  review_id uuid PRIMARY KEY REFERENCES safety_reviews(id),
  context_fingerprint text NOT NULL CHECK (context_fingerprint ~ '^[0-9a-f]{32}$'),
  captured_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- Existing snapshots cannot reconstruct earlier changes that were already restored.
-- Supplemental context starts at upgrade; mismatches in the retained original fingerprint
-- are latched below. No historical decision, preparation or notification is rewritten.
INSERT INTO safety_review_context_baselines(review_id, context_fingerprint)
SELECT id, safety_context_fingerprint(event_request_id) FROM safety_reviews;
CREATE FUNCTION capture_safety_review_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO safety_review_context_baselines(review_id, context_fingerprint)
  VALUES (NEW.id, safety_context_fingerprint(NEW.event_request_id));
  RETURN NEW;
END
$$;
CREATE TRIGGER capture_safety_review_context AFTER INSERT ON safety_reviews
  FOR EACH ROW EXECUTE FUNCTION capture_safety_review_context();

CREATE FUNCTION protect_safety_invalidation_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Safety invalidation evidence cannot be changed or deleted.' USING ERRCODE = 'check_violation';
END
$$;
CREATE TRIGGER protect_safety_invalidation_evidence BEFORE UPDATE OR DELETE ON safety_approval_invalidations
  FOR EACH ROW EXECUTE FUNCTION protect_safety_invalidation_evidence();
CREATE TRIGGER protect_safety_context_baseline BEFORE UPDATE OR DELETE ON safety_review_context_baselines
  FOR EACH ROW EXECUTE FUNCTION protect_safety_invalidation_evidence();

CREATE FUNCTION invalidate_safety_approval(target uuid, cause text, force_invalidation boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Do not lock/update event rows from a shared venue/stock update: that reverses the
  -- application arrangement-lock order. Existing source locks serialize review decisions.
  INSERT INTO safety_approval_invalidations(review_id, source)
  SELECT s.id, cause FROM safety_reviews s
  LEFT JOIN safety_review_context_baselines c ON c.review_id = s.id
  WHERE s.event_request_id = target AND s.status = 'APPROVED'
    AND NOT EXISTS (SELECT 1 FROM safety_reviews newer
      WHERE newer.event_request_id = target AND newer.round > s.round)
    AND (force_invalidation OR s.arrangement_fingerprint <> safety_arrangement_fingerprint(target)
      OR c.context_fingerprint IS DISTINCT FROM safety_context_fingerprint(target))
  ON CONFLICT (review_id) DO NOTHING;
END
$$;

CREATE FUNCTION invalidate_safety_on_arrangement_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous jsonb; following jsonb; target uuid; affected uuid[] := '{}';
BEGIN
  IF TG_OP <> 'INSERT' THEN previous := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN following := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' AND previous = following THEN RETURN NULL; END IF;
  IF TG_TABLE_NAME = 'event_requests' THEN
    affected := ARRAY[coalesce(following, previous)->>'id']::uuid[];
  ELSIF TG_TABLE_NAME IN ('venue_bookings', 'equipment_requests') THEN
    affected := ARRAY[previous->>'event_request_id', following->>'event_request_id']::uuid[];
  ELSIF TG_TABLE_NAME = 'venues' THEN
    SELECT array_agg(DISTINCT event_request_id) INTO affected FROM venue_bookings
    WHERE venue_id = (coalesce(following, previous)->>'id')::uuid AND status IN ('PENDING','HELD','APPROVED');
  ELSIF TG_TABLE_NAME = 'equipment_types' THEN
    SELECT array_agg(DISTINCT event_request_id) INTO affected FROM equipment_requests
    WHERE equipment_type_id = (coalesce(following, previous)->>'id')::uuid AND status <> 'CANCELLED';
  ELSIF TG_TABLE_NAME = 'venue_outage_impacts' THEN
    SELECT array_agg(DISTINCT event_request_id) INTO affected FROM venue_bookings
    WHERE id = ANY(ARRAY[previous->>'venue_booking_id', following->>'venue_booking_id']::uuid[]);
  END IF;
  FOR target IN SELECT DISTINCT x FROM unnest(affected) x WHERE x IS NOT NULL ORDER BY x LOOP
    PERFORM invalidate_safety_approval(target, TG_TABLE_NAME);
  END LOOP;
  RETURN NULL;
END
$$;
CREATE TRIGGER invalidate_safety_event AFTER UPDATE ON event_requests
  FOR EACH ROW EXECUTE FUNCTION invalidate_safety_on_arrangement_change();
CREATE TRIGGER invalidate_safety_booking AFTER INSERT OR UPDATE OR DELETE ON venue_bookings
  FOR EACH ROW EXECUTE FUNCTION invalidate_safety_on_arrangement_change();
CREATE TRIGGER invalidate_safety_venue AFTER UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION invalidate_safety_on_arrangement_change();
CREATE TRIGGER invalidate_safety_equipment AFTER INSERT OR UPDATE OR DELETE ON equipment_requests
  FOR EACH ROW EXECUTE FUNCTION invalidate_safety_on_arrangement_change();
CREATE TRIGGER invalidate_safety_stock AFTER UPDATE ON equipment_types
  FOR EACH ROW EXECUTE FUNCTION invalidate_safety_on_arrangement_change();
CREATE TRIGGER invalidate_safety_outage AFTER INSERT OR UPDATE OR DELETE ON venue_outage_impacts
  FOR EACH ROW EXECUTE FUNCTION invalidate_safety_on_arrangement_change();

-- A block may invalidate readiness before an outage impact exists. Test its actual occupied
-- interval (including buffers); an unrelated date or venue must not invalidate an approval.
CREATE FUNCTION invalidate_safety_on_unavailability() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND (OLD.venue_id, OLD.starts_at, OLD.ends_at)
    IS NOT DISTINCT FROM (NEW.venue_id, NEW.starts_at, NEW.ends_at) THEN RETURN NEW; END IF;
  FOR target IN SELECT DISTINCT b.event_request_id FROM venue_booking_intervals b
    WHERE b.venue_id = NEW.venue_id AND b.status IN ('PENDING','HELD','APPROVED')
      AND b.occupied_starts_at < NEW.ends_at AND b.occupied_ends_at > NEW.starts_at
    ORDER BY b.event_request_id LOOP
    PERFORM invalidate_safety_approval(target, 'venue_unavailability', true);
  END LOOP;
  RETURN NEW;
END
$$;
CREATE TRIGGER invalidate_safety_unavailability AFTER INSERT OR UPDATE ON venue_unavailability
  FOR EACH ROW EXECUTE FUNCTION invalidate_safety_on_unavailability();

DO $$
DECLARE target uuid;
BEGIN
  FOR target IN SELECT DISTINCT event_request_id FROM safety_reviews WHERE status = 'APPROVED' LOOP
    PERFORM invalidate_safety_approval(target, 'migration_023_detected_mismatch', EXISTS (
      SELECT 1 FROM venue_booking_intervals b JOIN venue_unavailability u ON u.venue_id = b.venue_id
      WHERE b.event_request_id = target AND b.status IN ('PENDING','HELD','APPROVED')
        AND b.occupied_starts_at < u.ends_at AND b.occupied_ends_at > u.starts_at));
  END LOOP;
END
$$;

DO $$
DECLARE application_schema text := current_schema(); signature text; api_role text; relation text;
  functions text[] := ARRAY['safety_context_fingerprint(uuid)', 'capture_safety_review_context()',
    'protect_safety_invalidation_evidence()', 'invalidate_safety_approval(uuid,text,boolean)',
    'invalidate_safety_on_arrangement_change()', 'invalidate_safety_on_unavailability()'];
BEGIN
  FOREACH relation IN ARRAY ARRAY['safety_approval_invalidations','safety_review_context_baselines'] LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', application_schema, relation);
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC', application_schema, relation);
  END LOOP;
  FOREACH signature IN ARRAY functions LOOP
    EXECUTE format('ALTER FUNCTION %I.%s SET search_path = %I, pg_temp', application_schema, signature, application_schema);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%s FROM PUBLIC', application_schema, signature);
  END LOOP;
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      FOREACH relation IN ARRAY ARRAY['safety_approval_invalidations','safety_review_context_baselines'] LOOP
        EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM %I', application_schema, relation, api_role);
      END LOOP;
      FOREACH signature IN ARRAY functions LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%s FROM %I', application_schema, signature, api_role);
      END LOOP;
    END IF;
  END LOOP;
END
$$;
