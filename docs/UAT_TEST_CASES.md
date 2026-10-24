# Migration acceptance cases

Updated 2026-10-24. Run on isolated data. Automated evidence is described in
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
| GAP-01 | State-machine execution, delegation/escalation, data/import/export and remaining modules | Required Express behavior implemented and verified in NestJS | Pending; do not sign off |

A release sign-off must include configuration, commit, database isolation, executed
cases, browser coverage and failures. Do not copy historic pass counts onto untested
features. Raw credentials, browser session state and database dumps are not public
acceptance artifacts.
