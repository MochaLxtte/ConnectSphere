-- KAN-15: reviewed change requests for significant fields of APPROVED or CONFIRMED events.
-- Numbered 017 because KAN-9/KAN-26 (014, 015) and KAN-66 (to be renumbered 016) are pending
-- merge; the runner applies files by name, so the gap is harmless.
--
-- Migration 004 created a provisional event_change_requests table that no code has used. This
-- migration completes it rather than replacing it (shared migrations are never edited):
--   proposed_changes  the requested values, { "<apiField>": <value> } (from 004)
--   previous          the values they replace, captured at submission
--   base_revision     the KAN-66 event revision the organiser was looking at
--   applied_revision  on approval, the event revision produced by applying the change
--   cancelled_arrangements  on approval, { "venueBookings": [ids], "equipmentRequests": [ids] }
--   reason            the organiser's optional explanation (004 required it; now optional)
-- A request never changes the event by itself: approval applies the values in the same
-- transaction that records the decision. At most one request per event is PENDING
-- (KAN-15-AC101). RLS and Data API revokes for this table were applied by migration 004.

-- 004's unnamed CHECK required decided_by/decided_at for APPROVED/REJECTED only; WITHDRAWN now
-- records who withdrew and when as well, so it is replaced by the decision check below.
ALTER TABLE event_change_requests DROP CONSTRAINT IF EXISTS event_change_requests_check;
ALTER TABLE event_change_requests DROP CONSTRAINT IF EXISTS event_change_requests_reason_check;
ALTER TABLE event_change_requests ALTER COLUMN reason DROP NOT NULL;

ALTER TABLE event_change_requests
  ADD COLUMN previous jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN base_revision integer NOT NULL DEFAULT 1,
  ADD COLUMN applied_revision integer,
  ADD COLUMN cancelled_arrangements jsonb,
  ADD CONSTRAINT event_change_requests_previous_check CHECK (jsonb_typeof(previous) = 'object'),
  ADD CONSTRAINT event_change_requests_base_revision_check CHECK (base_revision >= 1),
  ADD CONSTRAINT event_change_requests_applied_revision_check CHECK (applied_revision >= 2),
  ADD CONSTRAINT event_change_requests_cancelled_check
    CHECK (cancelled_arrangements IS NULL OR jsonb_typeof(cancelled_arrangements) = 'object'),
  ADD CONSTRAINT event_change_requests_reason_text_check
    CHECK (reason IS NULL OR length(trim(reason)) > 0),
  ADD CONSTRAINT event_change_requests_rejection_reason_check
    CHECK (status <> 'REJECTED' OR length(trim(coalesce(decision_reason, ''))) > 0);

-- New rows must state what they replace and which revision they were based on.
ALTER TABLE event_change_requests ALTER COLUMN previous DROP DEFAULT;
ALTER TABLE event_change_requests ALTER COLUMN base_revision DROP DEFAULT;

-- No rows are expected (nothing has written to this table). NOT VALID keeps any unexpected legacy
-- row from blocking the migration while every new or updated row is still checked.
ALTER TABLE event_change_requests
  ADD CONSTRAINT event_change_requests_decision_check CHECK (
    (status = 'PENDING') = (decided_at IS NULL) AND (decided_at IS NULL) = (decided_by IS NULL)
  ) NOT VALID,
  ADD CONSTRAINT event_change_requests_applied_check CHECK (
    (status = 'APPROVED') = (applied_revision IS NOT NULL)
  ) NOT VALID;

CREATE UNIQUE INDEX event_change_requests_one_pending_idx
  ON event_change_requests (event_request_id) WHERE status = 'PENDING';
