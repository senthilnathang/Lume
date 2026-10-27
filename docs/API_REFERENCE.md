# Current API contract reference

Updated 2026-10-27. NestJS REST base: `/api/v2`; GraphQL: `/api/v2/graphql`.
This is a guide to implemented migration contracts, not a claim of complete parity.

Production runtime discovery uses deployment-owned `MODULE_ENTRYPOINTS`, a JSON
array of `{ "specifier": "./dist/extensions/acme.module.js", "export": "AcmeModule" }`.
Specifiers are precompiled CommonJS `.js`/`.cjs` files or already-installed packages;
relative paths and package resolution use the API working directory. `export`
defaults to `default` (or a direct `module.exports` definition). No downloads,
filesystem scanning or database-selected executable paths occur. At most 64
entries are accepted; all paths resolve before import, and dependencies/collisions
are validated before lifecycle hooks. Import-time code still runs as trusted
application code and cannot be rolled back. Runtime service-provider declarations
require Nest deployment registration rather than being silently ignored.

`MODULES_ENABLED=false` disables runtime initialization. Examples require
`LOAD_EXAMPLE_MODULES=true` independently of production entries. Startup loads
the dependency-ordered batch using `onLoad`, not installation/database hooks;
apply reviewed migrations beforehand. `AUTO_MIGRATE_MODULES=true` is rejected
when module loading is enabled. Import, validation and load errors fail startup;
durable workers/schedulers start at application bootstrap after module initialization.
The registry/catalog reflects these loaded definitions after a process restart.

Tenant registry: `tenants`, `tenant`, `createTenant`, `updateTenant` and
`deleteTenant` use persisted `tenant_registry` rows (migration 022 required).
Management requires `base.tenants.manage` and an active platform administrator.
IDs are canonical positive company-ID strings within the database Int range;
domains are normalized lowercase hostnames and unique. Configuration updates
replace the complete JSON object (maximum 60,000 bytes). Missing detail is null;
missing updates/deletes fail. Delete archives the row, retains its ID/domain,
sets it inactive and preserves all company data. Archived entries remain visible
to administrators and cannot be reactivated or reused through these APIs.

JWT authentication checks the effective company (including administrator header
overrides) on each protected REST/GraphQL request. Registered inactive/archived
companies are denied. Use a platform administrator without a company claim or
override for registry administration. Unregistered legacy companies retain current
behavior pending ownership reconciliation. User metadata remains the assignment
source; registration does not grant membership, provision schemas, route domains
or purge records. Read-only preflight reports unregistered observed IDs.

Tenant status is also checked before queued workflow/event/delivery dispatch,
before delivery-provider invocation, at workflow start and before each nested
workflow step. Denied jobs retain the existing bounded retry policy and eventually
fail if the tenant stays unavailable; reactivation permits a subsequent eligible
retry. A due schedule whose tenant is unavailable is made inactive for explicit
review/reactivation. Already-open flow, page and audit subscriptions recheck tenant
status before each matching event and suppress events while inactive/archived;
the connection stays open and reactivation permits future events. These are
boundary checks, not cancellation or rollback of an action already in progress.
Domain provisioning, multi-company membership and event publisher completeness
remain separate migration requirements.

Single-company membership management: `userTenantMembership(userId: Int!)` reads
the authoritative metadata assignment; `setUserTenant(userId: Int!, tenantId:
String)` sets it to an active registered company. Supply explicit `null` to clear;
omitting `tenantId` fails. Both require platform administration and
`base.tenants.manage`. The response contains `userId`, nullable numeric `companyId`
and `managed`. Assignment and active-session revocation commit in one transaction,
preserving other metadata. Malformed metadata must be repaired before mutation.

For managed users, requests with an old company claim fail and a fresh login
issues the current assignment. Explicit unassignment remains managed, so old
company-bearing tokens cannot regain access. Open subscriptions recheck current
user/role and assignment; member jobs/schedules and subsequent workflow steps
reject an obsolete company. Platform administrators retain their existing
cross-company authority for background work. Users without a `company_id` metadata
key retain legacy compatibility until reconciliation. This implements a single
company assignment, not a multi-company membership directory or invitation system.

