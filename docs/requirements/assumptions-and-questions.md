# Assumptions and customer questions

These items are unresolved unless a dated decision is added. The proposed defaults in architecture or code are team choices until validated; they do not replace customer requirements. Discuss customer questions through the clarification process for this team's section.

| ID   | Decision needed                                                                                                                       | Why it matters                                                     | Status |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------ |
| Q-01 | How are accounts created, roles assigned, and organisation membership established?                                                    | Avoid giving users a way to grant themselves staff access.         | Open   |
| Q-02 | Who may see unassigned events, assign or reassign coordinators, and access another coordinator's events?                              | Role alone is insufficient for authorization.                      | Open   |
| Q-03 | Which fields are mandatory for submission, and what may remain incomplete in a draft?                                                 | Draft and submission validation differ.                            | Open   |
| Q-04 | What are the event states, allowed transitions and actors, clarification/resubmission behavior, and confirmation prerequisites?       | Status changes must match real actions.                            | Open   |
| Q-05 | Which post-submission fields may be edited directly, and which require a reviewed change request?                                     | Prevent silent changes to approved arrangements.                   | Open   |
| Q-06 | How many venues may an event use? Do pending requests or tentative holds consume availability?                                        | Determines the booking model and conflict policy.                  | Open   |
| Q-07 | What timezone, interval boundary, setup/turnaround, operating-hour and blocked-period rules apply?                                    | Adjacent bookings can otherwise produce inconsistent availability. | Open   |
| Q-08 | How do layouts, capacity, accessibility and required facilities affect suitability? Are overrides permitted?                          | An available room may still be unsuitable.                         | Open   |
| Q-09 | Is equipment pooled by type or tracked individually? How do location, maintenance and substitutions work?                             | Determines availability and reservation granularity.               | Open   |
| Q-10 | What makes an event discoverable and open for registration? What capacity, duplicate, withdrawal and registration-period rules apply? | Registration must remain consistent with event arrangements.       | Open   |
| Q-11 | After a date, attendance, venue or equipment change, which reservations and registrations are retained, released or reapproved?       | Changes must not leave stale commitments.                          | Open   |
| Q-12 | Who may cancel or complete an event, and what resources must cancellation release?                                                    | Event lifecycle affects other core features.                       | Open   |
| Q-13 | Which actions notify which users, using which channel? Is read status or delivery retry required?                                     | Avoid missing recipients or exposing unrelated event details.      | Open   |
| Q-14 | Which important actions need audit records, who may inspect them, and what information must be retained?                              | Auditability is requested without a detailed policy.               | Open   |

## 8 September 2026 — Hosted PostgreSQL

**Current status:** The hosted-database arrangements remain in force. KAN-25 now uses
Supabase Auth, as recorded on 15 September below; the earlier note that authentication
had not been selected is historical. Q-01 and Q-02 remain open.

**Decision:** Use Supabase to host the development PostgreSQL database. The application keeps its Vue → Express → PostgreSQL structure, with Express using the PostgreSQL driver for database access.

**Implementation arrangements:**

- Use the documented Supabase session-pooler connection, or a direct connection where supported, with verified TLS. Store credentials in local environment configuration; do not commit them or place them in the Vue application.
- Disable the Supabase Data API for this application. Protect application tables with the reviewed row-level-security and privilege migration as an additional boundary. Express remains responsible for checking the authenticated actor's role and relationship to each event.
- Coordinate migration order and fixture changes on a shared development project. Apply ordered migrations without editing a migration already applied; keep existing event data intact. Use only synthetic development data.
- Keep automated database tests isolated. PostgreSQL 17 remains the CI test database; Docker Compose is available for an optional local test database. Test success there does not establish that a hosted connection or project settings have been verified.

**Affected work:** KAN-24 covers hosted connection setup, migration/seed reproducibility and database integration evidence. KAN-25 still needs an explicit decision on authentication, account provisioning and identity mapping. Selecting Supabase for PostgreSQL does not by itself select Supabase Auth or resolve Q-01/Q-02.

**Sprint impact:** The original 6 September commitment remains ten PBIs and 32 points, including KAN-24 at 5 points. This is a technical implementation decision; no scope, point or completion change has been recorded. Hosted setup and project-setting checks remain to be evidenced.

## 11 September 2026 — KAN-33 review queue/detail scope

