-- KAN-81 phase 3 / CR-2: a replacement booking points at the outage-affected booking it replaces.
-- Approving the replacement resolves the original's recovery flags and cancels the original, which
-- keeps its row and history. Existing bookings get NULL and are unchanged. Additive only.
ALTER TABLE venue_bookings
  ADD COLUMN replaces_booking_id uuid REFERENCES venue_bookings(id);

CREATE INDEX venue_bookings_replaces_idx ON venue_bookings (replaces_booking_id)
  WHERE replaces_booking_id IS NOT NULL;
