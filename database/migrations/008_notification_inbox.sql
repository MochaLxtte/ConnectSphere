-- KAN-64 / CF-20: support the in-app notification inbox. Additive only: existing notification
-- rows and the table's access restrictions from migration 004 are unchanged.
--
-- venue_booking_id links a venue-booking outcome to its booking (KAN-64-AC205).
-- dedupe_key identifies one outcome for one recipient, for example "review:<review id>". The unique
-- index makes a retried or repeated write of the same outcome a no-op (KAN-64-AC207). Rows written
-- before this migration have no key; NULLs never conflict, so they are left as they are.
ALTER TABLE notifications
  ADD COLUMN venue_booking_id uuid REFERENCES venue_bookings(id) ON DELETE SET NULL,
  ADD COLUMN dedupe_key text CHECK (dedupe_key IS NULL OR length(trim(dedupe_key)) > 0);

CREATE UNIQUE INDEX notifications_recipient_outcome_unique ON notifications (recipient_id, dedupe_key);
CREATE INDEX notifications_booking_idx ON notifications (venue_booking_id) WHERE venue_booking_id IS NOT NULL;
