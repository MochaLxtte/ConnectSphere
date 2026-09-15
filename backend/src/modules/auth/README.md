# Authentication and roles workstream

Ryan owns this directory and the authentication workstream: persistence mapping, password hashing, login/logout, session verification, and role middleware. Coordinate public request/response contracts with the other feature owners before implementing them.

Supabase Auth verifies email/password credentials. The backend verifies a Supabase access token and sets it directly as a HttpOnly session cookie, re-verifies that cookie on later requests, and resolves the Supabase user id through `app_users.supabase_user_id` to the application-owned profile and role. `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout` are mounted by the normal server.

Supabase owns credentials. ConnectSphere owns the role: create the `app_users` profile with its role directly when the user signs in, linked via `supabase_user_id`. 

Always verify the caller on the server and enforce role and resource ownership from that verified identity, never from client input. Never serialize a database row containing `password_hash`.
