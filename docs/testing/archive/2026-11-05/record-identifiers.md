# Record identifiers used in the historical testing guide

This is the ID table from §6.2 of the repository’s `AGENTS.md` at commit `092e51aa869a56ee8c5f3db85c30ef23b7faa3ae`. It is included here so the historical guide’s reference works inside the submission ZIP.

## 6.2 IDs

| ID | Meaning | Lives in |
| --- | --- | --- |
| `KAN-xx`, `KAN-xx-ACn` | Jira story, acceptance criterion | Jira, `sprint-backlog.md` |
| `CF-01`…`CF-20` | Core feature from the project instructions | `docs/requirements/README.md`, traceability |
| `CR-n` | Customer change request | `change-requests.md` |
| `TC-xx-nn` | Reusable test specification | `test-cases.csv` |
| `EX-...` | Unique execution-register row (including explicit Not executed placeholders) | `test-executions.csv` |
| `S#-Txx` | Sprint acceptance test (e.g. `S3-T04`) | `sprint-backlog.md` |
| `AUTO-YYYYMMDD-NN`, `MAN-YYYYMMDD-NN` | Automated / manual test run; preserve existing historical ID formats | `test-evidence.md`, linked from `test-executions.csv` where case evidence exists |
| `S#-Exx` | Registered evidence artifact | `sprint-0N/evidence/README.md` |
