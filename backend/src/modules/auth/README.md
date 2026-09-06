# Authentication and roles workstream

The teammate assigned authentication owns this directory: persistence mapping, password hashing, login/logout, session verification, and role middleware. Coordinate public request/response contracts with the frontend auth workstream before implementing them.

Only the five role identifiers and a safe user representation are provided. Authentication, sessions, role enforcement, and account provisioning are not implemented. There are no default passwords, fixed tokens, login bypasses, or mounted auth endpoints. A frontend role selector is not an authorization mechanism.

Before exposing an event route, verify the caller on the server, derive the organiser identity from that verified user, and enforce both the role and ownership of the requested resource. Decide and document the team's session strategy and account provisioning approach before adding authentication dependencies.

Keep handlers, validation, service rules, and parameterized SQL repositories separate as the workstream grows. Add tests for invalid credentials, unauthenticated requests, and cross-role or cross-owner access when those stories are implemented. Never serialize a database user row containing `password_hash` directly.
