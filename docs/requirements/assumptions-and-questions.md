# Assumptions and customer questions

These items are unresolved unless a dated decision is added. The proposed defaults in architecture or code are team choices until validated; they do not replace customer requirements. Discuss customer questions through the clarification process for this team's section.

| ID   | Decision needed                                                                                                                       | Why it matters                                                     | Status |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------ |
| Q-01 | How are accounts created, roles assigned, and organisation membership established?                                                    | Avoid giving users a way to grant themselves staff access.         | Precreated internal test accounts are sufficient for the first release; self-service staff account creation is not required. Multi-role accounts remain unanswered. |
| Q-02 | Who may see unassigned events, assign or reassign coordinators, and access another coordinator's events?                              | Role alone is insufficient for authorization.                      | Availability may be preconfigured. Fewest-active-events selection is agreed; counted statuses, fallback and reassignment boundaries remain open. |
| Q-03 | Which fields are mandatory for submission, and what may remain incomplete in a draft?                                                 | Draft and submission validation differ.                            | Event date and attendance are mandatory; optional needs may be None / Not Required. Complete the field and conditional-registration validation table. |
| Q-04 | What are the event states, allowed transitions and actors, clarification/resubmission behavior, and confirmation prerequisites?       | Status changes must match real actions.                            | Event-request rejection requires a reason. Final confirmation, clarification/resubmission and detailed transitions still need explicit criteria. |
| Q-05 | Which post-submission fields may be edited directly, and which require a reviewed change request?                                     | Prevent silent changes to approved arrangements.                   | Organiser edits before approval are permitted, but must be reconciled with coordinator-only later event editing. Major changes to confirmed arrangements require cancellation and a new request. |
| Q-06 | How many venues may an event use? Do pending requests or tentative holds consume availability?                                        | Determines the booking model and conflict policy.                  | Multi-session events are outside this release. Booking submission must be blocked for an already reserved period; tentative-hold and pending-request treatment remain open. |
| Q-07 | What timezone, interval boundary, setup/turnaround, operating-hour and blocked-period rules apply?                                    | Adjacent bookings can otherwise produce inconsistent availability. | No turnover period is required. Document interval boundaries and the Singapore-time convention; clarify new blocks overlapping existing bookings. |
| Q-08 | How are event facilities, layout and accessibility needs matched, and what happens after an unsuitable result?                        | An available room may still be unsuitable.                         | Required checks recorded in KAN-52; matching, missing inputs and booking follow-up still to clarify. |
| Q-09 | Is equipment pooled by type or tracked individually? How do location, maintenance and substitutions work?                             | Determines availability and reservation granularity.               | Quantity-based availability is required; equipment location need not restrict use. Exact pooling, maintenance and substitution rules remain to refine. |
| Q-10 | What makes an event discoverable and open for registration? What capacity, duplicate, withdrawal and registration-period rules apply? | Registration must remain consistent with event arrangements.       | Registration is individual; remaining eligibility, capacity and period rules need explicit criteria. |
| Q-11 | After a date, attendance, venue or equipment change, which reservations and registrations are retained, released or reapproved?       | Changes must not leave stale commitments.                          | Major changes affecting confirmed arrangements require cancellation and a new request; define effects on each reservation and registration. |
| Q-12 | Who may cancel or complete an event, and what resources must cancellation release?                                                    | Event lifecycle affects other core features.                       | Equipment reservations release automatically on cancellation/completion; authorised technical staff may also adjust them. Actors, transitions and other resource effects remain to specify. |
| Q-13 | Which actions notify which users, using which channel? Is read status or delivery retry required?                                     | Avoid missing recipients or exposing unrelated event details.      | Notification channels are an implementation choice; reconcile email promises with the chosen delivery scope. Recipients and delivery behaviour remain to specify. |
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

**Superseded in part, 26 September 2026:** the venue, equipment, registration, notification and
change-request services this record described were removed before Sprint 2 so the team implements
those stories itself. The rules below for Q-06 to Q-11 and Q-13 therefore describe code that no longer
exists and bind nothing; they are kept as the reasoning a future implementation can accept or reject.
The rules for Q-02 (assignment), Q-04 (transitions), Q-12 (cancellation) and Q-14 (status audit) remain
in force, because those services are still present. Every customer question stays **Open**.

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

