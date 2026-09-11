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

## KAN-36 decision panel

`src/features/reviews/components/ReviewDecisionPanel.vue` provides approval/rejection controls for a single event request. It is tested independently; the review queue remains a placeholder until KAN-33 supplies the real request-review page. The panel does not fetch requests, authenticate users or call the review endpoint itself.

The parent page supplies:

- `request`: the current request's `id`, `status` and optional `recordedDecision`, read from the server. Unknown statuses cannot be reviewed; the supported initial state is `SUBMITTED`.
- `canReview`: permission for this request, derived from verified access state. Omission denies access. This controls display only; Express must enforce the role and request-specific permission again when saving.
- `feedback`: a `ReviewFeedback` value from `src/features/reviews/types.ts`, scoped to `eventRequestId`. Use `state: 'saving'`, `state: 'saved'` with the confirmed `decision`, or `state: 'error'` with the API error `code`.

Example placement inside the request-review page:

```vue
<ReviewDecisionPanel
  :request="reviewRequest"
  :can-review="canReviewRequest"
  :feedback="reviewFeedback"
  @submit="recordDecision"
  @refresh="reloadRequest"
/>
```

`submit` emits `{ eventRequestId, input: { decision, reason } }`. The reason is trimmed and blank text becomes `null`. The parent sets saving feedback immediately and sends only `input` to `POST /api/events/:id/reviews` through the authenticated API client. Set saved feedback only after a successful server response; set error feedback when the call fails. Each update should supply a new feedback object for that request. The panel prevents duplicate submissions while waiting and ignores feedback for other request IDs.

`refresh` emits the current request ID. Reload its status and recorded decision from the server before clearing error feedback. A conflict or uncertain network/server failure requires this refresh because the decision may already have been saved. Invalid-input feedback preserves the selected decision and reason for correction. Authentication/access failures hide decision controls. Changing request IDs clears the previous selection and typed reason.

Recorded outcomes replace the form, including when an existing decision accompanies a stale `SUBMITTED` status. Component tests use supplied state and emitted events; they are not evidence of live authentication, API integration or completion of KAN-16.

Run the component tests from the repository root:

```powershell
npm.cmd run test --workspace @connectsphere/frontend -- src/features/reviews/components/ReviewDecisionPanel.test.ts
```
