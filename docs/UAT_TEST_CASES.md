# Migration acceptance cases

Updated 2026-10-27. Run on isolated data. Automated evidence is described in
[TESTING.md](TESTING.md); feature tasks remain in [the tracker](nestjs-migration-tasks.txt).

| ID | Case | Expected result | Evidence / status |
|---|---|---|---|
| CORE-DISCOVERY-01 | Start with explicit file/package exports in reverse dependency order, examples disabled | Production definitions load dependency-first and appear in the real AppModule registry | Discovery and full-startup regressions |
| CORE-DISCOVERY-02 | Configure a missing/invalid export, duplicate/cyclic graph or failing load hook | Startup rejects rather than serving a partial registry; bootstrap workers do not start | Discovery/Nest lifecycle regressions |
| CORE-DISCOVERY-03 | Disable modules or request automatic migrations | Disabled loading imports nothing; enabled loading rejects unsupported auto-migration flag | Initialization flag regressions |
| CORE-TENANT-01 | Call tenant operations without authentication/permission, or as a delegated non-platform admin | Denied; global registry restricted to platform administrators | Complete AppModule regression |
| CORE-TENANT-02 | Create/read/update/archive a numeric company-ID registry entry | Persisted values survive service recreation; normalized domain uniqueness; archive retains ID/domain and company data | Complete AppModule and migration replay regressions |
| CORE-TENANT-03 | Authenticate with an inactive/archived registered company, including administrator header override | REST and GraphQL protected requests denied; reactivation restores access before archive | Complete AppModule regression |
| CORE-TENANT-04 | Run read-only framework preflight before ownership reconciliation | Missing registry/schema and observed unregistered company IDs reported; no inferred ownership or data changes | Preflight regression; reconciliation/provisioning pending |
| CORE-TENANT-05 | Suspend a tenant before queued workflow, event or delivery dispatch | No handler/provider call; job uses bounded retries; eligible retry succeeds after reactivation | Disposable database worker regressions |
| CORE-TENANT-06 | Archive a tenant with a due schedule; suspend during nested workflow steps | Schedule made inactive without enqueue; subsequent nested step denied | Scheduler/executor regressions; in-flight effects not cancelled |
| CORE-TENANT-07 | Suspend/reactivate/archive a tenant after opening a subscription | Matching events suppressed while unavailable and resume after reactivation; connection remains open | Real WebSocket regression |
| CORE-TENANT-08 | Set/clear a user's assignment as platform admin | Other metadata preserved; sessions revoked atomically; stale company claims rejected; new login uses current assignment | Disposable MySQL/JWT regression |
| CORE-TENANT-09 | Attempt delegated, invalid-target or malformed-metadata assignment; fail session revocation | Denied or rolled back with original metadata/session state intact | Permission and trigger-failure regression |
| CORE-TENANT-10 | Reassign a member after queueing work or opening a subscription | Old job/schedule/step scope denied; existing subscription context cannot use the former assignment | Worker, schedule and subscription-context regressions |
| CORE-LIFECYCLE-01 | Install a module whose transitive dependency requires a DB installation hook through either API | Reject before any hook or registration; no skipped database work | Loader and API-adapter regressions |
| CORE-LIFECYCLE-02 | Submit concurrent installs or load/uninstall while hooks are blocked | Install hook runs once; competing lifecycle mutations fail; dependencies remain registered | Deferred-hook regression tests |
| CORE-LIFECYCLE-03 | Fail an install/uninstall hook, then correct it and retry | No false loaded/unloaded status; reservations are released for retry | Loader regression tests |
| CORE-AUDIT-01 | Query stored audit list/detail/history as platform admin | Filters and counts agree; equal timestamps use descending IDs; snapshots preserve stored values; missing detail is null | Disposable MySQL regression |
| CORE-AUDIT-02 | Grant a tenant member audit.read/audit.delete and attempt list/cleanup | Both REST and GraphQL deny unscoped history; cleanup leaves rows intact | Disposable MySQL regression |
| CORE-AUDIT-03 | Read legacy audit rows with null identity/date and nonnumeric record IDs | Nullable fields and String record IDs survive; unavailable historical email/role remain null | Disposable MySQL regression |
| CORE-CATALOG-01 | Query GraphQL module catalog and REST admin catalog as an administrator | Same instantiated builtin names; pending runtime definitions accurately marked; no fabricated installation dates | Complete AppModule regression |
| CORE-CATALOG-02 | Install/uninstall a registered runtime definition; try a builtin, missing module or failing hook | Actual registry changes only on supported success; failures reported explicitly | Loader/resolver regression |
| CORE-CATALOG-03 | Configure/reload a builtin or a runtime module without the opt-in contract | Explicit rejection; no skipped install hook or no-op success | Resolver/controller regression |
| CORE-CONFIG-01 | Save validated configuration, load/reload and create a fresh loader | Desired/applied revisions are truthful; hooks consume persisted configuration; restart reads it | Complete AppModule/MySQL regression |
| CORE-CONFIG-02 | Race saves/reloads or fail storage/validation/reload hooks | Stale writes conflict; reload deduplicated; applied revision advances only after success; newer saved revision remains pending | Database failure, concurrency and lifecycle regressions |
| CORE-THROTTLE-01 | Execute guarded GraphQL operations with no token, insufficient permissions and admin token | Authentication/permission errors or real results; no HTTP-context crash | Complete AppModule regression |
| CORE-THROTTLE-02 | Exceed a client's rate limit over HTTP, GraphQL or a subscription request context | Rate limit enforced; other client addresses have separate buckets | Real guard/storage regression |
| FLOW-ACCESS-01 | Queue a manual flow against another actor’s private record | Request denied; no job created | HTTP/MySQL regression |
| FLOW-ACCESS-02 | Revoke source visibility, record-read permission, or actor/role activity after queueing | Detail denied, run omitted from accessible lists, worker produces no effects | HTTP/MySQL regression |
| FLOW-ACCESS-03 | Make the source private after one action commits, then repeat the request ID and retry | Submission denied; no later action executes; earlier effects retained | HTTP/MySQL regression |
| FLOW-ACCESS-04 | Run a private-source flow as its owner or an administrator | Queueing, execution and own run history remain available | HTTP/MySQL regression |
| FLOW-BRANCH-01 | Run a condition_if graph with then/else edges and a merged action | Only the selected path and one copy of the shared action execute | HTTP/MySQL regression; browser acceptance pending |
| FLOW-BRANCH-02 | Change the deciding field in a branch, fail a later action, then retry | Saved branch choice is retained; committed actions are not repeated | HTTP/MySQL regression |
| FLOW-BRANCH-03 | Use a private record or hidden/masked condition field, or revoke field access before retry | No new branch effects; access is rechecked before receipt replay | HTTP/MySQL regression |
| FLOW-BRANCH-04 | Save an invalid predicate, missing edge labels, cycle, or oversized expansion | Activation rejected; malformed graphs never execute | HTTP and compiler regression |
| APPROVAL-PRIVATE-01 | Change a pending record from public to private, then read/list/approve/reject as an assigned non-owner | Detail/decisions denied; request omitted from lists; state and new notifications unchanged | HTTP/MySQL regression; browser acceptance pending |
| APPROVAL-PRIVATE-02 | Create private-record approval notifications for a user, role or initiator | Only owner or active administrator recipients receive new messages; assignment still controls decisions | MySQL regression |
| WF-COND-01 | Preview an unmet condition, update the record, refresh and transition | Blocked action displays reason; refreshed action becomes available and advances once | HTTP/MySQL regression; browser acceptance pending |
| WF-COND-02 | Revoke field read access or mask a condition field before submission | Generic unavailable reason; state/history unchanged | HTTP/MySQL regression |
| WF-COND-03 | Add/edit/clear a transition condition, cancel an edit and save the workflow | Typed values persist; clearing removes the condition; cancellation preserves it; invalid JSON stays in the modal | Component regression; browser acceptance pending |
| AUTH-01 | Login, refresh, logout and reuse revoked session | Authenticated access succeeds; revoked session is denied | Backend/session and earlier browser regressions |
| AUTH-02 | Missing role/permission or foreign tenant | Protected operations fail without leaking records | Backend integration regressions |
| USER-01 | Create/edit user and update roles | Canonical fields persist; passwords remain protected | Earlier user HTTP/browser checks |
| MENU-01 | Create parent/child, attempt cycle, clear parent | Cycle rejected; null clears parent; referenced delete conflicts | Isolated HTTP + unit tests |
| RULE-01 | Create/edit/deactivate record rule | Rule validates; audit records actor; delete deactivates | HTTP + rule-security tests |
| SEQ-01 | Concurrent sequence allocations | Unique increasing numbers and persisted next counter | Real MySQL tests |
| SEQ-02 | Invalid increment, inactive/exhausted sequence, counter rewind | Operation fails; counter is preserved | Unit/HTTP/GraphQL regressions |
| SEQ-03 | GraphQL allocation using query versus mutation | Query rejected; authorized mutation advances counter | GraphQL integration tests |
| DEF-01 | Reopen workflow/flow/approval graph after saving | JSON arrays/objects round-trip without string leakage | MySQL JSON regressions |
| APR-01 | Create sequential user/role chain; edit/cancel | Order/status preserved; cancelled edit leaves list unchanged | Adapter tests; editor interaction coverage still partial |
| APR-02 | Inbox pending/history across tenant, participant and record policy | Only permitted entries returned; cursor advances past hidden entries | HTTP integration tests |
| APR-03 | Approve/reject displayed step; replay or race decision | One valid decision persists; stale decisions conflict | HTTP and Chromium checks |
| APR-04 | Rejection reason and actor/timestamp in history | Terminal request shows persisted decision details | Chromium checked |
| UI-01 | Build both applications from shared module package | No imports require legacy backend source copies | Both builds/types and 86 client tests passed |
| CMS-01 | Published/private/unknown pages and sitemap | Published page renders; private data hidden; unknown page is 404 | Earlier isolated website/browser checks |
| OPS-01 | Provider-disabled startup | HTTP health and GraphQL work with deliveries disabled | Complete AppModule startup checked |
| OPS-02 | Fresh install, backup restore, deployment and rollback | Reproducible Nest-only release with preserved data | Final cutover pending |
| STRUCT-01 | Canonical app roots and one lockfile | Only apps/api, apps/admin and apps/website are active; legacy excluded | scripts/check_layout.py; API image dependency smoke passed |
| SEARCH-01 | Search across tenants, private records, hidden fields and documents | Only authorized, nondeleted results; hidden values never influence matching | 15 HTTP/JWT/MySQL tests passed |
| DEF-02 | Validate graph and race active definition updates | Invalid graphs return 400; failed updates preserve stored definition; concurrent patches serialize | HTTP/JWT/MySQL validation and concurrency tests passed |
| STATE-01 | Start, transition, finish and reload execution | State codes and actor history persist; terminal actions disappear | HTTP/MySQL, component and Chromium checks (execution created via API) |
| STATE-02 | Race/replay, wrong tenant, revoked access or history failure | One decision wins; denial/rollback leaves state and history consistent | 15 HTTP/MySQL tests with production validation pipe |
| STATE-03 | Timer/webhook/action configuration | Unsupported transitions are disabled and server rejects execution | HTTP and component regressions |
| STATE-APPROVAL-01 | Request approval, complete inbox steps, refresh and submit transition | Pending approval blocks transition; completion enables manual submission; history records approval ID | HTTP/MySQL and component regressions; browser acceptance pending |
| STATE-APPROVAL-02 | Reject and request again; retry concurrently or revisit same state | Duplicate requests reuse one pending approval; rejected attempts retained; later versions require new approvals | HTTP/MySQL regressions |
| STATE-APPROVAL-03 | Revoke access, change a condition or disable chain after approval | Final transition rejected without state/history changes | HTTP/MySQL regressions |
| GAP-01 | Advanced state-machine execution, delegation/escalation, data/import/export and remaining modules | Required Express behavior implemented and verified in NestJS | Pending; do not sign off |

