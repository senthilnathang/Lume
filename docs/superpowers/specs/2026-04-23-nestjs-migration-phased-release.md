---
name: Lume v2.0 NestJS Migration + Public Release (Phased)
description: 6-week phased NestJS migration with parallel cleanup and SEO planning for public launch
type: spec
date: 2026-04-23
---

# Lume v2.0: Phased NestJS Migration + Public Release Strategy

## Executive Summary

**Goal:** Complete NestJS migration of the Lume framework backend, cleanup documentation/code, verify security, deploy to staging, and prepare comprehensive SEO + public release strategy.

**Approach:** 3 sequential sprints (6 weeks) + 2 weeks parallel release preparation
- **Sprint 1 (Weeks 1-2):** Core NestJS foundation, auth, database, logging
- **Sprint 2 (Weeks 3-4):** 22 module migration, 256 API endpoints
- **Sprint 3 (Weeks 5-6):** Testing (512+ tests), security hardening (40+ controls), performance optimization
- **Weeks 7-8:** Cleanup, SEO, release documentation, production deployment checklist

**Timeline:** 8 weeks total (6 weeks migration + 2 weeks release prep)  
**Team:** Solo execution recommended (Claude Code agent-driven with checkpoints)  
**Current State:** Express.js backend stable, NestJS migration documented (5 docs, 18,000+ lines), not yet implemented

---

## Architecture: Layered Phased Approach

```
Phase 0: Discovery (Done)
  ✓ Express.js backend (22 modules, 49+ tables, 147 permissions)
  ✓ Vue 3 admin panel (working)
  ✓ NestJS roadmap documented (8 weeks, 5 comprehensive guides)
  ✓ Legacy code removed (server, app, database, workspace dirs)

Phase 1: Foundation (Weeks 1-2)
  Core NestJS infrastructure
    ├─ Project structure & TypeScript config
    ├─ PrismaService + DrizzleService (hybrid ORM)
    ├─ JwtService + RBAC (147 permissions)
    ├─ LoggerService + AuditService
    ├─ ValidationService + error handling
    ├─ Health check endpoint
    ├─ API versioning (/api/v2/...)
    └─ Docker build pipeline
  
  Deliverable: Running NestJS app, all core services tested, health endpoint ✓

Phase 2: Migration (Weeks 3-4)
  22 modules ported from Express to NestJS
    ├─ Automated module generator (NestJS boilerplate)
    ├─ 256 API endpoints ported (CRUD routers, custom handlers)
    ├─ Database adapters: PrismaAdapter + DrizzleAdapter
    ├─ Module dependencies resolved (base modules first, then features)
    ├─ Backward API compatibility verified
    ├─ Database migrations applied
    └─ Express.js can be decommissioned
  
  Deliverable: All 22 modules live on NestJS, all endpoints accessible, Express deprecated

Phase 3: Hardening & Production Ready (Weeks 5-6)
  Testing + Security + Performance
    ├─ Test suite: 512+ tests (auth, database, CRM, API, security)
    ├─ Security: 40+ controls (input validation, encryption, rate limiting, audit logging)
    ├─ Performance: Load testing (500 RPS, P95 < 850ms)
    ├─ Staging deployment verified
    ├─ Rollback procedures documented
    └─ Production deployment checklist ready
  
  Deliverable: Production-ready NestJS backend, security certified, performance validated

Phase 4: Release Preparation (Weeks 7-8, parallel to Phase 3 final days)
  Public launch readiness
    ├─ Code cleanup: Remove Express code, consolidate docs
    ├─ Security audit report published
    ├─ SEO strategy: Sitemap, robots.txt, schema.org, meta tags
    ├─ Nuxt 3 public site finalized
    ├─ Release notes + migration guide
    ├─ Documentation index updated
    └─ Deployment checklist finalized
  
  Deliverable: v2.0 ready for public launch, docs complete, SEO optimized
```

---

## Sprint-by-Sprint Execution Plan

### Sprint 1: Core Foundation (Weeks 1-2)

**Goal:** NestJS project running with stable core services, all foundational tests passing

**Tasks:**
1. **Project Initialization** (Day 1-2)
   - NestJS 11 project scaffold with Turbo monorepo integration
   - TypeScript 5.3 + ESLint + Prettier configuration
   - .env setup (development, staging, production templates)
   - Git branching: feature branches per component

2. **Core Services** (Day 3-5)
   - PrismaService: Database client, schema initialization
   - DrizzleService: Module table ORM client
   - LoggerService: Structured logging (Winston or Pino)
   - ValidationService: DTO validation (class-validator)
   - ErrorHandler: Centralized error responses

