# ConnectSphere frontend

**29 October 2026 registration update:** `/registrations` lets an authenticated attendee view their own saved registrations and confirm a withdrawal. `/events/:id/registrations` provides the current organiser/coordinator roster. The views clear data on identity or route changes and defer all authorization and eligibility decisions to the API. KAN-14 still owns event discovery and registration creation.

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
- KAN-9 Technical Support-only equipment event picker at `/equipment/availability` and saved/unsaved what-if checks at `/equipment/availability/:id`, with per-item stock and shortfall results.
- KAN-10 event completion panel (`EventCompletionPanel.vue`, in the planning panels of the review and organiser pages): the assigned coordinator marks an ended CONFIRMED event completed behind a confirmation, and the organiser and coordinator see the saved outcome. The server decides whether the event has ended.
- KAN-14 attendee pages at `/attend` and `/attend/:id` (`src/features/registrations`): open events and the attendee's own registrations, an event's details and registration conditions, and registration with a single button and no personal-data form. Attendee-only; an Events link shows for attendees.
- KAN-18 Technical Support equipment stock at `/equipment/stock` (`src/features/equipment`): quantities, operational status, an update form with reason and stale-form recovery, reservations the stock no longer covers and recent changes.
- KAN-26 saved equipment reservations on the same event page: full-line confirmation, reasoned cancellation, live readiness and retained history; confirmed events are read-only.
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
- KAN-79 Coordinator Lead assignment and active-event oversight at `/lead`, with KAN-65 reassignment at `/lead/oversight/:id`. Valid organiser submission now waits for a Lead allocation; historical KAN-29 automatic assignments remain readable. Clarification and read-only status history remain available to the owning organiser/assigned coordinator. KAN-64 provides the integrated in-app outcome notices below.
- KAN-64 notification inbox at `/notifications` (`src/features/notifications`) with a bell and unread count in the top bar, refreshed every 60 seconds while the page is visible. It lists the caller's notifications, with mark one and mark all read; links open only what the caller may still see.
- KAN-50 Venue Staff catalogue at `/venue-catalogue` and `/venue-catalogue/:id`. KAN-77 adds setup/turnaround fields in whole minutes from 0 to 1,440; stale buffer saves show a conflict and offer **Reload current values**. Saved buffers are planning inputs only until KAN-78 adds interval calculations and KAN-77 AC6 booking re-evaluation/warnings.
- KAN-51 venue availability calendar at `/venues/availability` for event coordinators, venue staff and technical support staff (`src/features/venues`). It shows one Singapore week per venue, distinguishing available time, confirmed bookings, blocked periods and closed hours, with week navigation, refresh, a venue picker and shareable `?week=&venue=` links. The coordinator review page links to the week of the event's proposed start.
- KAN-52 suitability at `/reviews/:id/venue-suitability`, linked from the assigned coordinator's review. Shows the event's source requirements, current venue capabilities, explicit interpretation and confirmation, and explained Suitable / Unsuitable / Needs review results. Rechecking reads current data; changed event requirements invalidate the old interpretation. No booking or event mutation occurs.
- KAN-55 Venue Staff block management at `/venue-blocks`: choose a venue, create a reasoned block, inspect saved periods or remove a block.
- KAN-8 venue booking queue/outcomes at `/venue-bookings` and detail at `/venue-bookings/:id`. Venue Staff review pending requests and record a decision; assigned coordinators read their booking outcomes. Other roles are denied before booking content loads. KAN-53 adds **Venue booking requests** to the assigned coordinator's review detail at `/reviews/:id`: choose an active venue, enter Singapore timing and optional layout/notes, then **Request this venue**. The panel is coordinator-only; successful submission saves Pending, while conflicts leave the form available for correction.

