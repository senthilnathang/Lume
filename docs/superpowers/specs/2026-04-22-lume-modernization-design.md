# Lume Framework Modernization Design
**Date:** 2026-04-22  
**Scope:** Comprehensive modernization across frontend, backend, build tooling, testing, and observability  
**Timeline:** 8 phases, big bang deployment  
**Execution:** Continuous (no approval gates between phases)

---

## Executive Summary

Modernize Lume Framework to current web standards and best practices:
- **Tailwind CSS 4** with CSS variables and improved theming
- **Monorepo structure** with shared configs (inspired by FastVue)
- **Turbo** for build orchestration
- **All dependencies** to latest stable versions
- **Comprehensive testing** (Jest, Vitest, Playwright)
- **Security hardening** and observability
- **Full documentation** with architecture and migration guides

**Constraints (Preserved):**
- Keep Ant Design Vue (stable, feature-rich)
- Preserve 23-module architecture
- Maintain stable API contracts
- MySQL as primary database

---

## Phase Overview

```
Phase 1: Dependencies Update (Week 1)
Phase 2: Build Tooling & Monorepo Structure (Week 2)
Phase 3: Frontend Modernization - Tailwind 4 (Week 3)
Phase 4: Testing Infrastructure (Week 4)
Phase 5: Backend Optimizations & Security (Week 5)
Phase 6: Observability & Monitoring (Week 6)
Phase 7: Integration Testing & Performance Validation (Week 7)
Phase 8: Documentation & Deployment Prep (Week 8)
```

---

## Phase 1: Dependencies Update

**Goal:** Update all core packages to latest compatible versions

### Backend Dependencies
- **Express:** 4.18.2 → 4.21.0
- **Prisma:** 5.22.0 → 5.24.0
- **Drizzle ORM:** 0.45.1 → 0.46.0+
- **Jest:** 29.7.0 → 30.0.0+ (better ESM support)
- **Node:** >=18.0.0 → >=20.12.0
- **Security packages:** bcryptjs, helmet, express-rate-limit to latest
- **Logging:** Winston 3.11.0 → 3.14.0+
- **Database drivers:** mysql2 3.20.0 → 3.21.0+, pg 8.20.0 → 8.21.0+

### Frontend Dependencies
- **Vue:** 3.5.30 → 3.6.0+
- **Vite:** 5.4.0 → 5.6.0+
- **Vue Router:** 4.4.0 → 4.5.0+
- **Ant Design Vue:** 4.2.0 → 4.3.0+ (keep this)
- **Vitest:** 2.1.0 → 2.3.0+
- **Playwright:** 1.49.0 → 1.50.0+
- **TypeScript:** 5.6.0 → 5.7.0+
- **Tailwind CSS:** 3.4.14 → stays for now (upgraded in Phase 3)

### Actions
- Update all package.json files
- Run pnpm install with lockfile revalidation
- Fix type errors from breaking changes
- Run all tests to verify compatibility
- Audit for security vulnerabilities

---

## Phase 2: Build Tooling & Monorepo Structure

**Goal:** Modernize build infrastructure, introduce shared configs

