# Authentication and roles workstream

Ryan owns this directory and the authentication workstream: profile mapping, login/logout, session verification, and role middleware. Coordinate public request/response contracts with the other feature owners before implementing them.

Supabase Auth verifies email/password credentials. The backend verifies a Supabase access token and sets it directly as a HttpOnly session cookie, re-verifies that cookie on later requests, and resolves the Supabase user id through `app_users.supabase_user_id` to the application-owned profile and role. `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout` are mounted by the normal server.

Supabase owns credentials. ConnectSphere owns the role: provision the `app_users` profile and its role before sign-in, linking it to the verified Supabase user's UUID through `supabase_user_id`. Login only looks up this mapping; an unmapped account receives `403 ACCOUNT_NOT_PROVISIONED` and no profile is created automatically.

Migration `004_add_supabase_user_id.sql` adds the nullable, unique UUID mapping for reproducible local and CI databases. Existing profiles remain unmapped until provisioned. Migration 003 is retained as historical schema; its Firebase identity table is not used by the Supabase implementation. For the shared Supabase project, coordinate the equivalent `app_users.supabase_user_id` UUID column and unique constraint with Arvin, then provision the account mappings with Ryan before testing login.

Configure `SUPABASE_URL` on the backend and `VITE_SUPABASE_URL` plus `VITE_SUPABASE_ANON_KEY` for the frontend. The optional backend-only `SUPABASE_JWT_SECRET` is needed only for legacy HS256 signing; otherwise the verifier uses the project's JWKS. Never put a signing secret in a `VITE_*` variable.

Event routes still need `authenticateRequest` and the agreed coordinator visibility/decision policies passed to `createApp`. Authentication is mounted by the normal server; event routes are not yet mounted there. Coordinator policy and the frontend decision/outcome integration remain separate work.

Always verify the caller on the server and enforce role and resource ownership from that verified identity, never from client input. Never serialize a database row containing `password_hash`.
