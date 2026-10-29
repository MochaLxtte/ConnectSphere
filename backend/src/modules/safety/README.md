# Safety review (KAN-84, CR-6)

The assigned coordinator submits an APPROVED or CONFIRMED event's current, ready arrangements to a Safety Officer as a numbered review round with three optional safety notes. The officer approves, rejects or requests venue/technical changes against that round; preparation can then be started on a confirmed event with current approval.

| File | Role |
| --- | --- |
| `service.ts` | `getEventSafety` (organiser/coordinator panel), `submitSafetyReview`, `listSafetyQueue`, `getSafetyReview`, `decideSafetyReview`, `startPreparation` |
| `router.ts` | Routes under `/api`: `/events/:id/safety`, `/events/:id/safety-reviews`, `/events/:id/preparation/start`, `/safety-reviews`, `/safety-reviews/:id`, `/safety-reviews/:id/decision` |

Rules: writes lock arrangements in the KAN-61/KAN-62 order (`lockEventArrangements`) and reuse KAN-61 `eventReadiness`, so KAN-81 outage recovery blocks submission and approval. Each round stores `safety_arrangement_fingerprint`; approval counts only while it matches the live arrangements, so changes from any story invalidate it without extra triggers. Decided rounds are immutable in the database. Notifications use the KAN-64 writer with `safetyReviewId`; Safety Officers see only safety-round notices. Decisions are in the [decision log](../../../../docs/requirements/assumptions-and-questions.md) (29 October 2026, KAN-84 D1–D8) and routes in the [API contract](../../../../docs/architecture/api-contract.md).

Tests: `backend/test/safety/`, `database/tests/safety/safety-reviews.integration.test.ts`, `frontend/src/features/events/components/SafetyReviewPanel.test.ts`, `frontend/src/features/safety/SafetyPages.test.ts`, `tests/e2e/safety-review.spec.ts`.