**Current status:** The detail-status restriction below is superseded by the shared detail
implementation recorded later on this page. The queue still excludes drafts and decided
requests. This entry preserves the original KAN-33 implementation assumption.

**Decision and rationale:** `GET /api/events` (queue) and `GET /api/events/:id` (detail) only
surface requests in `SUBMITTED`, `UNDER_REVIEW` or `CLARIFICATION_REQUESTED` status. `DRAFT`,
`APPROVED` and `REJECTED` requests are masked as `404 EVENT_REQUEST_NOT_FOUND` from these
endpoints — drafts are explicitly excluded by KAN-33's acceptance criteria, and decided
requests are organiser-facing status/outcome display, owned by KAN-16, not a re-review surface.

**Kind:** Team implementation assumption (not yet a customer clarification).

**Source and date:** Irfan, 11 September 2026, while implementing KAN-33.

**Affected story and acceptance-criterion IDs:** KAN-33-AC1–AC3 (repo copy in
`docs/scrum/sprint-01/sprint-backlog.md`); interacts with KAN-16-AC1 (status display) and
KAN-36 (which independently enforces its own reviewable-state check on write).

**Affected implementation and tests:** `backend/src/modules/events/submitted-requests.ts`
(`REVIEWABLE_STATUSES`), `backend/test/events/submitted-requests.test.ts`.

**Supersedes:** None.

## 11 September 2026 — Coordinator visibility has no default grant (KAN-29/Q-02 still open)

**Current status:** The requirement for explicit policies remains in force. The absence
of runtime policies and authentication described below is superseded by the 15 September
assigned-coordinator implementation assumption. Q-02 remains open for customer clarification.

**Decision and rationale:** Since KAN-29 (coordinator assignment) is not committed Sprint 1
scope and Q-02 is unresolved, `submitted-requests.ts` requires callers to supply a
`canViewRequest(actor, request)` policy function — there is no built-in rule that grants a
coordinator visibility into every submitted request. Production wiring in `app.ts` currently
has no policy supplied (the router mounts as unavailable, matching the KAN-36 pattern), so
this endpoint returns 404 for the whole app until KAN-25 and a real KAN-29/Q-02 answer exist.
Unit tests use a fixture-only policy and do not establish or endorse "every coordinator sees
every request" as the eventual rule.

**Kind:** Team implementation assumption.

**Source and date:** Irfan, 11 September 2026.

**Affected story and acceptance-criterion IDs:** KAN-33-AC1, KAN-33-AC3.

**Affected implementation and tests:** `backend/src/modules/events/submitted-requests.ts`,
`backend/src/modules/events/submitted-requests-router.ts`,
`backend/test/events/submitted-requests-router.test.ts`.

**Supersedes:** None.

## 11 September 2026 — `GET /api/events/:id` owner collision

**Current status:** The fallback described below is superseded by the shared detail handler.
There is now one GET registration for both supported roles. Runtime authentication is
connected as recorded on 15 September below, along with the coordinator page's action and
outcome display. KAN-16's organiser list/detail pages are connected, and approval/rejection
outcome refresh passed on 17 September (MAN-20260917-01). The signed-out detail-page check
also passed (MAN-20260917-02), followed by Draft/Submitted detail statuses and their
no-decision messages (MAN-20260917-03). A second organiser could not view the first
organiser's request details or list entries (MAN-20260917-04). Signed-out list access
also showed a sign-in prompt without request names or statuses (MAN-20260917-05).
The four list labels matched the recorded detail pages and Draft/Submitted detail
refresh passed (MAN-20260917-06). Team contract review and submission-to-status checks
remain pending; see [test evidence](../testing/test-evidence.md).

**Decision and rationale:** `docs/architecture/api-contract.md`'s proposed-routes table lists
`GET /api/events/:id` under three different owners (Kai Jie/KAN-34 draft retrieval,
Tristan/KAN-16 status display, Irfan/KAN-33 review detail) for three different actor
relationships to the same request. KAN-33's handler now only acts when the verified actor is
an `EVENT_COORDINATOR`; for any other actor it calls `next()` so a handler for KAN-34/KAN-16
can be mounted after it on the same path. This is a stopgap, not a resolved contract — the
three implementations should be reconciled (either into one role-aware handler or an agreed
mount order) before all three exist, to avoid silent precedence bugs.

**Kind:** Team implementation assumption; needs a team decision before KAN-34 or KAN-16 add
their own `GET /:id` handler.

**Source and date:** Irfan, 11 September 2026.

