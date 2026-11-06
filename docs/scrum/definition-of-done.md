A story is done when:

- Its acceptance criteria and relevant customer clarifications are clear and satisfied, including access restrictions and important failure cases.
- The implementation is reviewed, integrated, and understandable to its owner; any AI-assisted code is checked and explainable.
- Appropriate tests pass, CI is green, and the story or acceptance criteria link to implementation and test evidence.
- Database changes use reviewed, ordered migrations, and relevant setup, API and architecture documentation is current. Changes to the shared Supabase development project are coordinated; shared development database configuration evidence is distinct from isolated PostgreSQL test results.
- The integrated behavior passes relevant acceptance scenarios on localhost using the running frontend, API, real authentication and agreed development database, with reproducible test data and no secrets or real personal data committed. Public application hosting or a deployed app/API URL is not required. Relevant background jobs and shared database configuration still work and have evidence.
- The board, review notes and remaining limitations reflect the actual outcome. Unfinished criteria return to the backlog.

A scaffold stub, UI placeholder, unexecuted test outline, or disabled test does not satisfy a business acceptance criterion.