### New Monorepo Structure
```
lume/
├── packages/
│   ├── @lume/eslint-config/
│   ├── @lume/prettier-config/
│   ├── @lume/tsconfig/
│   ├── @lume/tailwind-config/     (Tailwind 4, theme design tokens)
│   └── @lume/ui-components/       (Shared Vue 3 components)
├── backend/
├── apps/
│   ├── web-lume/                  (admin Vue 3 SPA)
│   └── riagri-website/            (Nuxt 3 public site)
├── turbo.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

### Tooling Setup
- **turbo:** ^1.14.0 (build orchestration)
- **Shared configs:** ESLint, Prettier, TypeScript, Tailwind
- **Workspace aliases:** `@lume/*` for imports
- **pnpm workspace:** Shared dependency resolution
- **CI/CD:** Turbo caching, parallel test execution

### Actions
- Scaffold monorepo structure
- Create shared config packages
- Configure turbo.json with cache rules
- Migrate ESLint/Prettier configs to shared setup
- Update CI/CD pipelines

---

## Phase 3: Frontend Modernization - Tailwind 4

**Goal:** Upgrade Tailwind 3 → 4 with CSS variables and modern theming

### What's New in Tailwind 4
- CSS-first configuration with `@theme` directive
- Built-in CSS variables (30% CSS reduction)
- Simplified dark mode
- Better theming capabilities

### Migration Steps
1. Update tailwind.config.ts with CSS variables
2. Update Ant Design Vue theming to use Tailwind 4 CSS variables
3. Update template syntax for new utilities
4. Remove manual color abstractions
5. Improve dark mode with CSS variables
6. Remove tailwind-merge (less needed)

### Ant Design Vue Integration
- Ant Design Vue 4.3+ supports CSS variable theming
- Create CSS variable overrides for theme colors
- Keep a-config-provider for component configuration

### Actions
- Install tailwindcss 4.2.2+
- Rewrite tailwind.config files (both apps)
- Create Tailwind 4 CSS variables in globals.css
- Update Ant Design theming
- Audit and update Vue components
- Run E2E tests on all pages
- Validate dark mode switching

---

## Phase 4: Testing Infrastructure

**Goal:** Modernize testing with Jest, Vitest, and Playwright

### Backend Testing
- Jest 30+ for unit and integration tests
- Test database setup per test suite
- Coverage target: 80%+
- API integration tests for all CRUD routes
- Permission/auth tests per module

### Frontend Testing
- Vitest for unit tests (faster, Vue 3 optimized)
- Playwright for E2E (cross-browser)
- Component tests for critical components
- Admin panel: login, modules, CRUD
- Public site: navigation, rendering, responsive
- Editor: blocks, page builder
- Website: pages, menus

### Test Structure
```
backend/tests/
├── unit/
├── integration/
└── e2e/

frontend/apps/web-lume/tests/
├── unit/
└── e2e/

frontend/apps/riagri-website/tests/
├── unit/
└── e2e/
```

### CI/CD Integration
- Parallel test execution with turbo
- Coverage reports (80% threshold)
- Block PR merge if tests fail

### Actions
- Migrate Jest to ESM best practices
- Setup Vitest for frontend
- Create Playwright test suite
- Write 20+ E2E tests
- Set coverage thresholds

---

## Phase 5: Backend Optimizations & Security

**Goal:** Performance and security hardening

### ORM & Database Optimization
- Prisma: Add select/omit to optimize queries
- Drizzle: Optimize joins, add indexes
- Query performance baseline
- Slow query logging

### Security Hardening
- **Helmet:** All security headers (CSP, HSTS, X-Frame-Options)
- **Rate limiting:** Per-endpoint granularity
- **CORS:** Restrict to known origins
- **Input validation:** Express-validator for all endpoints
- **SQL injection:** Verify parameterized statements
- **XSS prevention:** Validate/sanitize user input
- **CSRF protection:** Token validation

### Caching Strategy
- Redis for session storage
- Redis for module template caching
- Cache invalidation on updates

### API Versioning
- Version header support (Accept: application/vnd.lume.v2+json)
- Deprecation warnings (maintain v1 API during transition)

### Error Handling
- Standardized error responses
- Request correlation IDs
- No stack traces in production

### Actions
- Security audit of endpoints
- Configure Helmet
- Optimize top 10 slowest queries
- Implement caching layer
- Add input validation rules
- Create API security tests

---

## Phase 6: Observability & Monitoring

**Goal:** Logging, tracing, metrics, error tracking

### Logging Strategy
- Winston: structured JSON logging
- Log levels: error, warn, info, debug
- Context: user ID, request ID, module name
- Rotation: daily, 30-day retention

### Application Tracing
- Request correlation IDs (uuid per request)
- Log request start/end, duration, status
- Middleware timing
- Module initialization timing

### Error Tracking
- Error categorization (system, business logic, validation)
- Error context (user, request, module)
- Sentry integration (optional for production)

### Performance Metrics
- Response time per endpoint
- Database query duration
- Cache hit/miss rates
- Module load times

### Frontend Observability
- Error boundary component
- Core Web Vitals monitoring
- Optional analytics tracking

### Actions
- Configure Winston logging
- Add request correlation middleware
- Create error boundary component
- Add performance monitoring
- Set up log aggregation

---

## Phase 7: Integration Testing & Performance Validation

**Goal:** End-to-end workflows, performance benchmarks, regression detection

### Test Scenarios
1. **Admin Panel:**
   - Login → Navigate → CRUD → Logout
   - Module installation/uninstallation
   - Permission management

2. **Editor Module:**
   - Create page → Add blocks → Save → Publish

3. **Website Module:**
   - Create pages → Organize menu → Publish
   - Forms and submissions

4. **Public Site:**
   - Navigation, content rendering, responsive

5. **API Contracts:**
   - All CRUD endpoints functional
   - Consistent error responses
   - Auth/authz enforced

### Performance Benchmarks
- Admin login: < 1s
- Page load: < 3s (FCP)
- API response: < 200ms (p95)
- Bundle size reduction from Tailwind 4

### Regression Testing
- Automated E2E suite
- Module inter-dependencies
- API backward compatibility

### Actions
- Run full E2E test suite
- Performance profiling (Lighthouse)
- Load testing (optional)
- Create regression baselines

---

## Phase 8: Documentation & Deployment Prep

**Goal:** Update docs, create migration guide, prepare deployment

### Documentation Updates
- **ARCHITECTURE.md:** Monorepo structure, new patterns
- **DEVELOPMENT.md:** Build process (turbo, configs)
- **TESTING.md:** Vitest, Playwright guide
- **MIGRATION_GUIDE.md:** Upgrade from v1 to v2
- **API.md:** All endpoints with version support
- **TAILWIND_4_GUIDE.md:** CSS variables, theming

### Changelog
- Major version: 1.x → 2.0
- Breaking changes documented
- Migration guide for projects
- New features highlighted

### Deployment Checklist
- Database migrations (if any)
- Environment variables
- Redis setup (if caching)
- Rollback plan (keep v1.x branch)
- Smoke tests on staging

### Release Process
- Tag as v2.0.0
- GitHub release notes
- Announce breaking changes
- Provide migration guide

### Actions
- Update all documentation
- Create migration guide
- Tag release
- Create deployment checklist

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Tailwind 4 CSS variables | Reduce bloat, better theming, modern standard |
| Keep Ant Design Vue | Stable, feature-rich, well-maintained |
| Monorepo with turbo | Better DX, shared configs, faster builds |
| Jest for backend | Mature, stable, good ESM support |
| Vitest for frontend | Faster, modern, excellent Vue 3 support |
| Continuous execution | No approval gates, faster delivery |
| Big bang deployment | One release, easier rollback |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Tailwind 4 compatibility | Test early, create fallback CSS variables |
| Large merge conflicts | Keep branch synced, resolve daily |
| Build slowness | Aggressive caching, optimize workflow |
| Breaking changes | Keep v1 API during transition |
| Testing gaps | Parallel writing, high thresholds |
| Performance regression | Baseline benchmarks, measure each phase |

---

## Success Criteria

✅ All dependencies updated to latest versions  
✅ Monorepo structure working with turbo orchestration  
✅ Tailwind 4 fully integrated with Ant Design Vue  
✅ 80%+ test coverage across codebase  
✅ All security hardening implemented  
✅ Observability and logging in place  
✅ E2E tests passing (20+)  
✅ Performance benchmarks met (login < 1s, page < 3s, API < 200ms)  
✅ Full documentation updated  
✅ v2.0.0 released and deployable  

---

## Appendices

### Technology Versions
- Node: 20.12.0+
- pnpm: 10.0.0+
- Express: 4.21.0
- Prisma: 5.24.0
- Drizzle: 0.46.0+
- Vue: 3.6.0+
- Vite: 5.6.0+
- Tailwind: 4.2.2
- Jest: 30.0.0+
- Vitest: 2.3.0+
- Playwright: 1.50.0+

### References
- FastVue Frontend: /opt/FastVue/frontend (monorepo reference)
- Tailwind 4 Docs: https://tailwindcss.com
- Turbo Docs: https://turbo.build
- Vue 3 Composition API: https://vuejs.org