Module lifecycle: installing through REST or GraphQL checks the transitive
dependency graph before running hooks. A pending dependency requiring a database
installation hook blocks API installation, just as a direct hook does. Deployment
callers supplying a database context install dependencies before their parent.
Concurrent installs share one operation; competing load/uninstall calls fail
while the corresponding hook is in progress. Dependencies of in-flight modules
cannot be uninstalled. Locks are released after hook failures; completed dependency
installs and arbitrary hook side effects are not automatically rolled back.
Configurable runtime modules declare `configuration.defaults`, a `validate(config)`
function that throws on invalid input, and `hooks.onLoad(config)` to consume it.
Migration 023 stores the desired JSON configuration. Module names must be canonical
lowercase identifiers; configuration is a complete object replacement up to 60,000
UTF-8 bytes. `updateModuleConfig(input)` requires `moduleName`, `config` and
`expectedRevision` (0 for defaults/no saved row). REST administrators can use
`PUT /admin/modules/:name/config` with `{config, expectedRevision}`. Stale revisions
fail with conflict, including concurrent first writes. Saving does not apply config.

Catalog entries expose desired `config`/`configRevision`, process-local
`appliedConfigRevision`, and `configPending`. Load/restart validates and consumes
the saved revision. A loaded module with `hooks.onReload(config)` can apply a
snapshot through GraphQL `reloadModule(name)` or REST `POST /admin/modules/:name/reload`.
The applied revision advances only after hook success. Concurrent reloads share one
operation and conflicting lifecycle operations fail. A newer save during reload
remains pending. Reload hooks must leave prior runtime state intact on failure;
the framework cannot roll back arbitrary hook side effects. Builtins remain
deployment-managed; modules without this contract fail explicitly. Reload applies
configuration in the receiving process only; it does not reload source code or
broadcast to other instances. Uninstall retains desired configuration for later load.

Framework audit history: GraphQL `auditLogs`, `auditLog(id)` and
`recordAuditHistory(entity, recordId)` read the same persisted rows as REST audit
list/detail. Reads require `audit.read` and an active platform administrator
(`admin` or `super_admin`); REST cleanup also requires `audit.delete`. Existing
rows have no tenant ownership, so delegated permissions cannot expose global
history. List filters support entity, action, user and inclusive date bounds;
sorting is newest timestamp then descending ID. Record history returns the latest
100 matches. Missing GraphQL details return null. Output `recordId` is now a
nullable String, preserving arbitrary stored identifiers; the history input
remains a positive Int. Snapshot changes contain parsed old/new values with raw
legacy text preserved when parsing fails. Historical email/role are null because
they were not stored. New audit writes serialize snapshots and record timestamps.
This implements stored queries; durable live audit event delivery remains open.

Framework module catalog: GraphQL `installedModules` / `installedModule(name)` now
report the instantiated builtins and registered runtime definitions, matching the
REST catalog's live process state. `status` is `loaded` or `pending`; `managedBy`
is `deployment` or `runtime`; `actions` lists supported lifecycle operations.
`installedAt` is nullable because deployment/registration does not supply a durable
installation timestamp. Legacy database catalog rows are not proof of loaded code.

GraphQL install/uninstall require `base.modules.manage` and invoke the runtime
loader. Builtins cannot be changed through runtime endpoints. Missing definitions,
dependency failures and lifecycle failures return errors; operations needing
database hooks require a reviewed deployment operation and are not advertised as
available actions. These runtime operations do not persist installation across
process restarts. Desired configuration persists independently for opt-in modules.
REST reload requires an already-loaded module with an explicit configuration reload
hook; it cannot bypass installation or database lifecycle hooks.

The global throttler handles REST, GraphQL HTTP and subscription request contexts;
GraphQL requests no longer fail while the HTTP guard tries to read an absent IP.

