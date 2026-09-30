-- KAN-29: availability is preconfigured; new and existing profiles start opted out.
-- Enable only real coordinators who are ready to receive submitted requests.
ALTER TABLE app_users
  ADD COLUMN coordinator_available boolean NOT NULL DEFAULT false;

-- System-selected assignments must not look like a person chose the coordinator.
-- Existing history retains its manual provenance and original actor.
ALTER TABLE coordinator_assignments
  ALTER COLUMN assigned_by DROP NOT NULL,
  ADD COLUMN assignment_method text NOT NULL DEFAULT 'MANUAL',
  ADD CONSTRAINT coordinator_assignments_method_actor_check CHECK (
    (assignment_method = 'MANUAL' AND assigned_by IS NOT NULL)
    OR (assignment_method = 'AUTOMATIC' AND assigned_by IS NULL)
  );