The creation, draft-editing and submission interfaces are integrated. Hosted organiser checks cover approval/rejection display and refresh, signed-out detail access, Draft/Submitted detail states and another organiser's denied detail access and empty list (MAN-20260917-01 through MAN-20260917-04). Opening `/events` directly after signing out showed a sign-in prompt without request names or statuses (MAN-20260917-05). The request list showed matching Draft, Submitted, Rejected and Approved labels, and Draft/Submitted detail statuses and review messages remained correct after refresh (MAN-20260917-06). The hosted submission-to-status check and acceptance of the newer planning features remain pending in [test evidence](../docs/testing/test-evidence.md). Express authenticates event API calls and enforces roles, ownership and current coordinator assignment. Frontend navigation and action flags do not replace those checks.

## KAN-16 organiser request list and detail

`EventRequestsPage.vue` loads `GET /api/events?scope=all` through the feature's `api/event-requests.ts` wrapper. It preserves the API's latest-update order and shows names, readable status labels and update times in Asia/Singapore. Unnamed drafts have an explicit fallback title. Draft titles link to `/events/:id/edit`; other titles link to `/events/:id`. The `/events/new` route renders `EventRequestForm.vue` through `NewEventPage.vue`, creates a draft with `POST /api/events`, and updates that saved draft for later saves before submission. Refresh retrieves current values; empty results and retryable failures have separate states.

The new-request form and existing-draft editor include registration capacity and opening/closing times, with conditional validation when registration is required. These are request settings; attendee registration is future work.

`EventRequestDetailPage.vue` reads `GET /api/events/:id`, showing request fields, status and a saved outcome with its reason and recorded time. All times use Asia/Singapore. Reasons remain plain text with line breaks. Missing reviews are distinguished from drafts awaiting submission and decided requests whose review details are unavailable. A draft with `actions.canEditDraft` exposes an Edit draft link and a Submit for review action. When submission fails, the page lists the server's per-field messages for missing and invalid values (KAN-6-AC101) and keeps the draft and its actions; the editor saves the current form before submitting. Non-draft details mount `EventPlanningPanels.vue` for assignment, clarification and read-only status history. Assignment history is read-only for organisers and regular coordinators. Initial assignment controls are confined to the Lead allocation page and require the server's `canAssignCoordinator` capability, an active request, no coordinator, and history loaded successfully without an active record. Replacing an existing coordinator uses the separate KAN-65 handover form on that Lead page. `StatusHistoryPanel.vue` refreshes after a status change and exposes no later lifecycle mutations. Organisers cannot make coordinator approval/rejection decisions.

Signing out or changing accounts clears previous results and cancels pending reads. The detail view also discards responses for a previously opened request. A 401 clears cached identity and offers sign-in, so the login page can show its form again. Failed reads hide previous request data. On the detail page, 403/404 responses show the same unavailable/no-permission message, while network/server failures offer Try again.

Component tests cover loading, labels, status refresh, recorded and absent outcomes, access failures and stale responses. `tests/e2e/event-requests.spec.ts` and `tests/e2e/event-request-detail.spec.ts` cover desktop/mobile layout, list/detail navigation, reload, retry, denied access and session-expiry navigation using API response fixtures. These fixtures do not prove hosted authentication or persistence. The [test register](../docs/testing/test-evidence.md) records the separate manual checks and remaining acceptance coverage.

## KAN-79 Coordinator Lead allocation

`EVENT_COORDINATOR_LEAD` is a separate authenticated role. The sidebar and overview expose an Assignment queue link for this role; regular coordinators retain only their assigned review workflow. `LeadAccessPage.vue` protects `/lead`, `/lead/oversight` and `/lead/oversight/:id`. Signed-out or wrong-role visitors do not trigger allocation data reads. The old `/reviews/unassigned` URL redirects through this same Lead gate.

