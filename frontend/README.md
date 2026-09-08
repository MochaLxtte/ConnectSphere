# ConnectSphere frontend

Vue 3, TypeScript, Vue Router, and Vite. Run commands from the repository root after following the root README setup.

```sh
npm run dev --workspace frontend
npm run typecheck --workspace frontend
npm test --workspace frontend
npm run build --workspace frontend
```

The dev server runs at `http://127.0.0.1:5173` and fails clearly if that port is already in use. Requests to `/api` proxy to Express at `http://127.0.0.1:3000`. Set `API_PROXY_TARGET` in the root `.env` or shell environment before starting Vite to use another backend. A shell value takes precedence. Express connects to Supabase PostgreSQL; the browser never receives database credentials or queries the application tables directly. Do not put database passwords or privileged Supabase keys in `VITE_*` variables.

## What works now

- Responsive application shell, navigation, page titles, and unknown-route handling.
- Live API liveness and database readiness checks on the overview, with separate loading, error, success, and retry states.
- A shared JSON API client that preserves structured backend error codes.
- Component and API contract tests for the connection checks and failure recovery.

Account access, event requests, and coordinator review pages are explicitly marked placeholders. There is no simulated login, fake event data, or role enforcement yet. All scaffold routes are public and contain no protected data. Add authentication and server-side authorization before exposing business features.

## Team work areas

| Work area                            | Location                                      | Planning references |
| ------------------------------------ | --------------------------------------------- | ------------------- |
| Application shell and routes         | `src/app`, `src/components`                   | Shared foundation   |
| Sign in and account state            | `src/features/auth`                           | KAN-25              |
| Event creation and draft saving      | `src/features/events`                         | KAN-31, KAN-4       |
| Event editing and submission         | `src/features/events`                         | KAN-34, KAN-6       |
| Coordinator review and clarification | `src/features/reviews`                        | KAN-33, KAN-27      |
| Decisions and organiser status       | `src/features/reviews`, `src/features/events` | KAN-36, KAN-16      |
| Health checks                        | `src/features/system`                         | Shared foundation   |

Keep domain-specific components, API wrappers, and tests in their feature directory. Promote components to `src/components` only when they are shared. Place API transport behavior in `src/lib/api-client.ts`. Replace the relevant placeholder page as you implement each item; coordinate route changes in `src/app/router.ts`.

## API contracts in use

```text
GET /api/health
200 { "status": "ok", "service": "connectsphere-api" }

GET /api/health/ready
200 { "status": "ok", "database": "connected" }
503 { "error": { "code": "DATABASE_UNAVAILABLE", "message": "..." } }
```

Business APIs are not implemented by this scaffold. Agree request/response contracts with the backend owner before connecting the event and account pages. Supabase Auth is a separate choice for KAN-25; no authentication client is configured yet. Frontend TypeScript types describe data; they do not replace server-side validation.

For production, serve `dist/` with a history fallback to `index.html` and route `/api/*` to the backend. The Vite proxy is development-only. The interface uses system-font fallbacks if the optional Google Fonts stylesheet is unavailable.
