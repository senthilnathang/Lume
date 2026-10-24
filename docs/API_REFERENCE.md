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
| Global search | GET `/search?q=...&limit=20` (authenticated; signed tenant required) |
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

## Global search

Search returns `{success: true, data: {results, total, query}}`. Each result has
`id`, `title`, `description`, `model`, and `group`. Query length is at most 200;
limit is an integer from 1 to 50. `total` is the returned result count, not an
unfiltered count that could reveal inaccessible records. Exact titles rank first.

Entity records require `base.records.read`, tenant scope, private ownership (or
administrator role), record rules and field permissions. Field filtering precedes
matching. Documents require `documents.read`, record rules, and public visibility
or upload ownership. Deleted documents/records/entities are excluded. Documents
lack a tenant column; unrelated private uploads are not exposed even to admins.
Shared document grants and larger-scale indexed search remain outside this contract.
Migration 017 aligns the Prisma document soft-delete field with Drizzle.

## State-machine workflow validation

`POST /api/v2/automation/workflows/validate` accepts the same canonical fields as
workflow creation: `name`, `model`, `initialState`, `states`, and `transitions`.
It requires `base_automation.workflows.manage`. A valid definition returns
`{success: true, data: {errors: []}}` without writing to the database. Invalid
input returns HTTP 400 with validation details. The editor maps legacy field
names before sending and displays the returned errors.

State codes must be unique, nonempty and at most 50 characters; exactly one start
state and at least one end state are required. The initial state must match the
start state. Transition codes must be unique and reference existing source and
destination states. Graph size is limited to 500 states and 2000 transitions.

Active creates and updates enforce these structural rules. Updates lock and
validate the persisted definition merged with the patch in one transaction.
Incomplete drafts/inactive definitions can still be stored; activation fails until
the definition is valid. Validation does not execute actions, certify reachability,
or replace the still-pending state-machine execution migration.