- **`/lead` — Assignment queue:** reads submitted, unassigned requests and available coordinator options. The Lead explicitly selects a coordinator; there is no default self-selection. A successful allocation removes that queue row and provides a link to its retained allocation record. Empty queues and no available coordinators have separate messages.
- **`/lead/oversight` — Event oversight:** reads all active non-draft events in `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` or `CONFIRMED`, showing organiser, current coordinator and status. Drafts and closed events are excluded.
- **`/lead/oversight/:id` — Event allocation:** reads basic event requirements, current allocation and assignment history. Initial assignment is available only when the server returns `actions.canAssignCoordinator: true`, the request is in an active state, and no current coordinator/history row exists. KAN-65 reassignment additionally requires `actions.canReassignCoordinator: true` and a version matching the single active history row and current coordinator. The page does not mount approval/rejection, clarification, booking or status-changing controls.

The API wrapper is `src/features/events/api/assignments.ts`. Queue reads use `GET /api/events/unassigned`; available targets use `GET /api/events/coordinators`; oversight uses `GET /api/events/oversight` and `GET /api/events/oversight/:id`. An explicit allocation uses `PUT /api/events/:id/coordinator` with `{ coordinatorId, note? }`; the note is optional and limited to 2,000 characters. `GET /api/events/:id/assignments` supplies history, retaining historical `AUTOMATIC` entries with no invented staff actor. Leads use the dedicated oversight DTO rather than the coordinator review-detail endpoint. Express independently enforces role, request state and target availability on every write.

`AssignmentPanel.vue` is shared with organiser/coordinator detail pages, where it only displays history. On the Lead detail it offers initial allocation or KAN-65 reassignment according to the current server capability. `409 COORDINATOR_ALREADY_ASSIGNED` refreshes persisted allocation/history; `ASSIGNMENT_HISTORY_CONFLICT` reports the consistency problem for investigation. An unavailable target produces the server's `INVALID_COORDINATOR` message. A network/server/unreadable-response result may have saved successfully, so controls remain blocked until **Refresh** (queue) or **Refresh assignment** (detail) reconciles persisted state. Refresh does not repeat the write.

All Lead pages wait for session restoration and clear protected state on sign-out, account changes or role changes. Reads and writes are aborted on departure; late responses, including a previous account's 401, cannot restore old data or clear the new account. Current 401 responses clear the cached identity and return to the sign-in gate. Duplicate writes are disabled while saving. Detail navigation invalidates the previous request's pending work.

Component and route tests are in `LeadAccessPage.test.ts`, `UnassignedRequestsPage.test.ts`, `AssignmentPanel.test.ts`, `assignments.test.ts` and `AppShell.test.ts`. They cover allowed/denied roles, queue and overview states, all five active detail states, explicit target selection, conflict/uncertain-result recovery, read-only historical assignments, and stale session/request responses. Browser fixtures cover the entry paths separately; hosted login, real account provisioning, persistence and acceptance still require the manual steps and actual run records in the [testing guide](../docs/testing/README.md) and [test evidence](../docs/testing/test-evidence.md).

### KAN-65 reassignment — 19 October 2026

On **Event allocation**, a Lead selects another available coordinator and enters **Reason for reassignment**. The current coordinator is excluded from the choices. Blank reasons and reasons over 2,000 trimmed characters cannot be submitted. The API wrapper sends `POST /api/events/:id/coordinator/reassign` with `{ coordinatorId, reason, expectedAssignmentVersion }`; the version is the active assignment UUID supplied by the detail endpoint. Missing/mismatched versions, multiple active rows and inconsistent current coordinator/history prevent the form from appearing.

A confirmed response displays the previous and new coordinator with the reason, then refreshes both the detail context and history. A server `changed: false` result is displayed as unchanged rather than claiming another handover. On `403`, `404` or `409`, the component clears the target and refreshes permission/version information; stale submissions are not automatically replayed. An invalid target reloads available choices. Network/server errors, unreadable JSON or malformed successful responses leave the outcome unconfirmed and block another write until **Refresh assignment** reconciles the saved state. The returned assignment ID/version changes only for a real handover.

