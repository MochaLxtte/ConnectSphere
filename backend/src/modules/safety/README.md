# Safety review (KAN-84, CR-6)

The assigned coordinator submits an APPROVED or CONFIRMED event's current, ready arrangements to a Safety Officer as a numbered review round with three optional safety notes. The officer approves, rejects or requests venue/technical changes against that round; preparation can then be started on a confirmed event with current approval.

| File | Role |
| --- | --- |
| `service.ts` | `getEventSafety` (organiser/coordinator panel), `submitSafetyReview`, `listSafetyQueue`, `getSafetyReview`, `decideSafetyReview`, `startPreparation` |
| `router.ts` | Routes under `/api`: `/events/:id/safety`, `/events/:id/safety-reviews`, `/events/:id/preparation/start`, `/safety-reviews`, `/safety-reviews/:id`, `/safety-reviews/:id/decision` |

Rules: writes lock arrangements in the KAN-61/KAN-62 order (`lockEventArrangements`) and reuse KAN-61 `eventReadiness`, so KAN-81 outage recovery blocks submission and approval. Each round stores `safety_arrangement_fingerprint` plus an immutable supplemental context baseline. Approval counts only while both match the live arrangements and no permanent invalidation exists. Migration 023 source-write triggers latch relevant changes to approved rounds; restoring the values cannot revive that approval. A fresh approved round is required. Pending rounds can still be restored before their first decision. Decided rounds are immutable in the database. Notifications use the KAN-64 writer with `safetyReviewId`; Safety Officers see only safety-round notices. Decisions are in the [decision log](../../../../docs/requirements/assumptions-and-questions.md) (29 October 2026, KAN-84 D1–D8) and routes in the [API contract](../../../../docs/architecture/api-contract.md).

Tests: `backend/test/safety/`, `database/tests/safety/safety-reviews.integration.test.ts`, `frontend/src/features/events/components/SafetyReviewPanel.test.ts`, `frontend/src/features/safety/SafetyPages.test.ts`, `tests/e2e/safety-review.spec.ts`.

## PR #78 follow-up — 29 October 2026

Requires migrations 001–023. Apply 023 before running this service; it adds the private invalidation/context tables. Shared application was verified on 1 November 2026; the [current rollout checkpoint](../../../../database/README.md#1-november-2026--shared-023-rollout-and-connected-retests) supersedes the earlier unapplied status. Migration 021 retains its original applied checksum; 022 adds forward-compatible remediation and fingerprint changes. Never reverse 021 or delete its ledger entry to apply this version. See [database setup](../../../../database/README.md) for upgrade and historical-baseline limits.

Request Changes captures immutable venue and technical fingerprints in `safety_review_change_baselines` within the decision transaction. Before resubmission, every requested area must differ from that decision-time baseline; notes alone or changes confined to an unrequested area are refused with `409 SAFETY_CHANGES_NOT_COMPLETED`. A missing baseline fails closed. `GET /events/:id/safety` exposes `unresolvedAreas`, and the coordinator panel lists the work still outstanding. The officer still decides whether the changed arrangements actually satisfy the requested safety corrections; a changed fingerprint alone does not approve them.

Officer venue context now includes opening/closing hours and setup/turnaround minutes. Existing preparation is blocked whenever the event is no longer CONFIRMED, its approval/round is stale, or live readiness fails, including conflicts that do not alter this event's fingerprint. Terminal events never expose equipment reservation controls through an old technical-remediation flag.

Regression evidence: `AUTO-20261029-PR78-REVIEW`; upgrade preservation is tested in `database/tests/safety/safety-upgrade.integration.test.ts`. Automated results do not establish connected manual acceptance.

## Officer screen response ownership — 30 October 2026

`SafetyReviewPage.vue` clears the previous review, decision, notes, selected areas and messages when the route, reviewer, role or session-loading state changes. It also clears the form while refreshing after a write. Each read and decision response belongs to the route and reviewer that started it; leaving that context, returning to the same route later or unmounting the page invalidates the response. An old success, error or 401 cannot change the new screen, clear its session, release its save controls or start a reload for another review.

On the current screen, decision controls stay unavailable during saving and the following read. A failed response can follow a committed write, so the page reads the current round before permitting another decision and never reports an unconfirmed write as saved. It reports a completed reload only after that read succeeds; if reconciliation fails, the form stays unavailable and the officer must reload the page. Current 401 responses clear the expired session. These are client-side corrections under KAN-84-AC4/AC10/AC12; the API, database decision guards and migration requirements are unchanged.

Controlled response-order checks are in `SafetyPages.test.ts` (isolated components) and `tests/e2e/safety-review.spec.ts` (browser/UI integration with substituted API responses). TC-06-442–444 retain those automated boundaries. The connected manual journey, TC-06-445, remains **Not executed**; use the [focused local E2E acceptance steps](../../../../docs/testing/README.md#30-october-2026--focused-local-e2e-acceptance-for-kan-80-kan-82-and-kan-84).

## 1 November 2026 — approval restoration regression

The original current-value-only interpretation is superseded for decided approvals by KAN-84-AC9. Event, booking, venue, equipment and outage changes record invalidation in the same transaction as the source write. Operational blocks use buffered booking intervals. No-op writes, ordinary event name/description edits and unrelated venue changes do not invalidate approval; source rollback also rolls back invalidation. The helper does not acquire reverse-order event/review locks from venue or stock writes. Preparation reads and writes require current readiness and a non-invalidated approved round.

Officer detail now includes venue `facilities` and equipment `technicalRequirements`, which the screen displays. The coordinator's confirmation and safety summaries refresh together after arrangement writes, explicit booking/equipment reloads and uncertain write outcomes; loading or failed reconciliation removes stale action controls. Same-event safety-note drafts survive summary refresh, while route/account changes discard stale responses.

Migration 023 cannot reconstruct changes restored before upgrade; existing supplemental context is captured at upgrade time. See the [database rollout](../../../../database/README.md#kan-84-persistent-invalidation--migration-023-1-november-2026) and `AUTO-20261101-RELEASE-REGRESSIONS`. The earlier connected failure remains in `MAN-20261101-02`; the later connected retest below records recovery without overwriting that failure.

## 1 November 2026 — connected rollout and recovery checkpoint

Shared migration 023 was applied at 23:26:05 Singapore time, with existing checksums validated and an empty repeat migration. Pre/post read-only checks preserved all 30 existing safety reviews and 10 preparation records, captured 30 supplemental baselines and one detectable invalidation, and verified RLS on both added tables. The matching local API was restarted.

In `MAN-20261101-03`, **TC-06-446 passed** against the real local frontend/API and shared development database: a dedicated venue's setup buffer changed 15 → 20 → 15 without an intervening safety read; the old approval remained invalidated after restoration. Original review/baseline rows and preparation values were retained until a fresh round 4 was approved and preparation explicitly resumed against it. **TC-06-447 passed** the related confirmation refresh check: a new pending venue request removed Ready, and cancelling it restored Ready while the event stayed APPROVED. See the [rollout checkpoint and linked snapshots](../../../../database/README.md#1-november-2026--shared-023-rollout-and-connected-retests). The venue was restored; new review, invalidation and preparation audit are retained as test history. These focused connected passes do not replace independent review or exact-commit CI.