**Affected story and acceptance-criterion IDs:** KAN-33-AC2, KAN-34-AC1, KAN-16-AC1/AC2.

**Affected implementation and tests:** `backend/src/modules/events/submitted-requests-router.ts`,
`backend/test/events/submitted-requests-router.test.ts` (the "defers to a later handler" case).

**Supersedes:** None.

## 11 September 2026 — Shared request-detail backend

**Current status:** The shared response and access boundaries below remain in force.
The 15 September entries supersede the backend-wiring and coordinator-page gaps recorded
here. Organiser list/detail integration is complete, and the hosted outcome checks recorded
on 17 September passed. Signed-out detail access, Draft/Submitted detail display and
second-organiser list/detail isolation also passed (MAN-20260917-02/03/04).
The signed-out list check passed in MAN-20260917-05.
List labels matched the four recorded detail statuses and Draft/Submitted detail
refresh passed in MAN-20260917-06. The submission-to-status integration check remains
tracked in the [test evidence](../testing/test-evidence.md).

**Implementation and rationale:** Consolidate `GET /api/events/:id` into one handler for
KAN-34 draft retrieval, KAN-33 coordinator detail and KAN-16 status/outcome retrieval.
Different pages use the same flat event response, extended with the recorded `review` and
caller-specific `actions`. The organiser and coordinator paths no longer depend on handler
mount order or a non-coordinator `next()` fallback.

An organiser can retrieve their own request in any current Sprint 1 status. A coordinator
cannot retrieve drafts and must pass the explicit visibility policy for every other status,
including `APPROVED` and `REJECTED`. Missing and inaccessible requests have the same 404
response. The pending-review queue keeps its existing status filter.

Viewing and decision permissions remain separate. `canEditDraft` is true only for an owned
draft. `canMakeInitialDecision` requires a coordinator, `SUBMITTED` status, no stored review
and the explicit `canReviewRequest(actor, request, client)` policy used by KAN-36. These
flags guide the interface; write endpoints recheck access and state before saving.

The detail query reads the event and review in one database snapshot. If imported data has
multiple review rows, it returns the earliest by creation time and ID; any stored review
prevents another initial decision. A decided status without a review row returns
`review: null` rather than inventing a decision record. Further review rounds remain outside
this read contract.

**Kind:** Technical implementation record on Tristan's feature branch. Team contract review
and customer clarifications remain separate; this record does not close Q-01, Q-02 or Q-04.

**Implementation owner and date:** Tristan, 11 September 2026.

**Remaining integration at the time:** The normal server still supplies no authentication or coordinator
policy adapters, so the routes remain unavailable during ordinary startup. The draft,
coordinator and status pages still need to consume the shared actions and outcome correctly.
In particular, viewing a saved outcome must not depend on permission to submit a new decision.

**Affected story and acceptance-criterion IDs:** KAN-34-AC1, KAN-33-AC2/AC3,
KAN-33-AC6, KAN-16-AC1–AC3; supports reloading outcomes after KAN-36-AC1/AC2. Backend retrieval alone
does not complete the corresponding browser acceptance scenarios.

**Affected implementation and tests:** `backend/src/modules/events/event-request-detail.ts`,
`backend/src/modules/events/submitted-requests-router.ts`,
`backend/test/events/event-request-detail.test.ts`,
`backend/test/events/submitted-requests-router.test.ts`,
`database/tests/events/event-request-detail.integration.test.ts`. On 11 September, type
checking and all 42 targeted backend tests passed, including 31 shared-detail service/HTTP
cases. All 25 PostgreSQL tests passed, including 11 new shared GET/POST cases in an isolated
test database. Fixture authentication does not verify live login. All five browser checks
also passed; the queue error/retry case in `tests/e2e/review-queue.spec.ts` uses response
fixtures and is not evidence of a fully authenticated coordinator workflow.

**Supersedes:** The detail-status restriction in the earlier KAN-33 scope record and the
non-coordinator fallback in the route-collision record, including KAN-33-AC5's blanket
restriction on draft/decided detail access. The owning organiser may retrieve drafts;
coordinators remain unable to view drafts; authorised viewers may retrieve decided requests.
The queue filter, KAN-33-AC4 empty-queue behaviour, KAN-33-AC6 ID validation and requirement
for explicit coordinator policies remain in force.

## 13 September 2026 — KAN-6 submission-completeness rule (Q-03 still open)

