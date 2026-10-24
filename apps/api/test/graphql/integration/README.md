# GraphQL integration tests

Run from `apps/api`:

```sh
npm ci
npm run db:generate
npm test -- --runInBand test/graphql/integration
```

The harness runs real NestJS, Apollo, Passport, Prisma and MySQL, including HTTP
requests and WebSocket subscriptions. It reads `GRAPHQL_TEST_DATABASE_URL`, falling
back to `DATABASE_URL` from the environment or `.env`. Use a local test MySQL
server with an account permitted to create and drop databases.

Each suite creates a uniquely named `lume_gql_test_<uuid>` database, pushes the
Prisma schema into it, seeds fixtures, and drops that database on completion.
It does not reset or migrate the database named in the connection URL. An abruptly
terminated process can leave its disposable database behind.

The tests cover authentication, tenant boundaries, RBAC, field permissions,
entity and record persistence, atomic bulk deletion, pagination, SQL batching,
query complexity, slow-query logging and subscription delivery. They do not
verify every framework resolver; some other GraphQL operations remain stubs.

`field-permissions.integration.spec.ts` also verifies permission lookup, creation,
updates, removal, masking preservation, management authorization and immediate
enforcement on record reads and writes. Missing or deleted fields and invalid
settings must leave stored permissions unchanged.

`roles.integration.spec.ts` covers role CRUD, name validation and conflicts,
reserved/system-role protections, rejection of assigned-role deletion, relation
cleanup, transactional audit writes, relation batching and cache invalidation
between serial mutation fields. It also injects an audit storage failure to
verify that role deletion and relation cleanup roll back together.

`permissions.integration.spec.ts` verifies the read-only permission catalog:
stored metadata mapping, category filtering before pagination, stable ordering,
page limits, active-only listing and lookup, invalid input, and authorization
through a persisted role-permission assignment. Inactive and null-active rows
are excluded from this catalog.

`record-rules.integration.spec.ts` covers persisted rule CRUD, model validation,
domain operators, actor audit logs, permission checks, pagination, deterministic
ordering and rollback of invalid or failed reorder batches. Deletion deactivates
the row; management queries retain inactive rules. The `delete` action alias is
stored as `unlink`. Domains use JSON objects as expected by SecurityService, not
arrays of condition objects. Groups/users accept JSON arrays of positive IDs.

Legacy record rules may have null timestamps, activity flags and sequence values.
Their GraphQL fields are nullable, and RecordRule implements Node rather than the
Auditable interface's non-null timestamp contract. New rules receive timestamps.
Rules saved through GraphQL are also tested through SecurityService's evaluator.
Global rules apply to everyone. Scoped rules apply when the trusted user ID or
any trusted role ID matches; every applicable rule must pass. Callers supply
`{ userId, roleId }` or `{ userId, roleIds }` from authenticated server context,
never request-body selectors. Missing identity for scoped rules, malformed
persisted policy data and missing record fields deny access. Multiple domains
are returned as `{ $and: [...] }` so constraints on the same field are preserved.
No applicable rules return `{}`. Disabling a rule takes effect on the next call.

`record-access.integration.spec.ts` verifies enforcement in the shared RecordService
used by DataGrid GraphQL and EntityRecordsController REST CRUD. Reads filter before
pagination and totals; create checks computed data; update checks both old and new
data; delete checks the stored row. Bulk deletion validates all rows in one
transaction before writing. Conditional writes reject changes to record data,
entity or tenant after authorization. Identity is resolved from stored users;
REST no longer defaults missing identities or tenants to 1.

Both generic `EntityRecord`/`entity_records` rules and the entity's name are applied
to the record's JSON data. Administrators remain subject to global record rules.
Other modules that write directly through Prisma are not covered by this
enforcement. Downstream domain consumers must support
the `$and` representation. Listing still performs filtering in memory.

`relationship-access.integration.spec.ts` covers REST relationship linking and
unlinking, plus the service's relationship readers. Mutations require read and
write record-rule access to both records, active records/entities in the signed
tenant, and matching source/target entity definitions. The source must also match
the URL entity. Transactions lock the relationship, entities and records until
commit; repeated/concurrent identical link requests return the existing link.
This prevents duplicates through this service without a schema migration; direct
database writes can still create duplicates. Readers omit inaccessible, foreign
and orphaned targets. All service entry points now require a trusted context
containing companyId, userId and source entityId.

