# Sprint 1 preparation

This is the initial division of work from the [shared planning conversation](https://chatgpt.com/share/6a9da8d8-0dcc-83ec-925e-d798f4974edb). The team still needs to confirm people, capacity, estimates, dates, acceptance criteria and its sprint commitment. `Dev 1`–`Dev 6` are workstream labels, not assigned identities.

| Workstream | Jira items              | Focus                                       | Coordinate with                                                  |
| ---------- | ----------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| Dev 1      | KAN-25                  | Authentication and authorization            | All workstreams need agreed identity and event-access contracts. |
| Dev 2      | KAN-31, KAN-4           | Event creation and saving drafts            | Dev 3 on draft shape and validation; Dev 6 on persistence.       |
| Dev 3      | KAN-34, KAN-6           | Editing drafts and submitting requests      | Dev 2 on event persistence; Dev 4 on review entry.               |
| Dev 4      | KAN-33, KAN-27          | Coordinator review and clarification        | Dev 1 on visibility; Dev 5 on decisions and transitions.         |
| Dev 5      | KAN-36, KAN-16          | Approval/rejection and event status         | Dev 3 and Dev 4 on legal transitions and returned requests.      |
| Dev 6      | KAN-24; KAN-30 optional | Database and integration; optional ERD task | Coordinate migration order and shared contracts across the team. |

Use **KAN-33** for review. The conversation contains an older inconsistent KAN-32 example; do not create a second review workstream from it. Verify story titles and current state in the team's actual Jira backlog before editing it.

## Suggested integration order

1. Agree event fields, draft/submission validation, actor identity, error responses and proposed lifecycle. Record unresolved policy in [customer questions](../../requirements/assumptions-and-questions.md).
2. Merge database and authentication foundations in small reviewed changes. Do not use a client-supplied role as authorization.
3. Integrate creation, draft editing and submission as one working path with ownership checks.
4. Integrate coordinator review, clarification and approval/rejection with one shared transition policy.
5. Demonstrate the agreed Sprint 1 workflow, record actual test results, and return incomplete work to the backlog.

Multiple workstreams touch the events domain. Agree changes to shared types and migrations before coding; keep PRs focused and integrate frequently. The existing scaffold only proves the application wiring and leaves business stories to these workstreams.

The 20-feature release scope remains in [requirements](../../requirements/README.md). This initial work allocation is not a commitment to complete all release features in Sprint 1.