**Decision and rationale:** Q-03 (which fields are mandatory for submission, and what
may remain incomplete in a draft) remains an open customer question. As a provisional
team implementation assumption, KAN-6 requires `name`, `purpose`, `startsAt`, `endsAt`,
`expectedAttendance` and `venueRequirements` to be non-null before a `DRAFT` request may
transition to `SUBMITTED`. `description`, `accessibilityNeeds`, `equipmentRequirements`
and `registrationRequired` may remain blank at submission. This selection follows the
fields a coordinator needs to actually evaluate and schedule an event; it is not a
customer-confirmed rule and should be revisited once Q-03 is answered.

**Kind:** Team implementation assumption (not yet a customer clarification).

**Source and date:** Kai Jie, 13 September 2026, while implementing KAN-6.

**Affected story and acceptance-criterion IDs:** KAN-6-AC1, KAN-6-AC2 (repo copy in
`docs/scrum/sprint-01/sprint-backlog.md`).

**Affected implementation and tests:** `backend/src/modules/events/submit-input.ts`,
`backend/src/modules/events/submit-eligibility.ts`,
`backend/src/modules/events/submit-request.ts`,
`backend/test/events/submit-input.test.ts`,
`backend/test/events/submit-eligibility.test.ts`,
`database/tests/events/submit-request.integration.test.ts`.

**Supersedes:** None.

## 15 September 2026 — Supabase Auth and assigned-coordinator access

**Decision and rationale:** Sprint 1 uses Supabase Auth with pre-provisioned application
profiles. Express verifies the session token and maps its Supabase subject through
`app_users.supabase_user_id` to the application's user ID and role. Account provisioning
and role administration still need customer clarification under Q-01.

Only the currently assigned coordinator may view or review an event request through
the coordinator workflow. `event_requests.coordinator_id` must match the verified
`app_users.id`; it does not contain the Supabase Auth UUID. A null assignment or assignment
to another coordinator denies access. This gives Sprint 1 an explicit relationship rule
while Q-02 remains open for unassigned triage, assignment authority and delegation.

The coordinator queue excludes drafts and decided requests. Assigned coordinators can
retrieve non-draft details, including recorded outcomes after approval or rejection.
Organisers retain access to their own request details in every current Sprint 1 status,
and only their own drafts may be edited or submitted. Initial approval/rejection still
requires `SUBMITTED` status with no recorded decision. Assignment does not make a draft
reviewable. Reassignment changes subsequent access; decision writes check the assignment
against the locked event row before saving.

**Kind:** Team implementation assumption, pending customer clarification. This does not
close Q-01, Q-02 or Q-04, or add KAN-29 to the Sprint 1 commitment.

**Implementation:** `server.ts` uses `createRuntimeApp` in `backend/src/runtime-app.ts`
to mount authentication, event listing, shared detail, draft editing, submission and
decision writing with the same session verifier and explicit coordinator policies.
Until the assignment workflow is implemented, provision mapped test accounts and assign
synthetic requests through the Supabase dashboard.

**Verification:** Type checking, builds, 320 unit/component tests, 59 PostgreSQL tests
and six Playwright checks passed. The new authenticated review tests use locally signed
tokens with the actual verifier, session cookies, application-user mapping and runtime
policies against an isolated test database. They cover approval, rejection, ownership,
invalid sessions, impersonation attempts and reassignment. The startup check confirms
the running server requires login for each mounted event route. These checks do not
verify hosted Supabase sign-in or its signing-key service.

**Remaining integration at this stage:** The coordinator page's action and outcome display
is addressed by the next entry. Organiser-page integration and verification of the complete
workflow with hosted accounts remain pending. Backend wiring alone does not complete the
corresponding story acceptance scenarios.

**Affected stories:** KAN-25, KAN-33, KAN-34, KAN-6, KAN-36 and KAN-16.

**Supersedes:** The earlier absence of an authentication-provider selection and the
11 September runtime-wiring gap. The explicit-policy requirement and shared-detail
contract remain in force; the assigned-coordinator rule supplies the runtime policy.

## 15 September 2026 — Coordinator decision interface

**Implementation:** The coordinator page now uses the shared `canMakeInitialDecision` flag
instead of assuming permission. Recorded approval/rejection outcomes and reasons remain
visible when another decision is unavailable. Successful saves reload the request's status
and review; failed refreshes offer a read retry without submitting the decision again.
Uncertain writes and conflicts require a refresh before retrying, and late responses from
a previous request cannot replace the current page.