A release sign-off must include configuration, commit, database isolation, executed
cases, browser coverage and failures. Do not copy historic pass counts onto untested
features. Raw credentials, browser session state and database dumps are not public
acceptance artifacts.

## Remaining manual workflow acceptance

| ID | Case | Expected result | Status |
|---|---|---|---|
| STATE-04 | Designer Run button with valid/invalid record ID | Valid start navigates to execution; invalid ID does not start | Adapter/HTTP coverage; browser check pending |
| STATE-05 | Two browser sessions act on the same displayed version | One wins; stale client refreshes without duplicate history | HTTP concurrency covered; two-browser check pending |
| STATE-06 | Deploy admin and open execution through production proxy | Requests reach NestJS with correct session and tenant | Pending client deployment |
| STATE-07 | Import required legacy executions | Reconciled IDs, snapshots and history with repeatable dry run | Pending M12 |

The completed Chromium case used an API-created isolated execution. It verified
manual decisions and reload, not the designer Run button or production deployment.
## Business-rule editor migration — 2026-10-26

- At `/settings/automation/business-rules`, create a rule for an existing entity
  model and field, with a JSON condition and typed JSON value. Reload and edit;
  verify condition/value types, priority zero, and active status are preserved.
- Verify rules apply after both record creation and update using the actor's
  tenant and record permissions. Denied reads/writes must not change the record.
