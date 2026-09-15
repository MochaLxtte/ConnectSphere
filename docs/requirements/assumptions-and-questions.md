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
outcome display. Team contract review, organiser-page integration and verification of the
complete workflow with hosted accounts remain pending.

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
here; organiser-page integration and the complete real-account workflow remain pending.

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

**Remaining integration:** Verify the coordinator workflow with mapped Supabase accounts
and assigned test requests, then implement the organiser-facing status/outcome page for KAN-16.

**Affected stories:** KAN-36, KAN-33 and the shared response used by KAN-16.

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
