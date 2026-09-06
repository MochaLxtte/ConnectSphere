-- Starting schema, not a completed business workflow. Evolve via new migrations.
CREATE TABLE scaffold_metadata (
  key text PRIMARY KEY,
  value text NOT NULL
);
INSERT INTO scaffold_metadata (key, value) VALUES ('scaffold_version', '1');

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN (
    'EVENT_ORGANISER', 'EVENT_COORDINATOR', 'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'
  )),
  -- Seeded accounts cannot log in. KAN-25 owns credentials and authentication.
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX app_users_email_unique ON app_users (lower(email));

CREATE TABLE event_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id uuid NOT NULL REFERENCES app_users(id),
  coordinator_id uuid REFERENCES app_users(id),
  -- Proposed Sprint 1 vocabulary. Add later states when their rules are agreed.
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED', 'APPROVED', 'REJECTED'
  )),
  name text,
  purpose text,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  expected_attendance integer CHECK (expected_attendance >= 0),
  venue_requirements text,
  accessibility_needs text,
  equipment_requirements text,
  registration_required boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_requests_organiser_idx ON event_requests (organiser_id);
CREATE INDEX event_requests_review_queue_idx ON event_requests (coordinator_id, status);

CREATE TABLE event_clarifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_request_id uuid NOT NULL REFERENCES event_requests(id),
  requested_by uuid NOT NULL REFERENCES app_users(id),
  message text NOT NULL CHECK (length(trim(message)) > 0),
  response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

CREATE TABLE event_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_request_id uuid NOT NULL REFERENCES event_requests(id),
  reviewed_by uuid NOT NULL REFERENCES app_users(id),
  decision text NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
