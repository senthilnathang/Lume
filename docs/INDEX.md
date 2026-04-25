# Lume Framework Documentation Index

Welcome to the Lume Framework documentation. This guide helps you navigate the organized documentation structure covering architecture, deployment, development guides, and archived phase documents.

---

## Quick Navigation

### Getting Started
- **[CLAUDE.md](/CLAUDE.md)** — Project instructions, rules, and conventions (ESM, ORM, frontend, backend)
- **[README.md](/README.md)** — Project overview and setup information

### Development
- **[DEVELOPMENT.md](DEVELOPMENT.md)** — Developer guide for creating modules, views, blocks, and testing
- **[INSTALLATION.md](INSTALLATION.md)** — Setup guide for all three servers (backend, admin panel, public site)
- **[TESTING.md](TESTING.md)** — Test configuration and patterns for Jest + ESM

### Architecture Documentation
Core system design and technical specifications.

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — System architecture, module system, ORM (Prisma + Drizzle), page builder, CMS
- **[architecture/advanced_architecture.md](architecture/advanced_architecture.md)** — Advanced architectural patterns and Phase 5 implementation details
- **[architecture/documentation_architecture.md](architecture/documentation_architecture.md)** — V2 documentation structure and standards
- **[architecture/nestjs_migration_plan.md](architecture/nestjs_migration_plan.md)** — Complete NestJS migration roadmap (8 weeks, 5 documents)
- **[architecture/nestjs_migration_implementation.md](architecture/nestjs_migration_implementation.md)** — NestJS migration implementation details
- **[architecture/nestjs_migration_verification.md](architecture/nestjs_migration_verification.md)** — Express to NestJS migration verification

### Deployment & Release
Production deployment, launch planning, and public release strategy.

- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Deployment procedures and infrastructure
- **[CPANEL_DEPLOYMENT.md](CPANEL_DEPLOYMENT.md)** — cPanel-specific deployment configuration
- **[deployment/master_launch_plan.md](deployment/master_launch_plan.md)** — V2 launch master plan
- **[deployment/public_release_roadmap.md](deployment/public_release_roadmap.md)** — SEO & public release strategy
- **[deployment/complete_roadmap_phases_2_5.md](deployment/complete_roadmap_phases_2_5.md)** — Comprehensive roadmap spanning Phases 2-5
- **[deployment/major_version_changes.md](deployment/major_version_changes.md)** — V2 major version changes overview
- **[deployment/seo_strategy.md](deployment/seo_strategy.md)** — SEO implementation strategy
- **[deployment/nestjs_security_hardening.md](deployment/nestjs_security_hardening.md)** — NestJS security hardening and audit

### Guides & How-To
Quick start guides and step-by-step instructions.

- **[guides/nestjs_quick_start.md](guides/nestjs_quick_start.md)** — Quick start guide for NestJS setup
- **[guides/nestjs_integration_guide.md](guides/nestjs_integration_guide.md)** — Detailed NestJS integration guide
- **[guides/migration_journey.md](guides/migration_journey.md)** — Complete migration journey documentation

### Additional Resources
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** — Database migration procedures and upgrade guides
- **[MIGRATION_STATUS.md](MIGRATION_STATUS.md)** — Current migration status and completion tracking
- **[MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md)** — Migration completion report
- **[MIGRATION_PRODUCTION_ROADMAP.md](MIGRATION_PRODUCTION_ROADMAP.md)** — Production migration roadmap
- **[PERFORMANCE.md](PERFORMANCE.md)** — Performance tuning guidelines
- **[PERFORMANCE_TUNING.md](PERFORMANCE_TUNING.md)** — Detailed performance optimization strategies
- **[OBSERVABILITY.md](OBSERVABILITY.md)** — Monitoring and observability setup
- **[OBSERVABILITY.md](OBSERVABILITY.md)** — Logging, monitoring, and observability
- **[TEAM_RUNBOOKS.md](TEAM_RUNBOOKS.md)** — Team operational runbooks and procedures
- **[INCIDENT_RESPONSE_PLAYBOOK.md](INCIDENT_RESPONSE_PLAYBOOK.md)** — Incident response procedures
- **[RELEASE_NOTES.md](RELEASE_NOTES.md)** — Version release notes and changelog
- **[UAT_TEST_CASES.md](UAT_TEST_CASES.md)** — User acceptance testing scenarios
- **[ENTITY_BUILDER_COMPLETE.md](ENTITY_BUILDER_COMPLETE.md)** — Entity builder module completion report
- **[BULLMQ_ARCHITECTURE.md](BULLMQ_ARCHITECTURE.md)** — BullMQ job queue architecture
- **[GITHUB_ANALYSIS_AND_STRATEGY.md](GITHUB_ANALYSIS_AND_STRATEGY.md)** — GitHub strategy and analysis
- **[SPRINT_1_CHECKPOINT.md](SPRINT_1_CHECKPOINT.md)** — Sprint 1 checkpoint and status

---

## Directory Structure