The panel clears protected data, reason and saved messages on account, role or event changes and ignores late responses. A Lead retains oversight after handover; the old coordinator's subsequent protected requests are denied by the backend and the new coordinator uses the existing review/planning pages. The Lead role itself still does not grant those actions. Migration 007 application and Lead login were reported successful; the shared manual workflow checks remain **Not executed** and will run after the remaining features are finished. Notification delivery remains KAN-64 work. See [AUTO-20261019-02](../docs/testing/test-evidence.md#19-october-2026--kan-65-coordinator-reassignment) for local automated verification and the separate setup report.

**21 October integration follow-up:** KAN-64 now records handover notices for the organiser, new coordinator and previous coordinator. The previous coordinator's notice contains no event details or link after access is lost. The inbox and unread counter clear on session changes, and pending actions cannot restore another account's rows or read state. The backend rechecks recipients and target permissions; a successful assignment response does not prove that anyone has opened their inbox. Shared migration 008 and hosted workflow checks remain pending. The combined venue backend additionally requires migration 009 before catalogue, search, suitability and calendar use.

## KAN-9 equipment availability

`src/features/equipment/` contains the typed API wrapper, Singapore-time and quantity validation, access boundary, eligible-event list and event assessment page. Technical Support Staff can inspect saved types, quantities and dates, or enter a clearly labelled unsaved what-if item list/window. Requirements text is displayed for reference and is never guessed into stock quantities. The assessment distinguishes **Fulfillable** from **Shortfall / Unfulfillable**, highlights each deficit, and shows current total, damaged, maintenance, operational, peak reserved and available quantities. It neither saves the form nor reserves stock.

Saved checks use current event dates and server-loaded lines; mismatched saved dates require reconciliation. What-if checks include all reservations, including this event's existing reserved lines. Changing mode, dates or items immediately invalidates a displayed/pending result. A source-version conflict refreshes the context, clears the unsaved form and asks for a new check; it does not replay the old input. Refresh, navigation, account changes, role changes and sign-out clear protected data and abort pending requests. Only the current session's 401 clears that session; other-role users see the access gate before event data loads.

The user reports migration 014 and test accounts ready for availability checks; migration 015 is additionally required for the reservation panel below and has no recorded shared application. Stock maintenance and request editing remain KAN-18/KAN-63 dependencies. Component tests beside the feature and `tests/e2e/equipment-availability.spec.ts` use API fixtures; real database behavior is covered separately in `database/tests/equipment/availability.integration.test.ts`. Browser fixtures do not establish manual integrated acceptance. Record connected manual results through the [testing guide](../docs/testing/README.md); KAN-9 manual cases remain **Not executed**.

## KAN-26 saved equipment reservations

`EquipmentReservationPanel.vue` opens saved requests through **Load saved reservations** on the equipment detail page. Only Technical Support sees it. Reservations use saved IDs, full quantities and the server source version; no what-if form value is sent to a mutation. An approved event can reserve a requested line or cancel a reserved line with a trimmed reason of 1–2,000 characters. Confirmation shows the equipment, full quantity and Singapore-time period. Confirmed events show read-only reservations; no saved requirements means no reservation action and never a ready outcome.

The panel displays active/reserved counts and server-derived readiness, including later operational stock losses, and preserves cancelled-line decision/release history. A mutation clears prior availability success immediately and suppresses readiness success while saving. Success uses the authoritative returned reservation context and refreshes the KAN-9 source/status/version. If that refresh fails, the save acknowledgement remains but further checks are disabled until a successful refresh. Conflicts and uncertain network outcomes clear confirmation and reload saved data; they do not replay a write or claim success. Account, role, route and refresh changes discard pending results. Aborting a client request does not undo a server transaction already committed.