- Disable and re-enable from the list. The request sets an explicit status;
  model/field identities remain fixed during editing.
- Malformed JSON must remain in the open editor with an error and no save.
  Invalid operators, unsafe fields, missing values and unsupported actions must
  fail at the API too. Rejected partial updates must preserve the original row.
- Missing IDs return 404. Anonymous and unauthorized requests cannot mutate rules.
- The editor must not offer DELETE-only triggers, multiple actions or email
  delivery. Existing other action types remain visible and can be disabled.

HTTP/database and component checks are recorded in TESTING.md. Live browser
acceptance for this editor remains pending; no local deployment is implied.

## Manual linear flow migration — 2026-10-26

Automated HTTP/database and component checks passed; browser acceptance remains open.

- Create a manual draft for a real entity, open Designer / Run, insert a starter
  graph and save. Reopen it and verify nodes/edges round-trip.
- Add field-update and record-create nodes, connect a single path and activate.
  Confirm malformed, branched, cyclic or unsupported active graphs are rejected.
- Add an `action_update_record` node with multiple fields, including false, zero
  and null for optional fields. Confirm all fields persist together; one denied
  field, invalid value or failed receipt must leave every field unchanged. Retrying
  a later failed action must not reapply this completed multi-field update.
- Add `action_send_notification` with a recipient ID and message, run the saved
  flow and verify one tenant-scoped in-app inbox entry. Denied sender/recipient
  access must prevent creation; hidden field references fail and masked values
  remain masked. A later failed action must not duplicate the notification on retry.
