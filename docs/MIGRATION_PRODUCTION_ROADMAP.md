# NestJS migration roadmap

Updated 2026-10-24. **In progress**, not feature-complete. The detailed acceptance
criteria and per-task status are in [nestjs-migration-tasks.txt](nestjs-migration-tasks.txt).

| Phase | Tasks | Current status |
|---|---|---|
| Inventory and ownership | M01–M04 | Workspace inspected; UI extracted; default commands target NestJS; contract classification continues |
| Feature parity | M05–M11 | Multiple contracts migrated; execution, delegation, data features and other handlers remain open |
| Data and backend cleanup | M12–M14 | Reconciliation, canonical folder cutover, CI/deployment and legacy retirement remain |
| Release verification | M15–M18 | Strong regression evidence exists; full release acceptance and deployment remain |

## Completed foundation changes

Shared browser code is now in `packages/@lume/module-ui`; normal backend workspace
commands launch/build/test NestJS. Legacy commands are explicit `legacy:*` commands.
JSON decoding is consistent for MySQL text-backed fields. Settings, approval inbox,
and sequence allocation now use persisted, guarded contracts.

## Review inventories

- [Frontend contract inventory](frontend-contract-audit.json): 74 unmatched literal calls.
- [Backend inventory](backend-migration-inventory.json): 652 legacy route/mount
  declarations and 100 Nest implementation markers.

These counts include review candidates, potentially unused paths and legitimate
comments. Each requires reachability and behavior analysis; none is a direct bug count.

## Release criteria

Required feature parity, real data reconciliation, fresh-install verification,
security/access tests, critical browser workflows, backup/restore and rollback must
pass before retiring Express. Move NestJS to `backend/api` only when service/build
references are prepared. Do not delete required legacy data/code or relabel incomplete
features as complete merely to reduce the inventory.

External integrations remain disabled. Recent migration/cleanup changes are not yet
deployed. Publishing a Git commit is distinct from deploying or changing a database.