3. **Authentication & Authorization** (Day 6-7)
   - JwtService: Token generation, verification, refresh
   - RbacGuard: Role-based access control (147 permissions)
   - CompanyIsolation: Multi-tenant data filtering
   - Password hashing: Bcrypt middleware

4. **API Infrastructure** (Day 8-10)
   - Health check endpoint (`GET /api/health`)
   - API versioning: `/api/v2/` prefix
   - Request/response interceptors
   - CORS configuration
   - Rate limiting setup

5. **Testing & Deployment** (Day 11-14)
   - Jest configuration for NestJS + ESM
   - Unit tests: PrismaService, JwtService, ValidationService
   - Docker build: `Dockerfile`, `.dockerignore`, `docker-compose.yml`
   - Local deployment verification

**Success Criteria:**
- ✓ `npm run dev` starts NestJS on port 3000
- ✓ `GET /api/health` returns `{ status: 'ok' }`
- ✓ 50+ core tests passing
- ✓ All core services tested in isolation
- ✓ Docker image builds successfully

**Checkpoint:** Review core services code, verify all tests pass, demo health endpoint

---

### Sprint 2: Module Migration (Weeks 3-4)

**Goal:** All 22 modules ported to NestJS, 256 API endpoints functional, backward compatibility verified

**Tasks:**
1. **Module Generator** (Day 1-2)
   - Template: NestJS module structure (controller, service, entity, DTO)
   - Automated script: Generate 22 boilerplate modules
   - Dependency injection: Resolve module imports/exports

2. **Module Porting by Category** (Day 3-14, parallel where possible)
   - **Core (3 modules):** auth, user, settings
   - **Activities & Audit (2):** activities, audit
   - **Content (4):** documents, media, editor, website
   - **Communication (2):** messages, team
   - **Commerce (1):** donations
   - **Base Modules (7):** base, base_rbac, base_security, base_automation, base_customization, base_features_data, advanced_features

3. **Database Adapters** (Concurrent with porting)
   - PrismaAdapter: User, Role, Permission, RolePermission, Setting, AuditLog, InstalledModule, Menu, Group, RecordRule, Sequence
   - DrizzleAdapter: Module-specific tables (14 schemas)
   - Test: `npm run test:db` verifies all tables accessible

4. **API Endpoints** (Concurrent with porting)
   - CRUD routers: GET /, GET /:id, POST /, PUT /:id, DELETE /:id
   - Custom handlers: Login, permissions lookup, menu reorder, etc.
   - Query filtering: Domain isolation, soft deletes, pagination
   - Response format: Consistent `{ success, data }` structure

5. **Backward Compatibility** (Day 13-14)
   - API contract verification: All 256 endpoints respond to same requests
   - Database schema: No breaking changes
   - Response formats: Match Express.js output
   - Test suite: Express vs NestJS side-by-side tests

**Success Criteria:**
- ✓ 22 NestJS modules created and deployed
- ✓ 256 endpoints ported, all routes live
- ✓ All module tests passing (250+ tests)
- ✓ Database adapters working (Prisma + Drizzle)
- ✓ API contract verification complete (no breaking changes)
- ✓ Express.js code can be archived (not deleted yet)

**Checkpoint:** Full endpoint audit, load test at 50 RPS, verify zero data loss

---

### Sprint 3: Hardening & Production Ready (Weeks 5-6)

**Goal:** Production-ready NestJS backend with comprehensive testing, security controls, and performance validation

**Tasks:**
1. **Test Suite Expansion** (Day 1-4)
   - Auth tests (15 cases): Login, refresh, JWT, RBAC
   - Database tests (8 cases): Transactions, soft deletes, adapter compatibility
   - CRM tests (6 cases): Module-specific logic
   - API tests (5 cases): Rate limiting, error handling, versioning
   - Security tests (10+ cases): SQL injection, XSS, CSRF, encryption
   - Target: 512+ tests, 100% pass rate

2. **Security Hardening** (Day 5-8)
   - Input validation: Sanitize all DTOs (40+ validation rules)
   - Encryption: Sensitive fields (passwords, tokens, PII)
   - Rate limiting: Per-endpoint (auth: 5/min, API: 100/min, default 50/min)
   - CORS: Whitelist trusted origins
   - HTTPS: TLS enforcement in staging
   - Audit logging: All mutations logged (40+ log types)
   - Headers: Security headers (CSP, X-Frame-Options, X-Content-Type-Options)

