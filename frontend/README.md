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
- Organiser creation and draft saving at `/events/new`, with submission after a successful save.
- Owned-draft editing and save-then-submit at `/events/:id/edit`.
- Organiser details at `/events/:id`, showing status and recorded decision, draft edit/submit controls where permitted, and planning panels after submission.
- KAN-29 automatic assignment on submission, initial manual assignment of unassigned requests, clarification and read-only status history. Later confirmation/cancellation/completion, coordinator handover, equipment, attendee registration, change-request and notification features are outside the current application. KAN-12 venue search is integrated; remaining venue application work stays in Sprint 2, with schema foundations retained; see the [scope audit](../docs/requirements/README.md#30-september-sprint-scope-audit).
- KAN-51 venue availability calendar at `/venues/availability` for event coordinators, venue staff and technical support staff (`src/features/venues`). It shows one Singapore week per venue, distinguishing available time, confirmed bookings, blocked periods and closed hours, with week navigation, refresh, a venue picker and shareable `?week=&venue=` links. The coordinator review page links to the week of the event's proposed start.
- KAN-52 suitability at `/reviews/:id/venue-suitability`, linked from the assigned coordinator's review. Shows the event's source requirements, current venue capabilities, explicit interpretation and confirmation, and explained Suitable / Unsuitable / Needs review results. Rechecking reads current data; changed event requirements invalidate the old interpretation. No booking or event mutation occurs.
- KAN-55 Venue Staff block management at `/venue-blocks`: choose a venue, create a reasoned block, inspect saved periods or remove a block.
- KAN-8 venue booking queue/outcomes at `/venue-bookings` and detail at `/venue-bookings/:id`. Venue Staff review pending requests and record a decision; assigned coordinators read their booking outcomes. Other roles are denied before booking content loads. KAN-53 adds **Venue booking requests** to the assigned coordinator's review detail at `/reviews/:id`: choose an active venue, enter Singapore timing and optional layout/notes, then **Request this venue**. The panel is coordinator-only; successful submission saves Pending, while conflicts leave the form available for correction.

The creation, draft-editing and submission interfaces are integrated. Hosted organiser checks cover approval/rejection display and refresh, signed-out detail access, Draft/Submitted detail states and another organiser's denied detail access and empty list (MAN-20260917-01 through MAN-20260917-04). Opening `/events` directly after signing out showed a sign-in prompt without request names or statuses (MAN-20260917-05). The request list showed matching Draft, Submitted, Rejected and Approved labels, and Draft/Submitted detail statuses and review messages remained correct after refresh (MAN-20260917-06). The hosted submission-to-status check and acceptance of the newer planning features remain pending in [test evidence](../docs/testing/test-evidence.md). Express authenticates event API calls and enforces roles, ownership and current coordinator assignment. Frontend navigation and action flags do not replace those checks.

## KAN-16 organiser request list and detail

`EventRequestsPage.vue` loads `GET /api/events?scope=all` through the feature's `api/event-requests.ts` wrapper. It preserves the API's latest-update order and shows names, readable status labels and update times in Asia/Singapore. Unnamed drafts have an explicit fallback title. Draft titles link to `/events/:id/edit`; other titles link to `/events/:id`. The `/events/new` route renders `EventRequestForm.vue` through `NewEventPage.vue`, creates a draft with `POST /api/events`, and updates that saved draft for later saves before submission. Refresh retrieves current values; empty results and retryable failures have separate states.

The new-request form and existing-draft editor include registration capacity and opening/closing times, with conditional validation when registration is required. These are request settings; attendee registration is future work.

`EventRequestDetailPage.vue` reads `GET /api/events/:id`, showing request fields, status and a saved outcome with its reason and recorded time. All times use Asia/Singapore. Reasons remain plain text with line breaks. Missing reviews are distinguished from drafts awaiting submission and decided requests whose review details are unavailable. A draft with `actions.canEditDraft` exposes an Edit draft link and a Submit for review action; the editor saves the current form before submitting. Non-draft details mount `EventPlanningPanels.vue` for assignment, clarification and read-only status history. Assignment controls appear only when the request has no coordinator, its assignment history loaded successfully without an active record, and its status permits initial assignment. An existing coordinator cannot be replaced. `StatusHistoryPanel.vue` refreshes after a status change and exposes no later lifecycle mutations. Organisers cannot make coordinator approval/rejection decisions.

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
| Venue booking decisions/outcomes     | Tristan | `src/features/venues`                        | KAN-8               |
| Venue availability calendar          | Ernest  | `src/features/venues`                        | KAN-51              |
| Health checks                        | Shared  | `src/features/system`                         | Shared foundation   |

Arvin supports cross-feature integration, end-to-end testing and resolving integration issues after database setup.

Keep domain-specific components, API wrappers, and tests in their feature directory. Promote components to `src/components` only when they are shared. Place API transport behavior in `src/lib/api-client.ts` and coordinate route changes in `src/app/router.ts`.

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

`ReviewAccessPage.vue` protects `/reviews`, `/reviews/unassigned` and `/reviews/:id`. It waits for session loading to finish and mounts the child page only for an event coordinator. Other users do not see review links in the sidebar or overview; direct navigation shows a sign-in or coordinator-only message. Account changes and sign-out unmount the previous child and cancel pending reads. A current API 401 clears the expired local session, and stale responses cannot restore a previous account's data. This page boundary preserves the shared backend's role-aware listing and detail contracts; organisers still use `/events` for their own requests.

Component tests in `ReviewAccessPage.test.ts` and browser fixtures in `tests/e2e/review-access.spec.ts` cover these access and session transitions. The [test evidence](../docs/testing/test-evidence.md) records the review-queue defect and automated regression results under MAN-20260917-07 and AUTO-20260917-07/08. The organiser queue recheck passed on 18 September (MAN-20260918-01): after reload the Review queue link was absent, and direct `/reviews` navigation showed Coordinator access only without request data. This recheck did not cover `/reviews/:id` or the remaining role/session scenarios.

`src/features/reviews/components/ReviewDecisionPanel.vue` provides approval/rejection controls for a single event request. KAN-33's `ReviewRequestPage.vue` mounts it and supplies API calls and feedback; `ReviewQueuePage.vue` lists requests. The panel itself does not fetch requests, authenticate users or call the review endpoint.

The shared GET retains the flat event fields and adds `review` and `actions`. The page consumes these fields, enables decisions only when the backend allows them, and keeps a saved outcome and reason visible after decision actions become unavailable. It reloads the detail after a successful write.

Hosted approval and rejection checks passed, including outcome display after reload, hidden decision controls and removal from the pending queue. The [test evidence](../docs/testing/test-evidence.md) records the dated results and remaining unauthorised-access and organiser-workflow checks.

The parent page supplies:

- `request`: the current request's `id`, `status` and nullable `review`, read from the server. The review includes the recorded decision and reason. Initial decisions require `SUBMITTED` or `UNDER_REVIEW`, no recorded review, and explicit `canMakeInitialDecision` permission from the server. Other statuses cannot be reviewed by this panel.
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

## KAN-8 venue booking decisions

The booking pages use `src/features/venues/api/venue-bookings.ts`. The staff list contains pending requests; the coordinator list contains all booking statuses for events currently assigned to that coordinator. Both open the same booking detail. It displays stored booking times/layout/notes alongside the latest event timing, attendance, venue requirements and accessibility needs, then the recorded decision, optional reason and timestamp. These event fields are current values, not a submission snapshot.

Only Venue Staff see decision controls for a pending booking. The optional reason is limited to 2,000 characters and sent as plain text; blank text becomes `null`. Saving disables duplicate actions. A 409 conflict automatically refreshes the detail read; an uncertain network/server result requires manual Refresh booking before another attempt; a saved decision remains readable with no new decision controls. Signed-out/wrong-role access, account changes and expired sessions clear protected content. The server rechecks eligibility and permissions for every request.

The coordinator's event-review page links to its booking outcomes using `eventRequestId`; staff can inspect booking-specific event information without receiving access to the wider coordinator event-review routes. Follow the [KAN-8 manual guide](../docs/testing/README.md#kan-8-hosted-verification) with provisioned staff/coordinator accounts and existing synthetic pending rows. No booking-creation interface or hosted acceptance is implied.