`equipment-reservations.ts` contains the typed API calls. `EquipmentReservationPanel.test.ts` and `EquipmentReservationWorkflow.test.ts` cover action confirmation, permissions, idempotent responses, readiness, cancellation validation and stale-response boundaries. `tests/e2e/equipment-reservations.spec.ts` uses mocked authenticated responses; separate database integration establishes stock locking, persisted history and in-app notification behaviour. Shared migration 015 application and connected manual acceptance are **Not executed**. Until KAN-63 exists, use only team-agreed saved test requests; the page does not create requests. KAN-18, KAN-62 and KAN-10 remain separate stock/lifecycle workflows.

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

`ReviewAccessPage.vue` protects `/reviews` and `/reviews/:id`. The legacy `/reviews/unassigned` route redirects to the separately guarded Lead assignment queue at `/lead`. It waits for session loading to finish and mounts the child page only for an event coordinator. Other users do not see review links in the sidebar or overview; direct navigation shows a sign-in or coordinator-only message. Account changes and sign-out unmount the previous child and cancel pending reads. A current API 401 clears the expired local session, and stale responses cannot restore a previous account's data. This page boundary preserves the shared backend's role-aware listing and detail contracts; organisers still use `/events` for their own requests.

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

## 25 October 2026 closeout corrections