3. **Performance Optimization** (Day 9-11)
   - Query caching: Redis caching for read-heavy endpoints
   - Connection pooling: MySQL connection pool tuning
   - N+1 query elimination: Eager loading verification
   - Database indexing: Add indexes for frequently queried fields
   - Load testing: 500 RPS target, measure P95, P99 latencies

4. **Staging Deployment** (Day 12-13)
   - Environment setup: staging.env with production-like config
   - Docker deployment: Deploy to local staging environment
   - Smoke tests: Health check, login, module access
   - Data seeding: Staging database with test data
   - Rollback procedure: Tested and documented

5. **Production Readiness** (Day 14)
   - Monitoring setup: Logging, error tracking (Sentry)
   - Backup procedures: Database backup scripts
   - Deployment checklist: Step-by-step production deployment guide
   - Runbook: Post-deployment verification procedures

**Success Criteria:**
- ✓ 512+ tests passing (100% pass rate)
- ✓ 0 critical vulnerabilities, 40+ security controls implemented
- ✓ Performance: P95 < 850ms @ 500 RPS (vs Express baseline)
- ✓ Staging deployment successful
- ✓ Rollback procedure tested
- ✓ Production deployment checklist finalized

**Checkpoint:** Load test results, security audit sign-off, staging deployment validation

---

## Parallel Workstreams (Weeks 3-8)

### Workstream A: Code Cleanup & Documentation (Weeks 3-4)

**Parallel to Sprint 2, after Sprint 1 stable**

**Tasks:**
1. Remove deprecated documentation
   - Delete: `PHASE_*.md`, `ENTITY_*.md`, `GITHUB_*.md`, `MIGRATION_PRODUCTION*.md`, `INCIDENT_RESPONSE*.md`, `TEAM_RUNBOOKS.md`, `ARCHITECTURE_ANALYSIS.md`
   - Consolidate into: `ARCHITECTURE.md`, `MIGRATION_STATUS.md`, `DEVELOPMENT.md`

2. Update docs index
   - Create: `docs/README.md` with consolidated index
   - Link: All remaining documentation
   - Remove: Duplicate/outdated content

