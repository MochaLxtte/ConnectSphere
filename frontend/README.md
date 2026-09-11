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

| Work area                            | Owner   | Location                                      | Planning references |
| ------------------------------------ | ------- | --------------------------------------------- | ------------------- |
| Application shell and routes         | Shared  | `src/app`, `src/components`                   | Shared foundation   |
| Sign in and account state            | Ryan    | `src/features/auth`                           | KAN-25              |
| Event creation and draft saving      | Ernest  | `src/features/events`                         | KAN-31, KAN-4       |
| Event editing and submission         | Kai Jie | `src/features/events`                         | KAN-34, KAN-6       |
| Coordinator review and clarification | Irfan   | `src/features/reviews`                        | KAN-33, KAN-27      |
| Decisions and organiser status       | Tristan | `src/features/reviews`, `src/features/events` | KAN-36, KAN-16      |
| Health checks                        | Shared  | `src/features/system`                         | Shared foundation   |

Arvin supports cross-feature integration, end-to-end testing and resolving integration issues after database setup.

Keep domain-specific components, API wrappers, and tests in their feature directory. Promote components to `src/components` only when they are shared. Place API transport behavior in `src/lib/api-client.ts`. Replace the relevant placeholder page as you implement each item; coordinate route changes in `src/app/router.ts`.

## API contracts in use

```text
GET /api/health
200 { "status": "ok", "service": "connectsphere-api" }

GET /api/health/ready
200 { "status": "ok", "database": "connected" }
503 { "error": { "code": "DATABASE_UNAVAILABLE", "message": "..." } }
```

The queue, shared request-detail and decision-write handlers are implemented but remain unavailable in the normal server until authentication and access policies are supplied. Use the [API contract](../docs/architecture/api-contract.md) when connecting event pages. Supabase Auth is a separate choice for KAN-25; no authentication client is configured yet. Frontend TypeScript types describe data; they do not replace server-side validation.

For production, serve `dist/` with a history fallback to `index.html` and route `/api/*` to the backend. The Vite proxy is development-only. The interface uses system-font fallbacks if the optional Google Fonts stylesheet is unavailable.

## KAN-36 decision panel

`src/features/reviews/components/ReviewDecisionPanel.vue` provides approval/rejection controls for a single event request. KAN-33's `ReviewRequestPage.vue` mounts it and supplies API calls and feedback; `ReviewQueuePage.vue` lists requests. The panel itself does not fetch requests, authenticate users or call the review endpoint.

The shared GET retains the flat event fields and adds `review` and `actions`. Frontend types and permission/outcome wiring still need updating: the parent currently hardcodes `canReview` to true. Separate permission to display an outcome from `actions.canMakeInitialDecision`; binding that flag directly to the existing `canReview` prop would hide saved outcomes. Refresh the shared detail after a successful or uncertain decision write. Live authenticated browser integration remains pending.

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
