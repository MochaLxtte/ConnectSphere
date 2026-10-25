# Release burndown

**Closure reconciliation — 26 October 2026:** the [current review summaries](README.md#acceptance-and-closure-inputs--26-october-2026) now record team-reported outcomes: Sprint 1 **24 accepted / 8 carried**, Sprint 2 **24 accepted / 19 carried**, Sprint 3 **63 accepted / 0 carried**. Collective review decisions were confirmed on 26 October for 19 September, 3 October and 17 October respectively. Sprint 3's historical build-level DoD evidence remains unresolved against later reproduced failures; its 63 SP is explicitly a team-reported outcome. These reported totals are not substituted for missing daily observations or a verified historical release baseline. The team will supply closing boards, review feedback and burndown charts/source data; no chart or ideal line is generated here.

Release 1 must be finished by Friday Week 12, **6 November 2026 at 23:59, Singapore time** (Week 12 dates supplied by Tristan on 16 October). This tracks **remaining release story points after each sprint** against an ideal line, so the team can answer "are we on track?" at every planning and review. Any one member updates it (write "Recorded by" in the row's evidence column) at every sprint close (after the review) and whenever release scope changes.

Rules (`AGENTS.md` §5): only stories that meet the Definition of Done by the sprint's last day burn points. Unfinished stories burn 0 in that sprint and carry their full points forward. Scope added by customer changes is recorded as a separate increase, never hidden inside remaining work.

## Release scope

| Field | Value |
| --- | --- |
| Release scope at start (all Release 1 stories, SP) | Not recorded; reconstruct only from the actual original scope/estimation record, not the present backlog total |
| Release end | Friday 6 November 2026 at 23:59, Singapore time; Week 12 is 2–8 November per The 16 October update |
| Planned sprints | Four; Sprint 3 is penultimate and Sprint 4 is final development, as reported by Tristan on 16 October |

## Current scope and administrative snapshot — 16 October 2026

Verified Jira: **42 parent items / 174 SP**, **14 Done / 48 SP**, **13 To Do / 63 SP in Sprint 3**, **15 To Do / 63 SP in Sprint 4**. No unestimated parent remains. These are inventory and planned allocation, not a reconstructed historical burndown or accepted velocity.

| Accounting event | Point effect | Treatment |
| --- | ---: | --- |
| 15 October estimated inventory | 93 | Excluded eight unestimated original parents and customer-change estimates; not the original release baseline |
| Estimate eight existing unestimated parents | +31 | Original-scope estimate completion, not newly requested customer functionality |
| KAN-15 explicit re-estimate, 2→5 | +3 | Recorded understanding/size revision |
| CR-1 buffers (KAN-77/78) | +10 | New customer scope, received 2 October, estimated/recorded 16 October |
| CR-5 Lead assignment (KAN-79) | +8 | Replacement requirement; preserve KAN-29 history; existing KAN-65 counted once |
| CR-2/3/4/6 (KAN-81/82/83/84) | +29 | Previously forecast; now actual Jira scope. Do not add the prior forecast again |
| KAN-64 8→5 plus KAN-80 3 | 0 | Split preserves all original scope and total points |
| Five carried stories / 19 SP | 0 release increase | Existing work moved between sprint allocations, never added to release scope again |
| **Current estimated release inventory** | **174** | **127 original-scope estimates + 47 new customer-change estimates** |

| Current allocation | Parent count | SP | Meaning |
| --- | ---: | ---: | --- |
| Jira Done inventory | 14 | 48 | Administrative state; actual acceptance/velocity separately evidenced |
| Sprint 3, Active 4–17 October | 13 | 63 | 29 original work including 19 carried + 34 customer-change work |
| Sprint 4, Future 18–31 October | 15 | 63 | 50 original work including split KAN-80 + 13 customer-change work |
| **Outstanding allocation** | **28** | **126** | **63 + 63; assumes no additional remaining work in Done inventory** |

Rebalance: S3 **97−47−3+16=63**; S4 **47+3+5+8=63**. Original estimates are unchanged except the explicit KAN-64 decomposition. CR receipt on **2 October** is confirmation recorded **16 October**; the team planned to finish Sprint 2 against its original 43-point scope and handle the new changes during Sprint 3 planning. See [change chronology and impact](../requirements/change-requests.md). No actual sprint-end velocity or historical daily observations were manufactured.

<details>
<summary>Earlier 16 October 97/29 allocation (superseded; preserved accounting snapshot)</summary>

## Current scope and administrative snapshot — 16 October 2026

**Record updated 16 October 2026.** Verified Jira inventory: **37 parent items / 145 estimated SP**. Of those, **14 parents / 48 SP are Jira Done** and **23 parents / 97 SP are To Do in active Sprint 3 (id 67)**. There are no unestimated parents in this current snapshot. Jira Done is an administrative state, not proof of historical acceptance or release-wide DoD compliance.

| Current allocation | SP | Meaning |
| --- | ---: | --- |
| Jira Done inventory | 48 | Current administrative state; historical acceptance/velocity is separately evidenced |
| Selected Sprint 3 | 97 | 60 existing future + 19 full-point carry-over + 18 new customer-change work; all To Do |
| Current estimated Jira parent scope | 145 | 48 + 97; not the original release baseline |
| Sprint 4 change forecast | 29 | CR-2 (8), CR-3 (5), CR-4 (8), CR-6 (8); not yet added as Jira parents in this snapshot |
| **Current release scope forecast** | **174** | **145 current Jira scope + 29 forecast new scope; not accepted delivery or a reconstructed baseline** |
| Planned outstanding allocation | 126 | 97 selected Sprint 3 + 29 Sprint 4 forecast; assumes no further work is found in the Jira Done inventory |

The previous 93-point inventory is retained below as the 15 October snapshot. The current Jira scope increase is **52 SP**: 31 newly estimated points across the eight existing unestimated items, KAN-15's explicit 2 → 5 revision (+3), and new KAN-77/KAN-78/KAN-79 (+18). Moving the five original stories into Sprint 3 does **not** add their 19 points to release scope again. The four remaining change estimates add 29 to the forecast only, giving 174; avoid counting this proposed increase again when those Jira stories are created.

Sprint 2 id 34 was administratively closed on **16 October at 02:06 Singapore time**. The five outstanding stories KAN-6 (3), KAN-34 (3), KAN-50 (5), KAN-12 (5) and KAN-52 (3) carry at full points for completion/re-verification and receive zero delivered credit in this current disposition. This is not evidence that all five failed a 3 October review, and the remaining 24 original Sprint 2 points are not automatically accepted. Historical Sprint 2 velocity remains **Not recorded**.


</details>

## Reported review outcomes — confirmation received 26 October 2026

| Sprint | Reported acceptance date | Accepted stories / SP | Carried stories / SP | Decision source / limitation |
| --- | --- | --- | --- | --- |
| 1 | 19 September | 7 / 24 | 3 / 8 | All six collectively agreed at review; confirmed 26 October. Reviewed build Not recorded. |
| 2 | 3 October | 7 / 24 | 5 / 19 | All six collectively agreed; original-scope carry-over is distinct from new customer changes. Reviewed build Not recorded. |
| 3 | 17 October | 13 / 63 | 0 / 0 | All six collectively agreed, reported 26 October. Later reproduced failures/fixes retained; historical build-level DoD compliance Not assessed. |

The following older per-sprint table is retained as its dated accounting snapshot. Use the reported outcomes above for the current review summary, with their limitations; do not treat them as source data for missing daily observations. Original release baseline, ideal line and independently reconciled remaining-release points remain Not recorded.

## Per-sprint data

| Sprint | Dates | Scope at sprint start (SP) | Scope added / removed (SP, reason) | Committed (SP) | Done by sprint end (SP) = velocity | Carried (SP) | Remaining release SP after sprint | Ideal remaining | Evidence |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 6–19 Sept 2026 | Not recorded | Not recorded | 32 | 24 (reported closure outcome) | 8 | Not recorded | Not recorded | [Recorded review](sprint-01/review.md); original Jira closing report Not recorded. Reconciled by Tristan, 15 October 2026. |
| 2 | 20 Sept–3 Oct 2026 | Not recorded | Not recorded | 43 | Not recorded | 19 selected later for current completion/re-verification; historical boundary total Not recorded | Not recorded | Not recorded | [Baseline and acceptance record](sprint-02/review.md); admin close 16 October 02:06 +08. Original 43 preserved; other 24 not automatically accepted. Recorded 16 October. |
| 3 | 4–17 Oct 2026 | Not recorded at 4 October; selection not finalised then | Initial 97 selection; rebalance −47 moved original work −3 notification scope +16 new outage/holds = −34 | 63 selected | Not assessed | Not assessed | Not assessed | Not assessed | [Current plan](sprint-03/planning.md); active id 67, 13 parents To Do at 16 October verification. |
| 4 | 18–31 Oct 2026 | Not assessed; future sprint | 47 moved original work +3 split notifications +13 CR-3/6; previous 29 forecast replaced by full 63 allocation | 63 planned | Not assessed | Not assessed | Not assessed | Not assessed | [Current plan](sprint-04/planning.md); future id 68, 15 parents To Do. Actual meeting/review not yet occurred. Recorded 16 October. |

**Earlier 16 October forecast note, schedule confirmation in chat; proposal status superseded by the selected-plan snapshot above:** six members intend two full days of focused work for Sprint 3 and greater availability for Sprint 4. Higher velocity is an expectation, not an observed result or permission to inflate estimates. The initial proposal in [Sprint 3 estimation](sprint-03/estimation-and-capacity.md) had not yet been entered as committed or Done. The planned 1–6 November preparation period does not change the 31 October Sprint 4 boundary.

**15 October reconciliation:** keep the planned 3 October Sprint 2 boundary. Several implementation and verification records are dated 4–10 October, and the current Jira administrative completion timestamps are not acceptance dates. Use the story-by-story [review baseline](sprint-02/review.md) to establish what actually met the applicable Definition of Done by the boundary. Later completion remains visible without being backdated. No agreed extension is recorded; an extension must not be invented to make later results fit the original window. This replaces the earlier ambiguous suggestion to choose a retrospective extension.

**15 October inventory snapshot:** the backlog had 93 estimated points and eight unestimated parent items, excluding estimates for CR-1–CR-6. The verified 16 October inventory above supersedes this snapshot for current scope. Neither is the original release baseline; do not derive historical accepted delivery or an ideal release line by treating them as one.

Average velocity: **Not recorded**. Sprint 1's reported outcome is 24 points; a multi-sprint average awaits Sprint 2's actual outcome. Reopened repair work, ordinary carry-over and added requirements must be identified separately so neither the release total nor historical delivery is counted twice.

## Chart

Export or draw the chart from the table above (remaining SP vs ideal line, scope increases marked), save it as `release-burndown.png` in this folder and register it in the latest sprint's evidence register.

Chart: **Not recorded**. The missing baseline and historical observations prevent a faithful chart; no synthetic daily or release burndown has been generated.

## Arvin evidence reconciliation — 25 October 2026

KAN-34 retains **3 SP** (original carry-over) and KAN-78 **8 SP** (existing CR-1), both already included in Sprint 3's **63 SP**. Their integration through PR #48/#54 and the latest automated CI evidence add **0 release scope points** and establish **no new Done/velocity credit**. Complete hosted acceptance and actual review/DoD disposition are not supplied; do not subtract 11 from remaining work or manufacture a 17 October completion. Sprint 1/2 history, current release inventory and all other story estimates remain unchanged. See [S3-E21](sprint-03/evidence/README.md#arvin-delivery-reconciliation--25-october-2026).

## 25 October 2026 — Arvin contribution reconciliation (Sprints 1–3)

This is a dated evidence backfill prepared with Codex on 25 October, not a new ceremony, Jira transition, test execution or acceptance decision. Historical entries, other members’ ownership and agreed estimates are preserved.

KAN-24 merged after the planned Sprint 1 end; Arvin’s KAN-51 fixes merged after the planned Sprint 2 end. This readback does not validate or increase the historical accepted totals. KAN-34/KAN-78 remain without a newly recorded hosted acceptance/Jira Done decision. Supporting contributions add no release scope or velocity.
