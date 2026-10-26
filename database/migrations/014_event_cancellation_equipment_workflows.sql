-- KAN-62 / KAN-63: lifecycle cancellation and equipment request/review workflow.
ALTER TABLE equipment_requests
  ADD COLUMN technical_requirements text,
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  ADD COLUMN cancelled_by uuid REFERENCES app_users(id),
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN cancellation_reason text,
  ADD CONSTRAINT equipment_requests_cancellation_fields CHECK (
    (status = 'CANCELLED') = (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL)
  );

ALTER TABLE equipment_requests DROP CONSTRAINT equipment_requests_status_check;
ALTER TABLE equipment_requests ADD CONSTRAINT equipment_requests_status_check
  CHECK (status IN ('REQUESTED', 'RESERVED', 'REJECTED', 'CANCELLED'));

ALTER TABLE event_registrations ADD COLUMN cancellation_outcome_at timestamptz;
ALTER TABLE event_registrations DROP CONSTRAINT event_registrations_status_check;
ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_status_check
  CHECK (status IN ('REGISTERED', 'WITHDRAWN', 'CANCELLED'));
ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_cancelled_at_check
  CHECK ((status = 'CANCELLED') = (cancellation_outcome_at IS NOT NULL));

ALTER TABLE event_requests ADD COLUMN equipment_plan_status text NOT NULL DEFAULT 'REQUIRED'
  CHECK (equipment_plan_status IN ('REQUIRED', 'NOT_REQUIRED'));

CREATE TABLE event_cancellations (
  event_request_id uuid PRIMARY KEY REFERENCES event_requests(id),
  cancelled_by uuid NOT NULL REFERENCES app_users(id),
  cancelled_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  affected_venue_bookings integer NOT NULL CHECK (affected_venue_bookings >= 0),
  affected_equipment_requests integer NOT NULL CHECK (affected_equipment_requests >= 0),
  affected_registrations integer NOT NULL CHECK (affected_registrations >= 0)
);

ALTER TABLE event_status_history ADD COLUMN reason text;

