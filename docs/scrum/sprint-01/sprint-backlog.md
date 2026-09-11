# Sprint 1 backlog and acceptance test plan

**Sprint window: 6–19 September 2026, inclusive (Asia/Singapore).** At Sprint Planning on Sunday 6 September, the team committed to the nine user stories and separate KAN-24 infrastructure PBI listed below. The six developers share the workstreams, with one developer also serving as Scrum Master and another as Product Owner. Sprint Review is scheduled for Saturday 19 September, followed by Sprint 2 Planning on Sunday 20 September. Feature links map the backlog items to the project's core requirements.

Detailed story wording, acceptance criteria (AC), task splits, reviewers and tests below are **drafts for team review**. Story owners are assigned below; individual development capacity is still to be recorded. Local task IDs are documentation references for creating or linking Jira subtasks. Attach a dated Jira export with the full story titles and agreed criteria.

Use [planning](planning.md) for the commitment and decisions, [estimation and capacity](estimation-and-capacity.md) for actual estimates and availability, and [daily progress](daily-progress.md) for dated changes. Assess completion against the team's adopted [definition of done](../definition-of-done.md), then record actual outcomes in the [review](review.md), [retrospective](retrospective.md) and [evidence index](evidence/README.md).

## Committed backlog

The nine committed user stories, **including KAN-27**, total **27 story points**. **KAN-24 is a separate 5-point infrastructure PBI**, giving a **32-point Sprint 1 commitment across 10 PBIs**. KAN-33 and KAN-16 are the team's 2-point reference stories for relative estimation. KAN-24 covers shared database foundations; individual business implementations and their tests stay with the functional stories. Completion and velocity will be assessed at sprint close.

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

**Current repository baseline:** login, event and review pages are placeholders. Shared auth/event types, an initial schema, migrations, seed scripts and infrastructure checks provide the starting point. Business stories still require implementation and acceptance testing. Keep Jira ownership aligned with the allocation above and update status as work progresses.

## Decisions needed to finalize implementation details