`business-rule-access.integration.spec.ts` exercises business-rule event handlers
with real Prisma/Drizzle data and RecordService. Conditions inspect freshly loaded
record JSON, all operators must match, priority zero is preserved, and subsequent
rules see successful changes. `set_field` actions use the event actor's read/write
rules and the record service's validation, formula evaluation and conditional
writes. They suppress the resulting update event to retain the existing
non-recursive automation behavior. Wrong-entity, wrong-tenant, deleted-record and
missing-actor events cannot write. Notification and webhook actions are not tested.
Cascade writers remain a separate path requiring review.

`assignment-access.integration.spec.ts` covers user, role and round-robin
assignment with real persisted rules. Conditions inspect current record JSON;
active users in active roles are selected in stable ID order. Writes use the
event actor's read/write rules and shared validation without recursive events.
A locked rule row serializes round-robin selection, and the record write and
cursor update commit together. Denied writes and cursor failures do not advance
the cursor. The first assignment starts at index zero. Unsupported `group` mode
fails closed rather than interpreting a group ID as a user ID. Users/roles are
global in the current schema; it has no tenant-membership relation for assignees.

The suite executes `migrations/010_add_assignment_round_robin_cursor.sql` against
an existing rule in its disposable database. Apply this migration to the
application database before deploying the updated assignment engine and Prisma
client. Running these tests does not migrate the application database.

`rollup-access.integration.spec.ts` verifies per-parent aggregates over actual
relationship links, with duplicate children removed and both ends tenant-scoped.
Only parents linked to the triggering child are recomputed. Generic and named
entity read rules apply to all contributing children; parent read/write rules
and validation apply through RecordService. A denied parent rolls back all
parent writes for that rollup. No partial aggregate is published when a child is
unreadable. Recomputations lock each rollup rule and suppress recursive events.

Sum/count use zero for empty inputs; avg/min/max use null. Count counts non-null
values, including nonnumeric strings. Numeric aggregates ignore blanks, booleans
and non-finite values. Filters validate all operators before calculation. Both
relationship directions work; self-relations treat source as parent. Deletion
events now carry companyId so hard deletion of the last child can reset totals.
Legacy hard-delete events without tenant context cannot be recomputed safely.
Relationship links must still exist for record-deletion recomputation.
Link/unlink changes now emit a relationship event after commit and await rollup
recomputation. The removed link's parent is retained in the event context so
removing the last child resets its total. Both relationship directions and
self-relations work; duplicate requests and failed mutations emit no event.
Aggregates still include children linked through other matching relationships.
`relationship-rollup.integration.spec.ts` tests this through real Nest event
listeners, HTTP and MySQL, including concurrent links and access-rule failures.
Relationship mutations commit before automation runs: a denied or failed rollup
is logged and leaves the previous total intact, without undoing the link.
By default these events run in process. With `AUTOMATION_DURABLE_EVENTS=true`,
relationship events are stored transactionally and dispatched by the automation
worker. See the durable workflow configuration below.

`cascade-access.integration.spec.ts` replaces the mocked cascade contract tests
with real MySQL coverage. Explicit cascade update/delete calls require trusted
`{ companyId, userId }` context. Source and target read rules and operation rules
apply, as do target validation, stored formulas and post-update write rules.
All target writes share one transaction: policy, validation or write failures
roll back earlier targets. Duplicate links are processed once; foreign-tenant,
deleted, missing and wrong-entity targets are skipped. Both directions, including
self-relations, are covered. Explicit cascade calls remain one-hop and suppress
events. Ordinary RecordService update, delete and bulk-delete operations now
automatically apply enabled cascades in the same transaction as the source
mutation. All affected record events are published only after commit. A denied
target, invalid field or source write failure rolls back the complete operation.
Targets are soft-deleted even when the source requests hard deletion.
`automatic-cascade.integration.spec.ts` covers REST/GraphQL entry points,
overlapping bulk deletes, source/target rollback and committed-event visibility.
Transaction-bound automation calls and writes with `emitEvent: false` do not
start cascades, preventing recursion; callers that own a transaction also own
its cascade orchestration. Cascades do not recursively traverse further hops.

`validation-rules.integration.spec.ts` covers persisted validation rules and
their enforcement on record creates and updates, including merged data,
stored formula results and transactional cascade rollback. All active rules
for the entity run in stable priority order (including priority zero). Invalid
configurations return validation errors; database failures propagate. Required,
format, range, regex and custom conditions are checked without silently ignoring
unknown operators. Uniqueness checks require a tenant and validate any excluded
record against that tenant/entity; deleted records are excluded. These are
standalone preflight checks when called directly. RecordService creates and
updates now validate and persist in one transaction. Unique-rule row locks
serialize competing writes, and locking reads see current committed values even
after an outer transaction established an older snapshot. Transaction-bound
automation writes use the same protection. `unique-concurrency.integration.spec.ts`
covers simultaneous creates, updates, mixed writes, old snapshots and cascade
rollback. Creation/update events publish after commit. Conditional SQL writes
also reject stale record authorization using affected-row counts. Uniqueness
comparisons are exact JSON scalar comparisons; direct database writes bypass
these application-level guarantees. Locks serialize tenants sharing a rule and
scan the model's records in the tenant, which may limit throughput at scale.

