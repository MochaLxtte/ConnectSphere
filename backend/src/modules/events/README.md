# Event proposal workstream

Ernest owns event creation and draft saving; Kai Jie owns draft editing and submission. Irfan owns coordinator review and clarification; Tristan owns approval/rejection and organiser-facing status. These workstreams share this directory, with Arvin supporting database setup and cross-feature integration. Coordinate the field names in `types.ts` with the frontend event forms and database migrations before changing a contract.

This scaffold defines draft data and proposed statuses only. It does not save drafts, validate submissions, assign coordinators, enforce transitions, or expose event endpoints. Those remain sprint tasks. All editable proposal fields support `null` so an incomplete draft can be stored; define which fields are required for submission with the customer.

Add router/controller, runtime validation, service, and repository files when implementing the stories. TypeScript interfaces do not validate untrusted HTTP input. Use parameterized queries, server-derived organiser identity, ownership checks, and transactions where multiple related writes must succeed together. Preserve `false` and `0` as values when handling nullable fields.

The status list (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED`, `REJECTED`) is a proposal for team discussion, not an implemented workflow. Restrict initial stories to their agreed transitions and add a migration if the vocabulary changes. Future venue, equipment, attendance, and scheduling work should have their own modules as those stories enter a sprint.
