# Safety review (KAN-84, CR-6)

The assigned coordinator submits an APPROVED or CONFIRMED event's current, ready arrangements to a Safety Officer as a numbered review round with three optional safety notes. The officer approves, rejects or requests venue/technical changes against that round; preparation can then be started on a confirmed event with current approval.

| File | Role |
| --- | --- |
| `service.ts` | `getEventSafety` (organiser/coordinator panel), `submitSafetyReview`, `listSafetyQueue`, `getSafetyReview`, `decideSafetyReview`, `startPreparation` |
| `router.ts` | Routes under `/api`: `/events/:id/safety`, `/events/:id/safety-reviews`, `/events/:id/preparation/start`, `/safety-reviews`, `/safety-reviews/:id`, `/safety-reviews/:id/decision` |

Rules: writes lock arrangements in the KAN-61/KAN-62 order (`lockEventArrangements`) and reuse KAN-61 `eventReadiness`, so KAN-81 outage recovery blocks submission and approval. Each round stores `safety_arrangement_fingerprint`; approval counts only while it matches the live arrangements, so changes from any story invalidate it without extra triggers. Decided rounds are immutable in the database. Notifications use the KAN-64 writer with `safetyReviewId`; Safety Officers see only safety-round notices. Decisions are in the [decision log](../../../../docs/requirements/assumptions-and-questions.md) (29 October 2026, KAN-84 D1–D8) and routes in the [API contract](../../../../docs/architecture/api-contract.md).

Tests: `backend/test/safety/`, `database/tests/safety/safety-reviews.integration.test.ts`, `frontend/src/features/events/components/SafetyReviewPanel.test.ts`, `frontend/src/features/safety/SafetyPages.test.ts`, `tests/e2e/safety-review.spec.ts`.

## PR #78 follow-up — 29 October 2026

Requires migrations 001–022. Migration 021 retains its original applied checksum; 022 adds forward-compatible remediation and fingerprint changes. Never reverse 021 or delete its ledger entry to apply this version. See [database setup](../../../../database/README.md) for upgrade and historical-baseline limits.

Request Changes captures immutable venue and technical fingerprints in `safety_review_change_baselines` within the decision transaction. Before resubmission, every requested area must differ from that decision-time baseline; notes alone or changes confined to an unrequested area are refused with `409 SAFETY_CHANGES_NOT_COMPLETED`. A missing baseline fails closed. `GET /events/:id/safety` exposes `unresolvedAreas`, and the coordinator panel lists the work still outstanding. The officer still decides whether the changed arrangements actually satisfy the requested safety corrections; a changed fingerprint alone does not approve them.

Officer venue context now includes opening/closing hours and setup/turnaround minutes. Existing preparation is blocked whenever the event is no longer CONFIRMED, its approval/round is stale, or live readiness fails, including conflicts that do not alter this event's fingerprint. Terminal events never expose equipment reservation controls through an old technical-remediation flag.

Regression evidence: `AUTO-20261029-PR78-REVIEW`; upgrade preservation is tested in `database/tests/safety/safety-upgrade.integration.test.ts`. Automated results do not establish connected manual acceptance.