3. Archive Express.js code (don't delete yet)
   - Tag commit: "Archive Express.js code (backup before NestJS cutover)"
   - Keep in git history for rollback if needed

**Deliverable:** Clean documentation, legacy docs removed, Express code archived

---

### Workstream B: Frontend & Release Prep (Weeks 5-8)

**Parallel to Sprint 3 and beyond**

**Phase 1: Vue Admin Panel Verification (Week 5-6)**
- Verify Vue admin works with NestJS backend
- Update API calls if needed (should be zero changes due to backward compatibility)
- Test all module views
- Ensure authentication flow works

**Phase 2: Nuxt 3 Public Site (Week 5-7)**
- Scaffold Nuxt 3 project
- Setup Tailwind CSS
- Create page structure:
  - `pages/index.vue` — Homepage
  - `pages/products.vue` — Product listing
  - `pages/services.vue` — Services
  - `pages/about.vue` — About page
  - `pages/contact.vue` — Contact form
  - `pages/[...slug].vue` — CMS page catch-all
- Integrate with CMS API (`/api/website/public/pages/:slug`)
- Navigation from API menus

**Phase 3: SEO Implementation (Week 7-8)**
- Sitemap generation: `public/sitemap.xml`
- Robots.txt: `public/robots.txt`
- Meta tags: Open Graph, Twitter Card, description
- Schema.org JSON-LD: Product, Organization, LocalBusiness
- Structured data validation
- Performance optimization: Image optimization, code splitting

**Phase 4: Release Documentation (Week 7-8)**
- Release notes: v2.0 features, breaking changes, migration guide
- Deployment checklist: Production deployment steps
- Post-deployment runbook: Monitoring, rollback triggers
- Public release strategy: Marketing, announcement, timeline

**Deliverable:** Vue admin verified, Nuxt site live, SEO implemented, release docs complete

---

## Success Criteria (By Week 8)

### Technical
- ✓ NestJS backend fully functional (all 22 modules, 256 endpoints)
- ✓ 512+ tests passing, 100% pass rate
- ✓ Security: 0 critical vulnerabilities, 40+ controls implemented
- ✓ Performance: P95 < 850ms @ 500 RPS (12-19% faster than Express)
- ✓ Data integrity: Zero loss, zero corruption during migration
- ✓ Vue admin panel verified with NestJS
- ✓ Nuxt 3 public site deployed and SEO optimized
- ✓ Staging environment tested and validated

### Documentation
- ✓ Architecture docs updated (NestJS instead of Express)
- ✓ Deployment guide created and tested
- ✓ Security audit report published
- ✓ Release notes and migration guide written
- ✓ Runbook for post-deployment monitoring
- ✓ SEO strategy documented

### Business
- ✓ v2.0 ready for public release
- ✓ Production deployment checklist finalized
- ✓ Team trained on NestJS codebase
- ✓ Rollback procedure tested and ready

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Sprint 1 overruns (core setup delays Sprint 2) | Medium | High | Pre-built NestJS boilerplate, Docker images, follow NESTJS_QUICK_START_GUIDE.md exactly |
| Module migration bottleneck (22 modules slow) | Medium | High | Automated module generator, parallel porting where possible, template services |
| Test coverage gaps (512+ tests insufficient) | Low | Medium | Template test suites per module, continuous CI/CD, peer review all tests |
| Performance regression (NestJS slower than Express) | Low | High | Weekly load testing, compare metrics, optimize queries/caching, rollback ready |
| Security vulnerability discovery late (Week 6) | Medium | High | Security review at Week 3, Week 5, continuous static analysis, penetration testing |
| Database migration issues | Low | Critical | Backup before migration, test on staging first, dual-DB setup for 1 week (Express + NestJS) |
| Express.js code deletion (can't rollback) | Low | Critical | Tag git commit, archive Express code, keep in history for 1 month |

---

## Execution Checklist

### Week 1-2: Sprint 1 Foundation
- [ ] NestJS project initialized, Turbo integrated
- [ ] PrismaService, DrizzleService, JwtService functional
- [ ] Health endpoint responding
- [ ] Core tests passing (50+)
- [ ] Docker image builds
- Checkpoint review

### Week 3-4: Sprint 2 Migration
- [ ] 22 NestJS modules generated
- [ ] All 256 endpoints ported
- [ ] Database adapters verified
- [ ] Backward compatibility tests passing
- [ ] Express code archived
- Checkpoint review + load test (50 RPS)

### Week 5-6: Sprint 3 Hardening
- [ ] 512+ tests passing
- [ ] Security controls implemented (40+)
- [ ] Performance optimization complete
- [ ] Staging deployment successful
- [ ] Production deployment checklist ready
- Checkpoint review + security audit sign-off

### Week 7-8: Release Preparation
- [ ] Express code cleanup/removal
- [ ] Documentation consolidated
- [ ] Vue admin verified with NestJS
- [ ] Nuxt public site deployed
- [ ] SEO implementation complete
- [ ] Release notes finalized
- [ ] Production deployment scheduled

---

## Resources & References

**NestJS Migration Documentation:**
- `NESTJS_INTEGRATION_GUIDE.md` — Master integration document (8-week timeline, checklists, decision trees)
- `NESTJS_QUICK_START_GUIDE.md` — Day-by-day tasks with executable scripts
- `NESTJS_MIGRATION_IMPLEMENTATION.md` — Code examples, service templates, module migration guide
- `NESTJS_SECURITY_HARDENING.md` — 40+ security controls with verification checklists
- `EXPRESS_TO_NESTJS_MIGRATION_VERIFICATION.md` — Current Express analysis, test suite definitions

**Existing Cleanup Plan:**
- `docs/superpowers/plans/2026-04-23-cleanup-deploy-seo.md` — Original 12-task cleanup/deployment/SEO plan

**Tech Stack:**
- Node.js 20+, NestJS 11, TypeScript 5.3, Prisma 6, Drizzle, MySQL, Redis, Jest, Docker

**Team Setup:**
- Solo execution recommended with agent-driven checkpoints
- Each sprint boundary: Review, QA, sign-off before proceeding

---

## Next Steps

1. **Approve this spec** ✓ (awaiting user confirmation)
2. **Create detailed implementation plan** → Invoke superpowers:writing-plans
3. **Execute Sprint 1** → Follow NESTJS_QUICK_START_GUIDE.md Week 1-2 tasks
4. **Review checkpoint** → Verify core services, health endpoint, tests
5. **Proceed to Sprint 2** → Module migration (Week 3-4)
6. **Finalize & Release** → Week 7-8 release preparation

---

**Status:** Design phase complete, ready for implementation planning  
**Confidence:** High (detailed roadmap exists, all documentation prepared)  
**Estimated Total Effort:** 8 weeks (6 migration + 2 release prep)  
**Completion Target:** Week 8 (public release ready)