**Verification:** Type checking, builds, 337 unit/component tests and nine Playwright
checks passed. Component tests cover eligibility, saved outcomes, reasons, refresh failures
and navigation during requests. The decision browser checks use response fixtures to
exercise approval and rejection through a reload, including the mobile outcome display.
These checks do not establish that the full workflow has passed against the hosted
Supabase project.

**Remaining integration at this stage:** Verify the coordinator workflow with mapped
Supabase accounts and assigned test requests. KAN-16 also needs the organiser-facing
status/outcome page and an organiser list API that includes submitted and decided requests;
the current list returns drafts only. The next entry records the first hosted approval check.

**Affected stories:** KAN-36, KAN-33 and the shared response used by KAN-16.

## 15 September 2026 — Hosted approval check

**Tested by:** Tristan.

**Procedure and result:** Signed in to the webpage and approved a synthetic event request.
The corresponding request in Supabase changed from `SUBMITTED` to `APPROVED`.

**Evidence scope at this stage:** This records the successful webpage approval and observed
hosted status update. Rejection, inspection of the saved review row/reason, outcome
persistence after reload, queue removal and unauthorised-access checks had not yet been
completed against the hosted project. The organiser's status/outcome workflow was also incomplete.
Screenshots and the remaining acceptance results belong in the [test evidence record](../testing/test-evidence.md).

**Sprint impact:** KAN-36 implementation has progressed to hosted acceptance testing.
This single check does not mark KAN-36, KAN-16 or the complete workflow Done.

## 16 September 2026 — Hosted approval follow-up

**Tested by:** Tristan.

**Result:** Approval follow-up checks passed for the matching saved review row and reviewer,
the retained outcome after reload with decision controls hidden, and removal from the
pending-review queue. The [test evidence record](../testing/test-evidence.md) contains the
acceptance results. The subsequent rejection check also passed; unauthorised-access and organiser-workflow checks remain open.
KAN-16 still needs the organiser interface and an organiser list that includes submitted
and decided requests. These results do not mark either story Done.

## 17 September 2026 — Organiser outcome display and refresh

**Tested by:** Tristan, using the local webpage and Supabase development project. The
working branch was at `95cd43e`; the exact served build and check time were not captured.

**Implementation:** KAN-16's organiser list includes all owned statuses through
`GET /api/events?scope=all`. Linked read-only detail pages use the existing shared GET for
status and saved review information; no additional detail handler or access policy was added.

**Result:** The approved outcome remained after refresh. A rejected request opened from
Event requests showed its rejected status and reason, both retained after refresh. The
approved-request screenshot also showed `No reason provided.` and the recorded decision
time. See MAN-20260917-01 in the [test evidence record](../testing/test-evidence.md).

**Remaining checks:** Hosted non-final status display, submission-to-status refresh,
unrelated-owner reads and signed-out access remain unrecorded. Automated checks cover
those boundaries separately. This does not close the open customer questions or mark
KAN-16 Done; peer review, integration and remaining acceptance still need completion.

**Follow-up:** Reopening the copied request URL after sign-out showed a sign-in prompt,
with no request details or review reason displayed (MAN-20260917-02). This records the
detail-page behaviour; it does not establish signed-out list access or token revocation.

**Draft/Submitted follow-up:** The organiser detail page showed `Test Event Request 4`
as Draft with the not-submitted message, and `Test Event Request 3` as Submitted with
no approval or rejection recorded (MAN-20260917-03). List labels and refresh remain
to be confirmed. The remaining submission and access checks are tracked in the
[test evidence record](../testing/test-evidence.md); this does not close KAN-16.

**Ownership follow-up:** `Test Event Organiser 2` could not view the first organiser's
request through its URL, and the second account's Event requests page showed no requests
(MAN-20260917-04). This records browser list/detail isolation; no HTTP response or forged
owner parameter was captured. Remaining acceptance is tracked in the test evidence.

**Signed-out list follow-up:** Opening `/events` directly after signing out showed a
sign-in prompt without request names or statuses (MAN-20260917-05). This records the
browser result only; no HTTP response or previous-token replay was captured.

**List display follow-up:** Event requests showed Draft, Submitted, Rejected and
Approved for the four corresponding test requests, matching their detail pages
(MAN-20260917-06). Draft/Submitted detail statuses and review messages also remained
correct after refresh. The submission-to-status workflow remains in the [test evidence](../testing/test-evidence.md).

