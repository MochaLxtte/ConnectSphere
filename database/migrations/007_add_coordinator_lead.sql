-- KAN-79 / CR-5: a trusted application role for initial assignment and oversight.
-- Provision this role on a mapped staff profile through the trusted database setup;
-- no user-facing signup or profile endpoint may grant it.
-- Existing assignments, automatic history and coordinator availability are unchanged.
ALTER TABLE app_users DROP CONSTRAINT app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN (
  'EVENT_ORGANISER', 'EVENT_COORDINATOR', 'EVENT_COORDINATOR_LEAD',
  'VENUE_STAFF', 'TECHNICAL_SUPPORT_STAFF', 'ATTENDEE'
));