## 21 September 2026 — Review closure and Sprint 2 planning record

**Team decisions:**

- Venue availability calendars are for **Event Coordinators, Venue Staff and Technical Support Staff**. The application role names are `EVENT_COORDINATOR`, `VENUE_STAFF` and `TECHNICAL_SUPPORT_STAFF`. KAN-51 must enforce this access in the API and interface. The detail visible in booking labels still needs agreement; calendar access alone does not grant unrestricted event-request access.
- Coordinators may assign requests to themselves or to another coordinator. This establishes permitted assignment targets, but does not settle who may reassign a request already owned by another coordinator. KAN-29 also requires **automatic assignment** when an organiser submits a request; existing manual assignment is only part of the workflow.
- Sprint 1 closed in Jira with seven Done items worth **24 points** and KAN-6, KAN-33 and KAN-34 carried over at their original **8 points**. Its original ten-item, 32-point commitment is unchanged.
- Sprint 2 contains nine new stories worth **35 points**, plus the three carry-over stories, for **43 points across 12 PBIs**. The roughly six-point allocation target per developer applies to the new work; owners must also account for carry-over and integration effort.

**Implementation gaps at this checkpoint:** The venue calendar route accepts any authenticated role, with booking labels restricted to coordinators and venue staff. It needs alignment with the three-role decision above. Submission does not automatically select a coordinator. Availability, selection/tie-break and fallback were still open at this checkpoint; the later KAN-29 revision below settles selection. The current manual handover restriction remains an implementation assumption until Q-02 is fully resolved.