```
docs/
├── INDEX.md (this file)
├── ARCHITECTURE.md
├── DEVELOPMENT.md
├── INSTALLATION.md
├── TESTING.md
├── DEPLOYMENT.md
├── CPANEL_DEPLOYMENT.md
├── MIGRATION_GUIDE.md
├── MIGRATION_STATUS.md
├── MIGRATION_COMPLETE.md
├── MIGRATION_PRODUCTION_ROADMAP.md
├── PERFORMANCE.md
├── PERFORMANCE_TUNING.md
├── OBSERVABILITY.md
├── TEAM_RUNBOOKS.md
├── INCIDENT_RESPONSE_PLAYBOOK.md
├── RELEASE_NOTES.md
├── UAT_TEST_CASES.md
├── ENTITY_BUILDER_COMPLETE.md
├── BULLMQ_ARCHITECTURE.md
├── GITHUB_ANALYSIS_AND_STRATEGY.md
├── SPRINT_1_CHECKPOINT.md
├── architecture/
│   ├── advanced_architecture.md
│   ├── documentation_architecture.md
│   ├── nestjs_migration_plan.md
│   ├── nestjs_migration_implementation.md
│   └── nestjs_migration_verification.md
├── deployment/
│   ├── master_launch_plan.md
│   ├── public_release_roadmap.md
│   ├── complete_roadmap_phases_2_5.md
│   ├── major_version_changes.md
│   ├── seo_strategy.md
│   └── nestjs_security_hardening.md
├── guides/
│   ├── nestjs_quick_start.md
│   ├── nestjs_integration_guide.md
│   └── migration_journey.md
├── archived/
│   ├── PHASE_*.md (15 phase documents)
│   ├── EXECUTION_READINESS_CHECKLIST.md
│   ├── FINAL_PREPARATION_SUMMARY.md
│   ├── PHASES_3_4_COMPLETION_STATUS.md
│   ├── PLAN_COMPLETION_STATUS.md
│   └── STAKEHOLDER_SUMMARY.md
├── superpowers/
│   ├── roadmap/
│   ├── specs/
│   ├── plans/
│   └── cleanup_audit.sh
└── README.md
```

---

## Documentation Organization Explained

### Root Level Documentation
- **README.md** — Project overview (kept in root per Git conventions)
- **CLAUDE.md** — Project instructions for AI assistants and development rules (kept in root for reference)

### Core Directories

#### `architecture/`
Contains advanced architectural patterns, system design decisions, and NestJS migration planning:
- Advanced system design beyond the main ARCHITECTURE.md
- Complete NestJS migration roadmap and implementation details
- Documentation standards and patterns

#### `deployment/`
Production-focused documents for launching and releasing the system:
- Launch planning and public release strategy
- Security hardening and audit reports
- SEO implementation and version upgrade roadmaps

#### `guides/`
Quick-start and how-to documentation:
- NestJS integration and setup guides
- Step-by-step implementation procedures
- Migration journey walkthroughs

#### `archived/`
Historical phase documents and completed execution checklists:
- PHASE 2-5 execution guides and checklists
- Status and completion reports (now part of main docs)
- Stakeholder and preparation summaries
- Use this when researching how previous phases were executed

#### `superpowers/`
Specialized tools and scripts:
- cleanup_audit.sh — Documentation organization script
- roadmap/ — Long-term planning documents
- specs/ — Feature specifications
- plans/ — Implementation plans

---

## Key Project Instructions

For critical rules and conventions, refer to **[CLAUDE.md](/CLAUDE.md)**:

- **Frontend Rules**: Ant Design Vue, Vue Router dynamic routes, module frontend organization, API client patterns
- **Backend Rules**: ES Modules, Hybrid ORM (Prisma + Drizzle), database structure, testing with Jest
- **Editor Module**: TipTap-based visual page builder with 30+ widget blocks
- **Website Module**: CMS with pages, menus, media, and design tokens

---

## Quick Reference

### Common Tasks
- **Setting up locally?** Start with [INSTALLATION.md](INSTALLATION.md)
- **Adding a new module?** See [DEVELOPMENT.md](DEVELOPMENT.md)
- **Deploying to production?** Check [DEPLOYMENT.md](DEPLOYMENT.md) and [CPANEL_DEPLOYMENT.md](CPANEL_DEPLOYMENT.md)
- **Upgrading to NestJS?** Read [architecture/nestjs_migration_plan.md](architecture/nestjs_migration_plan.md)
- **Need security hardening info?** See [deployment/nestjs_security_hardening.md](deployment/nestjs_security_hardening.md)

### Project Stats
- **Total Modules**: 23 pluggable modules
- **Database**: MySQL (hybrid ORM: Prisma core + Drizzle modules)
- **Frontend**: Vue 3 admin panel + Nuxt 3 public site
- **Testing**: Jest with ESM support, 577 tests across 8 suites

---

## Documentation Maintenance

This documentation is maintained across three sections:

1. **Core Docs** (root & docs/) — Always current, reflects active development
2. **Architecture & Deployment** (subdirectories) — Specific technical focuses
3. **Archived Docs** (archived/) — Historical reference for completed phases

For updates to documentation or questions about structure, see [CLAUDE.md](/CLAUDE.md) for project guidelines.

---

**Last Updated**: 2026-04-25
**Documentation Version**: 2.0 (Reorganized)