| Area | REST contract |
|---|---|
| Authentication | `/auth/login`, `/auth/refresh`, `/auth/logout` |
| Modules | `/admin/modules` (deployed builtins are not runtime-installable packages) |
| Groups | `/admin/groups` |
| Menus | `/admin/settings/menus` |
| Record rules | `/admin/record-rules` (DELETE deactivates and audits) |
| Sequences | `/admin/settings/sequences`; POST `/:code/next` allocates |
| Automation definitions | `/automation/workflows`, `/automation/flows`, `/automation/approvals` |
| Scheduled registered workflows | `/automation/scheduled` (migration 019, actor/tenant scoped) |
| Manual workflow execution | POST `/automation/workflows/:workflowId/run/:recordId`; GET `/:workflowId/executions/:id`; POST `/:workflowId/executions/:id/transition` under `/automation/workflows` |
| Approval requests | GET/POST `/automation/approval-requests`, GET `/:id`, POST `/:id/approve`, POST `/:id/reject` |
| Global search | GET `/search?q=...&limit=20` (authenticated; signed tenant required) |
| Public website | `/website/public` |

Approval list parameters are `view=pending|history`, optional `before` cursor and
`limit` (1–100, default 25). Response data contains `items` and `nextCursor`.
A page may contain no visible items while still returning a cursor. Approve sends
`{stepIndex}`; reject sends `{stepIndex, reason}`. Actor and tenant come from the
session. History contains completed/rejected requests, not all earlier decisions
on requests still pending.

Approval creation, reads and decisions enforce current private-record ownership:
only the record creator or an active `admin`/`super_admin` role can access a private
record. Tenant scope, participant/step assignment and record rules still apply;
administrator visibility does not grant approval of another actor's step. Pending
and history lists omit inaccessible requests while advancing the scan cursor.
New approval notifications apply the same private-record restriction to recipients,
including completion/rejection messages sent to the initiator. Existing generic
notifications are not retroactively deleted when visibility changes; opening the
request rechecks access. Automatic starts use the initiating actor's current access.

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
or certify support for advanced execution behavior.

## Manual state-machine executions

All paths below are relative to `/api/v2/automation/workflows` (the
`/api/v2/base_automation/workflows` alias also works).

| Method / path | Input | Permission / result |
|---|---|---|
| POST `/:workflowId/run/:recordId` | Empty JSON object | `base_automation.workflows.manage`; 201 with execution |
| GET `/:workflowId/executions/:id` | None | `base_automation.workflows`; execution, history and safe snapshot projection |
| POST `/:workflowId/executions/:id/transition` | `{ "transitionCode": "review", "version": 0 }` | Management permission; 200 with updated execution |
| POST `/:workflowId/executions/:id/approval` | `{ "transitionCode": "review", "version": 0 }` | Workflow management and `base_automation.approvals`; 201 with `{requestId, status}` |

Responses wrap data in `{success: true, data: ...}`. IDs are positive integers.
An active, structurally valid definition and a matching dynamic entity record are
required. The actor and company come from authenticated context. Reads require
record read access; starts/transitions also require record write access. Tenant,
private ownership and record rules are rechecked on every operation.

Executions retain an immutable definition snapshot. State codes, destination,
actor, history version and completion time are server-derived. Each transition
locks the execution, checks the submitted version and writes state/history in one
transaction. Stale, repeated or concurrent decisions return 409. Arbitrary state,
actor or record data in the request is rejected. Record data itself is not changed.
Starting again intentionally creates a separate execution.

This runtime supports manual transitions only. Group-restricted, timed,
webhook, action and unknown transition configurations return 409 and
appear disabled with a reason. Decision, SLA, state-action and unknown state
configurations prevent starting. Existing snapshots continue to work after the
source definition changes or is deleted. Legacy execution history is not imported.

Approval gates require migration 020 and a transition with `requires_approval: true`
and a positive `approval_chain_id`. Requesting approval creates an ordinary approval
request and binds it to the exact execution, version and transition in one transaction
with its notifications. Concurrent/repeated requests reuse the pending or completed
request. A rejected request may be retried; previous attempts remain recorded.
An unrelated pending request for the same chain/record conflicts rather than being
adopted. Clients cannot supply or substitute an approval request ID.

Complete approval steps through the approval inbox, then refresh and submit the
transition. Completion does not automatically advance the state. Current record
access, field conditions, active matching chain and execution version are checked
again on submission. Old approvals cannot authorize a different execution or a
later visit to the same state. History records `approvalRequestId` alongside the
transition actor. Detail returns only the bound request's ID/status and
`canRequestApproval`; approval steps/reasons retain their existing participant
access rules. Chain steps and outcome callbacks are snapshotted when approval is
requested; configured callbacks retain their existing durable-job behavior.