**Review follow-up:** Registration-dependent draft fields, coordinator navigation after approval, saved-draft submission and mandatory-field validation remain tracked as [S1-DEF-01–04](../scrum/sprint-01/review.md#review-defects-and-carry-over). Some demonstrated validation/submission paths passed while other paths failed; reproduce the exact affected paths before claiming a fix. Q-03's customer clarification remains open.

**Record details:** Prepared 21 September after the completed team review and Sprint 2 planning. Exact meeting times and attendance were not recorded. These are team decisions, not a claim of separate customer approval. See the [Sprint 1 review](../scrum/sprint-01/review.md) and [Sprint 2 planning](../scrum/sprint-02/planning.md).

**Supersedes:** Earlier open wording about whether coordinators may select themselves or a colleague, and any assumption that all authenticated roles should have venue calendar access. Earlier dated implementation and test records remain historical evidence; this documentation update does not change code or establish new test results.

## 21 September 2026 — Sprint 2 criteria alignment

**Version note:** This entry records the earlier detailed planning version. The Jira backlog audit later on this page identifies shorter current Jira cards and the remaining reconciliation; its 93 planning criteria must not be described as a verbatim current Jira snapshot.

The initial alignment recorded nine Jira user stories and 99 acceptance criteria, labelled `KAN-<number>-AC<number>` for repository traceability, replacing the earlier proposed criteria. The later KAN-29/KAN-51 revision below supersedes those two cards; the [current backlog](../scrum/sprint-02/sprint-backlog.md) now has 93 criteria. Technical tasks, extra robustness checks and unresolved policy questions remain separate; the 35 new points and eight carry-over points are unchanged. Current Sprint 1 Jira wording still needs reconciliation with its historical story cards.

KAN-52 already requires checks for capacity, required facilities, applicable accessibility and layouts, and date/time availability, using current event and venue information. It also requires a useful explanation of failure. Q-08 now concerns how the event needs are represented and matched, what missing information means, and whether an unsuitable result prevents submitting a request for assessment. It does not reopen whether the named checks belong in the story.

KAN-8 requires staff to be able to provide rejection information or a reason. Whether a non-empty reason is mandatory remains to be agreed. KAN-53 requires relevant event timing and venue requirements to reach the booking/staff-review workflow; the representation and snapshot-versus-current-data behaviour need to be specified.

At initial alignment, the three-role calendar decision and self/other-coordinator assignment decision were separate meeting refinements. The revised KAN-51 below now includes all three roles explicitly; manual reassignment remains a separate refinement. The [Jira refinement register](../scrum/sprint-02/planning.md#jira-refinements-to-record) also tracks automatic-assignment fallback, time boundaries, operational blocks and the four carried defects.

**Effect:** Requirement documentation and planned traceability updated. No implementation, executed-test result, point estimate or Jira issue was changed by this record.

## 21 September 2026 — KAN-29 and KAN-51 revision

**Version note:** These two revised cards still match the current Jira wording. The customer-rule reconciliation below now permits preconfigured availability, and the backlog audit distinguishes the other cards' planning and Jira versions.

**KAN-29:** The current story has seven acceptance criteria. On successful submission, filter to available Event Coordinators, choose the coordinator with the **fewest active events**, and break ties using a **consistent ID/order**. Retain one assignment on the correct event, assigned-coordinator visibility, no manual administrator action for initial assignment, no automatic approval/rejection and persistence until reassignment.

The availability source, event statuses counted as active and no-available-coordinator outcome remain to be defined. The implementation must document its stable tie-break order and preserve consistent counts/ownership under concurrent submissions. Manual self/other assignment and handover authority remain separate from this initial-assignment rule.

**KAN-51:** The revised user story explicitly names Event Coordinators, Venue Staff and Technical Support Staff as authorised internal users. Its six criteria cover relevant dates/times, confirmed booking unavailability, recorded unavailability, distinguishable available/unavailable periods, correct venue association and denied unauthorised access. The role extension is no longer an outstanding wording change. Role-specific booking labels/details and separate search/booking permissions remain to be settled.

**Traceability:** The current cards use `KAN-29-AC1`–`KAN-29-AC7` and `KAN-51-AC1`–`KAN-51-AC6`, in the order of their revised criteria. Their planned cases and CSV mappings have been updated together. Previous labels for those two cards are superseded; no executed Sprint 2 result depends on them. The other seven new story cards are unchanged. There are **93 current criteria across nine new stories**, plus the separately recorded assignment rule.

**Scope and implementation:** The baseline remains 12 PBIs and **43 points**. This is a documentation revision; automatic assignment and calendar access changes still need implementation and verification. No application or Jira changes, new test results or acceptance outcomes are recorded here.

## 21 September 2026 — Customer rules reconciled with the backlog

The customer discussions on 25 August and 9 September establish the rules below. This record resolves the matching open questions above. Earlier implementation assumptions and test observations retain their original dates; recording a requirement does not establish that the implementation already satisfies it.

| Area | Rule and scope | Remaining refinement |
| --- | --- | --- |
| Event-request rejection | KAN-36 must require a rejection reason, at least a short explanation. Approval does not require a reason under this clarification. | Add explicit Jira criteria and a linked correction if the UI or API still accepts an empty rejection reason. Retain the original Sprint 1 acceptance record and record this reconciliation separately. |
| Submission validation | Event date and attendance are mandatory. Inapplicable accessibility, equipment, registration and special needs may be recorded as None / Not Required. | KAN-6 needs a complete field checklist, valid timing/attendance rules and conditional registration rules. Link S1-DEF-03/04 and verify both new-request and saved-draft paths. |
| Coordinator assignment | Availability may be treated as already marked. KAN-29 can use preconfigured availability without adding an availability-management interface. Selection rules may be team assumptions; retain the agreed fewest-active-events rule and consistent ID/order. | Define active-event statuses, the stored availability field and no-candidate behaviour. Manual reassignment remains a separate permission decision. |
| Venue booking conflicts | A request for a period already reserved for another event must be blocked at submission, not only at final booking approval. | Add this behaviour to KAN-53/KAN-54 with no persisted conflicting request and useful feedback. Define which tentative/pending states consume availability. |
| Operational blocks | An existing reservation must not be silently displaced by a later operation. The answer about a new operational block repeats the booking-submission wording without specifying which operation is refused. | Obtain an explicit block-over-existing-booking rule for KAN-55. Do not infer automatic cancellation or displacement from that answer. |
| Equipment | Quantities and overlapping reservations must affect availability. Venue and equipment arrangements may proceed independently. Cancelled or completed events release equipment reservations automatically, and authorised technical staff may make manual adjustments. Equipment location need not restrict allocation. | KAN-26 must support planning-stage arrangements and resource release. Define the exact eligible event states, quantity integrity and manual-change permissions. |
| Post-submission changes | Organisers may edit submitted requests before approval. Another answer restricts general event editing to coordinators. Major changes affecting confirmed arrangements, such as changed attendance or duration, require cancellation and a new request. | Resolve the lifecycle/field boundary explicitly in KAN-15 or a linked story. KAN-34's draft editing does not cover this path. |
| Release boundaries | Precreated internal accounts and a placeholder venue catalogue are sufficient. Sample venue/equipment lists and layouts may be defined by the team. Multi-session events and turnover buffers are not required. Registrations are individual. Notification channels are an implementation choice. | Keep the selected KAN-50 maintenance story unless the team deliberately replans. Reconcile email promises in later stories with the chosen notification channel. Do not infer a timezone requirement from an illustrative example. |
| Technical staffing and account roles | Earlier discussion excludes staffing logistics, while another answer mentions automatic staff assignment. Multiple roles for one person remain unanswered. | Resolve KAN-23's scope before implementation; do not introduce specialist staff scheduling or multi-role accounts as settled requirements. |

**Effect:** Requirements and refinement records only. No Jira status, story estimate, application behaviour or executed test result changed in this review. The Sprint 1 closure remains 24 Done points and eight carried points; Sprint 2 remains 43 points until an explicit scope change is agreed.

## 21 September 2026 — Jira backlog audit

The pre-edit Jira export reviewed on 21 September contains **43 issues: 30 stories and 13 subtasks**, with unique issue keys. Sprint 1 has ten stories at 32 points, seven Done at 24 points and three carried stories at eight points. Sprint 2 has nine new stories at 35 points plus those eight carried points. KAN-6 and KAN-34 remain assigned to Kai Jie; KAN-33 remains assigned to Irfan. All nine new Sprint 2 stories are unassigned. The two Sprint fields preserve sprint-membership history and should not be removed from carried items.

The review and retrospective took place on **19 September**. Jira records KAN-16's resolution as **20 September, 23:06**, and the other six completed stories as **21 September, 00:26**. The timestamp fields do not state a timezone. Record these as later tracker updates; do not change meeting dates or reconstruct daily completion times from them. The snapshot is not a start/close board capture, sprint report or daily burndown.

### Jira changes identified in the pre-edit audit

| Item | Change or decision needed |
| --- | --- |
| KAN-36 | Add mandatory rejection-reason criteria: blank/whitespace reasons are refused; the saved reason belongs to the correct decision and is visible to the relevant organiser. Check implementation and create/link corrective work without rewriting Sprint 1's historical evidence. |
| KAN-6 | Replace undefined submission rules with a field/conditional-validation checklist and link the two carried submission defects. |
| KAN-53 / KAN-54 | Explicitly reject submission when an already reserved period conflicts, with useful feedback and no created request. Continue checking at approval to cover stale availability and concurrent requests. |
| KAN-10 | Replace the copied organiser status-view description with the actual event-completion story. Specify the authorised actor, allowed prior states, recorded transition and resulting resource effects. |
| KAN-26 | Remove an unintended dependency on final event/venue confirmation. Specify planning-stage equipment reservations, quantity/conflict protection, automatic release on cancellation/completion and authorised manual adjustments. |
| KAN-21 / KAN-55 | Resolve the duplicated operational venue-block scope. Keep one authoritative story, transfer any agreed mandatory-reason requirement, and link the other as duplicate/superseded. Do not count both estimates for the same delivery. |
| KAN-29 | Record preconfigured availability, active-event statuses, deterministic ordering and no-candidate behaviour. Retain the agreed automatic-selection rule. |
| KAN-24 | Add verifiable database/setup/diagram criteria. The current description is one sentence; the repository's detailed infrastructure checks are not yet adopted Jira criteria. Link existing evidence without inventing a new historical acceptance date. |
| KAN-23 | Resolve whether staff assignment belongs in this release, estimate before selection, and clarify why assigning a staff member currently marks the support request Completed. Assignment and completed work should not be conflated without an explicit rule. |
| KAN-15 / release workflow | Specify post-submission editing and change-request review outcomes. Map final event confirmation, cancellation and equipment-request/review behaviour to existing Jira items or refine missing stories. These workflows are not covered merely by KAN-16 status display or KAN-36 initial approval. Add future scope through planning, not automatically to Sprint 2. |
| Sprint 2 ownership and evidence | Assign the nine new stories and balance the full 43 points, including carry-over. KAN-42 integration testing and KAN-43 code review remain In Progress under KAN-33; close them only when the corresponding work and evidence are complete. |

Jira's Highest/High/Medium/Lowest priority field and the team's Must/Supporting selection classification are different fields of meaning. Keep them distinct or document an explicit mapping.

### Criteria versions to reconcile

The counts below describe the pre-edit export. The live refinements recorded later on 21 September are listed in the next section; these counts are not a current live-Jira count.

Sprint 1's nine functional stories contained **79 Jira acceptance criteria in the pre-edit export**. Its existing repository cards use broader implementation criteria and historical test IDs. Cross-reference the versions without renumbering existing evidence or claiming that the later wording was the exact version used at planning or review. KAN-24 had no explicit criteria in that export; five checks were subsequently added as recorded below.

For Sprint 2, the pre-edit export had **77 criteria**, while the detailed planning cards retain **93**. KAN-29, KAN-50 and KAN-51 matched. Keep the existing repository criterion IDs; they identify the detailed planning version rather than a verbatim copy of each later Jira refinement.

| Story | Jira / detailed planning criteria | Difference to resolve |
| --- | ---: | --- |
| KAN-12 | 10 / 13 | Explicitly changing/clearing filters and clear venue identification are absent from the shorter wording; excluding failed-filter results is partly implied. |
| KAN-52 | 7 / 9 | Preserve checks that suitable venues are not falsely rejected and that current event/venue information is used. |
| KAN-53 | 7 / 11 | Preserve correct venue linkage, explicit creation/submission and pending-versus-decided state. Add the customer-required submission conflict rule. |
| KAN-8 | 8 / 11 | Preserve opening the request with timing/requirements, linking the decision to the correct booking request, and ensuring rejection does not confirm a booking. |
| KAN-54 | 7 / 9 | Preserve different-venue non-conflict and current-information checks. Add the submission conflict rule alongside confirmation protection. |
| KAN-55 | 11 / 13 | Date/time bullets were consolidated; explicit reason entry is missing. Reconcile mandatory reasons with KAN-21 and settle overlapping-block behaviour. |

Some differences consolidate wording rather than remove behaviour. Agree concise Jira criteria and retain detailed examples as test cases where appropriate; criterion counts are not a measure of delivered scope. No extra story points or acceptance outcomes are implied by this audit.

## 21 September 2026 — Jira updates applied

The live backlog now records the customer-rule corrections and release gaps identified above. Sprint 1 remains **32 committed, 24 Done and 8 carried points**. Sprint 2 remains **12 PBIs / 43 points**, with 35 points To Do, eight In Review and zero Done at this inspection. Existing assignees, estimates and sprint history were retained. This is backlog refinement, not an implementation or test run.

### Carry-over and corrective work

| Jira work item | Parent / relation | Recorded work |
| --- | --- | --- |
| [KAN-56](https://smu-g7-grp1.atlassian.net/browse/KAN-56) | Subtask of KAN-33; S1-DEF-02 | Restore authorised coordinator navigation to decided requests, retain saved outcomes and test access/initial-review regressions. Final event confirmation is a separate workflow. |
| [KAN-57](https://smu-g7-grp1.atlassian.net/browse/KAN-57) | Subtask of KAN-34; S1-DEF-01 | Repair registration-dependent fields when reopening a draft; test both toggle directions, persistence and conditional validation. |
| [KAN-58](https://smu-g7-grp1.atlassian.net/browse/KAN-58) | Subtask of KAN-6; S1-DEF-03 | Enable and verify saved-draft submission alongside the new-request path. |
| [KAN-59](https://smu-g7-grp1.atlassian.net/browse/KAN-59) | Subtask of KAN-6; S1-DEF-04 | Reject incomplete submissions with field feedback and retain draft data. |
| [KAN-60](https://smu-g7-grp1.atlassian.net/browse/KAN-60) | Task related to KAN-36 | Enforce a nonblank event-rejection reason in the UI/API, persist it for the organiser and verify invalid attempts have no side effects. |

KAN-56–KAN-59 are To Do, unestimated subtasks included in the carried parent estimates, with individual subtask assignees still to select. KAN-60 is an unestimated future-backlog task outside Sprint 2. KAN-36 remains Done for its historical Sprint 1 slice; its new mandatory-reason criteria and linked correction do not rewrite previous results.

### Existing cards refined

- **KAN-6, KAN-33 and KAN-34:** added the reported carry-over paths and regression expectations. KAN-6 now explicitly requires event date and attendance, allows None / Not Required for inapplicable optional needs, and records the remaining field/conditional rules to agree.
- **KAN-29:** recorded preconfigured availability, the existing fewest-active-events/tie-break rule and the manual self/other assignment decision. Stored availability, counted states, no-candidate behaviour and handover authority remain open.
- **KAN-12, KAN-52, KAN-53, KAN-8, KAN-54 and KAN-55:** added the meaningful correctness checks missing from the shorter descriptions. Submission-time booking conflict protection, approval-time rechecking and mandatory operational-block reasons are explicit. Pending holds, interval boundaries, suitable-event rules, booking-review permissions and blocks overlapping existing bookings still need decisions.
- **KAN-21:** initially marked superseded and linked as a duplicate of KAN-55. Its old two-point estimate was still counted in the first inspection's raw future-backlog total. It was subsequently archived in the scope consolidation below; the history remains available.
- **KAN-10:** replaced the copied organiser-status description with event completion, recorded transition, persistence and equipment release. Exact eligibility remains proposed.
- **KAN-26:** removed a blanket final-confirmation prerequisite and added planning-stage reservations, quantities/conflicts, independent venue/equipment arrangements, automatic release and authorised manual adjustments.
- **KAN-15:** recorded change-request review, notifications, the pre-approval editing ambiguity and cancellation/new-request handling for major changes affecting confirmed arrangements.
- **KAN-23:** marked staffing scope and the old assignment-to-Completed rule as unresolved before selection; no estimate invented.
- **KAN-19:** replaced an email-only promise with the release's chosen notification channel. This optional story was subsequently archived in the scope consolidation below.
- **KAN-24:** added five verifiable setup/schema/security/integration/diagram criteria and references to the existing 20 September evidence. Hosted Data API-setting verification and criterion-to-evidence cross-references remain to complete.

KAN-50 and KAN-51 already matched their current story wording. KAN-9 already addresses requested quantities, overlapping reservations and independence from venue confirmation; KAN-18 excludes operationally unavailable equipment. Those four descriptions required no change in this pass.

### Future release stories created

| Jira story | Release coverage | Refinement still needed |
| --- | --- | --- |
| [KAN-61](https://smu-g7-grp1.atlassian.net/browse/KAN-61) — Confirm Event After Planning Arrangements | CF-06; distinguish final confirmation from KAN-36 initial approval | Eligible states, readiness checklist, optional arrangements and notification/registration effects |
| [KAN-62](https://smu-g7-grp1.atlassian.net/browse/KAN-62) — Cancel Event and Release Its Arrangements | CF-06/CF-19 with equipment and booking effects | Actors/states, reason policy, booking release and registration/notification handling |
| [KAN-63](https://smu-g7-grp1.atlassian.net/browse/KAN-63) — Submit and Review Event Equipment Requests | CF-15, connected to KAN-9 and KAN-26 | Request/review states, partial fulfilment, edit rights and reservation timing |
| [KAN-64](https://smu-g7-grp1.atlassian.net/browse/KAN-64) — Notify Relevant Users About Event Workflow Updates | CF-20, reusing notification work already described in other stories | Trigger/recipient/channel matrix, retries, duplicate handling and reuse of existing implementation |

These stories are To Do, unassigned and unestimated in the future backlog. Their criteria are proposals for refinement before sprint selection. They do not add to the 43-point Sprint 2 commitment. Review existing code and overlapping stories before estimating remaining work.

### Sprint settings and remaining team work

The live Sprint 2 goal now covers automatic coordinator assignment, a maintained venue catalogue and the connected booking/decision workflow. Jira starts the sprint at **20 September 00:00** and ends it at **4 October 00:00**, the boundary after the inclusive 3 October final day. The planned review remains Saturday 3 October; its actual meeting time is not recorded. Automatic sprint completion remains disabled.

The nine new Sprint 2 stories still need named owners/reviewers and a capacity check. Kai Jie retains KAN-6/KAN-34 and Irfan retains KAN-33. KAN-42 and KAN-43 remain In Progress pending actual integration-test and code-review evidence. Retain the **93 repository planning criterion IDs** and existing test references; the six shorter Jira cards now include their missing checks as dated refinements. A fresh portable export, a detailed criterion cross-reference, unresolved policy decisions and original meeting/board evidence remain to collect.

## 21 September 2026 — release backlog consolidated

The [product backlog](product-backlog.md) now maps all 20 core features to retained stories and records future acceptance criteria and dependencies. Existing venue stories KAN-50–KAN-55 already cover the venue gaps; no parallel venue stories were created. Reassignment, ordinary planning edits and manager registration visibility needed explicit coverage:

| New Jira story | Scope and boundary | Live state |
| --- | --- | --- |
| [KAN-65](https://smu-g7-grp1.atlassian.net/browse/KAN-65) — Reassign Event Coordinator | Handover of an existing event, one current coordinator, updated relationship-based access and retained event information. Linked to KAN-29 automatic initial assignment. | To Do, unassigned, unestimated; no sprint |
| [KAN-66](https://smu-g7-grp1.atlassian.net/browse/KAN-66) — Update Event Information During Planning | Ordinary permitted edits by role, relationship and stage; significant changes use KAN-15. Linked to KAN-15. | To Do, unassigned, unestimated; no sprint |
| [KAN-67](https://smu-g7-grp1.atlassian.net/browse/KAN-67) — View Event Registrations | Relevant organiser/coordinator sees correct event registrations, counts and active/withdrawn states, with protected personal fields. Linked to KAN-14 and KAN-17. | To Do, unassigned, unestimated; no sprint |

### Existing scope retained and clarified

- **KAN-14:** adds relevant attendee event information, registration enabled/window/capacity checks, own saved status, duplicate prevention and access checks. Core registration has no waiting-list dependency.
- **KAN-17:** records confirmation, persistent withdrawal status, capacity released once, access controls and failure consistency. Withdrawal timing and re-registration rules remain open.
- **KAN-15 — Submit and Review Event Change Requests:** one story now covers submission, coordinator comparison/assessment, saved outcomes, permitted application of accepted changes and resource reconsideration. KAN-66 owns ordinary edits. Major changes affecting confirmed arrangements use cancellation plus a new request.
- **KAN-61:** confirmation readiness covers required venue/equipment arrangements and applicable Not Required equipment. Optional human staffing is not a prerequisite.
- **KAN-62, KAN-63 and KAN-64:** their descriptions were found blank during the follow-up inspection. Full stories, criteria and open decisions were saved and verified. They cover cancellation/resource release, coordinator equipment requests with Technical Support Staff review/update, and request/planning/registration notification groups respectively. Additional duplicate review or notification stories were unnecessary.

The existing estimates on older stories remain unchanged and require review against refined scope before future selection. New criteria are working requirements, not evidence of completed implementation or acceptance. Handover authority, editing boundaries, registration disclosure, lifecycle/readiness rules and the notification trigger/recipient/channel matrix remain to settle.

### Archived scope

KAN-21 was archived as a duplicate of KAN-55 after retaining its mandatory-reason and operational-block requirements in KAN-55. KAN-19 waiting lists, KAN-22 human technical-support requests and KAN-23 human staff assignment were archived as optional scope outside the selected core release. This scope choice does not claim that the customer prohibited these extras. Required equipment technical requirements and Technical Support Staff review remain in KAN-63.

All four cards had no child items or sprint membership when checked. Each now displays an archived notice and Restore action; their history was preserved. The [archived-item register](product-backlog.md#archived-backlog-items) records the rationale. Sprint 1 remains 32 committed / 24 Done / eight carried points, and Sprint 2 remains 12 PBIs / 43 points. No statuses were changed to Done by this cleanup.

### Repository and test alignment

The requirements map, traceability matrix, future test outlines, Sprint 2 references and submission checklist now point to the consolidated backlog. TC-07 plans KAN-66 ordinary planning edits and the KAN-15 boundary; old KAN-34 draft-edit evidence remains under TC-03 and its original result entries. KAN-65/KAN-66/KAN-67 have no new executed acceptance results.

The [portable Jira snapshot](../submission/1/jira-backlog-2026-09-21.csv), exported at 03:59 +08:00 on 21 September, retains all 51 active/non-archived records, including Done items: 33 stories, one task and 17 subtasks. Complete descriptions/criteria and relevant planning fields are preserved; [export metadata](../submission/1/README.md) explains field selection and limits. The live future backlog has 15 items: seven older estimates totalling 26 points and eight unestimated items. Sprint 2 remains 35 points To Do, eight In Review and zero Done. The snapshot is current refinement evidence, not a historical closing board or a new acceptance result. Final submission needs a refreshed snapshot and the remaining original meeting/board evidence.

## 1 October 2026 — S1-DEF-01 and S1-DEF-03 repaired and re-verified

**Decision and rationale:** Re-investigated two of the four Sprint 1 carry-over defects against the current `main` (`dff42ed`, after the 26 September KAN-24 over-scope revert) and confirmed both are already fixed, merged before this entry:

- **S1-DEF-03 (KAN-58, under KAN-6):** "Saved-draft-to-submitted-request action reported unavailable although DEMO-05 passed and submission code exists" ([Sprint 1 review](../scrum/sprint-01/review.md#review-defects-and-carry-over)). Root cause: `PATCH /api/events/:id` returns a plain draft record with no `actions`/`review`, but `EventDraftEditPage.vue`'s save/submit handlers read `updated.actions.canEditDraft` on that response. The write always succeeded; reading a field that was never there threw immediately afterward, so submitting from the saved-draft edit path always failed with a generic error — exactly the reported symptom — even though the draft itself saved correctly. Fixed by re-reading the shared `GET` detail after a successful write instead of guessing from a response shape that never carried it.
- **S1-DEF-01 (KAN-57, under KAN-34):** "Existing draft registration changed No → Yes, but capacity and registration dates were unavailable" (same review record). `EventDraftEditPage.vue` had its own hand-rolled form that predated the registration-window fields added under KAN-24/CF-18 and was never updated to include them. Fixed by replacing that duplicate form with the already-built, already-tested `EventRequestForm.vue` (used by `NewEventPage.vue` for creation), which already has registration capacity/opens/closes fields, conditional on Registration required = Yes.

**Kind:** Team implementation record (bug fixes merged 20 September, re-verified 1 October); not a new customer clarification.

**Verification on re-check:** `npm run check` on current `main` passes — typecheck clean, 190 frontend + 372 backend unit tests, both builds. Targeted re-run of `EventDraftEditPage.test.ts` and `EventRequestForm.test.ts` (23 tests) also passes in isolation. This is automated-fixture coverage only; no hosted Supabase Auth browser walkthrough has been performed for either fix, matching the standing caveat on this environment's test credentials.

**Scope — what this does not close:** S1-DEF-04 (mandatory-field validation gaps under KAN-6/KAN-59) and S1-DEF-02 (KAN-33/KAN-56 coordinator follow-up navigation, Irfan) are untouched by this work and remain open. Hosted/browser acceptance for S1-DEF-01 and S1-DEF-03 (the S2-T19 and S2-T21 scenarios) is also still outstanding — this entry closes the *repair*, not the Sprint 2 acceptance test cases, which need a real account to execute.

**Source and date:** Kai Jie, 1 October 2026.

**Affected story and acceptance-criterion IDs:** KAN-6-AC1/AC4 (S1-DEF-03/KAN-58); KAN-34-AC1–AC3 (S1-DEF-01/KAN-57); supports S2-T19 and S2-T21 in [the Sprint 2 backlog](../scrum/sprint-02/sprint-backlog.md).

**Affected implementation and tests:** `frontend/src/features/events/pages/EventDraftEditPage.vue`, `frontend/src/features/events/components/EventRequestForm.vue`, `frontend/src/features/events/api/event-requests.ts`, `frontend/src/features/events/pages/EventDraftEditPage.test.ts`, `frontend/src/features/events/components/EventRequestForm.test.ts`. Originally merged as PR #17 and PR #18 on 20 September 2026.

**Supersedes:** None — narrows the open scope of S1-DEF-01 and S1-DEF-03 recorded in the [Sprint 1 review](../scrum/sprint-01/review.md#review-defects-and-carry-over) and [Sprint 2 carry-over table](../scrum/sprint-02/sprint-backlog.md#carry-over-repair-criteria-and-tasks); does not reopen or change the Sprint 1 closure record itself.

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
