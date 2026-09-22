# 1. Final product backlog

**Status: current snapshot retained; refresh for final submission.** The [21 September Jira snapshot](jira-backlog-2026-09-21.csv) includes all 51 retained records: 33 stories, one corrective task and 17 subtasks. The consolidated product backlog covers all 20 release features, Sprint 1 and Sprint 2 commitments, and future criteria. Four archived items are recorded separately in the [scope register](../../requirements/product-backlog.md#archived-backlog-items).

Export the final backlog and story details from Jira into this folder. Include each story's key, title, user-story description, acceptance criteria, status, priority, estimate where used, sprint and relevant dependencies. Keep completed and pending items in the export. Separate infrastructure items such as KAN-24 from customer-facing stories.

The [product backlog](../../requirements/product-backlog.md), [requirements summary](../../requirements/README.md), [Sprint 1 backlog](../../scrum/sprint-01/sprint-backlog.md) and [Sprint 2 backlog](../../scrum/sprint-02/sprint-backlog.md) support the export but do not replace it. Instructors will not access the live Jira project.

| Export record | Value |
| --- | --- |
| Export date and time | 21 September 2026, 03:59 +08:00 |
| Jira project / filter and included scope | KAN project List, all retained work items including Done and subtasks; archived KAN-19/KAN-21/KAN-22/KAN-23 excluded |
| Export file(s) | [jira-backlog-2026-09-21.csv](jira-backlog-2026-09-21.csv) |
| Retained fields | Key, title, type, status, priority, assignee, estimate, sprint membership/history, complete description/criteria, parent, related links and created/updated times |
| Validation | 51 unique keys; 33 stories + one task + 17 subtasks; all 14 selected field values checked against the native export; CSV round-trip passed |
| Review | Technical consistency checks completed on 21 September; Product Owner review of future policy choices and estimates remains open |

This portable extract retains the complete Jira description text, including Jira's formatting syntax. Repeated Sprint and relationship columns are combined without dropping values. Account identifiers, watchers, attachments and comments are omitted from this scope document; it is not a full project backup. The four archived records retain their history in Jira and are described in the scope register.

The snapshot records the state after the 21 September refinement. It does not reconstruct the 6 September baseline, the 19 September closing board or daily burndown observations. Sprint 2 remains 43 points; the future backlog has seven older estimates totalling 26 points plus eight unestimated items. Refresh this snapshot before final submission and verify its scope again.

Before packaging, open the export locally and check that story descriptions, acceptance criteria and completed/pending statuses are readable without Jira access.
