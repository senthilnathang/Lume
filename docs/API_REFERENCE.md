# Current API contract reference

Updated 2026-10-24. NestJS REST base: `/api/v2`; GraphQL: `/api/v2/graphql`.
This is a guide to implemented migration contracts, not a claim of complete parity.

| Area | REST contract |
|---|---|
| Authentication | `/auth/login`, `/auth/refresh`, `/auth/logout` |
| Modules | `/admin/modules` (deployed builtins are not runtime-installable packages) |
| Groups | `/admin/groups` |
| Menus | `/admin/settings/menus` |
| Record rules | `/admin/record-rules` (DELETE deactivates and audits) |
| Sequences | `/admin/settings/sequences`; POST `/:code/next` allocates |
| Automation definitions | `/automation/workflows`, `/automation/flows`, `/automation/approvals` |
| Approval requests | GET/POST `/automation/approval-requests`, GET `/:id`, POST `/:id/approve`, POST `/:id/reject` |
| Public website | `/website/public` |

Approval list parameters are `view=pending|history`, optional `before` cursor and
`limit` (1–100, default 25). Response data contains `items` and `nextCursor`.
A page may contain no visible items while still returning a cursor. Approve sends
`{stepIndex}`; reject sends `{stepIndex, reason}`. Actor and tenant come from the
session. History contains completed/rejected requests, not all earlier decisions
on requests still pending.

Sequence GraphQL fields now use real persistence. `nextSequenceValue(id)` is a
**mutation** and requires `base.sequences.manage`; a query of that name is rejected.
Create can specify `code`; legacy callers default it to `name`, which must meet code
validation. Unsupported custom formats fail explicitly. Counter edits cannot rewind.

Do not treat similarly named workflow-definition and durable-job APIs as equivalent.
Use DTOs/controllers and isolated integration tests to verify exact payload/response
contracts. [Inventories](frontend-contract-audit.json) identify candidates for review;
matching a route declaration alone is not compatibility certification.
