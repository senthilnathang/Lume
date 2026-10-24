# NestJS migration roadmap

Updated 2026-10-24. **In progress**, not feature-complete. The detailed acceptance
criteria and per-task status are in [nestjs-migration-tasks.txt](nestjs-migration-tasks.txt).

| Phase | Tasks | Current status |
|---|---|---|
| Inventory and ownership | M01–M04 | Workspace inspected; UI extracted; default commands target NestJS; contract classification continues |
| Feature parity | M05–M11 | Multiple contracts migrated; execution, delegation, data features and other handlers remain open |
| Data and backend cleanup | M12–M14 | Canonical apps layout and tooling are aligned; data reconciliation and final legacy retirement remain |
| Release verification | M15–M18 | Strong regression evidence exists; full release acceptance and deployment remain |

## Completed foundation changes

Shared browser code is now in `packages/@lume/module-ui`; normal backend workspace
commands launch/build/test NestJS. Apps share one pnpm lockfile; legacy code and
obsolete deployment tooling are excluded from the active workspace.
JSON decoding is consistent for MySQL text-backed fields. Settings, approval inbox,
and sequence allocation now use persisted, guarded contracts.

## Review inventories

- [Frontend contract inventory](frontend-contract-audit.json): 76 unmatched literal calls.
- [Backend inventory](backend-migration-inventory.json): 652 legacy route/mount
  declarations and 100 Nest implementation markers.

These counts include review candidates, potentially unused paths and legitimate
comments. Each requires reachability and behavior analysis; none is a direct bug count.

## Release criteria

Required feature parity, real data reconciliation, fresh-install verification,
security/access tests, critical browser workflows, backup/restore and rollback must
pass before retiring Express. The canonical paths are `apps/api`, `apps/admin`, and `apps/website`. Do not delete required legacy data/code or relabel incomplete
features as complete merely to reduce the inventory.

External integrations remain disabled. The local API has restarted from apps/api; newly built clients are not deployed. Publishing a Git commit is distinct from deploying or changing a database.