Transitions may include a data-only `condition`, for example
`{"name":{"$in":["Ready","Approved"]},"amount":{"$gte":100}}`.
All fields and operators are combined with AND. Scalar equality and `$eq`, `$ne`,
`$in`, `$nin`, `$gt`, `$gte`, `$lt`, `$lte` are supported; ordering requires finite
numbers and comparisons do not coerce types. Missing/non-scalar record values never
match. Omit the condition or use `{}` for an unconditional transition. Conditions
allow at most 100 fields and 1,000 values per membership array; malformed conditions
fail definition validation. Conditions use the execution's saved definition and
current locked record data. Unknown/deleted, unreadable or masked fields block the
transition without revealing predicate results. Preview exposes only a generic
`unavailableReason`; submission rechecks access and conditions before writing state
and history. The workflow form's transition dialog supports adding, editing and
clearing JSON conditions, with inline JSON/object validation and a Conditional tag
in the transition list. Active-definition saves validate predicate operators on the
server; draft definitions are checked before activation or execution.
## Business rules (migration update, 2026-10-26)

Authenticated `GET/POST /api/v2/automation/rules` and
`GET/PUT/DELETE /api/v2/automation/rules/:id` use `base_automation.rules`
for reads and `base_automation.rules.manage` for writes. Definitions are global
automation configuration; execution enforces the triggering actor's tenant and
record permissions. The `base_automation` route alias remains supported.

Create requires `name`, `model`, `field`, and `action`. Optional `condition`
defaults to `{}`, `priority` to `10`, and `status` to `active`. A field update uses
`action: { "type": "set_field", "fieldName": "status", "value": "review" }`;
`fieldName` must match `field`. Conditions are a field map with scalar equality or
`$eq/$ne/$gt/$gte/$lt/$lte/$in/$nin/$contains` operators. All conditions must match.
Rules run on both record creation and update; no per-rule trigger selector exists.

Updates preserve omitted fields and cannot change `model`, `field` or identity.
Activate/deactivate with `PUT { "status": "active" | "inactive" }` rather than a
toggle endpoint. Malformed definitions return 400; missing IDs return 404. Writes
validate the merged definition under a row lock. Invalid legacy rules can still
be disabled with a status-only update. JSON values preserve false, zero and null.

The routed editor supports field updates and exposes JSON conditions and values.
Existing notification/webhook actions are not converted into field updates by the
editor; external providers remain disabled. This migration does not complete M05.

## Manual flows

Paths are relative to `/api/v2/automation/flows`. Definition CRUD remains the
existing flow contract. Activating a definition validates its saved graph; drafts
may be incomplete. Supported graphs have `trigger: "manual"`, one `trigger_manual`
node, one `end_success` node and an acyclic graph defined by edges.
Cycles, disconnected nodes and unsupported node types are rejected. Limits are
100 nodes, 198 edges, 10 nested conditions and 1000 expanded compilation steps.

`condition_if` accepts `{ "condition": { "name": "Reviewed" } }`. It requires
exactly two outgoing edges, labelled `"branch": "then"` and `"branch": "else"`.
Other edges have no branch label; paths may merge. Predicates use the same bounded
field-map AND syntax as state transition conditions: scalar equality or `$eq`,
`$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`. Ordered comparisons require
numbers; missing values never match. Fields must exist and be readable and unmasked.
Each branch decision commits a boolean receipt before either path executes.
Retries retain that decision even after record changes, while rechecking current
actor, record and field access. Shared suffixes compile into each branch but run
only on the selected path; compilation rejects excessive expansion.

