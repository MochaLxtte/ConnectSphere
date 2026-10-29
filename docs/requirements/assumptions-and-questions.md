# Assumptions and customer questions

**Reading note — 17 October 2026.** Entries below retain their original dates and decisions. Later customer changes may supersede an earlier rule; use the [change register](change-requests.md) and current sprint cards to identify the applicable version. A historical open question is not reopened merely because its old entry remains visible. The dated submission reconciliation at the end records the latest documentation corrections.

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

## 29 September 2026 — KAN-56 coordinator decided-request history

**Question ID:** S1-DEF-02 (KAN-56 under KAN-33); related to Q-02 and Q-04.

**Decision and rationale:** Decided requests stay out of the initial-review queue, which keeps
`REVIEWABLE_STATUSES` unchanged. A separate coordinator list, `GET /api/events?scope=history`,
returns the coordinator's assigned requests in `APPROVED`, `REJECTED`, `CONFIRMED`,
`CANCELLED` or `COMPLETED` (`FOLLOW_UP_STATUSES`), newest change first, using the same
`canViewRequest` assignment policy as the queue. Drafts are never listed. The later lifecycle
statuses are included so a request stays reachable after follow-up steps such as confirmation,
which was the Sprint 1 review's concern. A query parameter on the existing list route was chosen
over a new route to mirror the organiser's `scope=all` pattern; organisers are refused
`scope=history`. Reopening uses the shared detail route, so "no second initial decision" relies on
its existing action flags and the decision endpoint's 409, not on new logic. Final confirmation
itself remains KAN-61.

**Kind:** Team implementation assumption, not a customer clarification. Unassigned triage,
delegation and whether a reassigned coordinator keeps history access remain open under Q-02;
this list follows the *current* assignment only, like the queue.

**Source and date:** Irfan, 29 September 2026, while implementing KAN-56.

**Affected story and acceptance-criterion IDs:** KAN-33-AC1–AC3; KAN-56 acceptance checks;
S2-T20.

**Affected implementation and tests:** `backend/src/modules/events/submitted-requests.ts`,
`backend/src/modules/events/submitted-requests-router.ts`,
`frontend/src/features/reviews/api/submitted-requests.ts`,
`frontend/src/features/reviews/pages/ReviewQueuePage.vue`,
`backend/test/events/submitted-requests.test.ts`,
`backend/test/events/submitted-requests-router.test.ts`,
`database/tests/events/authenticated-review.integration.test.ts`,
`frontend/src/features/reviews/pages/ReviewQueuePage.test.ts`,
`frontend/src/features/reviews/pages/ReviewAccessPage.test.ts`,
`tests/e2e/review-access.spec.ts`, `tests/e2e/review-queue.spec.ts`.

**Supersedes:** The 17 September contract line that coordinators must omit `scope`.

## 1 October 2026 — S1-DEF-01 and S1-DEF-03 repaired and re-verified

**Decision and rationale:** Re-investigated two of the four Sprint 1 carry-over defects against the current `main` (`dff42ed`, after the 26 September KAN-24 over-scope revert) and confirmed both are already fixed, merged before this entry:

