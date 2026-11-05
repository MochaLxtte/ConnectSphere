# 5. Slide deck: content brief and completion record

The deliverable is a **self-contained PDF** using the prescribed eLearn slide template. It will not be presented. The brief below supplies supported content and evidence references; it does not replace the course template or constitute a finished deck.

## Team input needed

WS6 owns assembly; see the [shared checklist](../checklist.md#ws6-submission-integration). Supply the actual template, adapt this content to its sections, export the PDF here and complete the review record. Other workstreams verify their own facts and evidence links.

| Deck field | Value to fill |
| --- | --- |
| Template filename/version and source | Not recorded |
| Final PDF filename | Not recorded |
| Prepared by / date | Not recorded |
| Reviewed by / date | Not recorded |
| Remaining qualifications accurately disclosed | Not assessed |

## Content to place in the course template

The rows describe content, not a mandatory slide count. Use the template's own order and space; split dense tables instead of shrinking text.

| Rubric area | Supported content to explain | Evidence to cite | Team contribution still needed |
| --- | --- | --- | --- |
| Scrum process and evidence | Four two-week sprint windows; original request workflow expanded through venue planning and customer changes into the final release. Show one actual inspect/adapt/follow-up chain. | [Scrum overview](../../scrum/README.md), sprint reviews/retrospectives and [recordings](../../scrum/final-sprint-recordings.md) | Actual retrospective feedback/action/follow-up and missing charts/board artifacts; Sprint 4 closure |
| Estimation and planning | Explain the story-point anchor, estimation discussion, capacity assumptions, original commitments, carry-over and the effect of new scope. Distinguish scope from accepted velocity. | [Release accounting](../../scrum/release-burndown.md), sprint estimation records | Retained voting/disagreement/capacity evidence and dated burndown inputs; do not invent a smooth burn curve |
| User stories and customer needs | Demonstrate a role/goal/benefit story with testable ACs. Changes received 2 October were considered in later planning; show an original criterion and its linked changed requirement. | [Requirements](../../requirements/README.md), [backlog](../../requirements/product-backlog.md), [change register](../../requirements/change-requests.md) | WS1 final reconciliation review |
| System design | Explain modular monolith, frontend/API/database boundaries, role/relationship checks, SQL transactions and concurrency protection. Use one important change to show why the design supports adaptation. | [Design report](../../architecture/README.md), C1/C2/C3 and selected sequence images | WS2 factual/visual review; select legible figures rather than placing every diagram on a slide |
| Working software | Follow organiser request → Lead allocation → coordinator review → venue/equipment arrangements → confirmation/safety → attendee/lifecycle outcomes. Include a relevant conflict or failure and its supported recovery. | [Full release walkthrough](../../testing/release-e2e-walkthrough.md), [testing report](../../testing/README.md) | Final release decision/qualification; do not call every step accepted merely because the procedure exists |
| Testing and traceability | Show one feature → story/AC → case → test file/manual steps → execution record. Summarise unit, real database integration, browser substitutes and connected E2E separately. Explain remaining coverage gaps. | [Testing report](../../testing/README.md), [traceability](../../requirements/traceability.csv) and retained run artifacts | WS3 review; percentages must retain their denominators and environment |
| Code quality and CI | Explain types/builds, coverage regression gates, isolated PostgreSQL tests and browser checks. Main CI passed on the recorded frozen merge; retain earlier failures and repairs as improvement evidence. | [Main CI record](../../testing/test-evidence.md#ci-20261102-main--merge-readback-and-frozen-source-verification), [CI configuration](../../../.github/workflows/ci.yml) | Independent review/acceptance qualification; green CI is not a team review |
| Accountability and explainability | Each member can explain their stories, design trade-offs, test boundaries and AI-assisted work. Use a source-to-evidence example that can be opened during Q&A. | [Master guide](../../../AGENTS.md), story/module records and evidence | Each member reviews their contribution and supplies an example they can explain; no invented endorsement |

## Deck editing rules

- Begin each section with a conclusion and its supporting evidence, not a chronology of every commit.
- Refer to numbered submission folders and named artifacts so the deck remains understandable outside GitHub/Jira.
- Use exact, qualified sprint outcomes from the reconciled records. A later repair or confirmation does not create an earlier execution/build record.
- Use readable diagrams and short captions; keep detailed API tables, hundreds of test rows and raw logs in the supporting folders.
- State remaining limitations once clearly. Do not imply independent GitHub approval, formal R24 acceptance or 100% coverage where the evidence does not establish it.
- Retain the required AI-assistance explanation and how work was checked. Avoid repeated personal recorder labels throughout the deck.

## Review and export

1. Fill the actual template with the reconciled content, then have each workstream reviewer verify their section.
2. Export a PDF in this folder and inspect every page for clipped text, tiny figures and broken links.
3. Record its filename, template version and review details above. Update DOC-601 in the shared checklist after inspection.

The [earlier deck record](archive/2026-11-05/README.md) remains available as history. No final slide PDF is claimed by this brief.

<details>
<summary>Links to earlier sections (historical reference)</summary>

<a id="5-summary-slide-deck"></a>

- [5. Summary slide deck](archive/2026-11-05/README.md#5-summary-slide-deck) — retained historical section.

</details>