`approval-lifecycle.integration.spec.ts` verifies the approval request lifecycle
and migration 011 against its disposable database. Requests now live in
`automation_approval_requests`, separately from chain definitions. Each chain
step requires exactly one `approverId` or `roleId`, plus an optional `name`.
Steps are snapshotted on creation; later edits affect only new requests. Service
calls require trusted `{ companyId, userId }` context. Creation and transitions
require record read/write access; request reads also require participation.
Only the assigned active actor/current role can act on the expected step index.
Approvals and rejections persist actor, time and reason, and terminal requests
cannot advance. A new request may start after the previous one becomes terminal.
Chain locks serialize duplicate starts and request transitions; paused chains
cannot advance. Tests cover concurrent starts/decisions and failed-write rollback.
The authenticated approval-request API now exposes explicit lifecycle operations.
Approval in-app notifications are persisted transactionally. Chains can also
queue completion/rejection workflows; workflow notifications can queue email or
push delivery through an operator-configured JSON gateway (see below).
Hard-deleted records retain stored request history, but record-scoped service
reads reject access once the source record is deleted.

`approval-http.integration.spec.ts` exercises the real JWT/RBAC guards and
controller validation. All routes require `base_automation.approvals`; chain
configuration management permission is not required to participate. The service
still enforces participant access, assigned approvers and record rules, including
for administrators. Tenant/actor identity comes from authentication and the
existing tenant-header policy; body overrides and lifecycle fields are rejected.

Controller-relative routes (the production application's `/api/v2` global prefix
is prepended; the integration harness does not install that prefix):

| Method | Route | Body | Success |
| --- | --- | --- | --- |
| POST | `/api/automation/approval-requests` | `{chainId, recordEntityId, recordId}` | 201, `{success, data}` |
| GET | `/api/automation/approval-requests/:id` | none | 200, `{success, data}` |
| POST | `/api/automation/approval-requests/:id/approve` | `{stepIndex}` | 200, `{success}` |
| POST | `/api/automation/approval-requests/:id/reject` | `{stepIndex, reason}` | 200, `{success}` |

Step indices start at zero. Invalid input returns 400, missing authentication 401,
access denial 403, absent/foreign-tenant requests 404, and stale, out-of-order or
duplicate pending operations 409. The reason must contain 1–2000 characters after
the service checks for whitespace-only input. Migration 011 must be applied before
using these endpoints against the application database.

`approval-trigger.integration.spec.ts` verifies automatic request creation through
real Nest record-event listeners and exercises migration 012 in its disposable
database. Chain configuration accepts `triggerEvent`: `manual` (default),
`record.created`, `record.updated`, or `record.saved` (both). Existing chains remain
manual. Events reload persisted records and recheck active actor, tenant, entity,
read/write rules, chain configuration and conditions inside the request transaction.
Concurrent deliveries skip an existing pending request; malformed chains are
logged independently so later chains still execute. After completion or rejection,
a subsequent matching event can start a new request. This is pending-request
deduplication, not durable event deduplication: replay after a terminal decision
can also start another request. By default record events run asynchronously after
commit. With `AUTOMATION_DURABLE_EVENTS=true`, events are stored in the mutation
transaction, and approval creation is deduplicated across retries of that event.
Writes that suppress events do not trigger approvals. Requests do not block the
original record write; configured outcome workflows run through the worker.

For the full configured backend suite and compilation checks:

```sh
npm test -- --runInBand
npm run typecheck
npm run build
```

Cascade updates require `migrations/009_add_relationship_cascade_update.sql`.
Disposable integration schema creation does not apply migrations to the
application database; consult the migration README and current schema status.

Approval requests additionally require `migrations/011_add_approval_requests.sql`.
The migration test applies it only inside a disposable test database.
Automatic approval configuration additionally requires
`migrations/012_add_approval_trigger.sql`.