## 19 September 2026 — Provisional rules for the remaining first-release features

**Current status:** Every question below stays **Open**. This record documents the rules the
team encoded on `feat/KAN-24-core-feature-schema` so the remaining first-release features
could be built and tested; it does not answer any customer question and marks no story Done.

**Kind:** Team implementation assumption (not a customer clarification).

**Source and date:** Arvin, 19 September 2026.

**Decision and rationale:** The branch implements CF-05 and CF-08 to CF-20 together with the
outstanding parts of CF-02, CF-03, CF-04, CF-06 and CF-07. Each open question needed a working
rule before the code could exist. The rules below are the ones the code's header comments and
migration 005/006 comments state, and they are expected to change when the customer answers.

- **Q-02 (coordinator visibility and assignment)** — `backend/src/modules/events/assignment.ts`.
  Any Event Coordinator may see unassigned non-draft requests and the coordinator list, and may
  assign such a request to themself or a colleague. Once a request is assigned, only the
  currently assigned coordinator may hand it over. Drafts and closed requests (`REJECTED`,
  `CANCELLED`, `COMPLETED`) cannot be assigned. A coordinator unrelated to an already-assigned
  request receives the same 404 as a missing one. Across the venue, equipment and registration
  modules, "related to the event" means the owning organiser or the currently assigned
  coordinator (`isEventPlanner` in `backend/src/modules/equipment/equipment-requests.ts`).
  `coordinator_assignments` records the history; `event_requests.coordinator_id` remains the
  current assignment.
- **Q-04 (states, transitions, actors, clarification and confirmation)** — migration 005,
  `clarifications.ts` and `lifecycle.ts`. The status set becomes nine values: the six Sprint 1
  statuses plus `CONFIRMED`, `CANCELLED` and `COMPLETED`. Provisional transitions are
  `SUBMITTED → UNDER_REVIEW` (assigned coordinator starts the review),
  `SUBMITTED | UNDER_REVIEW → CLARIFICATION_REQUESTED` (assigned coordinator asks a question),
  `CLARIFICATION_REQUESTED → SUBMITTED` (the owner has answered every open question),
  `APPROVED → CONFIRMED`, active `→ CANCELLED` and `CONFIRMED → COMPLETED`. Approval of the
  request stays distinct from confirmation of a fully arranged event.
- **Q-05 (post-submission edits)** — `change-requests.ts`. After approval the organiser cannot
  edit the request directly; every draft field goes through a change request that the assigned
  coordinator approves or rejects. Only one `PENDING` change request per event, and only while
  the event is `APPROVED` or `CONFIRMED`. A proposed change may not clear a field that
  submission requires.
- **Q-06 (venue count and what consumes availability)** — migration 005. An event may hold
  several bookings. Only `APPROVED` bookings consume availability; `PENDING` requests do not
  hold the room. There are no tentative holds.
- **Q-07 (timezone, boundaries, operating hours, blocked periods)** — migration 005,
  `venues/suitability.ts` and `frontend/src/features/venues/presentation.ts`. Intervals are
  half-open `[startsAt, endsAt)`, so back-to-back bookings do not overlap. Venue operating hours
  are daily `opens_at`/`closes_at` times in Asia/Singapore, with a fixed UTC+8 offset because
  Singapore has no daylight saving; NULL means unrestricted, and an overnight interval is
  treated as outside operating hours. `venue_unavailability` rows are blocked periods that
  appear on the availability calendar and block approval. No setup or turnaround time is
  reserved around a booking.
