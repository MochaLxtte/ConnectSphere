# CF-06; CF-19; CF-20 · traceability mappings

1 grouped mappings from the traceability register. Mapping numbers identify data rows in that register, starting at 1 after the header. A path listed for a group supports the scope described in that row. The case and execution pages provide the case-specific outcomes.

[Mapping index](../trace-index.md) · [Original traceability register](../../../requirements/traceability.csv)

## Mapping 154

| Field | Record |
| --- | --- |
| Feature | CF-06; CF-19; CF-20 · Cancellation and arrangement release |
| Story IDs | KAN-62; KAN-26; KAN-15 |
| Acceptance criterion IDs | KAN-62-AC1; KAN-62-AC5; KAN-62-AC101; KAN-62-AC104; KAN-62-AC2; KAN-62-AC3; KAN-62-AC4; KAN-62-AC102; KAN-62-AC103 |
| Implementation | [backend/src/modules/events/cancellation.ts](../../../../backend/src/modules/events/cancellation.ts); [backend/src/modules/events/arrangement-locks.ts](../../../../backend/src/modules/events/arrangement-locks.ts); [backend/src/modules/notifications/inbox.ts](../../../../backend/src/modules/notifications/inbox.ts); [frontend/src/features/events/components/EventCancellationPanel.vue](../../../../frontend/src/features/events/components/EventCancellationPanel.vue) |
| Test case / sprint group IDs | [TC-06-101](../cf-06.md#tc-06-101); [TC-06-102](../cf-06.md#tc-06-102); [TC-06-103](../cf-06.md#tc-06-103); [TC-06-104](../cf-20.md#tc-06-104); [TC-06-105](../cf-06.md#tc-06-105) |
| Automated test path | [backend/test/events/cancellation-safety.test.ts](../../../../backend/test/events/cancellation-safety.test.ts); [backend/test/events/KAN-62-63-arrangements.test.ts](../../../../backend/test/events/KAN-62-63-arrangements.test.ts); [database/tests/events/cancellation-equipment.integration.test.ts](../../../../database/tests/events/cancellation-equipment.integration.test.ts); [database/tests/events/cancellation-safety.integration.test.ts](../../../../database/tests/events/cancellation-safety.integration.test.ts); [backend/test/notifications/inbox.test.ts](../../../../backend/test/notifications/inbox.test.ts); [frontend/src/features/events/components/EventCancellationPanel.test.ts](../../../../frontend/src/features/events/components/EventCancellationPanel.test.ts); [tests/e2e/equipment-request-review.spec.ts](../../../../tests/e2e/equipment-request-review.spec.ts); [tests/e2e/review-access.spec.ts](../../../../tests/e2e/review-access.spec.ts) |
| Recorded status and scope | 28 October 2026: PR #63 repairs verified by AUTO-20261028-PR63-01. Automated checks do not establish integrated manual acceptance. Manual cases remain pending. |
