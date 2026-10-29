-- KAN-17/67/80: stable registration outcomes; new workflow notifications share KAN-64's writer contract.
ALTER TABLE event_registrations ADD COLUMN outcome_version integer NOT NULL DEFAULT 1 CHECK (outcome_version > 0);
ALTER TABLE notifications ADD COLUMN registration_id uuid REFERENCES event_registrations(id),
  ADD COLUMN change_request_id uuid REFERENCES event_change_requests(id);

CREATE FUNCTION registration_outcome_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN NEW.outcome_version := OLD.outcome_version + 1;
  ELSE NEW.outcome_version := OLD.outcome_version; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER registration_outcome_version BEFORE UPDATE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION registration_outcome_version();

-- Only authenticated application transactions emit business outcomes. Fixture imports without
-- app.actor_id do not impersonate an actor. KAN-14 can reuse this hook without a second writer.
CREATE FUNCTION notify_registration_outcome() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e event_requests%ROWTYPE; kind text;
BEGIN
  IF nullif(current_setting('app.actor_id', true), '') IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('REGISTERED','WITHDRAWN') THEN RETURN NEW; END IF;
  SELECT * INTO e FROM event_requests WHERE id = NEW.event_request_id;
  kind := CASE WHEN NEW.status = 'REGISTERED' THEN 'REGISTRATION_CONFIRMED' ELSE 'REGISTRATION_WITHDRAWN' END;
  INSERT INTO notifications(recipient_id,event_request_id,registration_id,type,title,message,dedupe_key)
    SELECT DISTINCT recipient,e.id,NEW.id,kind,
      CASE WHEN NEW.status = 'REGISTERED' THEN 'Registration confirmed' ELSE 'Registration withdrawn' END,
      CASE WHEN NEW.status = 'REGISTERED' THEN 'Registration confirmed for ' ELSE 'Registration withdrawn for ' END
        || coalesce(e.name,'the event') || '.',
      kind || ':' || NEW.id || ':' || NEW.outcome_version
    FROM unnest(ARRAY[NEW.attendee_id,e.organiser_id,e.coordinator_id]) recipient WHERE recipient IS NOT NULL
    ON CONFLICT(recipient_id,dedupe_key) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_registration_outcome AFTER INSERT OR UPDATE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION notify_registration_outcome();

-- KAN-61 retains its readiness/transition ownership. This hook runs only after its real status
-- transition succeeds, inside that same transaction, without exposing a bypass confirmation API.
CREATE FUNCTION notify_final_event_outcome() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE kind text; target record;
BEGIN
  IF nullif(current_setting('app.actor_id', true), '') IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status
    OR NEW.status <> 'CONFIRMED' THEN RETURN NEW; END IF;
  kind := CASE WHEN NEW.status = 'CONFIRMED' THEN 'EVENT_CONFIRMED' ELSE 'EVENT_CANCELLED' END;
  FOR target IN
    SELECT NEW.organiser_id AS recipient, NULL::uuid AS booking, NULL::uuid AS equipment
    UNION SELECT NEW.coordinator_id,NULL::uuid,NULL::uuid
    UNION SELECT r.attendee_id,NULL::uuid,NULL::uuid FROM event_registrations r
      WHERE r.event_request_id=NEW.id AND r.status='REGISTERED'
    UNION SELECT b.decided_by,b.id,NULL::uuid FROM venue_bookings b
      WHERE b.event_request_id=NEW.id AND b.status = 'APPROVED' AND b.decided_by IS NOT NULL
    UNION SELECT r.decided_by,NULL::uuid,r.id FROM equipment_requests r
      WHERE r.event_request_id=NEW.id AND r.status = 'RESERVED' AND r.decided_by IS NOT NULL
  LOOP
    IF target.recipient IS NULL THEN CONTINUE; END IF;
    INSERT INTO notifications(recipient_id,event_request_id,venue_booking_id,equipment_request_id,type,title,message,dedupe_key)
    VALUES(target.recipient,NEW.id,target.booking,target.equipment,kind,
      CASE WHEN NEW.status='CONFIRMED' THEN 'Event confirmed' ELSE 'Event cancelled' END,
      coalesce(NEW.name,'The event') || CASE WHEN NEW.status='CONFIRMED' THEN ' is confirmed.' ELSE ' has been cancelled.' END,
      kind || ':' || NEW.id) ON CONFLICT(recipient_id,dedupe_key) DO NOTHING;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_final_event_outcome AFTER UPDATE OF status ON event_requests
  FOR EACH ROW EXECUTE FUNCTION notify_final_event_outcome();

-- KAN-18 owns stock editing. Operational-loss outcomes reuse the transaction that changes stock;
-- never emit success for an advisory availability read. One notice per affected event/person/loss.
CREATE FUNCTION notify_equipment_shortfall() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE outcome uuid := gen_random_uuid(); affected record; recipient uuid; acting_technical uuid; old_operational integer; new_operational integer;
BEGIN
  IF nullif(current_setting('app.actor_id', true), '') IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO acting_technical FROM app_users
    WHERE id = current_setting('app.actor_id', true)::uuid AND role = 'TECHNICAL_SUPPORT_STAFF';
  old_operational := CASE WHEN OLD.is_active THEN OLD.total_quantity-OLD.damaged_quantity-OLD.maintenance_quantity ELSE 0 END;
  new_operational := CASE WHEN NEW.is_active THEN NEW.total_quantity-NEW.damaged_quantity-NEW.maintenance_quantity ELSE 0 END;
  IF new_operational >= old_operational THEN RETURN NEW; END IF;
  FOR affected IN SELECT r.id,r.event_request_id,r.decided_by,e.coordinator_id,e.name
    FROM equipment_requests r JOIN event_requests e ON e.id=r.event_request_id
    WHERE r.equipment_type_id=NEW.id AND r.status='RESERVED' AND e.status IN ('APPROVED','CONFIRMED')
      AND EXISTS (SELECT 1 FROM equipment_requests edge WHERE edge.equipment_type_id=NEW.id AND edge.status='RESERVED'
        AND edge.starts_at < r.ends_at AND edge.ends_at > r.starts_at
        AND (SELECT coalesce(sum(load.quantity),0) FROM equipment_requests load
          WHERE load.equipment_type_id=NEW.id AND load.status='RESERVED'
            AND load.starts_at <= greatest(r.starts_at,edge.starts_at)
            AND load.ends_at > greatest(r.starts_at,edge.starts_at)) > new_operational)
    ORDER BY r.id
  LOOP
    FOREACH recipient IN ARRAY ARRAY[affected.coordinator_id,affected.decided_by,acting_technical] LOOP
      IF recipient IS NULL THEN CONTINUE; END IF;
      INSERT INTO notifications(recipient_id,event_request_id,equipment_request_id,type,title,message,dedupe_key)
      VALUES(recipient,affected.event_request_id,affected.id,'EQUIPMENT_UNAVAILABLE','Equipment unavailable',
        NEW.name || ' has an operational shortfall affecting ' || coalesce(affected.name,'the event') || '. Review the equipment arrangements.',
        'EQUIPMENT_UNAVAILABLE:' || outcome || ':' || affected.event_request_id)
      ON CONFLICT(recipient_id,dedupe_key) DO NOTHING;
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_equipment_shortfall AFTER UPDATE OF total_quantity,damaged_quantity,maintenance_quantity,is_active
  ON equipment_types FOR EACH ROW EXECUTE FUNCTION notify_equipment_shortfall();
