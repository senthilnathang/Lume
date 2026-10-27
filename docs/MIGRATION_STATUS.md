# Migration status

Updated 2026-10-27. **Framework migration remains in progress.** Complete F01–F07
before expanding individual modules/plugins. The canonical applications are
`apps/api`, `apps/admin` and `apps/website`; no backend folder move is planned.

## Implemented source

- Shared active identity/RBAC and database providers; persisted settings and audit
  reads with platform-admin restrictions for company-unscoped audit data.
- Tenant registry, single-company membership assignment and atomic session
  revocation; current membership/status checks for requests, jobs, workflow steps
  and subscription delivery. Legacy unregistered companies remain compatible.
- Dependency-aware module lifecycle, registry cleanup, explicit production
  CommonJS entrypoints, fail-fast startup and workers starting after initialization.
- Persisted opt-in module configuration with optimistic revisions and explicit
  reload. Applied state is local to each process; code changes require deployment.
- Read-only framework schema preflight and source reconciliation for 23 models
  (16 unchanged, seven requiring review).
- Existing automation work: validated business rules, scheduled workflows, manual
  flows, conditional state transitions and version-bound manual approval gates.
  Advanced automation and individual module/plugin parity remain deferred.

## Database and deployment boundary

The last recorded local installation includes migration 018. Migrations **019–023
are prepared and tested on disposable databases, but remain unapplied to the
application database**. They add workflow schedules, approval bindings, field-mask
columns, tenant registry and runtime module configuration. This source publication
is not a deployment; built client assets also remain undeployed. External email,
push and AI integrations remain disabled.

The configured read-only preflight last reported missing masking columns and
registry/configuration tables (exit 2). Source comparison and passing regression
tests do not establish ownership reconciliation, restored data or release readiness.

## Priority and outstanding acceptance

| Priority | Framework gate | Remaining acceptance |
|---|---|---|
| 1 | F01 identity/security | Complete scope review and ownership reconciliation; verify client access boundaries |
| 2 | F02 runtime/extensions | Finish extension-host acceptance and classify remaining framework placeholders |
| 3 | F03 persistence | Repeatable schema/data reconciliation, fresh install and backup/restore evidence |
| 4 | F04 API completeness | Required core contract coverage and audit event producers; classify remaining data/analytics handlers |
| 5 | F05 verification | Reproducible release checks and critical browser acceptance |
| 6 | F06 rollout | Reviewed migrations, API/client rollout, health checks and rollback rehearsal |
| 7 | F07 sign-off | Final acceptance and safe legacy retirement; then modules/plugins individually |

Single-company assignment does not certify multi-company provisioning. Subscription
filters do not establish complete event publishing. Runtime hooks and in-flight
external effects are not automatically rolled back. Preserve legacy source/data
until the corresponding module passes its migration gates.

See the [execution tracker](nestjs-migration-tasks.txt) for detailed checkboxes,
[roadmap](MIGRATION_PRODUCTION_ROADMAP.md) for sequencing,
[testing](TESTING.md) for dated evidence, [acceptance cases](UAT_TEST_CASES.md),
[architecture](ARCHITECTURE.md), [developer guide](DEVELOPMENT.md) and
[deployment](DEPLOYMENT.md) for the supported procedures. Historical completion
reports describe earlier milestones and do not supersede these open gates.
