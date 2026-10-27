# NestJS migration roadmap

Priority changed on 2026-10-27: complete the framework first, then migrate feature
modules and individual plugins. F01–F07 in the execution tracker now govern the
active queue: identity/security, runtime/extension host, core persistence, framework
API completeness, release verification, rollout and sign-off. M05–M10 feature
expansion is deferred; required shared infrastructure remains in framework scope.
Deferred work is not marked complete. Retain legacy module source until each
module's behavior and data migration have been verified.

Updated 2026-10-27. **In progress**, not feature-complete. The detailed acceptance
criteria and per-task status are in [nestjs-migration-tasks.txt](nestjs-migration-tasks.txt).

| Phase | Tasks | Current status |
|---|---|---|
| Inventory and ownership | M01–M04 | Workspace inspected; UI extracted; default commands target NestJS; contract classification continues |
| Feature parity | M05–M11 | Multiple contracts migrated; advanced execution, delegation, data features and other handlers remain open |
| Data and backend cleanup | M12–M14 | Canonical apps layout and tooling are aligned; data reconciliation and final legacy retirement remain |
| Release verification | M15–M18 | Strong regression evidence exists; full release acceptance and deployment remain |

## Completed foundation changes

Shared browser code is now in `packages/@lume/module-ui`; normal backend workspace
commands launch/build/test NestJS. Apps share one pnpm lockfile; legacy code and
obsolete deployment tooling are excluded from the active workspace.
JSON decoding is consistent for MySQL text-backed fields. Settings, approval inbox,
and sequence allocation now use persisted, guarded contracts.

## Review inventories

- [Frontend contract inventory](frontend-contract-audit.json): 69 unmatched literal calls.
- [Backend inventory](backend-migration-inventory.json): 652 legacy route/mount
  declarations and 80 Nest implementation markers.

Regenerated on 2026-10-27. These counts include review candidates, potentially unused paths and legitimate
comments. Each requires reachability and behavior analysis; none is a direct bug count.

## Release criteria

Required feature parity, real data reconciliation, fresh-install verification,
security/access tests, critical browser workflows, backup/restore and rollback must
pass before retiring Express. The canonical paths are `apps/api`, `apps/admin`, and `apps/website`. Do not delete required legacy data/code or relabel incomplete
features as complete merely to reduce the inventory.

External integrations remain disabled. The local API has restarted from apps/api; newly built clients are not deployed. Publishing a Git commit is distinct from deploying or changing a database.

Manual state execution now supports guarded starts, snapshot-based transitions,
version conflicts and atomic history. Migration 018 is applied to the local API;
advanced workflow effects and legacy data reconciliation remain open. Admin assets
are built but not deployed. External integrations remain disabled.

## Next acceptance work

| Scope | Required evidence |
|---|---|
| M04 contract inventory | Classify the 69 unmatched literal calls by routed consumers and payload compatibility |
| M05 automation | Field-update rule editor, registered-workflow schedules, manual flows with conditional branches, conditional transitions and manual approval gates implemented; group/timer/webhook transitions, advanced flow nodes/triggers and remaining parity/import work stay open |
| M06–M11 remaining features | Finish approvals, data tools, security consumers, public modules and runtime audits |
| M12 data | Repeatable legacy import with dry run, reconciliation and preserved history |
| M15–M16 release | Both client releases, critical browser cases, production routing and rollback verification |
| M17–M18 retirement | Remove legacy only after gates pass; publish final acceptance evidence |

The source inventories are review candidates, not confirmed bug counts. Provider
integration tests are deferred by user choice. The last recorded local API rollout includes migration 018. The current framework
and automation source, migrations 019–023 and client rollout remain undeployed.

## Framework release gate — 2026-10-27

Use the prioritized F01–F07 table in [current status](MIGRATION_STATUS.md).
Runtime production discovery, opt-in configuration/reload, registry/membership
checks and stored audit/settings contracts are implemented source milestones.
They do not close their parent gates. Complete ownership/schema reconciliation,
backup restoration, remaining core contract and publisher coverage, browser
acceptance and rollout evidence before starting the deferred module/plugin queue.
Keep each later module's behavior, import, permissions and browser acceptance
individually reviewable; retain its legacy implementation until those checks pass.