`approval-notifications.integration.spec.ts` tests lifecycle notifications and
the authenticated inbox, including migration 013 in its disposable database.
The current step's eligible active user/role members receive an action notice;
the initiator receives completion/rejection notices if still active and allowed
to read the record. Step recipients must pass both read and write rules. Notices
contain a generic title/message and request ID, never record data or rejection
reasons. Notification insertion shares the approval transaction: failure rolls
back the state change. A unique recipient/event key prevents duplicate inserts.
These are persisted in-app messages, not email, webhooks or push deliveries.

The existing `/api/advanced-features/notifications` inbox, unread count, read,
read-all and dismiss routes now require tenant context. Every query and mutation
combines owner and tenant predicates, even with status/type filters. Legacy
notifications with null company ID remain global to their owner; approval notices
always carry the request tenant. Lists are ordered newest first and accept limits
of 1–100. Notification access does not grant access to the linked request; the
approval endpoint rechecks current participation and record rules.

`migrations/013_scope_approval_notifications.sql` adds notification tenant scope
and recipient/event uniqueness.

## Durable workflow configuration and coverage

The migration README records the latest local inspection and deployment:
001–016 are in the ledger, and the schema additions from 014–016 are present.
Use `npm run db:migrate:sql -- --status` and inspect the schema before
deploying; tests only apply migrations to disposable databases.

`workflow-jobs.integration.spec.ts` exercises migrations 014 and 015, approval
outcome snapshots, competing workers, lease recovery, retry deduplication,
terminal failures, tenant isolation, recipient field access, queued delivery,
and durable approval triggers. `workflow-records.integration.spec.ts` covers
workflow record creation and authorization. External delivery is mocked in these
integration tests; they do not establish that an email or push provider works.

The workflow suite also boots the full AppModule and runs its real polling worker,
event listeners and action adapters against a disposable database. It
verifies automatic approval creation, outcome execution and a transient failure
followed by retry without a duplicate notification. Migrations 008 and 016 add
the separate Drizzle plugin/catalog tables to this fixture, so catalog seeding
and installed-plugin discovery run normally. The test checks that replaying 016
preserves seeded data. The complete GraphQL schema must build.
Catalog initialization is awaited during application startup. Seeding runs in a
transaction, restores missing built-in entries, and preserves existing entries
and their timestamps. The test deletes a plugin to check recovery, changes an
operator-owned title to check preservation, and injects a database failure to
verify rollback of category insertion.

For application-database startup and HTTP health verification after building:

```sh
npm run build
npm run verify:startup
```

The startup command runs normal application initialization hooks on a temporary
loopback port and closes the application afterward. It disables automation workers;
it is not a worker deployment. Marketplace initialization can seed an empty catalog.

Migration 014 adds approval outcome configuration, jobs and action receipts.
Migration 015 adds entity publication fields and stored-formula metadata missing
from the legacy schema. Review existing columns and back up the application
database before applying either file; MySQL DDL can partially commit on failure.

| Setting | Behavior |
| --- | --- |
| `AUTOMATION_WORKER_ENABLED=false` | Disables polling. Otherwise each application process polls every second. |
| `AUTOMATION_DURABLE_EVENTS=true` | Stores supported record/relationship events transactionally instead of dispatching them in process. Defaults off. |
| `WORKFLOW_DELIVERY_HOSTS` | Comma-separated allowed hostnames for HTTPS delivery. Empty denies all destinations. |
| `WORKFLOW_EMAIL_GATEWAY_URL`, `WORKFLOW_EMAIL_GATEWAY_TOKEN` | JSON email gateway and bearer token. Both are required for email delivery. |
| `WORKFLOW_PUSH_GATEWAY_URL`, `WORKFLOW_PUSH_GATEWAY_TOKEN` | JSON push gateway and bearer token. Both are required for push delivery. |

Approval chains use `on_completed` and `on_rejected` workflow names. Requests
snapshot those names; jobs pin the workflow definition before their first action.
Outcome and external-delivery jobs do not depend on the durable-events flag.
Keep the worker disabled until its tables exist. Disabling it leaves jobs queued.

Workers claim one job at a time with a 60-second lease, renewed every 10 seconds.
Failures retry with backoff and become `failed` on the fifth attempt; there is no
automatic replay of terminal failures. Database action receipts prevent repeated
supported actions on retry. Custom handlers and external services must handle
their own idempotency. Gateways receive a stable `idempotency-key`; delivery is
not an exactly-once guarantee if the receiver ignores it or a response is lost.

Delivery accepts HTTPS on port 443 to allowlisted public IPv4 destinations, pins
the resolved address, rejects redirects/non-2xx responses, and limits request and
response bodies to 256 KiB with a 10-second request timeout. Source and recipient
access are checked again before dispatch. AI actions require the AI adapter's
separate configuration and are not covered by live-provider verification.