Venue Staff can decide a linked replacement for a confirmed event; ordinary confirmed bookings remain blocked. Hold deadlines use the buffered occupied start. Catalogue buffer warnings show event identity and readable reasons, and review timestamps use Singapore time. Component and fixture-based browser regressions pass; they do not replace the [manual retest](../docs/testing/README.md#25-october-2026--closeout-retest) on the current integrated app.

**KAN-66 — 26 October 2026.** `/events/:id/details` (`EventDetailsEditPage.vue`) edits a submitted request (owner, before approval) or the name/description of an approved event (assigned coordinator). It shows only the fields listed in the detail response's `actions.editableFields`, sends changed fields with `expectedRevision`, and after `409 EVENT_REVISION_CONFLICT` disables saving and offers **Reload latest details**. The review page and clarification panel send the displayed revision with decisions, start review and questions.

**KAN-15 — 27 October 2026.** `/events/:id/change-request` (`EventChangeRequestPage.vue`) lets the owner of an approved or confirmed event request significant changes; only changed fields are sent with `expectedRevision`. `ChangeRequestPanel.vue` (in `EventPlanningPanels`) shows the pending request with current vs requested values and its effect on arrangements, approve/reject for the assigned coordinator, withdraw for the owner, and history. Shared field labels are in `features/events/change-request-fields.ts`.

## KAN-62 / KAN-63 workflow integration — 28 October 2026

Assigned coordinators use equipment arrangements on `/reviews/:id`; Technical Support uses `/equipment-requests` to reserve a complete line or reject with a reason. Reserved lines have an explicit replacement confirmation and the replacement requires another review. Forms carry opaque source revisions, use the exact event period, refresh after KAN-15 event revisions and preserve legacy notes. Conflicts and uncertain responses require refresh before another deliberate action. Account/route changes abort pending work and clear protected information.

Owning organisers/current coordinators can cancel eligible events with a reason and explicit arrangement confirmation. A lost response is reconciled with the saved cancellation outcome before another submission. The notification inbox exposes a private generic outcome to affected attendees. Component and browser fixture checks are linked in AUTO-20261028-PR63-01; those tests substitute authentication/API responses and do not replace connected manual acceptance.

**KAN-82 — 28 October 2026.** `VenueBookingPanel.vue` adds **Cancel arrangement** on each live row of an approved or confirmed event (a confirmation naming the event, venue and period, with a required reason) and **Request replacement** on a cancelled row with no live replacement, which prefills `replacesBookingId`. Rows show Replaces / Replaced by links; after a conflict or unconfirmed result the panel asks for a refresh before another cancel.

## KAN-82 arrangement suitability and KAN-84 current-review state — 30 October 2026

Each eligible saved venue arrangement now has **Check suitability**, opening `/reviews/:id/venue-suitability?bookingId=<id>`. `VenueSuitabilityPage.vue` shows its saved venue, interval, layout, notes and status alongside the parent event requirements. Venue and saved layout are read-only; the coordinator interprets facilities/accessibility and unresolved requirements, then explicitly confirms that interpretation. Saved layouts retain the booking API's 2,000-character limit; the original event-based mode keeps its 100-character interpretation limit. The assessment is advisory and does not change the event or booking.

The server uses the selected arrangement's own period and layout, checks current venue capabilities, buffers, blocks and other occupying bookings, and excludes only the selected booking from self-conflict checks. The original event-based mode excludes none. A changed arrangement or parent source requires a refreshed context and new confirmation. Booking-query, event and account changes clear the old form/result and cancel pending assessments; current server authorization still decides whether the record can be read. Component and browser/UI integration regressions are in `VenueSuitabilityPage.test.ts`, `VenueBookingPanel.test.ts` and `tests/e2e/venue-suitability.spec.ts`.

`SafetyReviewPage.vue` at `/safety-reviews/:id` clears the previous review, decision draft and messages on route, reviewer, role or session-loading changes. It ignores late responses after leaving that context, including responses arriving after a later return to the same review. Old responses cannot announce a decision on another review, sign out another reviewer, unlock a new save or refresh another route. Saving and the subsequent current-state read keep decision controls unavailable. A failed response triggers reconciliation without claiming the decision was saved; if the read also fails, reload the page before retrying. The server's fingerprint, authorization and immutable-decision checks remain authoritative. `SafetyPages.test.ts` and `tests/e2e/safety-review.spec.ts` cover the controlled client response ordering.

For KAN-80, the organiser's significant-change submission already produces the coordinator's **Change request to review** action prompt and the organiser's submission acknowledgement. The coordinator notification links to `/reviews/:id?change=<changeId>`; the organiser link uses `/events/:id?change=<changeId>`. Notification visibility and destination access are rechecked against current ownership/assignment. This uses the existing submission workflow; no separate coordinator-to-organiser request-for-action transition is introduced.

Connected manual acceptance for these focused changes is **Not executed**. Use TC-12-20, TC-06-445 and TC-20-431 in the [30 October local E2E acceptance section](../docs/testing/README.md#30-october-2026--focused-local-e2e-acceptance-for-kan-80-kan-82-and-kan-84). Automated component and API-fixture browser results do not establish these real-authentication/database journeys.

## Date/time entry and review shortcuts — 31 October 2026

Use native segmented `datetime-local` inputs with `max="9999-12-31T23:59"`, matching `EventRequestForm.vue`. This bounds the year to four digits and lets Chromium advance into the time segment after typing a complete year. The policy also covers venue search, bookings, operational blocks, hold deadlines and dynamic event edit/change fields. Date-only calendar entry uses `max="9999-12-31"`; venue opening/closing times already use native `time` controls. Keep existing validation and Singapore-time conversion; no custom key interception is needed. Native segment order/rendering follows the browser and locale.

The equipment what-if checker uses `step="0.001"` and `max="9999-12-31T23:59:59.999"`. Native pickers show milliseconds, while the raw source retains all six fractional digits until that specific field is edited. The page shows an exact retained value when it differs from the picker. Editing one time never rounds the untouched other time. The backend's microsecond precision and positive-interval rules are unchanged.

Coordinator review shortcuts use a labelled navigation list with consistent underlines, focus-visible links, two desktop columns and one mobile column. Existing destinations and permission conditions remain intact. Browser regressions in `venue-search.spec.ts`, `equipment-availability.spec.ts` and `review-decision.spec.ts`, plus the equipment component tests, are recorded in [AUTO-20261031-MINOR-UI](../docs/testing/test-evidence.md#auto-20261031-minor-ui--date-entry-consistency-and-review-links). Full local manual E2E acceptance remains separate.