- Run against an accessible record. Refresh history and verify the resulting
  record changes, including using an updated field in a later create action.
- Confirm a network retry reuses the request UUID and creates only one job.
  Editing a queued graph must leave the queued definition unchanged.
- Confirm another actor/tenant cannot read the run and revoked record access
  removes it from history. Revoked write/run permission must prevent effects.
- With a later action failing, confirm earlier committed actions remain and are
  not repeated on retry. Deactivating/deleting a queued flow prevents execution.
- With the worker disabled, confirm the panel reports that state and the run
  remains queued. This test does not authorize changing deployment flags.

## Scheduled workflow migration — 2026-10-26

- On an isolated database with migration 019, open automation → Scheduled. Verify
  the paused banner while scheduling is disabled; saving must not imply execution.
- Create an inactive interval schedule using a registered workflow and accessible
  record. Reopen, change to UTC cron, activate, and verify next due time and version.
- Enable scheduler and worker on the isolated instance. Verify exactly one durable
  job per due occurrence, actual record effects, last-job status and persistence
  across restart. Missed occurrences should coalesce, not flood the queue.
- Cross-tenant and other-user schedule reads/writes must fail. Revoked actor or
  record access must prevent effects. Disabling/deleting or editing a schedule
  must prevent older queued versions from starting; already-running work may finish.
- Concurrent updates must reject stale versions; concurrent dispatchers must not
  duplicate the occurrence. Queue/next-time writes must roll back together.
- Apply migration 019 twice to isolated data; both canonical and legacy rows must
  survive. Do not automatically execute legacy arbitrary-code definitions.

HTTP/database and component tests cover these contracts; live browser acceptance
and the local deployment of migration 019 remain pending.

## Framework release acceptance still required — 2026-10-27

| ID | Case | Expected result | Evidence / status |
|---|---|---|---|
| RELEASE-DB-01 | Restore a verified backup into an isolated target and reconcile ownership/schema | Target ledger and row ownership reviewed; discrepancies explained before migration | Pending; preflight/source comparison alone is insufficient |
| RELEASE-DB-02 | Apply reviewed 019–023 on the isolated restored target, then replay | Existing data/history preserved; ledger consistent; replay safe | Individual migration regressions exist; complete rehearsal pending |
| RELEASE-UI-01 | Exercise tenant reassignment, workflow schedule, manual flow and approval transition through routed clients | Fresh identity scope, visible denial/conflict feedback, persisted results after refresh | Component/API evidence exists; combined browser acceptance pending |
| RELEASE-RUNTIME-01 | Deploy explicit entrypoints with examples disabled, save config and reload every instance | Dependency order, health and per-instance applied revisions verified | Automated startup/config coverage exists; rollout pending |
| RELEASE-ROLLBACK-01 | Rehearse API/client rollback against preserved data and access policy | Recovery procedure demonstrated without weakening tenant enforcement | Pending; code rollback alone is insufficient |
| RELEASE-SIGNOFF-01 | Review F01–F07 and required event publishers/core contracts | Remaining gaps resolved with evidence before framework sign-off | Pending; deferred module/plugin work remains separately tracked |