Each node has a unique `id`, `type`, optional `name`/`position`, and object `config`.
Start/end configs are empty. `action_set_field` accepts `{ "fieldName": "name",
"value": "Updated" }`; `action_update_record` accepts
`{ "data": { "name": "Reviewed", "enabled": false, "count": 0 } }` and updates
1–100 named fields on the source record in one transaction. Alternate entity or
record IDs are not accepted. Every field must be writable and the merged record
must pass validation; a failed field or receipt write rolls back the whole action.
Values retain JSON types and support existing `${fieldName}` expressions against
the actor's readable data. `action_create_record` accepts `{ "entity": "entity_name",
"data": { "name": "${name}" } }`. Edges use `source`/`target` node IDs and optional
`id`. Graph order follows edges, not the order of the node array.

`action_send_notification` accepts `{ "recipientId": 2, "title": "Review",
"message": "${name}" }`. The recipient is a positive integer user ID; message is
required (1–10,000 characters), title is optional (1–255 characters). Delivery is
in-app only; channel, tenant and other configuration overrides are rejected.
The sender and recipient must be active with record-read permission and access
to the source record. Private records require ownership or an administrator role.
Whole-value `${fieldName}` references resolve from fields readable by both actors,
with masking applied. Notification creation and its receipt commit together, so a
later action's retry does not create another inbox entry. Existing generic inbox
entries are retained after access changes. Queued metadata-workflow email/push
notifications recheck sender/recipient visibility and field access before sending;
this flow node does not enable external providers or expose those channels.

| Endpoint | Contract |
| --- | --- |
| POST `/:id/run` | `{ "recordId": 123, "requestId": "UUID-v4" }`; requires `base_automation.flows.manage` |
| GET `/:id/runs` | Latest 25 candidate jobs, filtered by current record access; requires `base_automation.flows` |
| GET `/:id/runs/:jobId` | Own run in current tenant, with current record-read access; same read permission |

Repeated requests with the same actor, tenant, flow and UUID return the same job;
reusing that UUID for another record returns 409. Jobs pin the saved graph. Editing
the graph does not change queued work; deletion/deactivation or revoked management
permission prevents execution. Worker enablement is reported in responses; queuing
alone does not enable the worker. History exposes status/attempts and generic error
messages, not payloads or raw record results.

Actions enforce actor, tenant, record and field permissions. Each mutation and its
durable receipt commit together. A retry skips previously committed mutations;
earlier actions remain committed if a later action fails. Field updates reload the
record for subsequent action expressions. This is not an all-flow transaction.
Queueing (including duplicate request IDs), run detail and run lists require an
active actor and role with record-read permission and current source-record
access. Private sources are available only to their creator or an administrator.
Inaccessible runs are omitted from lists. The worker repeats these checks before
each manual-flow attempt, so access revoked after queueing or between retries
prevents further execution; earlier committed effects remain.
The routed Designer / Run panel edits graph JSON, activates saved definitions,
queues a selected record and refreshes run history. Advanced triggers, loops,
timers and provider actions remain open.
This slice uses existing job/receipt tables and needs no additional migration.

## Scheduled workflows (migration 019)

`/api/v2/automation/scheduled` now manages canonical workflow schedules, separate
from legacy code schedules. Reads require `base_automation.scheduled`; writes and
`GET /scheduled/workflows` require `base_automation.scheduled.manage`. Each actor
sees only their schedules in the authenticated tenant context (including authorized
administrator overrides). The workflow list supplies
registered executable metadata workflows, not state-machine or flow-designer IDs.

POST accepts `name`, `workflowName`, positive `recordId`, exactly one of
`cronExpression` (five fields, UTC) or `intervalMinutes` (1–525600), and optional
`status` (`inactive` by default). Actor, tenant and entity are derived server-side.
PUT `/:id` requires the observed `version`; identity fields cannot be edited.
Set the unused timing field to null when changing cadence type. DELETE `/:id`
removes the schedule. List data is `{items, schedulerEnabled}` (latest 200), with
last job ID/status/attempt count. `lastQueuedAt` is dispatch time, not completion.

Dispatch locks the due row and atomically inserts a durable job with a pinned
workflow definition while advancing the next due time. Concurrent dispatchers
cannot enqueue the same occurrence. Downtime coalesces missed occurrences into
one job and advances from the dispatch time. Invalid or revoked targets deactivate
the schedule. The worker rechecks the actor, record, permission and schedule version;
editing, disabling or deleting prevents older queued versions from starting.
Already-running work may finish. Failed jobs use the existing bounded retry policy.

`AUTOMATION_SCHEDULER_ENABLED=true` and an enabled durable worker are required for
polling. The default remains disabled. Apply migration 019 before using this API.
Legacy code schedules remain untouched for M12 import; arbitrary code, bulk-record
schedules and flow-designer execution are not implemented by this contract.