- **S1-DEF-03 (KAN-58, under KAN-6):** "Saved-draft-to-submitted-request action reported unavailable although DEMO-05 passed and submission code exists" ([Sprint 1 review](../scrum/sprint-01/review.md#review-defects-and-carry-over)). Root cause: `PATCH /api/events/:id` returns a plain draft record with no `actions`/`review`, but `EventDraftEditPage.vue`'s save/submit handlers read `updated.actions.canEditDraft` on that response. The write always succeeded; reading a field that was never there threw immediately afterward, so submitting from the saved-draft edit path always failed with a generic error — exactly the reported symptom — even though the draft itself saved correctly. Fixed by re-reading the shared `GET` detail after a successful write instead of guessing from a response shape that never carried it.
- **S1-DEF-01 (KAN-57, under KAN-34):** "Existing draft registration changed No → Yes, but capacity and registration dates were unavailable" (same review record). `EventDraftEditPage.vue` had its own hand-rolled form that predated the registration-window fields added under KAN-24/CF-18 and was never updated to include them. Fixed by replacing that duplicate form with the already-built, already-tested `EventRequestForm.vue` (used by `NewEventPage.vue` for creation), which already has registration capacity/opens/closes fields, conditional on Registration required = Yes.

**Kind:** Team implementation record (bug fixes merged 20 September, re-verified 1 October); not a new customer clarification.

**Verification on re-check:** `npm run check` on current `main` passes — typecheck clean, 190 frontend + 372 backend unit tests, both builds. Targeted re-run of `EventDraftEditPage.test.ts` and `EventRequestForm.test.ts` (23 tests) also passes in isolation. This is automated-fixture coverage only; no hosted Supabase Auth browser walkthrough has been performed for either fix, matching the standing caveat on this environment's test credentials.

**Scope — what this does not close:** S1-DEF-04 (mandatory-field validation gaps under KAN-6/KAN-59) remains open. This work did not assess S1-DEF-02 (KAN-33/KAN-56 coordinator follow-up navigation, Irfan); its separate repair and hosted result are recorded in the 29 September entry and MAN-20260929-01. Hosted/browser acceptance for S1-DEF-01 and S1-DEF-03 (the S2-T19 and S2-T21 scenarios) is also still outstanding — this entry closes the *repair*, not the Sprint 2 acceptance test cases, which need a real account to execute.

**Source and date:** Kai Jie, 1 October 2026.

**Affected story and acceptance-criterion IDs:** KAN-6-AC1/AC4 (S1-DEF-03/KAN-58); KAN-34-AC1–AC3 (S1-DEF-01/KAN-57); supports S2-T19 and S2-T21 in [the Sprint 2 backlog](../scrum/sprint-02/sprint-backlog.md).

**Affected implementation and tests:** `frontend/src/features/events/pages/EventDraftEditPage.vue`, `frontend/src/features/events/components/EventRequestForm.vue`, `frontend/src/features/events/api/event-requests.ts`, `frontend/src/features/events/pages/EventDraftEditPage.test.ts`, `frontend/src/features/events/components/EventRequestForm.test.ts`. Originally merged as PR #17 and PR #18 on 20 September 2026.

**Supersedes:** None — narrows the open scope of S1-DEF-01 and S1-DEF-03 recorded in the [Sprint 1 review](../scrum/sprint-01/review.md#review-defects-and-carry-over) and [Sprint 2 carry-over table](../scrum/sprint-02/sprint-backlog.md#carry-over-repair-criteria-and-tasks); does not reopen or change the Sprint 1 closure record itself.

## 3 October 2026 — KAN-51 venue availability calendar

**Question ID:** S2-Q03 (calendar labels and details) and S2-Q04 (booking-time boundaries); related to Q-06, Q-07 and S2-Q07. Who may use the calendar is the 21 September team decision above.

**Decision and rationale:** The calendar is rebuilt as a read-only module rather than by restoring the code removed on 26 September. `GET /api/venues/availability` returns every active venue with the periods overlapping a requested window of at most 31 days, and `/venues/availability` shows one week of it at a time:

- Only `EVENT_COORDINATOR`, `VENUE_STAFF` and `TECHNICAL_SUPPORT_STAFF` may read it. Organisers, attendees and signed-out callers are refused before any venue data is read; the sidebar link and page follow the same rule. Calendar access grants no booking, catalogue or event-request permission.
- A confirmed booking is an `APPROVED` `venue_bookings` row, following S2-Q04's note that the booking status is `APPROVED`, distinct from event `CONFIRMED`. `PENDING`, `REJECTED` and `CANCELLED` bookings are not shown, because migration 004's provisional Q-06 rule says they do not hold the venue. Whether pending requests should appear remains open under S2-Q04.
- Every `venue_unavailability` row is a recorded period of unavailability (KAN-51-AC3; displayed for KAN-55-AC8).
- Intervals are half-open in the API and the page, so back-to-back periods do not overlap and no turnover buffer is added. The page uses Singapore time (fixed +08:00) and Monday-to-Sunday weeks. Time inside a venue's opening hours that no period covers is available; time outside them is shown as closed, and a missing opening or closing time leaves that end of the day unrestricted.
- Inactive venues are not listed, because they cannot be requested.
- Detail visibility (S2-Q03): a booking names its event only to that event's currently assigned coordinator, and never for a draft, because that coordinator can already open the request; every other reader sees an anonymous confirmed booking. Block reasons are shown to all three roles because they explain operational unavailability to the planners KAN-55 serves. Both rules sit in `backend/src/modules/venues/availability.ts` so they can change in one place.
- Where a booking and a blocked period overlap (S2-Q07), the day bar shows the block and the day's list shows both periods, so neither is hidden.

**Kind:** Team implementation assumption, not a customer clarification. S2-Q03, S2-Q04 and S2-Q07 remain open; the detail-visibility and pending-request rules need team confirmation.

**Source and date:** Ernest, 3 October 2026, while implementing KAN-51.

**Affected story and acceptance-criterion IDs:** KAN-51-AC1–KAN-51-AC6; KAN-55-AC8 (display only); S2-T05, S2-T06.

**Affected implementation and tests:** `backend/src/modules/venues/availability.ts`,
`backend/src/modules/venues/availability-router.ts`, `backend/src/app.ts`,
`frontend/src/features/venues/` (`access.ts`, `availability.ts`, `api/availability.ts`,
`components/VenueAvailabilityCalendar.vue`, `components/VenueWeekTimeline.vue`,
`pages/VenueAvailabilityPage.vue`), `frontend/src/app/router.ts`,
`frontend/src/components/AppShell.vue`, `frontend/src/features/reviews/pages/ReviewRequestPage.vue`
(link to the event's week), `backend/test/venues/availability.test.ts`,
`backend/test/venues/availability-router.test.ts`,
`database/tests/venues/venue-availability.integration.test.ts`,
`frontend/src/features/venues/availability.test.ts`,
`frontend/src/features/venues/pages/VenueAvailabilityPage.test.ts`,
`frontend/src/features/reviews/pages/ReviewRequestPage.test.ts`, `tests/e2e/venue-availability.spec.ts`.

**Supersedes:** The 21 September implementation-gap note that the calendar route accepted any authenticated role; that route was removed on 26 September, and the new route enforces the three-role decision. The calendar references in the 19 September Q-07 rule describe removed code.

## 4 October 2026 — KAN-8 venue booking decisions

**Question IDs:** S2-Q04, S2-Q06, S2-Q10; KAN-8 pending-decision concurrency and failure recovery.

**Implementation and rationale:** Tristan has taken KAN-8 (three points) alongside KAN-29 (three points). Staff can list/open existing pending venue requests, approve/reject once and read the saved decision. The event's currently assigned coordinator can read their own booking requests and outcomes. The implementation uses retained migration 004 tables and adds no migration. KAN-53 booking submission is not included: manual checks need existing synthetic pending rows until that story is integrated.

The following are explicit **implementation choices awaiting team/customer confirmation**, not new agreed acceptance criteria:

- All verified `VENUE_STAFF` can review bookings across venues because there is no per-venue staff allocation model. Event Coordinators see only bookings for their currently assigned non-draft events; other roles cannot use this booking-detail API. Calendar permissions remain separately scoped.
- Only `PENDING` bookings accept a decision. Repeated, opposite or concurrent decisions return `409 BOOKING_ALREADY_DECIDED` after the first successful decision, leaving the first outcome unchanged.
- Approval requires an `APPROVED` event and an active venue. A stale pending booking can still be rejected. Booking approval does not change event status or implement final event confirmation.
- Staff receive the current event timing, attendance, purpose/description, venue requirements and accessibility needs alongside the booking's saved period, layout and notes. There is no new immutable requirements snapshot. Future KAN-53 work must agree how submitted requirements and later edits interact.
- A reason is optional, trimmed and limited to 2,000 characters; blank becomes null. KAN-8 requires staff to be able to provide rejection information, but does not currently require a nonblank reason. Do not infer that requirement from KAN-36/KAN-60.
- Approval rechecks approved bookings and operational blocks after locking the venue. Intervals are half-open, allowing adjacency without a turnover buffer; pending/rejected/cancelled bookings do not hold availability, consistent with KAN-51's recorded default. Whether pending holds should exist remains an open policy question.

The booking decision transaction preserves the original event/venue association and interval, records the verified staff profile and timestamp, and makes no event-status or notification writes. The existing conflict trigger remains in force. Creating or changing operational blocks is future KAN-55 integration and must coordinate venue locking; this implementation does not settle the block-over-existing-reservation policy.

**Evidence and limits:** Executed local checks are recorded under AUTO-20261004-KAN8-01 in [test evidence](../testing/test-evidence.md); the [manual guide](../testing/README.md#kan-8-hosted-verification) covers real staff/coordinator access, persistence, conflicts and refresh. Hosted acceptance, peer review and newly published CI remain pending. All fetched team branch heads are integrated locally; neither integration nor local tests accepts all selected stories. KAN-50/KAN-52/KAN-53/KAN-55 and the complete connected submission-to-booking path remain separate work.

**Source/date:** Tristan's implementation request; 4 October 2026. This is a development update after the planned 3 October sprint end, not a reconstructed planning/review decision. The 43-point baseline and historical Sprint 1 acceptance remain unchanged; actual Sprint 2 review/closure has not been supplied.

**Affected IDs:** KAN-8-AC1–AC11, TC-13, S2-T13/T14; approval/calendar portions of S2-T15/T16/T23. See the [API contract](../architecture/api-contract.md#venue-booking-decisions-kan-8-cf-13) for the concrete routes and errors.

**Supersedes:** Earlier current-implementation statements that the venue booking decision service/page is absent. Historical removed implementations and test observations keep their dates. Open policy questions are narrowed by these documented defaults, not marked customer-resolved.

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

## 28 September 2026 — KAN-29 implementation choices

Tristan is implementing automatic initial assignment in Sprint 2. The agreed selection rule remains available coordinators first, then fewest active events, then a consistent identifier order. The following defaults make that rule executable on this branch; they remain implementation choices for team review, not an additional customer clarification or a recorded meeting decision.

| Topic | Implementation choice |
| --- | --- |
| Availability | `app_users.coordinator_available`, non-null boolean defaulting to `false`. Configure it in Supabase for provisioned Event Coordinator accounts. Fictional seeds and new profiles remain unavailable until deliberately enabled. No availability-management UI. |
| Active workload | Count assigned requests in `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED` and `CONFIRMED`. Exclude `DRAFT`, `REJECTED`, `CANCELLED` and `COMPLETED`. Count requests, not assignment-history rows or event duration. |
| Tie break | Lowest application-user UUID using PostgreSQL UUID ascending order. |
| No eligible coordinator | HTTP `409 NO_AVAILABLE_COORDINATOR`. Submission rolls back; the saved request remains an editable draft with a retry message and no new assignment. |
| Atomicity and concurrency | Submit, coordinator linkage, automatic assignment history and submission status history commit together. Automatic and manual assignment writers lock the event first and coordinator rows in UUID order; automatic selection counts workload in a fresh statement after waiting. |
| Existing assignment on a draft | HTTP `409 DRAFT_ALREADY_ASSIGNED`; preserve the existing data for reconciliation. Retried submissions of an already-submitted request keep the existing `REQUEST_NOT_SUBMITTABLE` response. Neither case silently reallocates an event. |
| History | Migration 007 records `AUTOMATIC` with no human assigner; existing and later manual rows remain `MANUAL` with their actual actor. The organiser remains the actor for the submission status change. |
| Scope | Existing manual handover permissions stay unchanged. KAN-65 reassignment acceptance and venue workflows are separate; no removed feature is restored by KAN-29. |

Migration 007 is checked in for reproducible local/CI databases. Applying it and configuring eligible accounts in the shared Supabase project require the normal schema coordination with Arvin. No hosted schema change, Jira transition, peer acceptance or hosted manual pass is implied. See the [manual test guide](../testing/README.md#kan-29-hosted-verification).

## 30 September 2026 - Sprint 1 and Sprint 2 application boundary

Restrict the current application to the selected Sprint 1 and Sprint 2 stories. The earlier 28 September retention of manual handover is superseded: KAN-65 replacement of an existing coordinator remains future work. The Sprint 2 meeting's initial manual assignment to self/another coordinator remains available for unassigned requests in Submitted, Under review, Clarification requested or Approved. Automatic KAN-29 allocation and its recorded selection rules are unchanged.

Remove KAN-61 confirmation, KAN-62 cancellation, KAN-10 completion and KAN-64 notification generation from application services, routes and controls. Preserve KAN-16 read-only status/history, KAN-27 clarification and its reply/review-start path, request registration fields needed by the selected draft stories, and existing status values for compatibility.

Preserve applied database history, tables, triggers, constraints and stored data. Do not disable integrity protection or rewrite migrations to imitate a new database. Stop creating future equipment samples in new seed runs. Historical migration tests verify compatibility, not delivery of future application workflows. The [scope audit](README.md#30-september-sprint-scope-audit) and [test evidence](../testing/test-evidence.md#30-september-sprint-scope-correction) distinguish retained foundations, removed actions and verification. No changes to shared Supabase or Jira, sprint points, past review outcomes or future product-backlog criteria are implied.

## 30 September 2026 - Firebase migration retirement

Retire `003_add_firebase_identities.sql` because authentication uses Supabase. Renumber the remaining active files consecutively as 001-006 without changing their SQL: Supabase mapping 004 becomes 003, core schema 005 becomes 004, equipment integrity 006 becomes 005, and automatic assignment 007 becomes 006. The [database guide](../../database/README.md#shared-schema-and-migrations) lists exact filenames. Earlier dated decisions, test records and comments in unchanged SQL retain their original numbering; live setup instructions and implementation links use the new names.

Existing tables, identities and migration records are not deleted or renamed. The runner recognises each exact former filename, validates every recorded old/current checksum and skips already-applied SQL. It writes the current name only for a migration it actually executes, never a fictional alias record. A mismatched checksum rolls back the migration transaction. The retired Firebase checksum is still validated if its exact historical name is recorded; its original SQL remains in Git history. The dashboard-era `003_add_supabase_auth.sql` is a separate record, not an alias.

Read-only inspection found matching checksums under the original names 001, 002 and 004-006, an existing unused identity table without the canonical Firebase history row, and the separate dashboard-era record. Automatic assignment (old 007, now 006) and its new columns were absent. Retirement removes the attempt to recreate the legacy table, and the aliases let the updated runner proceed to only the new 006 once rollout is coordinated. This supersedes the earlier recommendation to restore missing Firebase history. It does not establish full hosted-schema equivalence or KAN-29 acceptance. No shared schema, data or history mutation is part of this repository change.

## 30 September 2026 - Shared migration verification

After migration 006 was applied to the shared project, read-only inspection confirmed its history checksum and KAN-29 columns/constraint. A fresh local run of 001-006 reproduced the application's tables, columns, constraints, indexes, triggers and normalized project function definitions. [DB-SCHEMA-20260930-01](../testing/test-evidence.md#30-september-migration-and-hosted-schema-consistency) records the counts and hosted-only RLS automation. No applied SQL file needs correction and no shared data or history was changed during this verification. Earlier observations that 006 was pending describe the pre-migration state; availability setup, hosted manual acceptance, CI and peer review remain separate work.

## 4 October 2026 — KAN-55 block venue for operational unavailability

**Question IDs:** Q-06/Q-07, S2-Q07; the open "block-over-existing-booking" question flagged for KAN-55 in the backlog's refinement table.

**Implementation and rationale:** Kai Jie picked up KAN-55 (three points) after KAN-53. `POST /api/venues/:venueId/unavailability` lets Venue Staff record a mandatory-reason unavailability period for one venue; `GET` lists a venue's blocks and `DELETE` removes one. All three routes are Venue Staff only (KAN-55-AC13). The service inserts into the existing `venue_unavailability` table from migration 004 — no new migration. A Venue Staff-only `VenueBlocksPage` (`/venue-blocks`) lets staff pick a venue, submit a block and remove one.

The following are explicit **implementation choices awaiting team/customer confirmation**, not new agreed acceptance criteria:

- Block-over-existing-booking (the open question above): creation is refused with `409 VENUE_BOOKING_CONFLICT` if the new period overlaps an existing `APPROVED` `venue_bookings` row, so an existing reservation is never silently displaced by a later block. This is an **application-level check only**; unlike migration 004's `venue_bookings_conflict` trigger (which already guards a new booking against an existing block), no new migration/trigger guards this reverse direction at the database level.
- Removal/amendment (`DELETE`) is implementation scope beyond KAN-55's listed acceptance criteria (AC1–AC13 only cover creation and downstream display); it was added as a reasonable minimum so staff can correct a mistake, following the backlog's own note about "retained removal functionality."
- KAN-55-AC8–AC12 (calendar/search/suitability exclusion and approval protection) needed no new code: KAN-51's calendar, KAN-12's search and KAN-8's approval-time recheck already read `venue_unavailability` directly, so a saved block is immediately reflected everywhere those already read it. Only creation/removal (AC1–AC7, AC13) is new in this module.
- The venue picker in `VenueBlocksPage` reuses the KAN-51 availability endpoint (already Venue Staff accessible) purely to get venue id/name; no new "list venues" endpoint was added.

**Evidence and limits:** `backend/test/venues/block-input.test.ts`, `backend/test/venues/block-router.test.ts` and `frontend/src/features/venues/pages/VenueBlocksPage.test.ts` cover input/HTTP/UI boundaries. `npm run check` (typecheck, 503 backend + 300 frontend unit tests, both builds) passes on this branch. A new `database/tests/venues/venue-blocks.integration.test.ts` was written to cover association, role checks, venue eligibility, the booking-overlap conflict, listing and deletion against real PostgreSQL, but **could not be executed** in this environment: `TEST_DATABASE_URL` is blank and Docker is unavailable here (the same limitation recorded for KAN-53). This is local automated-fixture coverage only; the integration suite, hosted S2-T17/T18 walkthrough, policy acceptance, peer review and CI remain pending.

**Source/date:** Kai Jie's implementation; 4 October 2026. This is a development update after the planned 3 October sprint end, not a reconstructed planning/review decision. Jira shows KAN-54 (Detect Venue Booking Conflicts) assigned to Ernest; this entry does not touch KAN-54.

**Affected IDs:** KAN-55-AC1–AC13, S2-T17/S2-T18. See the [venues module README](../../backend/src/modules/venues/README.md#venue-unavailability-blocks--kan-55) for the concrete routes and errors.

**Supersedes:** None recorded for KAN-55 specifically; narrows the open block-over-existing-booking question above to a documented team default pending confirmation.

## 4 October 2026 — KAN-52 venue suitability

**Question IDs:** Q-08 / S2-Q05, with existing S2-Q04 interval defaults. **Source:** The KAN-52 implementation clarification confirmed that the coordinator should interpret free-text event requirements for each check, without a database migration. This is a development choice after the planned sprint boundary, not an additional customer clarification or a retrospective planning decision.

An assigned Event Coordinator can assess a selected venue for their non-draft event. The page displays the current event's free-text venue/accessibility needs alongside its timing and expected attendance, and the venue's recorded capabilities. Facilities, accessibility labels, one required layout and wheelchair access are explicit per-assessment inputs. They are not saved back to the event or inferred by parsing arbitrary prose. Unlisted required labels are allowed so a missing capability can be tested. The coordinator must explicitly confirm that the interpretation includes every applicable need; confirming empty fields means none are required. Unresolved needs remain visible and prevent a Suitable result.

The following implementation details remain subject to team/customer review:

- Labels match by trimmed, case-insensitive exact equality. All specified facilities/accessibility labels are required; a selected layout must be supported. Wheelchair access has its own boolean check. One unrelated accessibility feature never satisfies a different stated need.
- Each check reports PASS, FAIL or UNKNOWN with a reason. A definite failure gives **UNSUITABLE**; otherwise missing, unconfirmed or unresolved requirements give **NEEDS_REVIEW**; only all applicable checks passing gives **SUITABLE**. Unknown data is not treated as absent requirements or as a proven mismatch.
- Numeric capacity uses the event's current expected attendance; equality with maximum capacity passes. Event time must be known and ordered. Opening hours apply continuously to the entire interval in Singapore time, including intervening days; a null endpoint is unrestricted. Inactive venues fail even if their other capabilities match.
- Availability uses every overlapping APPROVED booking, including the selected event's own existing reservation, and every operational block. PENDING/REJECTED/CANCELLED bookings do not reserve time. Half-open intervals permit adjacency and add no turnover buffer. These reuse the documented calendar/booking defaults; an assessment is not a reservation.
- The backend rechecks role/current assignment and reads event, venue and conflict information in one SQL snapshot on each assessment. A SHA-256 requirements version covers the relevant event source fields. Changed source data returns `409 SUITABILITY_CONTEXT_CHANGED`; the UI refreshes the source and requires a new interpretation. A previous venue or availability result is never a durable guarantee.

The operation is read-only: no booking, event decision/status, requirement update or stored suitability record is created. The retained Jira text says suitability informs venue selection and must not automatically reject an event. KAN-53 booking submission is not yet integrated into this branch/main; KAN-52 does not add an implicit booking override/blocking policy. KAN-55 block creation is already integrated and its records participate in the assessment.

**Scope/evidence:** KAN-52-AC1–AC9, S2-T09/T10 and CF-11/TC-11. The detailed contract is in [the API document](../architecture/api-contract.md#venue-suitability-kan-52-cf-11), and hosted cases remain in [the shared testing guide](../testing/README.md#kan-52-hosted-verification). Executed commands/results belong in [test evidence](../testing/test-evidence.md); implementation and test files alone do not establish a pass, hosted acceptance, peer review, CI or Jira Done. All migrations remain unchanged. The 93 criterion IDs and **43 points: 35 new + 8 carry-over** remain intact.

**Supersedes:** the removed 19 September suitability implementation's five-check description, loose accessibility interpretation and omission of facilities/layout checks. It narrows S2-Q05 to explicit per-assessment interpretation; remaining matching/eligibility and future booking-policy acceptance remain open.

## 4 October 2026 — KAN-53 venue booking submission

**Question IDs:** S2-T11/S2-T12 eligible event states (see the [sprint backlog's local task list](../scrum/sprint-02/sprint-backlog.md)); related to S2-Q04/S2-Q06 (booking model) carried from Q-06.

**Implementation and rationale:** Kai Jie picked up KAN-53 (three points), the remaining dependency the 4 October KAN-8 entry above flagged. `POST /api/events/:id/venue-bookings` lets the event's currently assigned, non-draft coordinator create a `PENDING` venue booking: it validates `venueId` (must be an active venue), `startsAt`/`endsAt` (ISO date-times, end after start) and optional `layout`/`notes`, then inserts into the existing `venue_bookings` table from migration 004 — no new migration. The route is nested under `/api/events` (like `createClarificationRouter`/`createAssignmentRouter`), not under `/api/venue-bookings`, so its `:id` always means an event request, never a booking. A frontend `VenueBookingPanel` (added to `EventPlanningPanels`, alongside `AssignmentPanel`/`ClarificationPanel`) lets the coordinator pick a venue from the active catalogue and submit; it lists existing requests and their decision outcome to both the coordinator and the organiser.

The following are explicit **implementation choices awaiting team/customer confirmation**, not new agreed acceptance criteria:

- Eligible event states: submission is refused with `409 EVENT_NOT_ELIGIBLE` only for `REJECTED`, `CANCELLED` or `COMPLETED` events. Every other non-draft state (`SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED`, `CONFIRMED`) currently accepts a request. `DRAFT` is already excluded structurally: `requireRelation` treats a coordinator-and-draft combination as not-found, matching the Sprint 1 detail policy. The team has not agreed whether a booking should instead wait until the event is `APPROVED` (symmetric with KAN-8's approval requirement) or be allowed earlier so Venue Staff can assess availability during review.
- Duplicate/repeated requests are allowed: nothing stops a coordinator from submitting several `PENDING` requests for the same event and venue, or for overlapping periods. Only `APPROVED` bookings consume availability (unchanged KAN-8/KAN-51 rule), so multiple pending requests do not conflict with each other; Venue Staff resolve them individually. S2-T12's proposed duplicate-request robustness remains open.
- Venue requirements (KAN-53-AC4) are not resubmitted per booking. They continue to come from the event's own `venue_requirements` field, already joined into every booking read (unchanged from KAN-8). A booking's own `notes` field is additional free text for that specific request, not a replacement.
- The venue picker offers every active venue from the catalogue (reusing KAN-12's `searchVenues` with no filters), not a suitability-matched subset — KAN-52 suitability checking is a separate, not-yet-built story.

**Evidence and limits:** `backend/test/venues/booking-input.test.ts` and the new `backend/test/venues/venue-booking-submission-router.test.ts` cover input/HTTP boundaries; `frontend/src/features/events/components/VenueBookingPanel.test.ts` covers the panel. `npm run check` (typecheck, 500 backend + 301 frontend unit tests, both builds) passes on this branch. A new `database/tests/venues/venue-bookings.integration.test.ts` describe block ("KAN-53 venue booking submission against PostgreSQL") was written to cover AC1–AC11 against real PostgreSQL but could not be executed in this environment: `TEST_DATABASE_URL` is blank and Docker is unavailable here, so the local fallback test database could not be created. This is local automated-fixture coverage only; the integration suite, hosted two-role UI walkthrough (S2-T11/T12), policy acceptance, peer review and CI remain pending.

**Source/date:** Kai Jie's implementation; 4 October 2026. This is a development update after the planned 3 October sprint end, not a reconstructed planning/review decision.

**Affected IDs:** KAN-53-AC1–AC11, S2-T11/S2-T12. See the [venues module README](../../backend/src/modules/venues/README.md#venue-booking-submission--kan-53) for the concrete routes and errors.

**Supersedes:** The 4 October KAN-8 entry's statement that "KAN-53 booking submission is not included"; that remains true of the KAN-8 work itself, but the dependency is now implemented separately here.

## 5 October 2026 — venue branch integration

**Source:** The integration request covered all published teammate work on the KAN-52 branch. The branch combines Ryan's latest KAN-12 date filtering and Kai Jie's KAN-53 submission (`origin/feat/KAN-53-submit-venue-booking-request`, original head `87c2103`) with the existing KAN-52/KAN-8/KAN-55 workflows. This is a local integration record, not a change to remote main, Jira assignments, Sprint 2 acceptance or the planned 3 October review outcome.

- KAN-53 now refuses an interval overlapping an approved reservation (`409 VENUE_BOOKING_CONFLICT`) or operational block (`409 VENUE_UNAVAILABLE`). It takes the venue lock before a fresh conflict query and saves no row on refusal. Approval still rechecks later; pending requests may overlap and do not reserve time. Half-open adjacency and no turnover buffer remain unchanged. This implements the already recorded submission-conflict customer rule rather than adding a new acceptance criterion.
- The booking panel and its reads/writes are coordinator-only. The original KAN-53 record's organiser read-only-list claim was component-fixture behavior, inconsistent with the real backend role gate. Organisers do not receive booking-planning access through this integration. Account/event/role changes discard stale asynchronous results. An uncertain write requires **Refresh booking requests** and inspection before another submission; it is not automatically retried.
- Booking dates require valid ISO date-times with an explicit timezone and real calendar days. Layout and notes are optional and trimmed, each limited to 2,000 API characters; the panel limits layout to 100. The coordinator supplies the booking interval, which may differ from event timing; assess that difference separately. KAN-52 reads event timing and does not reserve a venue or implicitly block KAN-53.
- The original KAN-53 statement that KAN-52 is not yet built describes its original branch only. KAN-52 is now present, but the booking picker still lists all active venues; it is not an automatically suitability-filtered shortlist. Existing event eligibility, duplicate-pending and current-versus-snapshot policy defaults remain open.
- KAN-12 and KAN-52 share the same continuous-interval Singapore opening-hours helper, including intervening closed hours, exact-midnight half-open endings and database seconds/fractions. Search also checks current approved bookings and operational blocks in the same catalogue snapshot.

**Evidence boundary:** original 4 October records retain their tested builds and limitations. Record the combined 5 October commands/results separately in [test evidence](../testing/test-evidence.md) and use [KAN-53 hosted checks](../testing/README.md#kan-53-hosted-verification). No test pass, hosted acceptance, CI, peer review, Done points or new planning allocation is inferred from this update. All six migrations, the 93 detailed criteria and **43 points: 35 new + 8 carry-over** are preserved.

**Supersedes:** the current applicability of earlier "KAN-53 absent" summaries and the imported organiser-panel claim; historical evidence remains unchanged in scope. S2-Q04/Q05/Q06/Q10 policy questions remain open where noted above.

## 9 October 2026 — KAN-59 submission validation rules (S1-DEF-04)

**Question IDs:** Q-03 (the field and conditional-registration validation table was still to be completed); S2-T22.

**Implementation and rationale:** an audit of `submit-input.ts` found three ways a direct API call could submit a request that the browser form would have stopped. The form trims text, turns blank text into `null` and checks the end time and registration window before it calls the API, so only other clients were exposed. The server only rejected `null`, so a whitespace-only name, purpose or venue requirement, an end time that was not after the start, and a registration window that closed before it opened all passed. Migration 004 notes that `ends_at > starts_at` "stays a service rule", but no such rule existed on submission. The following are explicit **implementation choices awaiting team confirmation**, not new agreed acceptance criteria:

- A blank or whitespace-only name, purpose or venue requirement counts as missing, the same as `null`. The response lists it in `missingFields`.
- The event end must be strictly after the start; otherwise the submission is refused for `endsAt`.
- When registration is required and both registration times are set, the registration close must be strictly after the open; otherwise it is refused for `registrationClosesAt`. A blank capacity still means "no limit", as the form already allows, and the registration window is not required to end before the event starts.
- An expected attendance of `0` is still accepted, because the existing test treats `0` as present and not missing. **Resolved 9 October by the Product Owner:** follow the customer documents. The Week 1 Customer Briefing and the Week 4 Project Instructions require expected attendance but set no minimum, so no rule is added and `0` stays accepted. If the customer later sets a minimum, add it as a new criterion. The consultation transcript PDF has no extractable text and was not checked.
- Past dates are not refused; no customer rule requires it. Description, accessibility needs and equipment requirements stay optional, and "None / Not Required" is ordinary text.
- A request with only missing fields returns `400 SUBMISSION_INCOMPLETE`. Any invalid value returns `400 SUBMISSION_INVALID` with `fieldErrors` (field to message) and still lists `missingFields`. Both roll back before the status update, so the request stays `DRAFT` with its data unchanged.

**Scope/evidence:** KAN-6-AC2, KAN-6-AC3; S1-DEF-04 (Jira KAN-59); S2-T22. Executed commands and results belong in [test evidence](../testing/test-evidence.md); this entry alone does not show acceptance.

**Source/date:** Irfan, 9 October 2026, while verifying the remaining Sprint 2 items. KAN-6 and KAN-59 belong to Kai Jie's story; their Jira cards were not edited.

**Supersedes:** nothing. It refines the 13 September entry's six mandatory fields by treating blank text as missing and adds the two ordering rules.

## 9 October 2026 — KAN-50 venue catalogue maintenance: scope and implementation choices

**Question IDs:** related to Q-07/Q-08 (operating hours, suitability data) and the "Release boundaries" decision that a placeholder venue catalogue is sufficient. No new customer question is raised.

**Implementation and rationale:** KAN-50 (five points, Irfan) lets Venue Staff keep the catalogue accurate. The 26 September removal deleted the earlier maintenance code, so it is rebuilt against migration 004's `venues` table without a schema change. The following are explicit **implementation choices awaiting team confirmation**, not new agreed acceptance criteria:

- Scope is viewing the active catalogue, opening one venue and updating its location, maximum capacity, facilities, accessibility features (plus the wheelchair-accessible flag), supported room layouts and daily operating hours. Creating, deleting or deactivating venues and changing a venue's name or description are not in KAN-50's criteria; the Jira text says "maintain accurate information". Venues come from the placeholder/seed catalogue. Any extension is refined as a separate story.
- Catalogue reads and writes are **Venue Staff only**. Event Coordinators keep reading venue data through KAN-12 search and KAN-52 suitability; the calendar roles of KAN-51 are unchanged. The service re-checks the role for direct callers.
- Routes live under `/api/venues/catalogue` so they cannot be mistaken for `/availability`, `/search-venues`, `/filter-options` or `/:venueId/unavailability`.
- Updates are partial (PATCH). An omitted field is unchanged; location and either operating-hour endpoint may be set to `null`. Capacity, facilities, accessibility features, layouts and the wheelchair flag cannot be `null`; the three lists may be empty.
- Facility, accessibility and layout labels follow the KAN-52 rules: trimmed, deduplicated ignoring case, at most 100 characters each and 30 distinct values per list. Capacity is a whole number from 1 to 2,147,483,647 (the database check is `> 0`).
- Operating hours are `HH:MM` in Singapore time. A null endpoint is unrestricted, as in KAN-12/KAN-52. When both are set, closing must be after opening, matching the database check.
- Updates run in one transaction that locks the venue row. Concurrent edits to different fields both persist; concurrent edits to the same field resolve last-writer-wins. No version precondition is added because the criteria do not require one. Inactive venues are not listed, reading one by ID reports `404 VENUE_NOT_FOUND`, and updating one is refused with `409 VENUE_INACTIVE`.
- Search and suitability read the `venues` table live, so a saved change is visible to them on the next request (KAN-50-AC13). Changing capacity or layouts does not modify existing bookings; it only affects later searches and assessments.
- Per-venue setup and turnaround time (Week 7 customer change 1) is **not** part of this pre-change work. It will be handled through the change procedure after Sprint 2 is settled.

**Scope/evidence:** KAN-50-AC1–AC14, S2-T03/S2-T04, CF-08/TC-08. Executed commands and results belong in [test evidence](../testing/test-evidence.md); this entry alone does not show acceptance.

**Source/date:** Irfan, 9 October 2026, while starting KAN-50 (Jira: In Progress, subtasks KAN-68–KAN-76). A team implementation record, not a reconstructed meeting decision.

**Supersedes:** the historical `venue-input.ts`/`venue-service.ts`/`VenueFormPage.vue` references in the sprint-02 backlog task S2-50-01, which describe code removed on 26 September.

## 15 October 2026 — historical baseline and Week 7 preparation

**Source:** Pre-Sprint-3 documentation reconciliation; the current repository, live Jira and the course's Week 7 customer-change and change-management PDFs were inspected. This is a preparation record, not a team meeting or an acceptance decision.

The [Sprint 2 baseline register](../scrum/sprint-02/review.md#baseline-and-later-delivery-register--15-october-2026) separates original criterion references, evidence available by 3 October, later implementation/verification and Jira administrative dates. Sprint 1's reported 24-of-32 outcome and Sprint 2's 43-point commitment remain unchanged. KAN-57/KAN-58/KAN-76 now have Jira Done status, but their status changes alone supply no missing test or peer-review evidence. DoD agreement details and the actual Sprint 2 review/retrospective remain **Not recorded**.

The [change register](change-requests.md) now records source-derived requests and candidate acceptance checks for CR-1–CR-6. CR-5 replaces initial automatic assignment with a new Lead queue; CR-6 adds a distinct Safety Officer. Original criteria and old test results are not rewritten to include these later requirements. The proposed classifications, Jira breakdown, estimates, owners and sprint allocation are **To agree**. No Jira issue was created, reopened or reassigned by this preparation.

Existing defects observed in [AUTO-20261015-01](../testing/test-evidence.md#15-october-2026-post-sprint-implementation-audit) are listed separately in [Sprint 3 triage](../scrum/sprint-03/planning.md#pre-planning-baseline-and-defect-triage). Reconcile the already-existing KAN-60 correction with KAN-36 rather than counting it again as a new Week 7 requirement. Confirm the applicable original criteria before deciding each repair's tracking and remaining estimate.

**Source identity:** `Week 7 Customer Changes.pdf`, pages 1–2, SHA-256 `cfe702a71c684e05d0644a9d965439bc4bf073224e53826f9da31591ca71b3c6`; `Week 7 Guide to Managing Changes.pdf`, pages 1–3, SHA-256 `b8397da31768411cc154b7682790d4a5e81746667d17f01237f0337bec6cfb63`. Originals remain in the team's course materials; the repository retains the relevant requirements and decisions for submission.

## 16 October 2026 — reported sprint dates, availability and scope proposal

The chat update records that Sprint 3 started and held planning on 4 October, is scheduled to finish on 17 October, and had no finalised story selection. No Sprint 3 work has started according to that update. All six members intend to focus for two full days, 16–17 October; daily hours, actual work and original meeting participants remain **Not recorded**. This account does not re-date earlier implementation or establish acceptance outcomes.

Sprint 3 is penultimate and Sprint 4 is the final development sprint. The two-week cadence projects Sprint 4 to 18–31 October. The confirmed Week 12 dates are 2–8 November; the course's Friday deadline therefore falls on **6 November 2026 at 23:59, Singapore time**. Final verification/submission preparation on 1–6 November is proposed. Arrange the final-sprint recordings before the actual meetings.

The release proposal was prepared without capping selection by historical velocity. The [prepared scope](../scrum/sprint-03/planning.md#proposed-scope-and-release-split--16-october) proposes all 15 current future items, five additional existing-story repairs and CR-1/CR-5 in Sprint 3; CR-2/CR-3/CR-4/CR-6 follow in Sprint 4. Provisional estimates are 84 and 29 SP respectively. These are AI proposals, not team votes, agreed commitments or observed velocity. The current Jira cards were read on 16 October; no Jira issue, estimate or assignment was changed.

**Still To agree:** classifications/tracking (including KAN-60 versus KAN-36 repair), draft new stories, technical policies, point votes, owners/reviewers and actual selection. Proposed KAN-15 re-estimation is 2 → 5, with the existing value preserved pending agreement. Shared work is counted once: KAN-65 handles reassignment, KAN-64 supplies original notifications, later change stories add their new triggers, and lifecycle/reservation stories share release logic. Open policies are listed in [planning](../scrum/sprint-03/planning.md#policy-decisions-before-implementation).

## 16 October 2026 — delegated Sprint 3 selection and Jira alignment

**Planning method:** Delegated planning through chat selected scope, estimates, the initial allocation and release defaults, including KAN-6/34/50/12/52 for full-original-point carry-over. No six-member vote, customer confirmation or meeting attendance is asserted. The user reports historical Sprint 2 acceptance was not recorded.

Adopt the [97-SP / 23-item plan](../scrum/sprint-03/planning.md#selected-scope-and-release-allocation). KAN-60 remains the canonical pre-existing rejection-reason correction; do not duplicate it by allocating the same work to KAN-36. KAN-15 is explicitly re-estimated 2→5 for submission, review and arrangement-impact handling; the original estimate is preserved. KAN-77/78/79 add 18 SP of CR-1/CR-5. Five original stories carry 19 SP without changing their estimates to zero. This is a current completion/re-verification disposition, not proof of a 3 October acceptance outcome.

Jira Sprint 2 was administratively closed on 16 October; Sprint 3 is active with the reported 4–17 October window. Original Sprint 1/Sprint 2 scope and acceptance history remain separate. All 23 selected items remain To Do; no application implementation, hosted demonstration or acceptance occurred through this documentation activity.

The following defaults supplement the customer requirements; they are delegated implementation choices, not customer quotations. They supersede the prior proposal questions for selected Sprint 3 work.

| Policy | Topic | Adopted default |
| --- | --- | --- |
| S3-P01 | Dates and access | Use server/database UTC instants for comparisons and Asia/Singapore display. Use half-open time windows [start,end); exact adjacency does not overlap. Recheck current role, ownership/assignment and resource state within every write transaction. Compare a revision/version for edits and decisions; stale requests fail without overwriting newer work. Venue catalogue concurrency is field-aware: preserve different-field edits and KAN-50's existing same-field last-save rule for non-buffer fields; KAN-77 rejects stale conflicting edits to the same buffer field only. |
| S3-P02 | Equipment pool | Pool by equipment type. Record nonnegative whole total, damaged and maintenance quantities, with damaged + maintenance <= total. Operational quantity = total - damaged - maintenance. Availability is operational quantity minus peak concurrent RESERVED quantity for the requested half-open interval, floored at zero for display. REQUESTED/REJECTED/CANCELLED rows do not reserve. Positive requested quantities only; equipment location and turnover buffers do not constrain allocation. Availability can be checked before venue confirmation. |
| S3-P03 | Equipment workflow and degraded stock | Only the assigned coordinator requests equipment for APPROVED planning events; Technical Support Staff review/reserve. A line is REQUESTED, RESERVED, REJECTED or CANCELLED; full requested quantity is reserved atomically, no partial reservation or silent substitute. The event is not equipment-ready until every active required line is RESERVED, or the coordinator explicitly records Not Required. Stock/operational changes must preserve existing reservation history, flag any affected shortfall and notify assigned coordinators; they must not pretend those reservations remain fulfilable. Subsequent confirmation/new reservation is blocked until resolved. Use new migrations for extra integrity/shortfall state, never modify applied ones. |
| S3-P04 | Lifecycle | Assigned coordinator confirms APPROVED -> CONFIRMED only when at least one valid APPROVED venue arrangement exists, all non-cancelled requested venue arrangements are approved, equipment is explicitly Not Required or all required equipment lines are RESERVED and currently fulfilable, and no pending significant change remains. No human staff scheduling prerequisite. Registration does not open automatically before its configured time. Assigned coordinator completes CONFIRMED -> COMPLETED at or after event end. Owning organiser or assigned coordinator may cancel SUBMITTED/UNDER_REVIEW/CLARIFICATION_REQUESTED/APPROVED/CONFIRMED with a trimmed nonempty reason. Draft cancellation remains outside this lifecycle action. Preserve decisions/history. Cancellation atomically cancels active venue/equipment arrangements and registrations; completion releases equipment exactly once but retains attendance/booking history. Later CR-6 adds the safety gate before preparation and is not claimed delivered here. |
| S3-P05 | Editing and significant changes | Draft editing stays KAN-34. Before initial approval, the owning organiser may edit submitted/review/clarification requests using full submission validation; retain submitted state and assignment, audit the revision, and force a reviewer with stale data to refresh. Once APPROVED/CONFIRMED, only the assigned coordinator may directly edit name and description as ordinary changes. Purpose, time, attendance, venue/equipment/accessibility requirements and registration configuration are significant and use KAN-15. One pending request per event; organiser owns it, assigned coordinator approves/rejects, rejection requires a reason. No arbitrary response deadline or change-request cutoff. A significant change that affects an already confirmed venue/equipment arrangement or active registrations cannot silently be applied: display the impact and require cancellation plus a new event request. Changes before any affected arrangement is confirmed can be approved after current validation/revalidation, with affected pending arrangements explicitly cancelled for resubmission and unaffected arrangements preserved. CR-3 later adds per-venue actions as a distinct revised requirement. |
| S3-P06 | Registration | Use authenticated attendee account identity; collect no extra personal fields for first release. Show Confirmed, registration-enabled events with name, description, purpose, event time and attendee-relevant confirmed venue details plus registration conditions. Admit only before event start and within [opensAt,closesAt), treating null bounds as unbounded; finite capacity is a nonnegative whole number (zero means full), null means unlimited for the existing contract. Never register for APPROVED merely because venue work has begun. Prevent duplicate active registrations and oversubscription transactionally. Withdrawal is permitted before event start, including after registration closes; confirm the action, release capacity once. Re-registration is permitted only while all normal admission rules hold and reuses the attendee/event record. Cancellation marks registrations cancelled without deleting history; cancelled registrations no longer occupy capacity. Organiser/current coordinator see attendee display name, email, registration status and timestamps; other roles do not gain roster access from internal status alone. No exports/waitlists. |
| S3-P07 | Notifications | Implement in-app notification inbox and read/unread state only, using transactional insertion plus unique business-event/recipient keys. Rolled-back changes produce no notifications, retries do not duplicate. Keep records for the release; no email worker is required. Include an acknowledgement even when actor is recipient (submission/registration), not a blanket exclude-actor rule. Protected links/details require current authorization: old assignees may retain a minimal handover notice but cannot reopen protected event data. Matrix: submission -> owner + Leads; clarification -> owner, reply -> assigned coordinator; initial decision -> owner; assignment -> owner/new coordinator, reassignment additionally old coordinator; venue decision -> assigned coordinator; equipment reservation/shortfall -> assigned coordinator and relevant technical staff; change request -> owner acknowledgement + assigned coordinator, outcome -> owner, affecting attendee details -> active attendees; confirmation/cancellation -> owner/current coordinator and active attendees, plus relevant venue/technical staff for affected arrangements; registration/withdrawal -> attendee and owner/current coordinator. CR2/4/6 add their new triggers in their own stories. |
| S3-P08 | Venue buffers | Venue Staff configure integer setupMinutes/turnaroundMinutes in 0..1440 inclusive, with zero on existing venues. Use the venue's current configured buffers for future/non-ended booking evaluations: occupied interval is [start-setup,end+turnaround). Completed historical bookings retain their recorded history. Check operational blocks and operating hours against the whole occupied interval. Apply the same calculator in search/calendar/suitability/submission/approval; pending requests still do not reserve until CR4 introduces holds. Re-evaluate future existing bookings on buffer edits, retain the booking rows and explicitly flag new overlaps/operational violations without silently cancelling them. Both conflicting existing arrangements are flagged; new conflicting reservations cannot be approved. UI labels the event period separately from occupied period and flagged conflicts. When buffers cross an unsupported operating-day boundary, report unavailable rather than normalizing away the time. |
| S3-P09 | Lead assignment | Provision EVENT_COORDINATOR_LEAD through trusted existing account setup. Leads oversee all non-draft events in the single deployment, with basic list fields and current assignments; the role alone cannot approve requests, act as venue staff or read attendee rosters. New successful submissions remain SUBMITTED and unassigned; all registered Leads see the queue. Only Leads initially assign/reassign to an EVENT_COORDINATOR with isAvailableForAssignment=true. Initial/reassignment states: SUBMITTED, UNDER_REVIEW, CLARIFICATION_REQUESTED, APPROVED, CONFIRMED; refuse DRAFT/REJECTED/CANCELLED/COMPLETED. Preserve existing assignments and original KAN-29 history. KAN-65 handles reassignment and revokes old assignment-derived access immediately. Require a trimmed nonempty reason for reassignment, not initial assignment. Concurrent allocation uses a lock/version; one current assignment and nonoverlapping history. Targeting the current coordinator is an unchanged result without a new history/notification row. Only disable automatic allocation in the same integrated release that enables the queue and Lead access. |

The venue-specific concurrency exception preserves KAN-50's original AC. CR-5's Lead-only assignment deliberately supersedes older coordinator self/manual-assignment policy on deployment. CR-6 adds the later safety gate; suitability remains advisory. New criteria use AC101+ on existing cards to preserve historical identifiers; new KAN-77/78/79 cards use their own AC numbering. Any later policy change requires a new entry and matching Jira/tests/contracts updates.

**Still missing evidence:** actual Sprint 2 review participants/build/acceptance, retrospective feedback/actions, original board/burndown observations and the DoD agreement details. None is supplied by this delegated planning record.

## 16 October 2026 — customer receipt confirmation and balanced release reconstruction

**Source/method:** Tristan confirmed in chat that the team received the Week 7 customer changes on **2 October 2026**, near Sprint 2's end, and intended to finish Sprint 2 against its existing scope before considering the changes during Sprint 3 planning. The receipt date is user-confirmed; no eLearn announcement capture is claimed. Source inspection was recorded 15 October. Current backlog reconstruction and delegation are recorded 16 October; original 4 October planning did not finalise scope according to the chat update's earlier statement.

The backlog was reconstructed using linked new stories or justified reopened work, then balanced between Sprints 3 and 4. Adopted allocation: **63/63**, replacing **97/29**. Customer changes are new/replacement requirements (KAN-77/78/79/81/82/83/84, 47 new SP); original unfinished KAN-6/34/50/12/52 retain full 19 SP, and pre-existing correction KAN-60 remains separate. KAN-29's historical automatic-assignment rule remains original evidence and is prospectively superseded by the Lead queue.

KAN-64 is split before implementation: five points for complete inbox/request/venue notifications, new KAN-80 three points for equipment/lifecycle/change/registration triggers. Every original criterion is mapped in the [change register](change-requests.md), with active KAN-64 IDs AC201–209 and historical combined criteria retained. No partial delivery, lost trigger or duplicate customer-scope points are claimed.

The following are delegated release defaults, not customer quotations or invented team votes:

### CR-2 / KAN-81 — delegated operational defaults

- Approved booking means the existing venue-booking APPROVED state, not a new event-status transition.
- Include live holds from CR-4 in outage impact so a provisional reservation cannot remain falsely usable.
- Keep the event lifecycle state unchanged; expose an explicit recovery/readiness condition instead of automatically cancelling the event.
- A linked replacement for recovery is supported here even though general independent arrangement management is a separate CR-3 story.
- Notifications use the shared in-app mechanism; no additional email channel or duplicate notification feature is introduced.

### CR-3 / KAN-82 — delegated operational defaults

- Per-arrangement periods reuse the current valid booking-period contract; this story does not silently add a new event-period containment restriction.
- The selected replacement mechanism is explicit cancellation then a new request, not in-place mutation of an approved row or an invisible all-or-nothing multi-venue operation.
- A coordinator must be told that cancelling first releases the original space and that a replacement is not guaranteed.
- Whole-event cancellation, event-level significant-change review and outage-specific recovery remain their own stories.

### CR-4 / KAN-83 — delegated operational defaults

- Venue Staff choose an explicit deadline; no arbitrary fixed hold duration or renewal period is attributed to the customer.
- Expiry must be strictly future and at or before buffered occupation begins; at the exact expiry instant the hold is expired.
- Use a trusted scheduled expiry job plus expiry-aware reads. A delayed worker may delay the expiry follow-up notice, but the creation notice already communicates the deadline before expiry and availability releases on time.
- Approval is the explicit completion action. No separate coordinator acknowledgement automatically turns a hold into an approved booking.
- New schema/state constraints and existing database conflict triggers must be reconciled through additive migrations, not editing applied history.

### CR-6 / KAN-84 — delegated operational defaults

- Safety is a separately recorded workflow phase/review revision, not a reuse of event-review approval or a reinterpretation of venue suitability.
- Arrangement readiness precedes safety submission. Event CONFIRMED and safety APPROVED are separate conditions for an explicit start-preparation action, avoiding a circular prerequisite.
- Requested changes route venue/technical tasks and invalidate readiness without automatically cancelling the event lifecycle or releasing unaffected reservations.
- If a safety-relevant change occurs after preparation starts, show preparation blocked until the revised arrangements are approved; do not silently retain the former approval.
- Emergency access, equipment placement and crowd movement must be represented by reviewable fields/notes or clearly shown as missing. Do not claim existing free text proves those checks were performed.
- Trusted role provisioning is required. An officer response may be assumed; no timeout escalation feature is added.

KAN-83 additionally owns explicit Venue Staff cancellation of a held arrangement (reason and history) so its release behaviour is completable in Sprint 3; later KAN-62/82 reuse it. KAN-81 provides a shared venue-readiness predicate in Sprint 3; KAN-61/84 integrate that predicate in Sprint 4. New acceptance cases remain Not executed; no design/implementation acceptance is inferred. Owners/reviewers are delivery assignments, not evidence that those members participated in this decision.

## 16 October 2026 — Story self-selection and document attribution

**Ownership update — 16 October 2026.** All 28 unfinished parent items are now unassigned in Jira. Team members will choose their own stories; independent reviewers and the integration lead are **To agree** after ownership is chosen. The scope remains **63 SP per sprint**, averaging **10.5 SP per member per sprint** and **21 SP per member across both**. Aim for roughly 10–11 SP each, retaining whole estimates and dependency order rather than forcing an exact split. Earlier named allocations are historical. Claim a Jira card and sync its sprint record before starting work.

Source: the chat update and a fresh read of all 68 Jira issues. Only ownership/reviewer allocation changes; sprint membership, point estimates and acceptance criteria remain unchanged. Historical records and actual test execution dates are preserved. Repeated administrative attribution labels are omitted; preparation method is recorded once in the [Scrum record conventions](../scrum/README.md#record-preparation).

## 16 October 2026 — Course-format backlog alignment

The current Jira descriptions use the course user-story and acceptance-criteria format, with priority, estimate, sprint and assignment kept in their native fields. Process history remains in the repository. Project scope and deliverables continue to follow the project instructions and rubric, including all 20 core features and six Week 7 changes.

All 299 active criterion IDs are retained. Four condensed criteria in KAN-6/KAN-34 now explicitly retain the original Jira submission feedback, required-data rules, saved-draft access, registration-field behaviour and persistence requirements. This restores omitted wording rather than adding scope; estimates and sprint membership are unchanged. TC-02-09 and TC-03-06 specify the corresponding checks and remain **Not executed**. The 14 Done parent descriptions are unchanged. Source: current Jira cards, course materials and project instructions; see the [course references](README.md#course-and-project-conventions).

## 17 October 2026 — Submission requirements and historical crosswalk reconciliation

The submitted repository and master workbook retain both original requirements and documented customer changes. The original Sprint 1/2 cards are not rewritten to imply that Week 7 changes applied earlier. Their dated crosswalks connect original source criteria to retained local IDs, concrete functional specifications and relevant test files. The applicable criteria/Definition of Done version adopted at historical review remains **Not recorded** where no source was supplied.

Sources: the 21 September and later retained Jira CSVs, the unchanged live 68-issue read on 17 October, the recorded 9 October Product Owner attendance-zero decision, and the Week 4 project instructions/Week 7 change register. The 16 October CSV remains a verbatim dated source. Repository-only corrections are labelled rather than being inserted into that export.

- KAN-12-AC102 and KAN-52-AC102 restore the existing rule that no venue match or an unsuitable venue does not automatically reject an event. The current Jira cleanup omitted those sentences; they are not new scope or customer changes.
- KAN-24-AC4 makes the existing Jira database-diagram check explicit in the dated Sprint 1 mapping, without renumbering original criteria.
- Sprint 2's old "repo-only" labels, attendance-zero question and proposed robustness labels are clarified against their later recorded refinements. Original dated notes remain available.
- All added test cases are specifications, **Not executed**. Existing failure evidence and scoped passing observations are retained. No application tests, hosted acceptance, team vote or historical meeting outcome is created by this document cleanup.

This correction does not alter estimates, assignees, sprint allocations, administrative resolution dates or the six-change release plan. Jira remains unchanged during this pass; the master backlog and workbook identify the two missing Jira sentences for later team reference.

## 19 October 2026 — KAN-79 implementation boundaries

Source: live KAN-79 AC1–10 and the implementation plan approved in chat by Tristan. The implementation uses the existing active-status set (Submitted, Under review, Clarification requested, Approved and Confirmed) for Lead oversight/initial allocation; only unassigned Submitted requests enter the new-request queue. Available targets must be trusted `EVENT_COORDINATOR` profiles with `coordinator_available=true`. Lead is a distinct role, not an inherited reviewer or venue-staff role. Existing assigned requests and active history cannot be replaced by the initial-allocation API.

The approval covers the local implementation, tests, documentation and commits, retaining KAN-65/KAN-64 as pending integration dependencies. It does not establish hosted acceptance, an independent review or a new team estimation vote. No new product criterion or estimate is introduced: the safeguards implement AC1–8 and the local portion of AC10. AC9 remains Not executed. Shared migration 007 and account provisioning require coordination with Arvin before rollout; no shared database change was made during this work.

## 19 October 2026 — KAN-65 implementation and deferred acceptance

Source: current Jira KAN-65 AC1–8/AC101–104 and the implementation plan approved in chat by Tristan. The approval covers bringing KAN-79 into a fresh feature branch, implementation, documentation and small local commits; manual tests are deferred and KAN-64 integration remains pending. The existing 3-SP estimate and criteria are unchanged; this is not a new team vote or acceptance decision.

The expected assignment version is the UUID of the single active `coordinator_assignments` row, avoiding a new schema field and detecting A→B→A stale pages. A valid same-current-assignee request is unchanged without a history write; the version is checked first. Inconsistent/missing current history is refused for reconciliation rather than silently repaired. Reassignment closes the old interval and inserts its replacement at one PostgreSQL timestamp, preserving actor/reason and existing event decisions/arrangements. Protected multi-query history reads hold a shared event-row lock until authorization and data retrieval finish; mutations serialize on the event row. These implement existing concurrency/access criteria rather than adding product scope.

The user reported that migration 007 was applied in Supabase and Coordinator Lead login works. This is setup confirmation only; no manual workflow test is recorded, no credentials were handled, and no shared database mutation was performed during this KAN-65 implementation. Hosted/manual checks, KAN-64 notifications, independent review and formal acceptance remain outstanding.

## 20 October 2026 — KAN-34 draft date-time format

Source: implementation decision for KAN-34-AC101, made by Kai Jie in chat with an AI assistant while repairing the HTTP 500 on impossible draft dates. This was not a team discussion or customer clarification.

Decision: draft date-times (`startsAt`, `endsAt`, `registrationOpensAt`, `registrationClosesAt`) are accepted only as ISO 8601 date-times with an explicit `Z` or `±HH:MM` offset and a real calendar date. This applies the existing [API convention](../architecture/api-contract.md) that HTTP dates carry an offset; values without one were previously accepted and interpreted in the database session's timezone. The browser form already sends UTC values from `toISOString()`, and no existing test or fixture sent an offset-free value, so no product behaviour in the application is expected to change. Other API clients sending offset-free values now receive a 400 validation error. Existing criteria and estimates are unchanged.

## 21 October 2026 — KAN-64 notification inbox: trigger matrix and implementation choices

Source: live KAN-64 AC201–AC209 and the developer's instruction on 21 October to implement it. This record is a **proposal to agree**: no team vote, Product Owner decision or independent review is recorded. The 5-SP estimate and the criteria are unchanged.

**Trigger and recipient matrix (AC208), To agree:**

| Trigger (acting user) | Recipients |
| --- | --- |
| Request submitted (organiser) | the organiser, as an acknowledgement |
| Clarification requested (coordinator) | the organiser |
| Initial approval or rejection (coordinator) | the organiser |
| Initial assignment (Lead) | the organiser and the new coordinator |
| Reassignment (Lead) | the organiser and the new coordinator, plus the previous coordinator, who gets a minimal notice with no event details |
| Venue booking decision (Venue Staff) | the organiser, the event's current coordinator and the deciding Venue Staff member, as an acknowledgement |

**Venue Staff recipients:** AC203 says "relevant Venue Staff". The developer chose the deciding staff member only; other Venue Staff are not notified. Revisit if the team wants every staff member to see decisions.

**Implementation choices that follow the criteria:** migration 008 adds `venue_booking_id` and `dedupe_key` to `notifications` with a unique index on recipient and key (AC205, AC207). The key is the notification type plus the id of the review, clarification, assignment-history row or booking, so a repeat is a no-op. Notifications are written in the business transaction. Access is re-checked on each read (AC206): the organiser must own the event, a coordinator must currently be assigned and the event must not be a draft, Venue Staff may open venue bookings. The previous-coordinator notice is the only one visible without event access and contains no event name. The inbox shows at most the newest 100. AC209 is a boundary only; KAN-80 owns the remaining original triggers and the change stories own CR-2, CR-4 and CR-6.

**Not done:** email, push and external delivery are out of scope (AC204). Notifying Leads of new submissions is not in the criteria and was not added. Migration 008 has not been applied to shared Supabase and must be agreed with the team first.

## 21 October 2026 — KAN-77 buffer concurrency and AC6 dependency

Source: KAN-77 implementation plan approved in chat by Kai Jie, the story owner, on 21 October 2026. These are implementation decisions within the existing S3-P01/S3-P08 policy, not customer clarifications or a team vote.

1. **Field-aware buffer concurrency (KAN-77-AC5).** A request that changes `setupMinutes` or `turnaroundMinutes` must also send the value the editor loaded (`expectedSetupMinutes` / `expectedTurnaroundMinutes`). Under the venue row lock, a mismatch returns `409 VENUE_BUFFER_CONFLICT` and nothing in the request is written. This compares values, so no version column was added. A value changed and then changed back is accepted, because the editor saw the same value that is stored. Edits to non-buffer fields keep KAN-50's rule. A request that changes no buffer is never refused for buffer changes made meanwhile.
2. **AC6 deferred to KAN-78 (option a).** KAN-77-AC1–AC5 are implemented. AC6, re-evaluating non-ended bookings and reporting affected-booking warnings after a duration change, needs KAN-78's shared buffered-interval calculation, which is not yet built. AC6 stays **Not executed**, KAN-77 stays In Progress, and its 2-SP estimate is unchanged. Until KAN-78, saved buffers are returned to catalogue, search, suitability and calendar callers but change no interval, filter or conflict result.

## 21 October 2026 — KAN-81 phase 1 outage recovery decisions

Source: KAN-81 plan approved in chat by Kai Jie, the story owner, on 21 October 2026, within CR-2 and the S3-P01/S3-P08 policies. These are implementation decisions, not customer clarifications or a team vote. The 8-SP estimate and the confirmed AC1–AC12 wording are unchanged.

1. **Phased delivery.** Phase 1 covers AC1–AC4, AC9 (planning effects), AC10, AC11 and the Venue Staff side of AC6/AC12. Phase 2 adds AC5 notifications through the merged KAN-64 writer and the coordinator recovery view. Phase 3 adds AC7/AC8 linked replacement bookings. Live-hold cases of AC3/AC10 wait for KAN-83, and the readiness half of AC9 waits for KAN-61/CR-6.
2. **KAN-55 rule replaced.** CR-2 replaces KAN-55's refusal of a block that overlaps an approved booking. The outage is saved and each affected arrangement is flagged. KAN-55's history and evidence are unchanged; its one integration test of the old refusal now checks the new behaviour, with a comment.
3. **Interval rule and KAN-78.** Affected bookings are chosen by one SQL condition (`AFFECTED_BOOKING_CONDITION` in `outage-impact.ts`): non-ended `APPROVED` bookings at the venue whose event interval overlaps the outage, half-open. KAN-78 (Arvin) replaces this condition with buffered occupancy. KAN-81 does not implement buffers.
4. **Flags in their own table.** Migration 010's `venue_outage_impacts` holds the flags and a copy of the outage period and reason. The `venue_bookings_conflict` trigger re-checks every update to an `APPROVED` booking against blocks, so an affected booking row must not be updated. Phase 3 and KAN-82 must account for this when changing affected bookings.
5. **Removal.** Removing a block marks only its own open flags `CLEARED` and keeps them as history. A booking still covered by another outage stays flagged by that outage. Nothing is re-approved.
6. **Uncertain writes (AC12).** The blocks page treats a 4xx with a server message as a definite refusal. A network failure, unreadable response or 5xx is uncertain: the page refreshes current state and says so, without retrying.


## 21 October 2026 — KAN-81 stale-refusal review correction

Source: PR47 review and Arvin's instruction to fix the findings and merge. A definite 4xx refusal does not establish that the cached staff view is current: 404/409 create/remove results now refresh both blocks and recovery while preserving the server message and save input. No write is retried automatically. This supplements phase-1 decision 6; the AC wording, phased scope and 8-SP estimate are unchanged. New TC-09-13–17 expose phase-1 verification without claiming completion of TC-09-01–12. Jira's To Do/In Progress mismatch was corrected to In Progress, retaining Kai Jie as assignee.

## 21 October 2026 — KAN-60 implementation decisions

**Source and date:** Irfan, 21 October 2026, while implementing KAN-60 (AI-assisted; plan approved in chat by Irfan).

- **Shared limit:** KAN-60-AC101 names "the existing shared review reason length limit", but the review parser had no limit. The existing shared workflow limit for reasons, notes and messages is `MAX_TEXT_LENGTH` = 2,000 characters after trimming (`workflow-support.ts`), so it is reused rather than introducing a new value.
- **Limit on approvals:** the limit applies to both decisions, so an over-long approval reason is also refused. Approval stays reason-optional (KAN-60-AC4); only the length is checked.
- **Field-specific error:** `400 INVALID_REVIEW_INPUT` adds `field: "reason"` (or `"decision"`) for field errors and keeps the existing code, so existing clients still recognise the error.

**Outcome:** implementation choices within the existing criteria; no new acceptance criterion, estimate or scope change. Jira wording is unchanged.

## 21 October 2026 — KAN-81 phases 2 and 3 decisions

Source: options proposed in chat on 21 October 2026. Kai Jie, the story owner, said to proceed without choosing, so the recommended option of each was adopted. These are implementation decisions within CR-2, not customer clarifications or a team vote; the 8-SP estimate is unchanged.

1. **Who is notified (AC5).** Only each affected event's current assigned coordinator, once per outage and event (dedupe key `VENUE_OUTAGE_RECOVERY_REQUIRED:<outage>:<event>`), linked to the event's first affected booking. The organiser is not notified. An event without a coordinator gets no notice. This adds one row to the KAN-64 trigger/recipient matrix, which is still To agree.
2. **Suitability for a replacement (AC7, phase 3).** The objective checks are enforced automatically (active venue, capacity, operating hours, buffered availability and conflicts). Checks that need the coordinator's interpretation of free-text requirements stay advisory, consistent with KAN-52 and CR-6.
3. **The original booking after an approved replacement (AC8, phase 3).** It becomes `CANCELLED`, keeping the row and its history, so it no longer reserves the venue. The `venue_bookings_conflict` trigger fires only for `APPROVED` rows, so this update is allowed even while the original overlaps the outage.
4. **Coordinator view (AC6/AC12).** No new page: every booking response carries its `recovery` list, which the existing booking page shows to Venue Staff and the assigned coordinator. The coordinator's venue panel marks bookings that need recovery.

## 21 October 2026 — KAN-81 phase 3 replacement rules

Source: phase 3 design approved in chat by Kai Jie, the story owner, on 21 October 2026, applying the phase 2/3 decisions above. Implementation decisions within CR-2, not a team vote; the 8-SP estimate is unchanged.

1. **Migration 011, not 010.** PR #47 merged migration 010, so the replacement link is a new additive migration (`venue_bookings.replaces_booking_id`). An applied migration is never edited.
2. **Requesting a replacement (AC7).** `POST /api/events/:id/venue-bookings` accepts an optional `replacesBookingId`. The original must be a booking of the same event (otherwise `404 VENUE_BOOKING_NOT_FOUND`) that still needs recovery (otherwise `409 REPLACEMENT_NOT_NEEDED`), for an `APPROVED` or `CONFIRMED` event (otherwise `409 EVENT_NOT_ELIGIBLE_FOR_REPLACEMENT`). After the usual availability checks, a replacement must fit the expected attendance (`409 VENUE_CAPACITY_TOO_SMALL`) and the venue's opening hours (`409 VENUE_CLOSED_DURING_PERIOD`). Ordinary requests are unchanged.
3. **Approving a replacement (AC8).** In the approval transaction, after the booking, event and venue locks and the conflict re-check, the original is locked and must still need recovery; otherwise `409 REPLACEMENT_NOT_NEEDED`. That covers a second replacement or a removed outage, and prevents double-booking the event. On approval the original's open flags become `RESOLVED` and the original becomes `CANCELLED`, keeping its row. A replacement may also be approved for a `CONFIRMED` event. Rejection changes nothing, so another attempt is possible.

## 21 October 2026 — KAN-83 implementation decisions

**Source and date:** Irfan, 21 October 2026, while implementing KAN-83 (AI-assisted; plan approved in chat by Irfan, including the three choices marked *approved*).

- **One occupancy rule (approved):** a booking occupies its venue when it is `APPROVED`, or `HELD` with the deadline still in the future (`backend/src/modules/venues/occupancy.ts`). Calendar, search, suitability, request creation, approval and block creation all use it. KAN-78 adds venue buffers in the same file; until then the occupied interval and the latest hold deadline use the requested start and end.
- **Expiry scheduling (approved):** `expire_venue_holds()` in migration 011 is the single expiry operation and uses the database clock. Migration 011 schedules it every minute with `pg_cron` where that extension is enabled; the API also runs it at startup and every minute. Reads never depend on either: a hold stops occupying the venue at its deadline even if no run has happened.
- **Notifications (approved):** placement, expiry and cancellation notices are written to the existing `notifications` table in the same transaction as the hold change (types `VENUE_HOLD_PLACED`, `VENUE_HOLD_EXPIRED`, `VENUE_HOLD_CANCELLED`). Showing them in the app is KAN-64's inbox, so AC7's in-app display cannot be accepted before KAN-64.
- **Hold eligibility:** a hold may only be placed on a `PENDING` request for an `APPROVED` event (the same event state approval requires), at an active venue whose capacity fits the expected attendance and whose opening hours contain the booked period.
- **Decisions on a hold:** Venue Staff may approve or reject a live hold through the existing decision endpoint. A hold at or after its deadline can no longer be approved, rejected or cancelled (`HOLD_EXPIRED`); it is already released.
- **Outage interaction:** creating an operational block releases any live hold it overlaps (status `CANCELLED`, reason "Venue unavailable: <block reason>") and notifies the coordinator; an approved booking still refuses the block as before. KAN-81 owns wider outage recovery.
- **Statuses:** `HELD` and `EXPIRED` are new booking statuses; readers see a `HELD` row past its deadline as `EXPIRED`. Venue Staff's queue lists pending requests and live holds.

**Outcome:** implementation choices within the existing criteria; no new acceptance criterion, estimate or scope change. Jira wording is unchanged.

## 22 October 2026 — sprint 3 integration 2 decisions

**Source and date:** Irfan, 22 October 2026, while integrating PRs #48–#53 on `feat/sprint-3-integration2` (AI-assisted; Kai Jie's review of #48 is the source for decisions 1–4). Implementation decisions by one member, recorded for the team to confirm; no team vote is recorded.

1. **Outages over approved bookings stay allowed (KAN-81-AC2 over KAN-78).** KAN-78's `prevent_blocking_occupied_booking` trigger now only takes the venue lock; it no longer refuses a block that overlaps an approved occupied interval. KAN-81 saves the outage and flags the bookings for recovery.
2. **Outage impact uses the buffered interval.** `AFFECTED_BOOKING_CONDITION` reads `venue_booking_intervals`, so an outage that covers only a booking's setup or turnaround also flags it.
3. **Staff queue.** Approved bookings appear in the Venue Staff queue only for buffer warnings other than `OPERATIONAL_BLOCK_OVERLAP`; outage-affected bookings are handled through KAN-81 recovery.
4. **Migration order.** 010 outages and 011 replacements (KAN-81) keep their numbers; KAN-78 becomes 012 and KAN-83 becomes 013. Branch names are recorded in each migration header.
5. **Live holds reserve the buffered interval (KAN-83 with KAN-78).** The 013 trigger extends 012's buffered checks with live holds, and the app's buffered check refuses a live hold with `VENUE_HELD`. A hold deadline may be no later than the buffered occupied start (setup time before the event), as KAN-83-AC1 states.
6. **KAN-12 search.** From #51 only the strict ISO 8601 date-time validation is integrated; the search service keeps operational-block exclusion, the shared opening-hours rule and KAN-78 buffers, and no `public.` schema prefixes.
7. **Staff queue empty state.** The Venue Staff heading reads "No pending requests, holds or affected bookings", replacing both branches' wording.

## 25 October 2026 — KAN-81 outages release holds by their buffered interval

**Source and date:** Kai Jie, 25 October 2026, while checking KAN-81 against `main` after the 22 October integration (AI-assisted). A correction to make the code meet the existing KAN-81-AC3 wording; no AC or estimate changes.

**Correction.** Saving an outage released only live holds whose *event* interval overlapped it, while approved bookings were already judged by their buffered occupied interval (22 October decision 2). An outage covering only a hold's setup or turnaround time therefore left the hold live and still reserving the venue, contrary to AC3 ("every non-ended approved booking or live tentative hold … whose buffered occupied interval overlaps the outage"). The hold query in `createVenueBlock` now reads `venue_booking_intervals`, the same interval the hold reserves under the 013 trigger. Exact adjacency remains unaffected (half-open intervals). Released holds keep KAN-83-AC10's behaviour: cancelled with the outage reason and the coordinator notified; they are not recorded as recovery items.

## 25 October 2026 — KAN-81 holds hit by an outage are released, not flagged

**Decision:** an operational outage flags overlapping non-ended **approved** bookings for recovery (KAN-81). An overlapping **live hold** is released instead: it is cancelled with the outage reason, its history is kept and its assigned coordinator is notified (KAN-83-AC10). It gets no recovery flag and no linked replacement; the coordinator requests a venue again through the normal request process (KAN-83-AC11).

**Who and how:** Irfan as Product Owner, 25 October 2026, after advice in an AI-assisted session (Claude). Not a team vote. Kai Jie (KAN-81 owner) is informed; Tristan reviews and approves the records PR (#58).

**Why:** a hold is a provisional reservation that is never a confirmed arrangement and can expire on its own, so a linked replacement adds little over a normal new request. The rule matches KAN-83's existing criteria, needs no code change, and the behaviour is already tested (TC-09-24 from PR #55, KAN-83 hold tests and manual run MAN-20261025-KAN83-01).

**Source:** a Codex review and manual run MAN-20261025-KAN83-01 both found that an outage-released hold gets no `venue_outage_impacts` row, which conflicted with the earlier AC3 wording ("identifies every … approved booking or live tentative hold") and AC7 (replacement for any affected arrangement).

**Changes:** KAN-81-AC3 and AC7 clarified and AC4 reworded in Jira (comment 25 October) and in the [Sprint 3 backlog](../scrum/sprint-03/sprint-backlog.md); test cases TC-09-03 and TC-09-07; KAN-81 traceability rows; CR-2 in the [change requests](change-requests.md). Classified as a clarification of unfinished work (SPM Master §10.1 step 2), so no new story and no estimate change (KAN-81 stays 8 SP). Separate from the pending KAN-81-AC9 readiness split.

## 25 October 2026 — Arvin KAN-78 and KAN-34 documentation reconciliation

**Source:** Arvin instructed a documentation update limited to his KAN-78/KAN-34 work and requested the latest main. Codex inspected main `96a0d10`, PR #48's reviews/merge record, PR #54's integration record, existing scenario assertions and CI run 40192394546. This is evidence reconciliation, not a new customer requirement, meeting or team vote.

**Existing decisions retained:** the 22 October integration renumbered KAN-78 to migration 012 after KAN-81's 010/011; migration 009 retains the KAN-77 duration columns and 013 extends guards with live holds. Outages over approved buffered bookings stay permitted and flagged; outage-only warnings use recovery instead of the staff decision queue. `TC-14-303` is clarified accordingly while previous versioned outcomes remain history. KAN-34's real-calendar/explicit-offset and draft update semantics remain unchanged.

**Provenance and limits:** original reviewer Leo Kai Jie requested changes; Irfan later approved their integration resolutions. Leo's post-integration re-review is Not recorded. The last recorded Jira state is In Review on 21 October, not a fresh current tracker read. The [25 October manual run](../testing/test-evidence.md#25-october-2026--kan-60-and-kan-83-manual-hosted-runs) reports migrations 001–013 applied and a KAN-78 affected-bookings display issue; it does not complete S3-T06/S3-T19. No AC wording, estimate, shared data, acceptance, sprint date or velocity is changed by this reconciliation. [Executed automation and remaining limits](../testing/test-evidence.md#25-october-2026--arvin-kan-78-and-kan-34-documentation-reconciliation) are recorded separately.

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

Evidence interpretation: Arvin’s original KAN-24 work included premature business features subsequently removed in PR #19. KAN-51 combines Ernest’s original implementation with Arvin’s later fixes. PR #47 is Kai Jie’s story with Arvin review/correction support. Missing independent approvals, hosted acceptance and ceremony evidence remain **Not recorded** or **Not assessed** as applicable. These are evidence boundaries, not new customer or team decisions.

## 25 October 2026 — Closeout fixes and approved expiry configuration

The team approval for configuring the existing KAN-83 expiry schedule on shared Supabase was reported in chat. The existing migration-013 function was verified before enabling `pg_cron` 1.6.4 and scheduling only `connectsphere-expire-venue-holds` every minute. Actual successful job executions are retained in `sprint-03/evidence/supabase-hold-expiry-20261025.json`. No business test fixtures, cleanup tests, migration renumbering or new schema migration were applied to the shared database.

The implementation repairs satisfy existing input-validation, conflict, replacement and display criteria; they add no story points or new customer requirement. Venue writes acquire one transaction-scoped venue gate before row locks, so an outage cannot skip an in-flight hold. If an outage wins, the hold is cancelled and a later decision is refused; if approval wins, the approved booking is retained and flagged for recovery. This implements the existing PO clarification that recovery flags belong to approved bookings, while live holds are released and may be requested again.

Full attendance at planning/review/retrospective meetings and unchanged team agreement with the current DoD were reported on 25 October. Actual retrospective feedback/action agreement, individual estimation votes, and board/burndown artifacts remain separately recorded or **Not recorded**; suggested retrospective actions are **To agree**. No review acceptance decision or new historical velocity is inferred.

## 25 October 2026 — Local acceptance and repair retest confirmation

Application deployment is out of the team's delivery plan. Acceptance uses the complete local frontend/API with real authentication and the agreed Supabase development database. The Week 4 project instructions require working software, clear run instructions and test/CI code, but do not prescribe public application hosting. KAN-79's coordinated policy/Lead/queue rollout still applies to the integrated local candidate; shared database migrations and KAN-83 scheduling remain operational requirements.

Decision source: Tristan communicated the project decision in chat and authorised updating the DoD. Additional participants, meeting details and votes are **Not recorded**. This is a current process amendment, not a customer-requirement change or retrospective acceptance decision.

The same report confirms that the latest fixes were tested and work. [REPORT-20261025-CLOSEOUT-RETEST](../testing/test-evidence.md#25-october-2026--closeout-retest-confirmation) closes the repair-smoke follow-up with reported Pass outcomes. The reporting date is 25 October; actual execution date, individual executors and exact tested build are **Not recorded**. Earlier failures, placeholders and reported sprint-review tests remain intact.

## 26 October 2026 — Collective review decisions and evidence follow-up

Source: project-discussion confirmation from Tristan on behalf of the team. Arvin, Ernest, Irfan, Kai Jie, Ryan and Tristan collectively agreed against ACs/DoD at each reported sprint review. Sprint 1 retains 7 accepted / 24 SP and 3 carried / 8 SP at 19 September. Sprint 2's seven non-carried stories were accepted at 3 October; customer-change additions do not retrospectively revoke original acceptance. Sprint 3 is reported as all 13 stories / 63 SP accepted at 17 October with no carry-over. These reported historical decisions were documented on 26 October.

The team describes later fixes as small improvements. The retained audit also contains reproduced existing-requirement failures, so that description does not replace the technical findings or their dates. The exact historical build is unavailable; whether those failures existed in the reviewed candidate remains Not assessed. Current repairs and retests remain separately evidenced. No Jira status or point field is changed by this record.

The team will supply closing-board exports, review feedback and burndown charts/source data for all three sprints. Reviewed build/commit/branch identifiers were not retained and remain Not recorded. Feedback text, action owners and artifact locations remain Not recorded until supplied.

## 26 October 2026 — KAN-9 equipment availability boundary

**Decision source:** Tristan approved the implementation plan in chat, including unsaved check mode and migration 014. This is a story-level implementation decision, not a new team estimation vote or acceptance decision. KAN-9 remains 8 SP; KAN-26 remains 3 SP.

- Technical Support Staff receive a separate minimal APPROVED/CONFIRMED event context. The organiser/coordinator detail endpoint is not widened; venue confirmation is not a prerequisite.
- Saved mode reads current non-CANCELLED equipment requests, combines same-type quantities and excludes only the exact saved RESERVED lines being assessed. Saved request windows must equal the event window. REJECTED demand stays visible but is not approved by a check.
- Unsaved what-if mode accepts explicit type/quantity/window inputs, prefilled from the event. It never interprets free text, saves requests or excludes existing reservations. It allows an explicit hypothetical window without changing the event.
- Operational stock is active total minus damaged and maintenance quantities. Availability subtracts peak simultaneous RESERVED demand using half-open periods and exact microseconds. Inactive stock has zero availability; empty requirements cannot pass.
- A source-value version catches changed event/saved requirements even when updated_at is unchanged. Each assessment reads one current PostgreSQL snapshot; the UI clears stale results on edits, errors, navigation and session changes.
- Migration 014 adds loss counters and overflow-safe constraints, preserving existing records and historical migrations. Shared Supabase application is **Not executed**. KAN-18 owns stock administration; KAN-63 owns request entry/review. KAN-26 must enforce operational capacity under lock: the existing historical reservation trigger only checks total stock.

These edge conditions are recorded as KAN-9-AC104–107 in Jira and the Sprint 4 card. Manual integrated acceptance and independent review remain outstanding.

## 26 October 2026 — KAN-26 reservation and release boundary

**Decision source:** Tristan approved the implementation plan in chat, including bringing the local KAN-9 commits into `feat/KAN-26-equipment-reservations`, migration 015, small local commits and dependent acceptance remaining pending. This is an implementation decision, not a new estimation vote or sprint acceptance. The 3 SP estimate is retained. KAN-26 is In Progress; KAN-104/105/106 track backend, interface and verification work.

- Reserve only a saved REQUESTED line's full quantity on an APPROVED event. Read type, quantity and period from that line; KAN-9's unsaved inputs remain read-only. Venue confirmation is independent.
- Lock the event, equipment pools and request rows consistently; re-read current operational capacity after waiting. Decision, reservation and notices commit together. Retried unchanged outcomes do not duplicate writes; changed source versions require refresh.
- Technical Support may manually cancel a RESERVED line on an APPROVED event with a reason. Retain original decision metadata and append release actor/time/cause. Operational stock edits remain KAN-18; coordinator request entry/review and explicit Not Required remain KAN-63.
- Migration 015 replaces the total-stock guard with operational-capacity protection and automatically releases recorded reservations when an event actually transitions to CANCELLED or COMPLETED. It never increments a stock counter. Retain old records without inventing missing actors. The event lifecycle API/UI remains KAN-62/KAN-10 and its connected acceptance remains pending.
- Readiness requires a nonempty active requirement set with every line RESERVED and currently fulfilable. Empty, unresolved, rejected, mismatched-period or degraded requirements cannot be silently marked ready.
- Reservation confirmations use KAN-64's transactional/deduplicated inbox for the current assigned coordinator and deciding Technical Support actor. Equipment notices grant only equipment-planning access; a closed event retains its notice without a planning link. Other KAN-80 triggers remain separate.
- Added KAN-26-AC105–108 in Jira and the Sprint 4 card to make these edge conditions traceable. Manual tests remain Not executed until actual results are supplied.

**Setup report:** migration 014 application and creation of the test accounts were reported in chat before this work. No hosted schema inspection or KAN-9/KAN-26 manual acceptance was performed by this update. Migration 015 shared application remains Not executed.

## 28 October 2026 — KAN-81-AC9 readiness split

**Decision:** KAN-81-AC9 keeps only its planning half: "Calendar, search, suitability, new hold/request creation and approval use the saved operational block immediately." The readiness half moves to the stories that own the readiness checks:

- **KAN-61-AC105:** "An event with a venue booking still requiring outage recovery (KAN-81) cannot be confirmed."
- **KAN-84-AC101:** "An event with a venue booking still requiring outage recovery (KAN-81) cannot pass the safety review."

Estimates unchanged (KAN-81 8 SP, KAN-61 3 SP, KAN-84 8 SP).

**Who and how:** Irfan as Product Owner, 28 October 2026, replying in chat to Kai Jie's proposal (AI-assisted, Claude). Not a team vote. Kai Jie updates the three Jira cards and these records.

**Why:** KAN-81 cannot finish while its AC9 depends on event confirmation (KAN-61) and the safety gate (KAN-84), neither of which exists yet. Each readiness rule belongs with the story that performs the check, so KAN-81 can be accepted on what it delivers: the recovery flags those stories will read.

**Changes:** KAN-81-AC9 in the [Sprint 3 backlog](../scrum/sprint-03/sprint-backlog.md); KAN-61-AC105 and KAN-84-AC101 in the [Sprint 4 backlog](../scrum/sprint-04/sprint-backlog.md); TC-09-09, TC-06-03 and TC-06-23; KAN-61, KAN-81 and KAN-84 traceability rows; CR-2 note in the [change requests](change-requests.md). KAN-84-AC2 already refuses safety *submission* with unresolved recovery; AC101 also covers a booking flagged after submission. Both new criteria are Not executed.

## 26 October 2026 — KAN-66 planning-edit implementation decisions

Source: Irfan (KAN-66 owner) approved these choices in the AI-assisted working session on 26 October 2026, before implementation. They implement the existing S3-P05 policy; no customer clarification, team vote or estimate change is asserted. The field and lifecycle rules are unchanged from S3-P05.

| ID | Decision | Reason |
| --- | --- | --- |
| D1 | Migration 016 (decided as 014; renumbered 27 October after KAN-9 merged its own 014) adds an integer `event_requests.revision`; a `BEFORE UPDATE` trigger advances it on every update and ignores client-written values. | `updated_at` cannot be compared reliably because JavaScript dates drop PostgreSQL microseconds. A trigger covers every writer (edits, reviews, assignment). |
| D2 | Each post-submission edit is recorded in a new `event_request_edits` table: event, resulting revision, editor and role, event status, and `{ field: { from, to } }` changes. Draft (KAN-34) edits are not audited. | KAN-66-AC103 requires audit information; the status-history trigger records only status changes. |
| D3 | `POST /api/events/:id/start-review`, `POST /api/events/:id/clarifications` and `POST /api/events/:id/reviews` accept an optional `expectedRevision`; a mismatch returns `409 EVENT_REVISION_CONFLICT`. The coordinator review page sends it. | KAN-66-AC101 requires stale reviewers to refresh after an organiser edit; optional so existing clients keep working. |
| D4 | `PATCH /api/events/:id` is extended: drafts keep the KAN-34 contract (revision optional); post-submission edits require `expectedRevision`. The detail response adds `revision`, `actions.canEditDetails`, `actions.editMode` and `actions.editableFields`. | One edit route, with the server deciding permitted fields by role, relationship and status. |

Consequences: an unchanged save creates no revision or audit row. Because an owner may now edit a SUBMITTED request, the KAN-34 integration regression that expected `DRAFT_NOT_EDITABLE` for a submitted request now uses a REJECTED request (`EVENT_NOT_EDITABLE`). Migration 016 must be announced to the team before it is applied to shared Supabase (AGENTS.md §7.3); it has **not** been applied. The isolated integration tests must not be pointed at shared Supabase: migration 013 re-schedules the named `pg_cron` hold-expiry job into each temporary test schema, which would break the live job once that schema is dropped.

## 27 October 2026 — KAN-15 change-request implementation decisions

Source: Irfan (KAN-15 owner) approved design D1–D8 in the AI-assisted working session on 27 October 2026, before implementation. No customer clarification, team vote or estimate change is asserted; the estimate stays 5 SP.

| ID | Decision | Reason |
| --- | --- | --- |
| D1 | Migration 017 completes the provisional `event_change_requests` table from migration 004 (unused until now): adds `previous`, `base_revision`, `applied_revision` and `cancelled_arrangements`; makes the organiser `reason` optional; replaces 004's decision check so a withdrawal also records who and when; requires a rejection reason; one `PENDING` request per event via a partial unique index. | Shared migrations are never edited, and creating a second table of the same name would fail. KAN-15-AC101/AC105. |
| D2 | The owner submits and withdraws; only the current assigned coordinator decides; owner and assigned coordinator can read; everyone else gets 404. Submission only for `APPROVED` or `CONFIRMED` events. | KAN-15-AC1, AC9, AC101. Withdraw keeps "one pending at a time" usable. |
| D3 | Routes are nested under the event like clarifications: `GET/POST /api/events/:id/change-requests`, `POST .../:changeRequestId/decision`, `POST .../:changeRequestId/withdraw`. A pending item in the list carries current values, `outdated` and the impact, so no separate detail route is needed. | Refines the proposal's `/api/change-requests/:id` paths; same behaviour, consistent with existing routers and the earlier scope-guard paths. |
| D4 | Field to affected arrangements: dates/times affect venue, equipment and registrations; attendance, venue and accessibility needs affect venue; equipment needs affect equipment; registration settings affect registrations; purpose affects none. Confirmed means venue booking `APPROVED`, equipment `RESERVED`, any active registration, or a `CONFIRMED` event when any arrangement kind is affected. Pending means venue `PENDING`/`HELD` and equipment `REQUESTED`. | KAN-15-AC4, AC7, AC102. A purpose-only change touches no arrangement, so it can be approved even on a confirmed event. |
| D5 | Approval is refused with `409 CANCEL_AND_RESUBMIT_REQUIRED` while any confirmed arrangement is affected. Otherwise one transaction rechecks the coordinator's `expectedRevision`, refuses the request if a proposed field changed since submission (`CHANGE_REQUEST_OUTDATED`), applies the values with full submission validation, writes a KAN-66 `event_request_edits` row, cancels the affected pending arrangements with a recorded reason and records the decision. Rejection requires a reason and changes nothing. | KAN-15-AC6, AC8, AC103–AC105. The per-field outdated check refines "base revision must be current", so an unrelated name edit does not invalidate a request. |
| D6 | Notifications use the KAN-64 inbox with their own module (`change-request-notifications.ts`): submission notifies the coordinator and acknowledges the organiser; a decision notifies the organiser (with reason and number of cancelled arrangements); a withdrawal notifies the coordinator. | KAN-15-AC10. KAN-64's matrix deliberately excludes change triggers (KAN-64-AC209). Attendee notices belong to KAN-80. |
| D7 | UI: `/events/:id/change-request` (`EventChangeRequestPage.vue`) for the owner; a **Change requests** panel on both event pages shows current vs requested values, the impact, approve/reject (reason required) for the coordinator, withdraw for the owner, and history. | KAN-15-AC3, AC5. |
| D8 | Pending equipment lines are cancelled with `status = 'CANCELLED'` only, because `main` has no equipment cancellation metadata yet. Adapt once the KAN-26 (#62) / KAN-62 (#63) cancellation model is merged. Venue bookings use the existing `cancelled_by/at/reason` columns. | Avoids depending on unmerged work. |

Consequences: the `sprint-scope.test.ts` guard no longer lists the four change-request routes (KAN-15 entered scope). The approval locks venue bookings before the event, in the same order as Venue Staff decisions, and maps a database deadlock to `409 CHANGE_REQUEST_BUSY`. Migration 017 must be announced before it is applied to shared Supabase (AGENTS.md §7.3); it has **not** been applied. KAN-66-AC8 is now deliverable together with this story.

## 27 October 2026 — KAN-62 / KAN-63 merged-model reconciliation

**Decision source:** Tristan's PR #63 feedback was provided by Ryan; Ryan asked that it be incorporated. This records the accepted implementation contract, not a team meeting or estimation decision.

- Use migration 015's existing released_at, released_by, release_reason and release_cause equipment fields. Event cancellation transitions the event first so the existing database trigger releases RESERVED lines once with EVENT_CANCELLED; the KAN-62 transaction then marks only remaining REQUESTED/REJECTED lines using the same release model.
- Do not add parallel cancelled_* equipment columns or a second constraint for cancelled equipment rows. Keep event_cancellations as the event-level actor/time/reason audit.
- Allocate the KAN-62/KAN-63 additive migration as 018, after the parallel 016/017 work. Integration migration expectations and route-mount regressions are updated. Database integration was not executed in this follow-up.

## 28 October 2026 — PR #63 correction within existing criteria

The review repair was authorized in this working session. Existing KAN-63 AC6/7/101/103/104 require full availability-safe reservation and stale-form protection: the implementation now shares KAN-26's writer and uses an opaque plan revision across both APIs. Existing KAN-62 AC3/4/102/103/104 require atomic one-time release, accurate history and attendee-safe notifications: shared venue-before-event locks and recipient-scoped cancellation projections enforce those requirements. KAN-15 AC7 invalidates a previous Not Required declaration when approved timing/equipment changes affect planning. These are corrections/integration of existing criteria, not new customer scope, a team estimate decision or completed manual acceptance. Jira wording and the two 5 SP estimates remain unchanged.

## 28 October 2026 — KAN-15 decision D8 follow-up

D8 (27 October) cancelled pending equipment lines with `status = 'CANCELLED'` only, to be adapted once the KAN-26/KAN-62 cancellation model merged. PR #63's review repair (`b9e5ca0`, merged 28 October) now records `released_by`, `released_at`, `release_reason` and `release_cause = 'MANUAL_CANCELLATION'` when an approved change request cancels a pending equipment line, satisfying migration 015's release constraints. No further KAN-15 change is needed for D8. Run MAN-20261028-KAN66-KAN15-01 did not exercise equipment lines.

## 28 October 2026 — KAN-82 independent venue arrangement decisions

Source: Irfan (KAN-82 owner and Product Owner) approved design D1–D8 in the AI-assisted working session on 28 October 2026, before implementation. No customer clarification, team vote or estimate change is asserted; the estimate stays 5 SP. These refine the CR-3 / KAN-82 delegated defaults above.

| ID | Decision | Reason |
| --- | --- | --- |
| D1 | `POST /api/venue-bookings/:id/cancel` with `{ reason }`: only the event's current assigned coordinator, rechecked under lock; the event must be `APPROVED` or `CONFIRMED` and the booking `PENDING`, a live `HELD` or `APPROVED`. Only that row becomes `CANCELLED` with `cancelled_by/at/reason`; its decision, hold history and id stay. Lock order venue gate → booking → event, as for Venue Staff decisions. A repeat is `409 BOOKING_ALREADY_CANCELLED`; a lapsed hold `409 HOLD_EXPIRED`; other states `409 ARRANGEMENT_NOT_CANCELLABLE`; anyone else who is a coordinator gets 404. Open outage-recovery flags on the cancelled booking are marked `RESOLVED` (added during implementation, 28 October), because it no longer occupies the venue. | KAN-82-AC4, AC7, AC10. Existing columns from migration 013 hold the cancellation. |
| D2 | A replacement reuses `POST /api/events/:id/venue-bookings` with `replacesBookingId`, which may now name a booking of the same event that was explicitly cancelled (`status = 'CANCELLED'` with `cancelled_at`), as well as an outage-recovery booking (KAN-81). It passes the normal checks plus KAN-81's objective suitability, starts `PENDING` and needs a Venue Staff decision. Approving it leaves the original cancelled. At most one live (pending, live held or approved) replacement per cancelled original: `409 REPLACEMENT_IN_PROGRESS` at request, and `409 REPLACEMENT_NOT_NEEDED` at approval if another replacement already holds the venue (checked under the original's lock). A rejected or expired replacement can be retried. | KAN-82-AC5, AC6, AC10. A booking KAN-81 resolved after its replacement was approved is `CANCELLED` without `cancelled_at`, so it stays a recovery original and cannot be replaced twice (regression found by the KAN-81 integration suite during implementation). |
| D3 | Each booking in API responses carries `replacedByBookingIds` (derived, earliest first). The event page shows per row the status, decision, hold deadline, recovery flag, cancellation reason and "Replaces …" / "Replaced by …" links; no aggregate label is shown. | KAN-82-AC8, without a migration. |
| D4 | `venueArrangementReadiness(eventId)` derives `{ ready, live, outstanding }` from the current rows (ready only when every live arrangement is approved, none needs recovery, and there is at least one). Invalidating a stored safety approval tied to an arrangement revision is delivered by KAN-84 when it adds safety approvals, reading this readiness. KAN-82 never cancels the event or releases unrelated venue or equipment allocations. | KAN-82-AC9. KAN-61 and KAN-84 are not built yet and there is no safety record to invalidate; same approach as the KAN-81 AC9 split (PR #66). |
| D5 | Notices through the KAN-64 inbox in their own module (`arrangement-notifications.ts`): `VENUE_ARRANGEMENT_CANCELLED` and `VENUE_REPLACEMENT_REQUESTED` go to the current coordinator and every Venue Staff account, in the same transaction, one per recipient per booking (`dedupeKey`). KAN-81 recovery replacements keep their behaviour and send no new notice. | KAN-82-AC11. The schema has no per-venue staff allocation, the same rule as the review queue. |
| D6 | UI in `VenueBookingPanel.vue`: **Cancel arrangement** on each live row opens a confirmation naming the event, venue, period and status with a required reason; **Request replacement** on a cancelled row with no live replacement prefills the link. Buttons are disabled while busy; after a conflict or an unconfirmed result the panel asks for a refresh and blocks further cancels until the list reloads. | KAN-82-AC5, AC12. Cancel-then-request is two explicit steps, per the CR-3 default that a replacement is not guaranteed. |
| D7 | No migration. Existing `cancelled_*`, `replaces_booking_id` and free-text notification types are enough. | Preserves applied migrations. |
| D8 | Estimate stays 5 SP. | Persistence and validation already existed; the work is one endpoint, a widened replacement rule, a derived field, two notice types, panel UI and tests. |

Consequences: the replacement and approval paths in `booking-service.ts` now distinguish explicitly cancelled originals from KAN-81-resolved ones. The readiness half of KAN-82-AC9 is delivered; the safety-approval invalidation half depends on KAN-84 (KAN-84-AC9); recorded on both sprint-04 cards and as Jira comments on 28 October 2026. No shared database change is needed for this story.

## 29 October 2026 — KAN-82 replacement approval lock order (review follow-up)

Source: PR #67 review by MochaLxtte (28 October 2026, changes requested); the fix was approved by Irfan (KAN-82 owner) in the AI-assisted working session on 29 October 2026. No customer clarification or team vote was needed.

Decision: approving a replacement venue booking locks its original booking immediately after the replacement's own row and before the event row (booking → original → event → venue). This matches decision D1's venue gate → booking → event order for arrangement cancellation and the shared order in `backend/src/modules/events/arrangement-locks.ts` (KAN-62, KAN-15). The checks on the original are unchanged and still run under its lock.

Reason: the previous order (booking → event → venue → original) deadlocked with a concurrent cancel of the same original, reproduced as PostgreSQL `40P01` for both a KAN-81 recovery original and a KAN-82 cancelled original (TC-12-13, `EX-12-13-A01`). Consequences: no AC, migration, API contract or estimate change; KAN-81 approval behaviour is preserved.

## 29 October 2026 — KAN-80 change-action and recipient interpretation

**Source:** Jira KAN-80-AC2/8; KAN-15-AC10 and the 27 October D6 implementation record above. KAN-80 describes change submission, requests for action and decisions, while the current KAN-15 workflow implements submission, approve/reject and withdrawal without a separate change-specific request-for-action transition. Submission currently directs the coordinator to review; decision notifications include an acknowledgement for the reviewing coordinator as well as the organiser, following KAN-80's actor-recipient wording. The existing D6 owner outcome remains.

**Question:** Is the submission notice the intended request for action, or is a distinct change-specific action and notification required? Who exactly should receive any such additional action? **To agree.** Do not infer a new workflow, acceptance criterion, team decision or completed KAN-80 acceptance from the current implementation. The source and KAN-15 owner's response are **Not recorded**. The 3 SP estimate remains unchanged; its fit after dependency integration is **To agree**.

## 29 October 2026 - PR #70 attendee-change notification scope

**Source:** PR #70 review and Arvin's answer in the development conversation. Arvin confirmed that changes to venue requirements and accessibility needs should trigger attendee notifications alongside purpose and event-time changes. The notice identifies the changed categories without exposing their internal values; current purpose and event time are shown on the recipient's own registration. This records Arvin's answer, not a reported team decision. The separate KAN-80 request-for-action interpretation remains To agree.

## 29 October 2026 — KAN-61 confirmation implementation decisions

**Source:** KAN-61 owner Kai Jie in the AI-assisted working session on 29 October 2026, choosing between proposed options. No customer clarification or team vote; the independent reviewer (Tristan) can raise disagreement on the PR.

| # | Decision | Reason |
| --- | --- | --- |
| D1 | A repeated confirmation of an already CONFIRMED event returns `200` with `changed: false` and the saved actor/time. It writes no status, history or notification. | KAN-61-AC5 (repeated transitions do not corrupt records); matches the KAN-17 withdrawal replay. |
| D2 | Confirmation is refused at or after the event's start time, judged by the database clock (`EVENT_ALREADY_STARTED`). Recorded as new criterion **KAN-61-AC106** with case TC-06-08. | Confirming an event that has begun has no planning value; the server clock avoids client time drift. **Jira KAN-61 still needs AC106 added by the owner.** |
| D3 | One shared, derived readiness check (`eventReadiness` in `backend/src/modules/events/confirmation.ts`) combines KAN-82 venue readiness (which counts KAN-81 outage recovery as outstanding), KAN-26 equipment readiness, explicit Not Required equipment and pending change requests. KAN-84-AC2 reuses it. | One definition of "ready" for confirmation and safety-review submission. |
| D4 | No migration. The status-history trigger records actor and time (AC4); migration 019 writes the KAN-80 confirmation notices on the status change. | Avoids a second writer for the same outcome. |
| D5 | Lock order: venue gate → bookings → event → equipment types → equipment requests, as in KAN-62 cancellation, before reading readiness and writing the status. | KAN-61-AC103: concurrent arrangement, outage or change-request writers wait, then the check sees their committed result. |
| D6 | "Required" equipment with no active lines is not ready; the coordinator must explicitly record Not Required. | KAN-61-AC3/AC102 require an explicit choice. |

Consequences: `POST /api/events/:id/confirm` and `GET /api/events/:id/confirmation` are added (API contract updated). The equipment module exports its existing readiness function unchanged.
