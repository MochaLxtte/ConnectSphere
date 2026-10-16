# Sprint 1 backlog and acceptance test plan

**Record check — 15 October 2026:** this is the historical Sprint 1 scope and test record. Later repairs and current Jira statuses for KAN-6/KAN-33/KAN-34 are tracked in the [Sprint 2 review register](../sprint-02/review.md#baseline-and-later-delivery-register--15-october-2026). Preserve criterion IDs, superseded assumptions and actual run dates; later passing tests do not turn an unrecorded Sprint 1 case into a historical pass. The version of the criteria adopted at Sprint 1 review remains **Not recorded**.

**Sprint window: 6–19 September 2026, inclusive (Asia/Singapore). Status: closed in Jira following the completed review.** At Sprint Planning on Sunday 6 September, the team committed to the nine user stories and separate KAN-24 infrastructure PBI listed below. Seven items closed Done for 24 points; KAN-6, KAN-33 and KAN-34 carried 8 points into Sprint 2. The current Jira snapshot corroborates these statuses, points and owners; exact meeting times and original tracker evidence remain to be retained. Feature links map the backlog items to the project's core requirements.

The cards below retain the **local implementation criteria, task splits and historical test references**. The current Jira descriptions and 79 functional-story acceptance criteria have now been reviewed; they are not a verbatim match for these broader local criteria. Use the [current-version reconciliation](#current-jira-reconciliation--21-september) before treating the cards as the adopted Jira version. Story owners are assigned below; individual development capacity is still to be recorded. Local task IDs are documentation references for creating or linking Jira subtasks. Preserve the reviewed export with its capture metadata and the criteria version adopted at planning/review.

Use [planning](planning.md) for the commitment and decisions, [estimation and capacity](estimation-and-capacity.md) for actual estimates and availability, and [daily progress](daily-progress.md) for dated changes. Assess completion against the team's adopted [definition of done](../definition-of-done.md), then record actual outcomes in the [review](review.md), [retrospective](retrospective.md) and [evidence index](evidence/README.md).

## Committed backlog

The nine committed user stories, **including KAN-27**, total **27 story points**. **KAN-24 is a separate 5-point infrastructure PBI**, giving a **32-point Sprint 1 commitment across 10 PBIs**. KAN-33 and KAN-16 are the team's 2-point reference stories for relative estimation. KAN-24 covers shared database foundations; individual business implementations and their tests stay with the functional stories. The closure outcome is **24 Done + 8 unfinished = 32**; supporting tasks are not estimated again.

| Jira item | Story slice | Owner | Proposed reviewer | Agreed points | Selection | Feature link |
| --- | --- | --- | --- | ---: | --- | --- |
| KAN-25 | Authenticate users and enforce agreed access rules | Ryan | Irfan or Tristan | 5 | Committed | CF-01 |
| KAN-31 | Start a new event request | Ernest | Kai Jie | 3 | Committed | CF-02 |
| KAN-4 | Save an incomplete draft | Ernest | Kai Jie | 3 | Committed | CF-03 |
| KAN-34 | Resume and edit an owned draft | Kai Jie | Ernest | 3 | Committed | CF-03; partial CF-07 |
| KAN-6 | Submit a valid draft | Kai Jie | Ernest | 3 | Committed | CF-02 |
| KAN-33 | View submitted requests permitted by the access policy | Irfan | Ryan or Tristan | 2 | Committed | CF-04 |
| KAN-36 | Approve or reject an eligible request | Tristan | Irfan | 3 | Committed | CF-04 |
| KAN-16 | View current event-request status | Tristan | Irfan | 2 | Committed | CF-06 |
| KAN-27 | Request clarification | Irfan | Ryan or Tristan | 3 | Committed | CF-04 |
| KAN-24 | Verify and evolve database/integration foundations | Arvin | Ryan | 5 | Committed infrastructure PBI | Supports the selected stories |

**Implementation snapshot, 15 September:** Supabase login and server-side identity/access checks are connected. The backend supports owned-draft editing/submission and shared request detail. The coordinator queue/detail and approval/rejection interface are connected, including recorded outcomes and refresh. Tristan's hosted approval check changed a synthetic request from `SUBMITTED` to `APPROVED`. KAN-16 still needs the organiser list/status interface and an organiser list API covering submitted and decided requests; the current organiser list returns drafts only. Full story acceptance and review remain outstanding. This snapshot does not change the original commitment or mark any item Done.

**Integration snapshot, 20 September, after the Sprint 1 window:** request creation, draft saving/editing, KAN-6 submission, KAN-16 list/detail, coordinator review and clarification were connected in the integrated code. Assignment and the later release workflows were also present, without adding PBIs or points to Sprint 1. This integration note initially left acceptance and review evidence unreconciled. The confirmed review date is 19 September; its outcomes are recorded in the closure table below. Earlier test rows retain their recorded scope, and the later integrated code alone does not establish delivery by 19 September.

## Closure and carry-over

The [review record](review.md) contains the detailed demo outcomes, defects and Jira dispositions. This closure table supersedes earlier implementation snapshots and unfinished task descriptions below; those retain the sequence of work rather than establishing new completion dates.

| Item | Owner | Points | Closure disposition | Review evidence / remaining work |
| --- | --- | ---: | --- | --- |
| KAN-25 | Ryan | 5 | Done in Jira | DEMO-01/08 passed. |
| KAN-31 | Ernest | 3 | Done in Jira | Creation accepted; assist with shared-form regression work if needed. |
| KAN-4 | Ernest | 3 | Done in Jira | Draft persistence accepted; registration editing defect carried under KAN-34. |
| KAN-34 | Kai Jie | 3 | Carried to Sprint 2 | DEMO-03 passed basic editing; S1-DEF-01 registration fields remain incomplete. |
| KAN-6 | Kai Jie | 3 | Carried to Sprint 2 | DEMO-04/05 passed tested paths; S1-DEF-03/04 require saved-draft and mandatory-field retests. |
| KAN-33 | Irfan | 2 | Carried to Sprint 2 | S1-DEF-02: assigned approved requests need discoverable coordinator follow-up access. |
| KAN-36 | Tristan | 3 | Done in Jira | DEMO-07/09 passed; support follow-up access regression checks. |
| KAN-16 | Tristan | 2 | Done in Jira | DEMO-05/07 passed; recheck organiser status after carry-over fixes. |
| KAN-27 | Irfan | 3 | Done in Jira | DEMO-10 passed. |
| KAN-24 | Arvin | 5 | Done in Jira | DEMO-11 passed; retain setup and database test evidence. |

Carry-over retains the original estimates: **KAN-6 (3) + KAN-33 (2) + KAN-34 (3) = 8**. [Sprint 2](../sprint-02/sprint-backlog.md) contains these items plus nine new items at 35 points, for **43 points across 12 PBIs**. KAN-29 was not committed in Sprint 1 and is newly selected for Sprint 2 at 3 points. No partial completion points were credited to the three carry-over items.

Done dispositions record the team's Jira closure decision. Jira records KAN-16's resolution at **20 September, 23:06**, and the other six Done stories at **21 September, 00:26**; those timestamp fields do not specify a timezone. These later tracker updates are separate from the **19 September review and retrospective**. The adopted criteria version, original export and final board/CI evidence still need linking. Do not infer completion dates from commits or reconstruct daily burndown from the current snapshot.

## Current Jira reconciliation — 21 September

The reviewed current snapshot confirms **seven Done stories at 24 points and three In Review stories at eight points**, with the recorded owners and estimates unchanged. KAN-6 and KAN-34 remain assigned to Kai Jie; KAN-33 remains assigned to Irfan. Their Sprint 1 and Sprint 2 memberships preserve carry-over history. See the shared [Jira backlog audit](../../requirements/assumptions-and-questions.md#21-september-2026--jira-backlog-audit) for the pre-edit comparison and [applied refinements](../../requirements/assumptions-and-questions.md#21-september-2026--jira-updates-applied). The AC counts below describe the original reviewed export, before the dated additions.

| Jira story | Pre-edit export AC count | Reconciliation still needed |
| --- | ---: | --- |
| KAN-25 | 7 | Cross-reference the five named roles and event-relationship permissions to local access criteria; retain sign-out/session checks as supporting implementation coverage. |
| KAN-31 | 12 | Map each named event field, multiple-request creation and organiser-only creation to the broader local form criteria and tests. |
| KAN-4 | 7 | Map saved values, Draft identification/listing, distinction from submitted requests and coordinator-queue exclusion to the retained draft tests. |
| KAN-34 | 9 | Map draft discovery/opening/editing/save/reopen and unchanged Draft state; link the registration-controls carry-over defect. |
| KAN-6 | 8 | Map submission feedback, retained details, Submitted state and reviewer availability; specify the confirmed field/conditional-validation rules and link both submission defects. |
| KAN-33 | 7 | Map the listed submission fields, draft exclusion and protected access. Preserve the superseded local KAN-33-AC5 and later implementation checks as historical records; record post-approval navigation repair separately. |
| KAN-36 | 10 | Map recorded decisions, status updates, organiser outcomes and access denials. Four mandatory-reason refinement checks are now in Jira, with KAN-60 linked for implementation; prior tests do not establish enforcement of a mandatory reason. |
| KAN-16 | 9 | Map Draft, Submitted, clarification, Approved and Rejected labels, latest outcomes and unrelated-client isolation to the retained list/detail evidence. |
| KAN-27 | 10 | Map clarification/amendment creation, message and organiser visibility, including that clarification neither approves nor rejects the event. Response/edit/resubmission behaviour still needs a separate decision. |
| **Functional-story total** | **79** | Cross-reference the current Jira wording without renumbering local criterion or test IDs; record the version actually adopted. |
| KAN-24 | 0 explicit criteria | The description covers database setup and a database diagram. Five setup/schema/security/integration/diagram checks were added to Jira on 21 September with existing evidence references. Cross-reference the three retained local criteria and record outstanding hosted/diagram evidence. |

This review supplies the current descriptions, criteria, owners and status snapshot. It does not supply the original planning/closing board, a sprint report, daily burndown, or proof that the current wording was the version used on 6 or 19 September. Preserve the original reviewed export in the evidence collection with its actual capture time. The 32-point baseline, 24-point closure outcome and eight carried points remain unchanged; no new acceptance result follows from comparing descriptions.

## Planning questions and implementation decisions

- **Database hosting, decided 8 September:** use Supabase for PostgreSQL, with Express accessing it through the PostgreSQL driver. Follow the [technical decision](../../requirements/assumptions-and-questions.md#8-september-2026--hosted-postgresql) for verified TLS, Data API settings, ordered migrations and isolated test data. The ten-PBI, 32-point commitment is unchanged.
- **Authentication and access, updated 15 September:** Supabase Auth is implemented, with verified server sessions mapped to `app_users`. Organisers access their own requests; coordinator reads and decisions use the Sprint 1 assigned-coordinator policy. Account administration and broader role/triage rules remain open under Q-01/Q-02 in [customer questions](../../requirements/assumptions-and-questions.md). A client-supplied role or organiser ID must not grant access.
- **Draft versus submission, clarified 21 September:** event date and attendance are mandatory; inapplicable optional needs may be None / Not Required. Complete the field and conditional-registration validation table under Q-03 and agree which incomplete values may remain in drafts. Reconcile both new-request and saved-draft submission paths without changing earlier test results.
- **Story boundaries:** KAN-31 owns starting a new request and the initial form; KAN-4 owns persisting incomplete work; KAN-34 owns retrieving and editing an existing draft. They share a form and persistence contract. Confirm these detailed boundaries so that tasks and delivered outcomes do not double-count the same work. Preserve the agreed estimates unless the team explicitly records a revision.
- **Transitions and decisions, clarified 21 September:** event-request rejection requires a reason. Explicit Jira criteria and linked task KAN-60 now record this rule; verify UI/API enforcement and preserve the earlier optional-reason implementation record below. Clarification/resubmission, post-submission editing boundaries and final-confirmation prerequisites still need a permitted-transition table under Q-04/Q-05.
- **Coordinator assignment:** KAN-29 / CF-05 was **not committed Sprint 1 scope**. Earlier test fixtures assigned `coordinator_id` to the coordinator's `app_users.id` directly; the integrated application now has manual assignment. The review permits coordinators to select themselves or a colleague. Sprint 2 KAN-29 adds automatic selection of an available coordinator; manual assignment alone does not satisfy it. Selection/availability rules, no-candidate handling and reassignment authority still need refinement in [Sprint 2 planning](../sprint-02/planning.md).

Record decisions with their source, date and affected AC IDs before treating dependent criteria as ready. If a decision changes scope or estimates, preserve the original baseline and record the revision in planning and estimation.

## Story cards

The following cards preserve the planned scope and dated implementation breakdown. The closure table above gives current story dispositions; an old task description is not a new claim that implementation is absent. All path targets are relative to the repository root. Each task includes its relevant tests, code review and integration as part of the story effort.

### KAN-25 — Authentication and authorization

As a ConnectSphere user, I want to authenticate and access only permitted functions and event information so that I can perform my role without exposing other users' information.

**Owner / proposed reviewer:** Ryan / Irfan or Tristan. **Dependencies:** KAN-24; Q-01/Q-02; agreed Sprint 1 role scope.

- **KAN-25-AC1:** Given a valid test account in the agreed role scope, when the user signs in with valid credentials, then the server establishes the authenticated identity and the UI shows the corresponding signed-in state.
- **KAN-25-AC2:** Given invalid credentials or no authenticated session, when sign-in fails or a protected API is requested, then protected data is withheld and the UI/API gives the agreed failure response.
- **KAN-25-AC3:** Given an authenticated user without permission for an action or event, when that user changes a request ID, role or owner value in a direct API call, then access remains denied under the agreed actor/event policy.
- **KAN-25-AC4:** Given a signed-in user, when the user signs out, then the previous session can no longer access protected API data.

| Local task | Proposed implementation work |
| --- | --- |
| S1-25-01 | Record account/session and access contracts; extend `backend/src/modules/auth/types.ts` only as needed. |
| S1-25-02 | Supabase Auth handlers/session verification are implemented under `backend/src/modules/auth/`, with runtime event wiring in `backend/src/runtime-app.ts`. Keep `app_users.supabase_user_id` mappings and synthetic account fixtures aligned with Arvin; complete the remaining account-provisioning and acceptance checks. |
| S1-25-03 | Implement `frontend/src/features/auth/pages/LoginPage.vue`, session-aware `frontend/src/lib/api-client.ts` behavior and navigation in `frontend/src/app/router.ts`. |
| S1-25-04 | Implement S1-T01–S1-T04, including direct API tests; integrate event access checks with the other workstreams. |

### KAN-31 — Start a new event request

As an event organiser, I want to start a request and enter event information so that I can prepare an event for submission.

**Owner / proposed reviewer:** Ernest / Kai Jie. **Dependencies:** KAN-25; Q-03; shared contract with KAN-4/KAN-34.

- **KAN-31-AC1:** Given an authenticated organiser permitted to create requests, when the organiser starts a new request, then a form exposes the event fields agreed for this slice and allows those details to be entered.
- **KAN-31-AC2:** Given details entered in a new request, when the organiser chooses Save draft, then those details are passed to the shared draft-save flow and successful creation returns an identifiable request owned by the authenticated organiser.
- **KAN-31-AC3:** Given a rejected create/save operation, when the UI receives the validation or server error, then it shows actionable feedback and preserves the entered values for correction or retry.

| Local task | Proposed implementation work |
| --- | --- |
| S1-31-01 | Agree form field types and draft/submission boundaries in `backend/src/modules/events/types.ts` and `docs/architecture/api-contract.md` with Kai Jie. |
| S1-31-02 | Replace `frontend/src/features/events/pages/NewEventPage.vue` with the creation form; extract a shared form component under the events feature (new file) if needed by KAN-34. |
| S1-31-03 | Connect the form to KAN-4's save service, including pending/error feedback; implement S1-T05–S1-T07 without duplicating persistence work. |

### KAN-4 — Save incomplete drafts

As an event organiser, I want to save an incomplete request so that I can retain my progress before all submission details are available.

**Owner / proposed reviewer:** Ernest / Kai Jie. **Dependencies:** KAN-24/KAN-25; Q-03; KAN-31 form contract.

- **KAN-4-AC1:** Given a request missing fields allowed to remain incomplete in a draft, when the organiser saves it, then the permitted values persist as a draft without applying full submission requirements.
- **KAN-4-AC2:** Given a successfully saved draft, when it is retrieved in a subsequent session, then its identifier and saved values are retained and it has not entered the submitted review workflow.
- **KAN-4-AC3:** Given a draft belonging to another organiser, when an unrelated organiser attempts to overwrite it through the API, then the update is denied and the stored values remain unchanged.

| Local task | Proposed implementation work |
| --- | --- |
| S1-4-01 | Implement agreed draft validation and create/save service under `backend/src/modules/events/` (new files), deriving ownership server-side. |
| S1-4-02 | Add PostgreSQL draft persistence using `backend/src/db/pool.ts`; coordinate any new migration under `database/migrations/` with Arvin. |
| S1-4-03 | Add save feedback to the shared event form and implement S1-T08–S1-T10, including persistence and cross-owner denial. |

### KAN-34 — Resume and edit drafts

As an event organiser, I want to reopen and update my saved draft so that I can complete or correct it before submission.

**Owner / proposed reviewer:** Kai Jie / Ernest. **Dependencies:** KAN-4/KAN-25; Q-03/Q-05; shared form. This is draft editing only, not all CF-07 event-information changes.

- **KAN-34-AC1:** Given an owned saved draft, when the organiser selects it, then the edit form is populated with the persisted values.
- **KAN-34-AC2:** Given changes to permitted draft fields, when the organiser saves and reloads, then the changed values persist, omitted fields remain unchanged, and permitted explicitly cleared fields are cleared under the agreed update contract.
- **KAN-34-AC3:** Given a request the organiser cannot edit because of ownership or workflow state, when an edit is attempted through the API, then the request is refused and stored data remains unchanged.

| Local task | Proposed implementation work |
| --- | --- |
| S1-34-01 | Implement owned-draft retrieval and update behavior under `backend/src/modules/events/` (new files), reusing Ernest's persistence service. |
| S1-34-02 | Done, 19 September: draft discovery in `frontend/src/features/events/pages/EventRequestsPage.vue` now links a `DRAFT` row to a new edit route, `frontend/src/features/events/pages/EventDraftEditPage.vue` (`/events/:id/edit`). It loads the shared detail response, renders the form only when `actions.canEditDraft` is true, and PATCHes edited fields, converting Singapore-local input times to UTC instants. |
| S1-34-03 | Implemented, 19 September: 38 targeted frontend tests (`EventDraftEditPage.test.ts`, plus an updated `EventRequestsPage.test.ts` link assertion) cover S1-T12/S1-T13 population, not-editable state, PATCH save semantics, and 400/401/404/409 error handling; the full `npm run check` suite passed the same day. This is automated-fixture coverage only — no hosted Supabase Auth browser walkthrough (no provisioned test credentials in this environment); S1-T11 browser coverage remains open. |

### KAN-6 — Submit event requests

As an event organiser, I want to submit a complete draft for review so that a coordinator can assess my proposed event.

**Owner / proposed reviewer:** Kai Jie / Ernest. **Dependencies:** KAN-4/KAN-34/KAN-25; Q-03/Q-04; downstream reviewer-access agreement.

- **KAN-6-AC1:** Given an owned draft satisfying the agreed submission rules, when the organiser submits it, then submission is persisted and the request becomes eligible for the agreed review workflow.
- **KAN-6-AC2:** Given a draft that fails an agreed submission rule, when submission is attempted, then field-specific or actionable validation feedback is returned, saved draft data is retained, and no submission transition occurs.
- **KAN-6-AC3:** Given an unrelated actor or a request in a state that cannot be submitted, when submission is attempted directly through the API, then the action is refused without changing the request.
- **KAN-6-AC4:** Given repeated or competing submission attempts for the same draft, when they are processed, then the agreed repeat-request behavior is applied and no duplicate submission effects or inconsistent state are produced.

| Local task | Proposed implementation work |
| --- | --- |
| S1-6-01 | Record agreed submission rules and allowed source/target states in `docs/architecture/api-contract.md`; add validation/transition functions under `backend/src/modules/events/` (new files). |
| S1-6-02 | Implement the submit handler and atomic database update, including agreed repeat/concurrency behavior; coordinate the request shape with Irfan. |
| S1-6-03 | Done, 19 September: `EventDraftEditPage.vue` (KAN-34's draft editor) gained a "Submit for review" action. It saves the current form via `PATCH /api/events/:id`, then calls `POST /api/events/:id/submit` and navigates to the read-only detail page on success; a submission error (e.g. incomplete required fields) shows the backend's own message and keeps the organiser on the form. 12 targeted frontend tests plus the full `npm run check` suite passed the same day; this is automated-fixture coverage only, not a hosted Supabase Auth browser walkthrough. S1-T14–S1-T17 hosted/PostgreSQL-integration coverage remains open. |

### KAN-33 — View submitted requests

As an event coordinator, I want to view submitted requests I am permitted to review so that I can assess the organiser's event details.

**Owner / proposed reviewer:** Irfan / Ryan or Tristan. **Dependencies:** KAN-25/KAN-6; Q-02; conditional KAN-29 assignment decision.

- **KAN-33-AC1:** Given requests in the agreed reviewable states and access scope, when the coordinator opens the review queue, then the queue shows only requests eligible for that coordinator under the recorded policy.
- **KAN-33-AC2:** Given a visible submitted request, when the coordinator opens it, then the saved submission details and current status needed for review are displayed.
- **KAN-33-AC3:** Given an unrelated or otherwise unauthorized request, when the coordinator or another actor attempts to fetch its details directly, then the API withholds the protected information under the agreed response policy.
- **KAN-33-AC4 (added during implementation, 11 September):** Given no request is currently in a reviewable state, when an authorised coordinator opens the queue, then it returns an empty list rather than an error.
- **KAN-33-AC5 (historical implementation assumption, superseded on 11 September):** The original implementation masked all drafts and decided requests as `404 EVENT_REQUEST_NOT_FOUND`. The shared detail handler now allows organisers to retrieve their own drafts and outcomes, and authorised coordinators to retrieve decided requests. Coordinator access to drafts and any request-specific access denial still return the same 404 as a missing request. The queue continues to exclude drafts and decided requests.
- **KAN-33-AC6 (added during implementation, 11 September):** Given a malformed event request ID in the detail route, when it is requested, then the API rejects it with a validation error before any database lookup.

The shared `GET /api/events/:id` handler now serves KAN-34/KAN-33/KAN-16. Its detail access
rules are separate from queue membership. Runtime authentication and the Sprint 1
assigned-coordinator policy are connected; full hosted-account acceptance remains pending.
The [API contract](../../architecture/api-contract.md) and
[dated implementation records](../../requirements/assumptions-and-questions.md) explain
the current behaviour and retain the superseded queue/detail assumption and route fallback.

| Local task | Proposed implementation work |
| --- | --- |
| S1-33-01 | Queue query implemented in `submitted-requests.ts`; shared detail query in `event-request-detail.ts`. Both use the Sprint 1 assigned-coordinator policy. Contract review and customer clarification about triage/delegation remain pending. |
| S1-33-02 | Queue and detail pages implemented with empty/error states and component tests. On 15 September, `ReviewRequestPage.vue` was connected to the shared decision action flag and saved outcome, replacing its hardcoded permission. The 17 September access fix restricts review navigation and child-page mounting to coordinators, clears content on account changes and handles expired sessions. The organiser queue recheck passed on 18 September: the Review queue link was absent after reload and direct `/reviews` showed Coordinator access only without request data (MAN-20260918-01). |
| S1-33-03 | Shared backend detail, access checks and outcome refresh pass HTTP and isolated PostgreSQL tests. Browser queue error/retry and coordinator page-access regressions pass with response fixtures (AUTO-20260917-07/08). The failed organiser-visible queue check in MAN-20260917-07 has a passed organiser navigation and direct `/reviews` recheck in MAN-20260918-01; this does not verify manual `/reviews/:id` access or all role/session scenarios. Full S1-T18–S1-T20 coverage with live authentication and the agreed visibility policy remains pending. |

**Integration update (15 September):** The hardcoded permission gap recorded on 11 September is resolved. The page uses `actions.canMakeInitialDecision`, keeps saved decisions and reasons visible, and refreshes after saving. Server enforcement remains independent of the interface. Browser tests use response fixtures; complete acceptance with hosted accounts remains pending.

### KAN-36 — Approve or reject requests

As an event coordinator, I want to record an approval or rejection for an eligible request so that the organiser receives a clear review outcome.

**Owner / proposed reviewer:** Tristan / Irfan. **Dependencies:** KAN-25/KAN-33; Q-02/Q-04; conditional assignment decision. The 21 September clarification requires a rejection reason. The retained criteria and implementation notes below describe the earlier scope; add the explicit Jira rule and link any required correction and new verification without rewriting historical results.

- **KAN-36-AC1:** Given an eligible request and an authorized reviewer, when the reviewer approves it, then the decision, reviewer identity and resulting state are recorded consistently according to the agreed transition policy.
- **KAN-36-AC2:** Given an eligible request and an authorized reviewer, when the reviewer rejects it with any explanation required by the agreed policy, then the rejection and any supplied explanation are recorded consistently with the resulting state.
- **KAN-36-AC3:** Given an unauthorized reviewer or a disallowed request state, when a decision is attempted directly through the API, then no review record or state change is persisted.
- **KAN-36-AC4:** Given repeated or competing decisions on the same request, when they are processed, then the agreed conflict policy prevents contradictory committed outcomes and partial writes.

| Local task | Proposed implementation work |
| --- | --- |
| S1-36-01 | Historical implementation: validation and initial-decision eligibility used assigned coordinator, `SUBMITTED`, no recorded decision and an optional reason. The 21 September clarification requires a rejection reason; enforce and verify that rule as a linked correction. Broader transition/triage rules remain documented questions. |
| S1-36-02 | Implemented review recording and matching status update in one transaction, with row locking, assignment recheck, rollback and competing-decision tests. |
| S1-36-03 | Coordinator actions and result/error feedback are connected and tested. Organiser outcome integration and approval/rejection refresh checks passed in MAN-20260917-01. Finish the remaining hosted checks and review before story closure; see [test evidence](../../testing/test-evidence.md). |

**Integration update (15 September):** The coordinator interface now uses the backend's
decision flag, displays saved outcomes and reasons, and reloads the detail after recording
a decision. Component and browser tests cover the interface, including failed refreshes
and preventing repeat decisions. Tristan signed in and approved an assigned synthetic
request through the webpage; Supabase showed `SUBMITTED` → `APPROVED`. This verifies
the hosted approval/status path only. The remaining checks at that point are listed in
[the recorded check](../../testing/test-evidence.md#15-september-hosted-approval-check).

**Follow-up (16 September):** Approval and rejection passed manual checks for the stored
decision, reviewer, supplied reason, refreshed outcome and removal from the queue.
S1-T21 and S1-T22 are passed. The owning organiser's direct decision attempt was refused
with `403 REVIEW_FORBIDDEN`. A coordinator could not read or decide an unassigned
submitted request; the direct decision attempt returned `404 EVENT_REQUEST_NOT_FOUND`
without a write. An assigned coordinator's attempt to approve a draft returned
`409 REQUEST_NOT_REVIEWABLE`; the request remained `DRAFT` without a review row.
KAN-16 organiser list/status implementation and outcome acceptance remain outstanding.
Remaining hosted checks are tracked in the [test register](../../testing/test-evidence.md).

### KAN-16 — View event-request status

As an event organiser, I want to see the current status of my request so that I know its progress and the outcome of review.

**Owner / proposed reviewer:** Tristan / Irfan. **Dependencies:** KAN-25; KAN-6/KAN-36 state contract; Q-04; KAN-27 clarification display/state contract.

- **KAN-16-AC1:** Given an owned request, when the organiser opens its list entry or detail, then the displayed status matches the persisted state using the agreed user-facing labels.
- **KAN-16-AC2:** Given a successful submission or review decision, when the organiser reloads the request, then the latest persisted status and permitted review information are displayed.
- **KAN-16-AC3:** Given a request the actor is not permitted to view, when status or decision data is requested directly through the API, then protected information is withheld.

| Local task | Proposed implementation work |
| --- | --- |
| S1-16-01 | Implemented `GET /api/events?scope=all` for all of the organiser's own request statuses, ordered by latest update. Default/explicit draft-only listing and the coordinator queue retain their existing behaviour. Shared detail already returns the owned request's status and recorded review. Backend validation and database coverage are linked in the test register. |
| S1-16-02 | Organiser list and linked detail views are implemented in `frontend/src/features/events/pages`: readable statuses, Singapore times, saved review outcome/reason, refresh and session/error handling. The detail view is read-only and reuses the shared API. Component/browser fixture checks passed. MAN-20260917-01 verifies organiser approval/rejection display and refresh; MAN-20260917-02 through MAN-20260917-06 record later list/detail, refresh and access checks. The submission-to-status check awaits KAN-6 frontend integration. |
| S1-16-03 | S1-T25/S1-T26 have automated and manual approval/rejection outcome coverage. Draft/submitted detail display passed in MAN-20260917-03; Draft/Submitted/Rejected/Approved list labels matched the detail pages and Draft/Submitted detail refresh passed in MAN-20260917-06. S1-T27 passes in isolated automation; signed-out list/detail and unrelated-organiser list/detail visibility passed manually in MAN-20260917-02/04/05. Publish for peer review and CI. The final submission-to-status check awaits KAN-6 frontend integration; run it once the interface is connected before story closure. |

### KAN-27 — Request clarification

As an event coordinator, I want to request clarification on an eligible event request so that the organiser can understand what additional information is needed for review.

**Owner / proposed reviewer:** Irfan / Ryan or Tristan. **Dependencies:** KAN-25/KAN-33; Q-02/Q-04. KAN-27 is committed at 3 points. The proposed detail below covers requesting and displaying clarification; confirm response, editing and resubmission expectations against the actual Jira story before adopting the AC. If those expectations change the estimated scope, record the decision and estimate revision rather than silently excluding required behavior.

- **KAN-27-AC1:** Given an eligible request and an authorized coordinator, when a non-empty clarification message is submitted, then it is linked to that request and actor and any state change follows the agreed policy.
- **KAN-27-AC2:** Given a recorded clarification, when the owning organiser opens the request, then the clarification text and its context are visible within the agreed access rules.
- **KAN-27-AC3:** Given an empty message, unauthorized actor or disallowed workflow state, when clarification is attempted, then the invalid operation is refused without creating a record or partially changing status.

| Local task | Proposed implementation work |
| --- | --- |
| S1-27-01 | Confirm the story boundary and clarification transition/access policy; update `docs/architecture/api-contract.md`. |
| S1-27-02 | Implement clarification validation/persistence under `backend/src/modules/events/` (new files) and request/display UI in the review and event detail views. |
| S1-27-03 | Implement S1-T28–S1-T30 and connect status display to KAN-16; record any excluded response/resubmission work explicitly. |

## KAN-24 — Database and integration infrastructure

**Committed infrastructure PBI: 5 points. Owner / proposed reviewer: Arvin / Ryan**, with the relevant feature owners reviewing their database contracts. This supports customer-facing stories rather than adding another customer feature.

**Proposed outcome, refined after the 8 September hosting decision:** team members can reproduce the Supabase PostgreSQL connection and schema setup, evolve a consistent schema and connect the application to the persistence foundations needed by the selected stories. After database setup, Arvin supports cross-feature integration, end-to-end testing and resolving integration issues with the relevant story owners. The complete business workflow is assessed under its functional stories; it is not an additional requirement for database setup to be Done.

KAN-24 has existing scaffold material to inspect: the root setup instructions, `database/migrate.ts`, `database/seed.ts`, `database/migrations/`, `backend/src/db/pool.ts` and `database/tests/database.integration.test.ts`. Retain `001_initial_scaffold.sql` unchanged once applied and review the additional security migration before applying it. `compose.yaml` supports an optional isolated test database; it is not the hosted development setup. Completion requires verification against the adopted criteria, including the actual Supabase project configuration. The following are the retained local infrastructure criteria. Five related setup/schema/security/integration/diagram checks were added to Jira on 21 September; cross-reference their evidence without changing historical acceptance dates:

- **KAN-24-AC1:** Given a clean local checkout, an authorised Supabase development project and documented prerequisites, when the hosted connection, database migration and seed instructions are followed, then the API connects over verified TLS to the expected migrated schema and a teammate can reproduce the setup from the committed instructions.
- **KAN-24-AC2:** Given the adopted Sprint 1 data contracts, when the reviewed migrations and synthetic fixtures are applied in the agreed order and rerun as documented, then required relationships/constraints and database access boundaries exist, fixtures support the agreed access scenarios, and rerunning setup does not overwrite existing event data unexpectedly. Verify that the Supabase Data API is disabled and application tables have the reviewed RLS/privilege protections; Express business permissions are assessed under the functional stories.
- **KAN-24-AC3:** Given the migrated development database and application connection configuration, when the agreed database integration checks run, then the application connects successfully and representative synthetic records can be persisted and retrieved under the agreed schema constraints, with actual commands, commit and results linked as evidence. This checks database foundations, not completion of the dependent business workflows.

| Local task | Owner / proposed reviewer | Work and completion evidence to collect |
| --- | --- | --- |
| S1-24-01 | Arvin / Ryan | Verify clean-checkout setup against the Supabase development project, including session-pooler or supported direct connection and verified TLS. Record the environment, actual date, commands, commit and results without credentials. |
| S1-24-02 | Arvin / relevant story owner | Review schema and database access protections, disable the project Data API, and agree migration order for the shared project. Keep applied migrations unchanged; add reviewed migrations and synthetic fixtures for the agreed auth, draft and review contracts. Record migration PRs and project-setting verification. |
| S1-24-03 | Arvin / Ryan | Verify application/database connectivity and representative record persistence/retrieval using the adopted schema; record actual commands and results for S1-T33. |
| S1-24-04 | Arvin / Ryan | Verify committed setup/API documentation and isolated PostgreSQL 17 CI checks; link hosted setup evidence separately from local/CI test results. Never run cleanup-based tests against the shared development project. |
| S1-INT-01 | Arvin / affected story owners | Shared support task after database setup, no extra points: integrate auth → draft → submission → review/clarification → status with the functional story owners, support end-to-end testing and resolve integration issues. Link failures and fixes to the relevant story tests; do not count their implementation a second time under KAN-24. |

Keep the ERD in [the architecture record](../../architecture/README.md) aligned with the implemented schema, keys and relationships as part of the system design documentation.

## Acceptance test plan

This plan records scenario coverage, not story completion. **Partial** means only the linked parts have been exercised; **Passed (isolated)** identifies automated checks against a dedicated local database. Blank evidence cells remain unexecuted/unrecorded. Integration means exercising the API/service against PostgreSQL where persistence, access filtering or atomicity matters; browser tests cover visible behaviour. Hosted acceptance and fixture-based automation are recorded separately in the [test run register](../../testing/test-evidence.md).

`S1-Txx` IDs are Sprint 1 scenario IDs. They supplement the broader `TC-xx` release outlines in [test-cases.csv](../../testing/test-cases.csv); they are not aliases for an existing test file. When implementing, link the corresponding AC, actual test path and result in [traceability.csv](../../requirements/traceability.csv). Attach dated runs to [evidence](evidence/README.md), including commit SHA, environment, commands or manual steps, actual result and exclusions.

| Scenario | AC | Planned level | Scenario and expected result | Execution status | Actual test file / run evidence |
| --- | --- | --- | --- | --- | --- |
| S1-T01 | KAN-25-AC1 | API integration + browser | Valid fixture account signs in; verified identity and signed-in UI agree. | Partial; hosted login succeeded | [MAN-20260915-01; signed-in UI/identity acceptance still to complete](../../testing/test-evidence.md) |
| S1-T02 | KAN-25-AC2 | API integration + browser | Invalid credentials and an unauthenticated protected request expose no protected data; feedback matches the contract. | Partial; API automation passed | [AUTO-20260915-01/02; invalid signature/expiry and unauthenticated routes covered; invalid-credential browser check pending](../../testing/test-evidence.md) |
| S1-T03 | KAN-25-AC3 | API integration | Wrong-role and unrelated-owner fixtures attempt direct calls and forged role/owner fields; permissions do not expand. | Partial; organiser/coordinator checks passed; unrelated-organiser list/detail visibility also passed manually | [AUTO-20260915-02; MAN-20260917-04; authenticated-review.integration.test.ts; full five-role matrix pending](../../testing/test-evidence.md) |
| S1-T04 | KAN-25-AC4 | API integration + browser | Sign out and reuse the former session; protected access is denied and the UI is signed out. | Partial; sign-out UI and reopening request list/detail passed; previous-token reuse not tested | [MAN-20260917-02/05; sign-in prompt shown with no request/review information](../../testing/test-evidence.md) |
| S1-T05 | KAN-31-AC1 | Browser | Authorized organiser opens the new-request page and enters agreed fields; usable form state is shown. | Not executed | |
| S1-T06 | KAN-31-AC2 | Browser + API integration | Enter values and save through the integrated draft flow; one identifiable request has the authenticated owner and expected values. | Not executed | |
| S1-T07 | KAN-31-AC3 | Component/browser | Exercise validation and server failure while saving; entered values remain and feedback permits correction/retry. | Not executed | |
| S1-T08 | KAN-4-AC1 | API integration | Save a fixture missing fields allowed in drafts; persistence succeeds without submission-only validation. | Not executed | |
| S1-T09 | KAN-4-AC2 | API integration + browser | Save, end the session, sign in and reload; values and identifier persist and the request remains outside the submitted queue. | Not executed | |
| S1-T10 | KAN-4-AC3 | API integration | An unrelated organiser attempts to overwrite a draft; access is denied and a database read confirms unchanged values. | Not executed | |
| S1-T11 | KAN-34-AC1 | Browser | Select an owned saved draft; all applicable persisted values populate the form. | Partial; component coverage passed | [AUTO-20260919-01; EventDraftEditPage.test.ts covers form population, including zero/false/null preservation; hosted/e2e browser walkthrough pending](../../testing/test-evidence.md) |
| S1-T12 | KAN-34-AC2 | API integration + browser | Change, omit and explicitly clear permitted fields; reload confirms update semantics and unrelated fields are unchanged. | Partial; backend integration and component coverage passed | [AUTO-20260915-02 and AUTO-20260919-01; update-draft.integration.test.ts and EventDraftEditPage.test.ts cover change/clear semantics and PATCH save; hosted/e2e browser walkthrough pending](../../testing/test-evidence.md) |
| S1-T13 | KAN-34-AC3 | API integration | Attempt edit as another owner and in a disallowed state; both are refused without a write. | Passed (isolated) | [AUTO-20260915-02; update-draft.integration.test.ts and authenticated-review.integration.test.ts](../../testing/test-evidence.md) |
| S1-T14 | KAN-6-AC1 | API integration + browser | Submit a valid owned draft; persisted state and review eligibility match the adopted transition policy. | Partial; backend integration and component coverage passed | [AUTO-20260915-02 and AUTO-20260919-03; submit-request.integration.test.ts and EventDraftEditPage.test.ts cover the save-then-submit flow and navigation to the read-only detail page; hosted/e2e browser walkthrough pending](../../testing/test-evidence.md) |
| S1-T15 | KAN-6-AC2 | Validation unit + API integration + browser | Violate each adopted submission rule; actionable feedback appears, draft data remains and state does not change. | Partial; validation, backend integration and component coverage passed | [AUTO-20260915-01/02 and AUTO-20260919-03; submit-input.test.ts, submit-request.integration.test.ts and EventDraftEditPage.test.ts show the server's own missing-fields message on screen; hosted/e2e browser walkthrough pending](../../testing/test-evidence.md) |
| S1-T16 | KAN-6-AC3 | API integration | Submit as an unrelated actor and from a disallowed state; no transition occurs. | Passed (isolated) | [AUTO-20260915-02; submit-request.integration.test.ts and authenticated-review.integration.test.ts](../../testing/test-evidence.md) |
| S1-T17 | KAN-6-AC4 | PostgreSQL integration | Repeat submission and send competing requests; responses follow the adopted policy with no duplicated effects or inconsistent state. | Passed (isolated) | [AUTO-20260915-02; submit-request.integration.test.ts](../../testing/test-evidence.md) |
| S1-T18 | KAN-33-AC1 | API integration + browser | Queue fixtures mix eligible/ineligible states and access relationships; only permitted reviewable requests are listed. | Partial; scoped API checks passed | [AUTO-20260915-02; authenticated-review.integration.test.ts; hosted queue acceptance pending](../../testing/test-evidence.md) |
| S1-T19 | KAN-33-AC2 | Browser | Open an allowed queue item; displayed submission details and status match persisted data. | Partial; response-fixture browser/component checks passed | [AUTO-20260915-01/03; ReviewRequestPage.test.ts and review-decision.spec.ts; hosted detail-field comparison pending](../../testing/test-evidence.md) |
| S1-T20 | KAN-33-AC3 | API integration | Request an unauthorized event ID directly using coordinator and other actor fixtures; protected fields are withheld. | Passed (isolated); unassigned coordinator case also passed manually | [AUTO-20260915-02; MAN-20260916-04; authenticated-review.integration.test.ts and event-request-detail.integration.test.ts](../../testing/test-evidence.md) |
| S1-T21 | KAN-36-AC1 | API integration + browser | Authorized reviewer approves an eligible request; decision, actor and state agree after reload. | Passed (isolated and hosted manual checks) | [AUTO-20260915-02/03; MAN-20260915-01; MAN-20260916-01: approval, review-row identity, reload and queue removal](../../testing/test-evidence.md) |
| S1-T22 | KAN-36-AC2 | API integration + browser | Authorized reviewer rejects under the adopted explanation rule; persisted decision, supplied explanation and state agree. | Passed (isolated and hosted manual checks) | [AUTO-20260915-02/03; MAN-20260916-02: rejection, reason, reviewer, reload and queue removal](../../testing/test-evidence.md) |
| S1-T23 | KAN-36-AC3 | API integration | Wrong actor and disallowed-state decisions are rejected; neither review rows nor state changes are persisted. | Passed (isolated); organiser, unassigned coordinator and assigned draft cases also passed manually | [AUTO-20260915-02; MAN-20260916-03/04/05; other hosted access/state cases remain open](../../testing/test-evidence.md) |
| S1-T24 | KAN-36-AC4 | PostgreSQL integration | Exercise repeated/competing decisions and transaction failure; no contradictory outcomes or partially committed review/state pairs remain. | Passed (isolated) | [AUTO-20260915-02; review-decision.integration.test.ts](../../testing/test-evidence.md) |
| S1-T25 | KAN-16-AC1 | API integration + browser | Open owned requests in each selected workflow state; list/detail labels match persisted state. | Passed (isolated); manual list/detail labels and detail refresh also passed for Draft, Submitted, Rejected and Approved | [AUTO-20260917-01/02/03/04/05/06; authenticated-review.integration.test.ts; EventRequestsPage.test.ts; EventRequestDetailPage.test.ts; organiser browser specs; MAN-20260917-01/03/06](../../testing/test-evidence.md) |
| S1-T26 | KAN-16-AC2 | Browser + API integration | Complete submission and both review outcomes on separate fixtures; organiser reload shows the latest status and permitted decision details. | Partial; automated coverage and hosted approved/rejected refresh passed; KAN-6 frontend integrated; hosted submission-to-status acceptance pending | [AUTO-20260915-02; AUTO-20260917-02/03/04/05/06; MAN-20260917-01; saved outcome/reason display and browser reload](../../testing/test-evidence.md) |
| S1-T27 | KAN-16-AC3 | API integration | An unrelated actor fetches status/decision data by event ID or attempts to select another owner for the list; protected information is withheld. | Passed (isolated); signed-out list/detail and unrelated-organiser list/detail visibility also passed manually | [AUTO-20260915-02; AUTO-20260917-02; MAN-20260917-02/04/05; event-request-detail.integration.test.ts and authenticated-review.integration.test.ts](../../testing/test-evidence.md) |
| S1-T28 | KAN-27-AC1 | API integration + browser | Authorized coordinator sends clarification on an eligible request; message/actor/event link and any state change persist consistently. | Not executed | |
| S1-T29 | KAN-27-AC2 | Browser | Owning organiser opens a request with clarification; the permitted message and context are visible. | Not executed | |
| S1-T30 | KAN-27-AC3 | API integration | Empty, unauthorized and disallowed-state clarification attempts create no record or partial state change. | Not executed | |
| S1-T31 | KAN-24-AC1 | Clean-checkout setup + PostgreSQL integration | Follow committed setup instructions from a clean checkout against the authorised Supabase development project; verified TLS, migrations/seeds and readiness confirm the expected schema. | Passed | [MAN-20260920-01: clean clone of `93bdd1a`, Node 24.21.0 on Windows 11, `npm ci` + `npm run setup`, session-pooler `DATABASE_URL` with `sslmode=verify-full` and the downloaded root CA, `npm run db:migrate` applied 003/004/005, `GET /api/health/ready` returned `{"status":"ok","database":"connected"}`](../../testing/test-evidence.md) |
| S1-T32 | KAN-24-AC2 | PostgreSQL integration | Inspect adopted schema constraints, RLS/privilege protections, disabled Data API setting and access fixtures; rerun migrations/seeds with existing synthetic event data and verify the documented non-destructive behavior. | Partial; Data API setting evidenced indirectly | [MAN-20260920-02: all 17 `public` tables report RLS enabled with no policies and no `anon`/`authenticated`/`service_role` privileges; a publishable-key call to `/rest/v1/app_users` returned 503 `PGRST002`, consistent with the Data API being disabled but not a check of the project setting itself. Reruns are non-destructive: `db:migrate` reports up to date and `db:seed` uses `ON CONFLICT DO NOTHING`, verified in `database.integration.test.ts` SCF-DB-01/02](../../testing/test-evidence.md) |
| S1-T33 | KAN-24-AC3 | PostgreSQL integration | Verify application connectivity and representative synthetic record persistence/retrieval under the agreed schema; link actual commands and results. Full business-workflow tests remain mapped to their functional stories. | Passed (isolated) | [AUTO-20260920-01: `npm run test:integration` against local PostgreSQL 17, 212 tests in 18 files, including `core-schema.integration.test.ts` CORE-DB-01 to 06 for status history, booking conflicts, equipment pooling, registration capacity and assignment uniqueness](../../testing/test-evidence.md) |

## Review acceptance reconciliation

The original test rows retain their recorded execution scope. The completed review adds the following observations without claiming every subcase or a new automated run. Detailed results are in [MAN-S1-REVIEW-01](../../testing/test-evidence.md).

| Existing scenarios | Review addition | Qualification / follow-up |
| --- | --- | --- |
| S1-T01–T04, T10, T13, T16, T20, T23, T27 | DEMO-01/08 passed the demonstrated authentication/access paths. | Exact actor/endpoint combinations and captures remain to be linked; do not extend the result to unshown subcases. |
| S1-T05–T09, T11–T12 | KAN-31/KAN-4 closed Done; DEMO-03 basic editing passed. | DEMO-02 found S1-DEF-01 in registration-dependent fields; KAN-34 carries over. |
| S1-T14–T15, T26 | DEMO-04/05 passed one validation and submission/status path. | S1-DEF-03/04 remain: reproduce reopened-draft submission and invalid-field bypasses. KAN-6 carries over while KAN-16 is Done for the demonstrated status slice. |
| S1-T18–T19 | DEMO-06 exposed coordinator follow-up access after approval. | Pending-queue exclusion is expected; a usable approved-request list/navigation path is missing. KAN-33 carries over. |
| S1-T21–T22, T24–T26 | DEMO-07/09 passed outcomes and repeated/conflicting-decision refusal. | Earlier concurrency/rollback tests remain separate; the review did not establish a new concurrent-write run. |
| S1-T28–T30 | DEMO-10 passed; KAN-27 closed Done. | Link the exact clarification demonstration; do not infer every negative API case from the walkthrough. |
| S1-T31–T33 | DEMO-11 passed; KAN-24 closed Done. | Retain prior automated/setup records and add the reviewed configuration captures. |

## Maintaining the closed backlog

Keep the agreed **32-point baseline** intact: nine user stories at 27 points plus KAN-24 at 5 points. Attach the final Jira export and adopted AC version when available. Record actual task hours only where tracked, separately from story points; leave missing daily observations unrecorded.

The review closed seven PBIs at **24 points**, including KAN-24's five points. KAN-6, KAN-33 and KAN-34 contribute no completed points in Sprint 1 and carry their original eight points into Sprint 2. Link the final board, reviewed build and demonstration evidence to the closure table above.

The [20-feature release scope](../../requirements/README.md) remains broader than this sprint. Sprint 2 selects KAN-29 for assignment and the venue stories mapped there; it also continues the three unfinished Sprint 1 stories. Draft editing covers only part of CF-07. Completed Sprint 1 slices must not be reported as complete release features without verifying their full agreed scope.
