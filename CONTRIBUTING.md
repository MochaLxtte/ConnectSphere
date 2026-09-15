# Contributing

Read the [setup instructions](README.md), [release scope](docs/requirements/README.md), and [initial workstreams](docs/scrum/sprint-01/README.md) before starting. Several Sprint 1 features are implemented while other release work remains unfinished; consult the dated backlog and test evidence for current boundaries. Agree acceptance criteria and shared contracts before implementing a story.

## Working on a story

1. Select an agreed Jira item and create a short branch such as `feat/KAN-25-auth`. Record the actual owner and sprint commitment in the team's tracker.
2. Keep changes focused. Coordinate shared event types, lifecycle rules, schema changes and migration order with affected workstreams.
3. Validate inputs at the API boundary and enforce authorization on the server, including the user's relationship to the event. Use transactions where actions update related commitments.
4. Add meaningful tests at the relevant level, then update [traceability](docs/requirements/traceability.csv), architecture decisions and setup documentation where behavior changes.
5. Run the relevant checks below and open a pull request with the problem, resulting behavior, story/acceptance-criterion links, actual verification and remaining limitations. Ask a teammate to review before merging.

```sh
npm run check
npm run test:integration
npm run test:e2e
```

Use the README for database/browser prerequisites. Run integration tests when API or persistence behavior changes and browser tests when user workflows change. CI supplements review; passing checks do not complete a business story without its acceptance criteria and Definition of Done.

## Test organization

- Group backend feature tests under `backend/test/<module>/`, for example `backend/test/events/review-input.test.ts`. Keep shared application and configuration tests directly in `backend/test/`.
- Keep frontend `*.test.ts` files beside the components or functions they test.
- Put database integration tests in `database/tests/` with the `.integration.test.ts` suffix.
- Put browser tests in `tests/e2e/` with the `.spec.ts` suffix.
- Include Jira story IDs in business-feature suite names, for example `describe('KAN-36 review request input', ...)`.

Create module folders when they have tests to contain. The existing test configurations discover these locations; update relative imports when moving a test.

## Shared conventions

- Keep customer rules separate from provisional implementation decisions. Record new clarifications in [assumptions and questions](docs/requirements/assumptions-and-questions.md), then update affected stories and tests.
- Once a migration has been shared or applied by others, add a new migration instead of rewriting it. Coordinate schema changes and use fictional seed data.
- Commit configuration examples, not secrets or personal data. Keep dependencies, build outputs and local test artifacts out of source control.
- Include a brief explanation of substantive AI-assisted code in the PR and verify it. Every contributor must understand and be able to justify their changes.
- Record Scrum decisions, meeting notes and test results as work happens. Keep planned activities separate from completed work and attach supporting evidence.

## Pull request notes

Include the Jira item, acceptance criteria addressed, concrete behavior, checks actually run, and any unresolved customer assumptions. Mention schema/setup changes and dependent workstreams so the reviewer can reproduce the change. Keep unrelated refactors in separate PRs.
