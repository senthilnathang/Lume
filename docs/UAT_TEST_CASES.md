# Migration acceptance cases

Updated 2026-10-25. Run on isolated data. Automated evidence is described in
[TESTING.md](TESTING.md); feature tasks remain in [the tracker](nestjs-migration-tasks.txt).

| ID | Case | Expected result | Evidence / status |
|---|---|---|---|
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
| STATE-03 | Approval/timer/webhook/action configuration | Unsupported transitions are disabled and server rejects execution | HTTP and component regressions |
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
