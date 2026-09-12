# Authentication and roles workstream

Ryan owns this directory and the frontend authentication workstream: persistence mapping, password hashing, login/logout, session verification, and role middleware. Coordinate public request/response contracts with the other feature owners before implementing them.

Firebase Authentication verifies email/password credentials. The backend exchanges a verified Firebase ID token for a five-day HttpOnly session cookie, verifies that cookie on later requests, and resolves the Firebase UID through `app_user_identities` to the application-owned `app_users` profile and role. `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout` are mounted by the normal server.

Firebase owns credentials. ConnectSphere owns the role: provision each Firebase UID in `app_user_identities` only after an administrator creates the corresponding `app_users` profile and approves its role. There are no default passwords, fixed tokens, login bypasses, or client-selected roles. A frontend role selector is not an authorization mechanism.

Before exposing an event route, verify the caller on the server, derive the organiser identity from that verified user, and enforce both the role and ownership of the requested resource. Firebase identity alone does not grant a ConnectSphere role or resource access.

Keep handlers, validation, service rules, and parameterized SQL repositories separate as the workstream grows. Add tests for invalid credentials, unauthenticated requests, and cross-role or cross-owner access when those stories are implemented. Never serialize a database user row containing `password_hash` directly.
