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
- Supabase sign-in, application session state and sign-out, backed by Express verification.
- Coordinator review queue and detail, with approval/rejection controls and saved outcomes.
- Coordinator-only review navigation and page access, with session-loading, signed-out and wrong-role states.
- Organiser request list at `/events`, covering all owned statuses, refresh, empty/error states and session-expiry recovery.
- Read-only organiser details at `/events/:id`, showing the current status and any recorded decision, reason and time.

The organiser creation page remains a placeholder. KAN-16's list and detail views are connected. Hosted organiser checks cover approval/rejection display and refresh, signed-out detail access, Draft/Submitted detail states and another organiser's denied detail access and empty list (MAN-20260917-01 through MAN-20260917-04). Opening `/events` directly after signing out showed a sign-in prompt without request names or statuses (MAN-20260917-05). The request list showed matching Draft, Submitted, Rejected and Approved labels, and Draft/Submitted detail statuses and review messages remained correct after refresh (MAN-20260917-06). The remaining submission-to-status check is tracked in [test evidence](../docs/testing/test-evidence.md). Express authenticates event API calls and enforces roles, ownership and the Sprint 1 coordinator assignment policy. Frontend navigation and action flags do not replace those checks.

## KAN-16 organiser request list and detail

`EventRequestsPage.vue` loads `GET /api/events?scope=all` through the feature's `api/event-requests.ts` wrapper. It preserves the API's latest-update order and shows names, readable status labels and update times in Asia/Singapore. Unnamed drafts have an explicit fallback title. Request titles link to `/events/:id`; the existing `/events/new` route still opens the creation placeholder. Refresh retrieves current values; empty results and retryable failures have separate states.

`EventRequestDetailPage.vue` reads the existing `GET /api/events/:id` response, showing request fields, status and a saved outcome with its reason and recorded time. All times use Asia/Singapore. Reasons remain plain text with line breaks. Missing reviews are distinguished from drafts awaiting submission and decided requests whose review details are unavailable. The view offers Refresh and a link back to the list; it has no editing, submission or decision controls, even if an action flag is enabled. This step adds no backend handler or schema changes.

Signing out or changing accounts clears previous results and cancels pending reads. The detail view also discards responses for a previously opened request. A 401 clears cached identity and offers sign-in, so the login page can show its form again. Failed reads hide previous request data. On the detail page, 403/404 responses show the same unavailable/no-permission message, while network/server failures offer Try again.

Component tests cover loading, labels, status refresh, recorded and absent outcomes, access failures and stale responses. `tests/e2e/event-requests.spec.ts` and `tests/e2e/event-request-detail.spec.ts` cover desktop/mobile layout, list/detail navigation, reload, retry, denied access and session-expiry navigation using API response fixtures. These fixtures do not prove hosted authentication or persistence. The [test register](../docs/testing/test-evidence.md) records the separate manual checks and remaining acceptance coverage.

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

The normal server mounts the queue, shared request-detail and decision-write handlers with Supabase session verification and the assigned-coordinator policy. Use the [API contract](../docs/architecture/api-contract.md) when connecting event pages. Frontend TypeScript types describe data; they do not replace server-side validation.

For production, serve `dist/` with a history fallback to `index.html` and route `/api/*` to the backend. The Vite proxy is development-only. The interface uses system-font fallbacks if the optional Google Fonts stylesheet is unavailable.

## KAN-36 decision panel

`ReviewAccessPage.vue` protects both `/reviews` and `/reviews/:id`. It waits for session loading to finish and mounts the child page only for an event coordinator. Other users do not see review links in the sidebar or overview; direct navigation shows a sign-in or coordinator-only message. Account changes and sign-out unmount the previous child and cancel pending reads. A current API 401 clears the expired local session, and stale responses cannot restore a previous account's data. This page boundary preserves the shared backend's role-aware listing and detail contracts; organisers still use `/events` for their own requests.

Component tests in `ReviewAccessPage.test.ts` and browser fixtures in `tests/e2e/review-access.spec.ts` cover these access and session transitions. The [test evidence](../docs/testing/test-evidence.md) records the review-queue defect and automated regression results under MAN-20260917-07 and AUTO-20260917-07/08. The organiser queue recheck passed on 18 September (MAN-20260918-01): after reload the Review queue link was absent, and direct `/reviews` navigation showed Coordinator access only without request data. This recheck did not cover `/reviews/:id` or the remaining role/session scenarios.

`src/features/reviews/components/ReviewDecisionPanel.vue` provides approval/rejection controls for a single event request. KAN-33's `ReviewRequestPage.vue` mounts it and supplies API calls and feedback; `ReviewQueuePage.vue` lists requests. The panel itself does not fetch requests, authenticate users or call the review endpoint.

The shared GET retains the flat event fields and adds `review` and `actions`. The page consumes these fields, enables decisions only when the backend allows them, and keeps a saved outcome and reason visible after decision actions become unavailable. It reloads the detail after a successful write.

Hosted approval and rejection checks passed, including outcome display after reload, hidden decision controls and removal from the pending queue. The [test evidence](../docs/testing/test-evidence.md) records the dated results and remaining unauthorised-access and organiser-workflow checks.

The parent page supplies:

- `request`: the current request's `id`, `status` and nullable `review`, read from the server. The review includes the recorded decision and reason. Unknown statuses cannot be reviewed; the supported initial state is `SUBMITTED`.
- `canMakeInitialDecision`: the backend's action flag for this request. False or omitted prevents submission while leaving an existing outcome readable. Render the panel only after an authorised detail read; Express rechecks role, assignment and state when saving.
- `feedback`: a `ReviewFeedback` value from `src/features/reviews/types.ts`, scoped to `eventRequestId`. Use `state: 'saving'`, `state: 'saved'` with the confirmed `decision`, or `state: 'error'` with the API error `code`.

Example placement inside the request-review page:

```vue
<ReviewDecisionPanel
  :request="reviewRequest"
  :can-make-initial-decision="reviewRequest.actions?.canMakeInitialDecision === true"
  :feedback="reviewFeedback"
  @submit="recordDecision"
  @refresh="reloadRequest"
/>
```

`submit` emits `{ eventRequestId, input: { decision, reason } }`. The reason is trimmed and blank text becomes `null`. The parent sets saving feedback immediately and sends only `input` to `POST /api/events/:id/reviews` through the authenticated API client. Set saved feedback only after a successful server response; set error feedback when the call fails. Each update should supply a new feedback object for that request. The panel prevents duplicate submissions while waiting and ignores feedback for other request IDs.

`refresh` emits the current request ID. The parent hides the panel while reloading the detail, so stale actions cannot be used during the read. A conflict or uncertain network/server failure requires this refresh because the decision may already have been saved. If a confirmed save is followed by a failed read, the page reports the saved decision and retries only the read. Invalid-input feedback preserves the selected decision and reason for correction. Authentication/access failures hide decision controls. Changing request IDs clears the previous selection and typed reason; late write responses cannot replace the newly opened request.

Recorded outcomes replace the form, including when an existing decision accompanies a stale `SUBMITTED` status. Component tests cover the panel and parent page; browser tests in `tests/e2e/review-decision.spec.ts` cover saving and reloading with API response fixtures. They do not verify hosted login, database persistence or completion of KAN-16's organiser interface.

Run the component tests from the repository root:

```powershell
npm.cmd run test --workspace @connectsphere/frontend -- src/features/reviews/components/ReviewDecisionPanel.test.ts
```
