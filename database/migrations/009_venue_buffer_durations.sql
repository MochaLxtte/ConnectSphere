-- KAN-77 / CR-1: per-venue setup and turnaround durations, maintained by Venue Staff.
-- Whole minutes from 0 to 1440; existing venues start at zero, so current intervals are unchanged.
-- Existing bookings, blocks and migration history are untouched. KAN-78 applies the buffers.
ALTER TABLE venues
  ADD COLUMN setup_minutes integer NOT NULL DEFAULT 0 CHECK (setup_minutes BETWEEN 0 AND 1440),
  ADD COLUMN turnaround_minutes integer NOT NULL DEFAULT 0 CHECK (turnaround_minutes BETWEEN 0 AND 1440);