- **Q-08 (suitability and overrides)** — `venues/suitability.ts` and `venues/booking-service.ts`.
  Suitability is assessed as five checks: `ACTIVE`, `CAPACITY` (venue capacity against expected
  attendance), `ACCESSIBILITY` (the event's stated accessibility needs), `OPERATING_HOURS` and
  `AVAILABILITY`. A failed check is a warning to the requester and Venue Staff, not a block: the
  booking request is still recorded and Venue Staff decide. Layouts are catalogue data used for
  search and recorded on the booking; they are not a pass/fail check.
- **Q-09 (equipment granularity)** — migration 005/006 and `equipment/types.ts`. Equipment is
  pooled by type with one `total_quantity`; individual items, locations, maintenance records and
  substitutions are not modelled. Availability is the highest simultaneous `RESERVED` quantity
  inside the window, not the sum of every overlapping reservation. Migration 006 corrects the
  database guard to use that same peak calculation.
- **Q-10 (discoverability, registration window, capacity, duplicates, withdrawal)** —
  `registrations/registration-eligibility.ts`. An event is discoverable when its status is
  `APPROVED` or `CONFIRMED` and `registration_required` is true. It is open when now falls
  within `[registration_opens_at, registration_closes_at]` (a NULL bound is unbounded), the
  event has not started, and the `REGISTERED` count is below `registration_capacity` (NULL means
  unlimited). One row per attendee and event: withdrawing keeps the row and re-registering
  reuses it. Withdrawal is allowed until the event starts.
- **Q-11 (what survives a change)** — `change-requests.ts` and `cancelOpenArrangements` in
  `events/workflow-support.ts`. Approving a change to the dates or expected attendance cancels
  the event's open venue bookings (`PENDING`, `APPROVED`) and equipment requests (`REQUESTED`,
  `RESERVED`), which must be re-requested, and returns a `CONFIRMED` event to `APPROVED`.
  Decided rejections and earlier cancellations are left alone. Registrations are not cancelled.
- **Q-12 (cancellation and completion authority)** — `lifecycle.ts`. Confirmation and completion
  are the assigned coordinator's; confirmation needs at least one `APPROVED` venue booking and
  no equipment request still awaiting a decision, and completion is only possible once the
  event's end time has passed by the database clock. Either the owning organiser or the assigned
  coordinator may cancel an active event with a required reason, which releases the same open
  bookings and equipment requests. The schema has no cancellation-reason column, so the reason
  travels only in the notifications, and it is sent to the organiser and coordinator only —
  registered attendees are told the event is off without it.
- **Q-13 (notifications)** — migration 005 and `notifications/notify.ts`. Delivery is in-app
  only, with read state and no email, push or retry. Notifications are written through `notify()`
  on the acting service's transaction client, so a notification exists only if the action it
  describes committed. Recipients are de-duplicated and the acting user is left out of the list.
  The existing draft submission and initial approval/rejection services were not changed to send
  notifications.

- **Q-14 (audit records)** — migration 005 and `events/workflow-support.ts`. Only event-request
  status changes are audited, through the `event_status_history` trigger. A service attributes a
  change by setting `app.actor_id` inside its transaction; an unattributed change still records a
  row, with a null actor, rather than being lost. The history is readable by the owning organiser
  and the assigned coordinator. No audit record is kept for venue, equipment, registration or
  notification actions, no retention period is defined, and nothing is exposed to an
  administrator role, because none exists. This is narrower than Q-14 asks and should be revisited
  once the customer states which actions need auditing and who may inspect them.

**Initial decision now allowed from `UNDER_REVIEW`:** `review-eligibility.ts` previously accepted
an initial approval or rejection only from `SUBMITTED`. It now accepts `SUBMITTED` or
`UNDER_REVIEW`. Without this, the new `POST /api/events/:id/start-review` transition would have
trapped a request: marking it as under review would have made it permanently undecidable and
forced the coordinator to raise a clarification purely to get back to `SUBMITTED`. The other
guards are unchanged — the caller must still be the assigned coordinator, and a request with a
recorded decision or in `APPROVED`/`REJECTED` still returns `REVIEW_ALREADY_DECIDED`. A pending
clarification must still be answered first, which returns the request to `SUBMITTED`.

**Affected story and acceptance-criterion IDs:** KAN-31/KAN-4 (draft creation), KAN-27
(clarification), KAN-29 (coordinator assignment, still outside the Sprint 1 commitment) and the
unlinked CF-08 to CF-20 features in [traceability.csv](traceability.csv). Interacts with
KAN-36-AC1/AC2 through the widened initial-review state.