- **Database hosting, decided 8 September:** use Supabase for PostgreSQL, with Express accessing it through the PostgreSQL driver. Follow the [technical decision](../../requirements/assumptions-and-questions.md#8-september-2026--hosted-postgresql) for verified TLS, Data API settings, ordered migrations and isolated test data. The ten-PBI, 32-point commitment is unchanged.
- **Authentication and access:** decide whether to use Supabase Auth or another approach; settle account provisioning, session strategy and the actor/event access matrix using Q-01 and Q-02 in [customer questions](../../requirements/assumptions-and-questions.md). The application has five roles; the exact Sprint 1 role coverage still needs agreement. A client-supplied role or organiser ID must not grant access.
- **Draft versus submission:** settle the field list and validation rules through Q-03. No particular event field is declared mandatory for submission by this document. Agree which incomplete values may be stored as drafts.
- **Story boundaries:** KAN-31 owns starting a new request and the initial form; KAN-4 owns persisting incomplete work; KAN-34 owns retrieving and editing an existing draft. They share a form and persistence contract. Confirm these detailed boundaries so that tasks and delivered outcomes do not double-count the same work. Preserve the agreed estimates unless the team explicitly records a revision.
- **Transitions and decisions:** resolve Q-04/Q-05 and record a permitted-transition table. The status constants in `backend/src/modules/events/types.ts` are provisional vocabulary. Clarification/resubmission behavior and whether rejection requires a reason remain unresolved.
- **Coordinator assignment:** KAN-29 / CF-05 is a **conditional dependency, not committed Sprint 1 scope**. KAN-33 and KAN-36 need a justified way to establish reviewer access. If assignment is required for the demo, explicitly add and estimate it or agree a clearly documented fixture boundary. Seeded assignment is not completed assignment functionality. Do not expose all requests to every coordinator to bypass this dependency.

Record decisions with their source, date and affected AC IDs before treating dependent criteria as ready. If a decision changes scope or estimates, preserve the original baseline and record the revision in planning and estimation.

## Story cards

All path targets below are relative to the repository root. Existing files are starting points, not completed implementations; proposed new files are identified explicitly. Each task includes its relevant tests, code review and integration as part of the story effort.

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
| S1-25-02 | Add auth handlers/services/middleware under `backend/src/modules/auth/` (new files) and wire `backend/src/app.ts`; coordinate the chosen identity mapping and synthetic account fixtures with Arvin. Do not assume locally stored credentials or Supabase Auth before the authentication approach is agreed. |
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
| S1-34-02 | Implement draft discovery in `frontend/src/features/events/pages/EventRequestsPage.vue` and an edit route/page under the events feature (new file) using the shared form. |
| S1-34-03 | Implement S1-T11–S1-T13 for reload, PATCH semantics and disallowed edits; review shared form changes with Ernest. |

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
| S1-6-03 | Add submission and error feedback to the event form; implement S1-T14–S1-T17 against the real persistence path where required. |

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
rules are separate from queue membership; coordinator policy and live authentication remain
open. The [API contract](../../architecture/api-contract.md) and
[dated implementation records](../../requirements/assumptions-and-questions.md) explain
the current behaviour and retain the superseded queue/detail assumption and route fallback.

| Local task | Proposed implementation work |
| --- | --- |
| S1-33-01 | Queue query implemented in `submitted-requests.ts`; shared detail query in `event-request-detail.ts`. Contract review and the production coordinator policy remain pending. |
| S1-33-02 | Replace `frontend/src/features/reviews/pages/ReviewQueuePage.vue`; add a review detail component/page under the reviews feature (new file), including empty/error states. — Done: `ReviewQueuePage.vue` (list) and new `ReviewRequestPage.vue` (detail, mounts Tristan's `ReviewDecisionPanel.vue`), with component tests. `canReview` is currently hardcoded `true` on the detail page pending KAN-25 — see note below. |
| S1-33-03 | Shared backend detail, access checks and outcome refresh pass HTTP and isolated PostgreSQL tests. The browser queue error/retry check passes with response fixtures. Full S1-T18–S1-T20 coverage with live authentication and the agreed visibility policy remains pending. |

**Known gap (11 September):** `ReviewRequestPage.vue` still passes `can-review="true"` to the decision panel. The next UI step must consume the shared action flags while keeping a recorded outcome visible when another decision is unavailable. Server enforcement is independent: the shared GET requires verified identity and ownership/visibility checks; the decision POST additionally requires coordinator identity and request-specific write permission. Live authentication remains part of KAN-25.

### KAN-36 — Approve or reject requests

As an event coordinator, I want to record an approval or rejection for an eligible request so that the organiser receives a clear review outcome.

**Owner / proposed reviewer:** Tristan / Irfan. **Dependencies:** KAN-25/KAN-33; Q-02/Q-04; conditional assignment decision. A mandatory rejection reason is not assumed; record the team's/customer's decision before implementing that rule.

- **KAN-36-AC1:** Given an eligible request and an authorized reviewer, when the reviewer approves it, then the decision, reviewer identity and resulting state are recorded consistently according to the agreed transition policy.
- **KAN-36-AC2:** Given an eligible request and an authorized reviewer, when the reviewer rejects it with any explanation required by the agreed policy, then the rejection and any supplied explanation are recorded consistently with the resulting state.
- **KAN-36-AC3:** Given an unauthorized reviewer or a disallowed request state, when a decision is attempted directly through the API, then no review record or state change is persisted.
- **KAN-36-AC4:** Given repeated or competing decisions on the same request, when they are processed, then the agreed conflict policy prevents contradictory committed outcomes and partial writes.

| Local task | Proposed implementation work |
| --- | --- |
| S1-36-01 | Agree approval/rejection eligibility, explanation and conflict rules with Irfan; implement shared transition validation under `backend/src/modules/events/` (new files). |
| S1-36-02 | Implement review recording and event-state change in one transaction; coordinate `event_reviews` schema changes through a new migration if required. |
| S1-36-03 | Add review actions and result/error feedback to the review detail UI; implement S1-T21–S1-T24, including PostgreSQL transaction/conflict checks. |

### KAN-16 — View event-request status

As an event organiser, I want to see the current status of my request so that I know its progress and the outcome of review.

**Owner / proposed reviewer:** Tristan / Irfan. **Dependencies:** KAN-25; KAN-6/KAN-36 state contract; Q-04; KAN-27 clarification display/state contract.

- **KAN-16-AC1:** Given an owned request, when the organiser opens its list entry or detail, then the displayed status matches the persisted state using the agreed user-facing labels.
- **KAN-16-AC2:** Given a successful submission or review decision, when the organiser reloads the request, then the latest persisted status and permitted review information are displayed.
- **KAN-16-AC3:** Given a request the actor is not permitted to view, when status or decision data is requested directly through the API, then protected information is withheld.

| Local task | Proposed implementation work |
| --- | --- |
| S1-16-01 | Agree status labels and visible decision fields with Kai Jie and Irfan; extend the event response contract without allowing arbitrary client-set status. |
| S1-16-02 | Implement status display in `frontend/src/features/events/pages/EventRequestsPage.vue` and the event detail view; reuse the scoped event API. |
| S1-16-03 | Implement S1-T25–S1-T27 and verify the integrated organiser-to-coordinator-to-organiser path. |

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

KAN-24 has existing scaffold material to inspect: the root setup instructions, `database/migrate.ts`, `database/seed.ts`, `database/migrations/`, `backend/src/db/pool.ts` and `database/tests/database.integration.test.ts`. Retain `001_initial_scaffold.sql` unchanged once applied and review the additional security migration before applying it. `compose.yaml` supports an optional isolated test database; it is not the hosted development setup. Completion requires verification against the adopted criteria, including the actual Supabase project configuration. The following criteria are **drafts for team review**:

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

These are **planned scenarios, all Not executed**. The file/evidence cells are intentionally blank until an actual test exists and has a recorded run. Integration means exercising the API/service against PostgreSQL where persistence, access filtering or atomicity matters; browser tests cover visible behavior. The setup needs synthetic accounts/events that match the adopted policy. Exact fixtures and rule-dependent expected results must be finalized after the decisions above.

`S1-Txx` IDs are Sprint 1 scenario IDs. They supplement the broader `TC-xx` release outlines in [test-cases.csv](../../testing/test-cases.csv); they are not aliases for an existing test file. When implementing, link the corresponding AC, actual test path and result in [traceability.csv](../../requirements/traceability.csv). Attach dated runs to [evidence](evidence/README.md), including commit SHA, environment, commands or manual steps, actual result and exclusions.

| Scenario | AC | Planned level | Scenario and expected result | Execution status | Actual test file / run evidence |
| --- | --- | --- | --- | --- | --- |
| S1-T01 | KAN-25-AC1 | API integration + browser | Valid fixture account signs in; verified identity and signed-in UI agree. | Not executed | |
| S1-T02 | KAN-25-AC2 | API integration + browser | Invalid credentials and an unauthenticated protected request expose no protected data; feedback matches the contract. | Not executed | |
| S1-T03 | KAN-25-AC3 | API integration | Wrong-role and unrelated-owner fixtures attempt direct calls and forged role/owner fields; permissions do not expand. | Not executed | |
| S1-T04 | KAN-25-AC4 | API integration + browser | Sign out and reuse the former session; protected access is denied and the UI is signed out. | Not executed | |
| S1-T05 | KAN-31-AC1 | Browser | Authorized organiser opens the new-request page and enters agreed fields; usable form state is shown. | Not executed | |
| S1-T06 | KAN-31-AC2 | Browser + API integration | Enter values and save through the integrated draft flow; one identifiable request has the authenticated owner and expected values. | Not executed | |
| S1-T07 | KAN-31-AC3 | Component/browser | Exercise validation and server failure while saving; entered values remain and feedback permits correction/retry. | Not executed | |
| S1-T08 | KAN-4-AC1 | API integration | Save a fixture missing fields allowed in drafts; persistence succeeds without submission-only validation. | Not executed | |
| S1-T09 | KAN-4-AC2 | API integration + browser | Save, end the session, sign in and reload; values and identifier persist and the request remains outside the submitted queue. | Not executed | |
| S1-T10 | KAN-4-AC3 | API integration | An unrelated organiser attempts to overwrite a draft; access is denied and a database read confirms unchanged values. | Not executed | |
| S1-T11 | KAN-34-AC1 | Browser | Select an owned saved draft; all applicable persisted values populate the form. | Not executed | |
| S1-T12 | KAN-34-AC2 | API integration + browser | Change, omit and explicitly clear permitted fields; reload confirms update semantics and unrelated fields are unchanged. | Not executed | |
| S1-T13 | KAN-34-AC3 | API integration | Attempt edit as another owner and in a disallowed state; both are refused without a write. | Not executed | |
| S1-T14 | KAN-6-AC1 | API integration + browser | Submit a valid owned draft; persisted state and review eligibility match the adopted transition policy. | Not executed | |
| S1-T15 | KAN-6-AC2 | Validation unit + API integration + browser | Violate each adopted submission rule; actionable feedback appears, draft data remains and state does not change. | Not executed | |
| S1-T16 | KAN-6-AC3 | API integration | Submit as an unrelated actor and from a disallowed state; no transition occurs. | Not executed | |
| S1-T17 | KAN-6-AC4 | PostgreSQL integration | Repeat submission and send competing requests; responses follow the adopted policy with no duplicated effects or inconsistent state. | Not executed | |
| S1-T18 | KAN-33-AC1 | API integration + browser | Queue fixtures mix eligible/ineligible states and access relationships; only permitted reviewable requests are listed. | Not executed | |
| S1-T19 | KAN-33-AC2 | Browser | Open an allowed queue item; displayed submission details and status match persisted data. | Not executed | |
| S1-T20 | KAN-33-AC3 | API integration | Request an unauthorized event ID directly using coordinator and other actor fixtures; protected fields are withheld. | Not executed | |
| S1-T21 | KAN-36-AC1 | API integration + browser | Authorized reviewer approves an eligible request; decision, actor and state agree after reload. | Not executed | |
| S1-T22 | KAN-36-AC2 | API integration + browser | Authorized reviewer rejects under the adopted explanation rule; persisted decision, supplied explanation and state agree. | Not executed | |
| S1-T23 | KAN-36-AC3 | API integration | Wrong actor and disallowed-state decisions are rejected; neither review rows nor state changes are persisted. | Not executed | |
| S1-T24 | KAN-36-AC4 | PostgreSQL integration | Exercise repeated/competing decisions and transaction failure; no contradictory outcomes or partially committed review/state pairs remain. | Not executed | |
| S1-T25 | KAN-16-AC1 | Browser | Open owned requests in each selected workflow state; list/detail labels match persisted state. | Not executed | |
| S1-T26 | KAN-16-AC2 | Browser + API integration | Complete submission and both review outcomes on separate fixtures; organiser reload shows the latest status and permitted decision details. | Not executed | |
| S1-T27 | KAN-16-AC3 | API integration | An unrelated actor fetches status/decision data by event ID; protected information is withheld. | Not executed | |
| S1-T28 | KAN-27-AC1 | API integration + browser | Authorized coordinator sends clarification on an eligible request; message/actor/event link and any state change persist consistently. | Not executed | |
| S1-T29 | KAN-27-AC2 | Browser | Owning organiser opens a request with clarification; the permitted message and context are visible. | Not executed | |
| S1-T30 | KAN-27-AC3 | API integration | Empty, unauthorized and disallowed-state clarification attempts create no record or partial state change. | Not executed | |
| S1-T31 | KAN-24-AC1 | Clean-checkout setup + PostgreSQL integration | Follow committed setup instructions from a clean checkout against the authorised Supabase development project; verified TLS, migrations/seeds and readiness confirm the expected schema. | Not executed | |
| S1-T32 | KAN-24-AC2 | PostgreSQL integration | Inspect adopted schema constraints, RLS/privilege protections, disabled Data API setting and access fixtures; rerun migrations/seeds with existing synthetic event data and verify the documented non-destructive behavior. | Not executed | |
| S1-T33 | KAN-24-AC3 | PostgreSQL integration | Verify application connectivity and representative synthetic record persistence/retrieval under the agreed schema; link actual commands and results. Full business-workflow tests remain mapped to their functional stories. | Not executed | |

## Updating the backlog during and after the sprint

Keep the agreed **32-point baseline** intact: nine user stories at 27 points plus KAN-24 at 5 points. Record the adopted AC. During the sprint, keep Jira and this document aligned when scope changes, and link the dated decision in [daily progress](daily-progress.md). Record actual task hours where the team tracks them, separately from story points.

At review, assess every committed PBI against its adopted AC and definition of done, linking PRs, commits, tests and demonstration evidence. Carry incomplete PBIs back to the product backlog with the unfinished criteria and reason. A partially completed PBI does not earn its full points. Explicitly record the outcome of KAN-24.

The [20-feature release scope](../../requirements/README.md) remains broader than this sprint. CF-05 is the conditional assignment dependency; CF-07 is covered here only for draft editing. CF-08–CF-20 and the rest of CF-07 remain release work unless explicitly planned later. Partial Sprint 1 slices of CF-01–CF-04 and CF-06 must not be reported as complete release features without verifying their full agreed scope.
