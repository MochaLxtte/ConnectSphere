# 7. Repository access and release identification

**Repository:** [ConnectSphere on GitHub](https://github.com/MochaLxtte/ConnectSphere).

This record identifies the frozen software separately from the later documentation/package snapshot. It also holds the instructor-access checks and formal release decision. Start with the [submission reading guide](../../README.md#submission-reading-order).

## Team input needed

WS6: complete the access and decision fields below using actual checks and decisions. The [shared checklist](../checklist.md#ws6-submission-integration) defines DOC-602–605; workstream ownership is in the [team home](../../README.md#ws6-submission-integration).

## Release identification

| Record | Supported value / field to fill |
| --- | --- |
| Frozen application merge | `fb6d8d93f721b114accc9857a05d62e859987e23` — PR #80, merged 1 November 2026, 23:58:58 SGT |
| Last application change in that repair | `55e2b61`, recorded at 1 November 23:55:42 SGT |
| Code-editing cutoff | 1 November 2026, 23:59 SGT; subsequent work is documentation/evidence only |
| Verification on frozen merge | [Main CI run 41323940034](https://github.com/MochaLxtte/ConnectSphere/actions/runs/41323940034), completed successfully 2 November, 00:08:53 SGT |
| Retained source comparison | 456 tested-source hashes matched the frozen candidate in the [merge readback](../../testing/test-evidence.md#ci-20261102-main--merge-readback-and-frozen-source-verification) |
| Documentation working branch | `docs/release-freeze-evidence` |
| Final submitted documentation commit / tag | Not recorded |
| Final inspected ZIP filename and package record | Not recorded |
| Frozen source comparison for final folder 6 | Not assessed — record actual comparison result and date |

Source: [retained merge/CI evidence](../../testing/test-evidence.md#ci-20261102-main--merge-readback-and-frozen-source-verification). This page does not claim a new live GitHub inspection. The final documentation commit will differ from the frozen application merge; compare runtime files separately instead of asserting the entire documentation-rich folder 6 equals the old commit.

## Instructor access

Both instructors must be able to access the repository. A sent invitation alone does not verify access. Do not place passwords or access tokens in this record.

| Instructor name | GitHub account | Access outcome / evidence | Checked by | Actual date |
| --- | --- | --- | --- | --- |
| Not recorded | Not recorded | Not assessed | Not recorded | Not recorded |
| Not recorded | Not recorded | Not assessed | Not recorded | Not recorded |

## Release decision

**Current recorded position:** the edit freeze is in effect, the repaired candidate is merged and exact-commit CI passed. Connected repaired-candidate checks passed. **Formal R24/TC-06-32 acceptance remains Not assessed.** PR #80 was merged by its author without a recorded independent GitHub approval. Preserve that fact; a later independent review must retain its own date.

| Decision field | Value to fill |
| --- | --- |
| Independent reviewer and actual review date | Not recorded |
| Reviewed frozen SHA and review evidence/link | Not recorded |
| Team release decision | Not assessed |
| Participants and method (meeting/chat/async review) | Not recorded |
| Actual decision date | Not recorded |
| Accepted limitations and follow-up, if any | Not recorded |
| Relevant Sprint 4 review / R24 evidence reference | Not recorded |

Once actual evidence is supplied, link it from the [Sprint 4 review](../../scrum/sprint-04/review.md) and record the supported release outcome through the [testing workflow](../../testing/README.md). Passing CI alone must not fill these fields. This is separate from historic sprint acceptance or its velocity.

## Package handover

Run the unchanged `npm run submission:prepare` from the repository root after reviewing the source documents. The generated `7/package-record.txt` records HEAD and whether uncommitted files were included. Inspect the [package checklist](../checklist.md#package-validation), then identify the final documentation snapshot and actual ZIP above. Do not edit generated copies or call an uncommitted draft the final submitted release.

The seven numbered folders must be at the ZIP root. Recordings are links; credentials and videos are excluded. Required source dotfiles, including `.github/workflows/ci.yml`, remain in folder 6. Commit, push and submission require the team's explicit instruction.

The [earlier access template](archive/2026-11-05/README.md) is retained as historical source.

<details>
<summary>Links to earlier sections (historical reference)</summary>

<a id="7-repository-and-instructor-access"></a>

- [7. Repository and instructor access](archive/2026-11-05/README.md#7-repository-and-instructor-access) — retained historical section.

</details>