**Affected implementation and tests:** `backend/src/app.ts`, `backend/src/runtime-app.ts`,
`backend/src/modules/events/` (`create-draft.ts`, `assignment.ts`, `assignment-router.ts`,
`clarifications.ts`, `clarification-router.ts`, `change-requests.ts`, `change-request-router.ts`,
`lifecycle.ts`, `lifecycle-router.ts`, `workflow-support.ts`, `workflow-http.ts`,
`review-eligibility.ts`, `event-request-detail.ts`), `backend/src/modules/venues/`,
`backend/src/modules/equipment/`, `backend/src/modules/registrations/`,
`backend/src/modules/notifications/`, `database/migrations/005_core_feature_schema.sql`,
`database/migrations/006_equipment_peak_availability.sql`, `database/seed.ts`, and the
frontend pages, panels and API clients under `frontend/src/features/` with
`frontend/src/app/router.ts` and `frontend/src/components/AppShell.vue`. Tests are in
`backend/test/events/`, `backend/test/venues/`, `backend/test/equipment/`,
`backend/test/registrations/`, `backend/test/notifications/`, `database/tests/events/`,
`database/tests/venues/`, `database/tests/equipment/`, `database/tests/registrations/`,
`database/tests/notifications/`, `database/tests/core-schema.integration.test.ts` and the
component tests beside each page and panel.

**Verification:** Type checking, both builds, 737 unit/component tests, 212 PostgreSQL
integration tests and 17 Playwright checks passed locally. The Playwright checks still cover
only the Sprint 1 pages and use API response fixtures. Nothing here has been run against hosted
Supabase accounts or peer reviewed, and Venue Staff, Technical Support Staff and Attendee
accounts must be provisioned in Supabase Auth and linked through `app_users.supabase_user_id`
before those roles can sign in at all. Record hosted results in the
[test evidence](../testing/test-evidence.md) before claiming acceptance.

**Supersedes:** The `SUBMITTED`-only initial-review state in the 15 September
assigned-coordinator record, and the earlier statements that venue, equipment, registration and
notification work was deferred. The assigned-coordinator access rule, the explicit-policy
requirement and the shared-detail contract remain in force.
## 19 September 2026 — Draft customer clarification for Q-03

**Purpose:** This is not a decision. It packages the provisional KAN-6 assumption (13
September 2026 entry above) into a concrete question so the next customer session can
actually close Q-03, rather than leaving it open indefinitely behind a team-only default.

**Proposed question for the customer:** "For an event request to move from Draft to
Submitted, which of the following details must be filled in, and which are acceptable to
leave blank until later (e.g. during coordinator review, clarification, or before
approval)?"

- Event name
- Purpose
- Start date/time
- End date/time
- Expected attendance
- Venue requirements
- Description
- Accessibility needs
- Equipment requirements
- Whether registration is required

**Current provisional default to present as the starting proposal (KAN-6, 13 September
2026):** Mandatory — `name`, `purpose`, `startsAt`, `endsAt`, `expectedAttendance`,
`venueRequirements`. May remain blank at submission — `description`, `accessibilityNeeds`,
`equipmentRequirements`, `registrationRequired`.

**Rationale to present alongside the proposal:** The six mandatory fields are the minimum a
coordinator needs to judge feasibility — identity, justification, timing, scale and space.
The four optional fields are either free-text detail or tied to questions Sprint 1 has not
committed to answering (Q-08 venue suitability, Q-09 equipment tracking, Q-10 registration),
and gaps in them can be closed later through the KAN-27 clarification-request flow instead
of blocking submission outright.

**Known risk to flag when presenting this default:** `accessibilityNeeds` is proposed as
optional, but it is also the field most likely to affect venue suitability (Q-08). If
venue-assignment logic ships before Q-08 is answered, an unset accessibility field could
let an unsuitable venue be assigned without anyone having stated a need. Ask the customer
directly whether accessibility needs should instead be mandatory, or whether "not stated"
may be treated as "none."

**Kind:** Draft clarification prepared for a customer discussion; does not close Q-03.
Record the customer's actual answer as its own dated entry once received, and update Q-03's
Status column in the table above from `Open` accordingly.

**Source and date:** Kai Jie, 19 September 2026.

**Affected story and acceptance-criterion IDs:** KAN-6-AC1, KAN-6-AC2, KAN-4-AC1,
KAN-34-AC2.

**Affected implementation and tests:** `backend/src/modules/events/submit-input.ts`,
`backend/src/modules/events/submit-eligibility.ts`,
`backend/test/events/submit-input.test.ts`.

**Supersedes:** None — complements the 13 September 2026 KAN-6 entry; changes no code
behavior on its own.

## Decision record template

Copy this block when the team receives an answer or adopts an explicit implementation assumption. Keep superseded decisions so later changes remain explainable.

```text
Question ID:
Decision and rationale:
Kind: customer clarification / team implementation assumption
Source and date:
Affected story and acceptance-criterion IDs:
Affected implementation and tests:
Supersedes, if any:
```
