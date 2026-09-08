# Proposed definition of done

The team should adopt or revise this before committing sprint work. This is a proposal, not evidence of team agreement.

A story is done when:

- Its acceptance criteria and relevant customer clarifications are clear and satisfied, including access restrictions and important failure cases.
- The implementation is reviewed, integrated, and understandable to its owner; any AI-assisted code is checked and explainable.
- Appropriate tests pass, CI is green, and the story or acceptance criteria link to implementation and test evidence.
- Database changes use reviewed, ordered migrations, and relevant setup, API and architecture documentation is current. Changes to the shared Supabase development project are coordinated; hosted configuration evidence is distinct from isolated PostgreSQL test results.
- The integrated behavior can be demonstrated using reproducible data, with no secrets or real personal data committed.
- The board, review notes and remaining limitations reflect the actual outcome. Unfinished criteria return to the backlog.

A scaffold stub, UI placeholder, unexecuted test outline, or disabled test does not satisfy a business acceptance criterion.
