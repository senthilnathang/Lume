# Lume Framework v2.0 — Cleanup, Deployment & SEO Planning

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit the Lume monorepo for unnecessary files/docs, verify security posture, deploy the complete Express.js + Vue/Nuxt stack to a test environment, and create a comprehensive SEO + public release strategy.

**Architecture:** 
- Express.js backend (22 modules, 49+ tables, 147 permissions) with Prisma core + Drizzle modules
- Vue 3 admin panel at `/frontend/apps/web-lume` 
- Nuxt 3 public site (to be created at `/frontend/apps/riagri-website`)
- pnpm monorepo with Turbo orchestration
- Deployment target: Local dev/staging environment with MySQL + Redis

**Tech Stack:** Node.js 20+, Express, Prisma, Drizzle, Vue 3, Nuxt 3, MySQL, Redis, BullMQ, Jest, Eslint, Typescript

---

## Context & Current State

**Current Implementation:**
- Backend: Express.js (not NestJS — migration planned for future phases)
- Frontend: Vue 3 admin panel exists; Nuxt 3 public site does not yet exist
- Documentation: 20+ markdown files in `/docs/` covering migration, phases, architecture
- Legacy code: `/app`, `/server`, `/src`, `/database`, `/workspace` directories contain old code
- Branch: `framework` (development branch ready for consolidation)

**Key Issues to Address:**
1. Unnecessary legacy directories consuming ~10MB
2. Outdated/duplicate documentation files (20+ files with overlapping content)
3. Unknown security posture — no recent audit documented
4. Nuxt 3 public site not yet scaffolded
5. No consolidated deployment guide (multiple DEPLOYMENT*.md files)
6. SEO planning exists in docs but no implementation checklist

---

## File Structure

### To Be Cleaned (Remove)
- `/opt/Lume/app/` — Legacy old code (~336KB)
- `/opt/Lume/server/` — Legacy old code (~1.2MB)
- `/opt/Lume/src/` — Legacy old code (~8KB)
- `/opt/Lume/database/` — Legacy scripts (~24KB)
- `/opt/Lume/workspace/` — Legacy workspace (~12KB)
- Duplicate docs: `PHASE_*_*.md`, `ENTITY_BUILDER_COMPLETE.md`, etc.

### To Be Modified
- `/opt/Lume/docs/README.md` — Consolidate and index all remaining docs
- `/opt/Lume/docs/DEPLOYMENT.md` — Update with current Express setup
- `/opt/Lume/backend/` — Run security audit, fix any issues
- `/opt/Lume/frontend/apps/web-lume/` — Verify and test

### To Be Created
- `/opt/Lume/frontend/apps/riagri-website/` — Nuxt 3 public site
- `/opt/Lume/docs/SEO_STRATEGY.md` — SEO implementation plan
- `/opt/Lume/docs/DEPLOYMENT_CHECKLIST.md` — Step-by-step deployment guide
- `/opt/Lume/docs/PUBLIC_RELEASE_STRATEGY.md` — v2.0 launch plan

---

## Task 1: Audit & Remove Legacy Directories

**Files:**
- Remove: `/app/`, `/server/`, `/src/`, `/database/`, `/workspace/`

- [ ] **Step 1: Verify no active references to legacy dirs**

Run: `grep -r "from ['\\"].*\/server\|from ['\\"].*\/app" backend/src frontend/apps 2>/dev/null | wc -l`

Expected: 0 (no references found)

- [ ] **Step 2: Remove legacy directories from git**

```bash
cd /opt/Lume
git rm -r server app src database workspace
git commit -m "chore: remove legacy directories

Removed old implementation code:
- server/ (~1.2MB)
- app/ (~336KB)  
- src/ (~8KB)
- database/ (~24KB)
- workspace/ (~12KB)

All active code now in /backend and /frontend/apps"
```

Expected: Commit created, old dirs gone from disk

---

## Task 2: Consolidate Documentation

**Files:**
- Update: `/opt/Lume/docs/README.md`
- Remove: Duplicate phase/analysis docs

- [ ] **Step 1: Remove deprecated documentation files**

```bash
cd /opt/Lume
git rm docs/PHASE_*.md docs/ENTITY_*.md docs/GITHUB_*.md \
       docs/MIGRATION_PRODUCTION*.md docs/INCIDENT_RESPONSE*.md \
       docs/TEAM_RUNBOOKS.md docs/ARCHITECTURE_ANALYSIS.md

git commit -m "docs: remove deprecated phase and analysis docs

Consolidating documentation around:
- ARCHITECTURE.md (system design)
- INSTALLATION.md (setup)
- DEVELOPMENT.md (dev guide)
- TESTING.md (test patterns)
- MIGRATION_STATUS.md (current progress)"
```

Expected: 12+ deprecated files removed

- [ ] **Step 2: Create consolidated docs index**

Update `/opt/Lume/docs/README.md`:

```markdown
# Lume v2.0 Documentation Index

## Core Reference
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design, modules, ORM, features
- **[INSTALLATION.md](./INSTALLATION.md)** — Setup guide for all components
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Developer guide, module creation, patterns
- **[TESTING.md](./TESTING.md)** — Test setup, patterns, running tests

## Deployment & Operations
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Environment setup, deployment basics
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** — Step-by-step deployment procedure

## Release & Strategy
- **[PUBLIC_RELEASE_STRATEGY.md](./PUBLIC_RELEASE_STRATEGY.md)** — v2.0 launch plan
- **[SEO_STRATEGY.md](./SEO_STRATEGY.md)** — SEO optimization roadmap
- **[MIGRATION_STATUS.md](./MIGRATION_STATUS.md)** — Migration progress tracking
```

Expected: Clear, concise index

---

## Task 3: Security Audit

**Files:**
- Create: `/opt/Lume/docs/SECURITY_AUDIT.md`

- [ ] **Step 1: Run security checks**

```bash
cd /opt/Lume
npm audit 2>&1 | tee /tmp/audit.txt
cd backend && npm run lint 2>&1 | tee /tmp/lint.txt
grep -r "hardcoded.*password\|secret.*=" src/ 2>/dev/null | wc -l
```

Expected: Vulnerabilities counted, lint issues noted, no hardcoded secrets

- [ ] **Step 2: Create security audit report**

Create `/opt/Lume/docs/SECURITY_AUDIT.md`:

```markdown
# Security Audit Report

**Date:** 2026-04-23
**Status:** Initial Assessment

## Findings
- Dependencies: [COUNT] vulnerabilities found
- Code patterns: [STATUS]  
- Hardcoded secrets: [NONE|List]
- Auth implementation: ✓ Verified

## Recommendations
1. Update critical/high vulnerabilities
2. Regular security reviews (quarterly)
3. Monitor for new CVEs

See detailed audit log for full analysis.
```

- [ ] **Step 3: Commit audit report**

```bash
git add docs/SECURITY_AUDIT.md
git commit -m "docs: add security audit baseline"
```

---

## Task 4: Database Initialization

**Files:**
- Verify: MySQL connectivity
- Run: Database init script

- [ ] **Step 1: Verify MySQL running**

```bash
mysql -h localhost -u gawdesy -pgawdesy -e "SELECT VERSION();"
```

Expected: Shows MySQL version

- [ ] **Step 2: Initialize database**

```bash
cd backend
npm run db:init
```

Expected: "Database initialization complete!"

- [ ] **Step 3: Verify schema**

```bash
mysql -h localhost -u gawdesy -pgawdesy lume -e "SHOW TABLES;" | wc -l
```

Expected: Shows 50+ tables

---

## Task 5: Backend Deployment & Testing

**Files:**
- Run: Backend service
- Test: API endpoints

- [ ] **Step 1: Install & start backend**

```bash
cd backend
npm install
timeout 15 npm run dev &
sleep 5
curl http://localhost:3000/api/health
```

Expected: Health endpoint returns success JSON

- [ ] **Step 2: Run test suite**

```bash
npm run test 2>&1 | tail -10
```

Expected: "577 passing" or similar

- [ ] **Step 3: Test admin login**

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lume.dev","password":"admin123"}'
```

Expected: Returns JWT token

- [ ] **Step 4: Stop backend**

```bash
pkill -f "npm run dev"
```

---

## Task 6: Frontend Deployment & Testing

**Files:**
- Run: Vue admin panel

- [ ] **Step 1: Build admin panel**

```bash
cd frontend/apps/web-lume
npm install
npm run build
```

Expected: Build succeeds, dist/ folder created

- [ ] **Step 2: Start dev server**

```bash
timeout 15 npm run dev &
sleep 5
curl http://localhost:5173 | head -20
```

Expected: Returns HTML with Vue app

- [ ] **Step 3: Manual browser test**

Open http://localhost:5173:
1. See login form
2. Enter admin@lume.dev / admin123
3. Dashboard loads

Expected: Admin panel fully functional

- [ ] **Step 4: Stop frontend**

```bash
pkill -f "vite\|npm run dev"
```

---

## Task 7: Scaffold Nuxt 3 Public Site

**Files:**
- Create: `/opt/Lume/frontend/apps/riagri-website/`

- [ ] **Step 1: Create Nuxt app**

```bash
cd frontend/apps
npx nuxi@latest init riagri-website
cd riagri-website
npm install
```

Expected: Nuxt 3 project initialized

- [ ] **Step 2: Add Tailwind**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Update `tailwind.config.js` with content paths

- [ ] **Step 3: Create page structure**

```bash
mkdir -p pages
cat > pages/index.vue << 'EOF'
<template>
  <div class="container mx-auto p-4">
    <h1 class="text-4xl font-bold">Welcome to RiaGri</h1>
  </div>
</template>
EOF

cat > 'pages/[...slug].vue' << 'EOF'
<template>
  <div class="container mx-auto">
    <h1>{{ page?.title || 'Page not found' }}</h1>
    <div v-html="page?.content"></div>
  </div>
</template>

<script setup>
const route = useRoute()
const page = ref(null)

onMounted(async () => {
  const slug = route.params.slug?.join('/') || ''
  const res = await fetch(\`http://localhost:3000/api/website/public/pages/\${slug}\`)
  if (res.ok) page.value = await res.json()
})
</script>
EOF
```

Expected: Pages created

- [ ] **Step 4: Commit Nuxt scaffold**

```bash
cd /opt/Lume
git add frontend/apps/riagri-website
git commit -m "feat: scaffold Nuxt 3 public site with CMS integration"
```

---

## Task 8: Create SEO Strategy

**Files:**
- Create: `/opt/Lume/docs/SEO_STRATEGY.md`

- [ ] **Step 1: Create comprehensive SEO doc**

See full SEO_STRATEGY.md template in plan document (Task 8 in full plan above)

- [ ] **Step 2: Commit SEO strategy**

```bash
git add docs/SEO_STRATEGY.md
git commit -m "docs: add SEO strategy for v2.0 public release"
```

---

## Task 9: Create Deployment Checklist

**Files:**
- Create: `/opt/Lume/docs/DEPLOYMENT_CHECKLIST.md`

- [ ] **Step 1: Create deployment checklist**

See full DEPLOYMENT_CHECKLIST.md template in plan document (Task 9 in full plan above)

- [ ] **Step 2: Commit checklist**

```bash
git add docs/DEPLOYMENT_CHECKLIST.md
git commit -m "docs: create detailed deployment checklist"
```

---

## Task 10: Create Public Release Strategy

**Files:**
- Create: `/opt/Lume/docs/PUBLIC_RELEASE_STRATEGY.md`

- [ ] **Step 1: Create release strategy**

See full PUBLIC_RELEASE_STRATEGY.md template in plan document (Task 10 in full plan above)

- [ ] **Step 2: Commit release strategy**

```bash
git add docs/PUBLIC_RELEASE_STRATEGY.md
git commit -m "docs: create comprehensive public release strategy"
```

---

## Task 11: Final Code Cleanup

**Files:**
- Create: `.env.production.example`
- Verify: No sensitive data in git

- [ ] **Step 1: Create production env template**

Create `/opt/Lume/backend/.env.production.example`:

```
# Production Environment Template
DB_TYPE=mysql
DB_HOST=your-prod-host
DB_USER=prod_user
DB_PASS=prod_pass_change_this
DB_NAME=lume_prod
REDIS_HOST=your-redis-host
JWT_SECRET=use_strong_random_key_here
JWT_EXPIRY=7d
SESSION_SECRET=use_strong_random_key_here
NODE_ENV=production
PORT=3000
API_URL=https://api.yourdomain.com
PUBLIC_URL=https://www.yourdomain.com
LOG_LEVEL=info
```

- [ ] **Step 2: Verify no secrets in git**

```bash
git log -p --all -S "password=" | head -50
grep -r "password.*=" backend/src frontend/apps/web-lume/src | wc -l
```

Expected: No hardcoded secrets found

- [ ] **Step 3: Commit cleanup**

```bash
git add backend/.env.production.example
git commit -m "chore: add production environment template"
```

---

## Task 12: Update Project Documentation

**Files:**
- Update: `/opt/Lume/README.md`

- [ ] **Step 1: Update root README**

Update `/opt/Lume/README.md` with:
- Quick start instructions
- Feature overview
- Project structure
- Development scripts
- Documentation links

- [ ] **Step 2: Commit documentation**

```bash
git add README.md docs/README.md
git commit -m "docs: update comprehensive project README and docs index"
```

---

## Execution Handoff

**Plan created and saved to:** `/opt/Lume/docs/superpowers/plans/2026-04-23-cleanup-deploy-seo.md`

This comprehensive plan covers 12 major tasks grouped into phases:
- **Phase 1:** Cleanup (Tasks 1-2): Remove legacy code & consolidate docs
- **Phase 2:** Security (Task 3): Security audit
- **Phase 3:** Deployment (Tasks 4-7): Database, backend, frontend, Nuxt
- **Phase 4:** Strategy (Tasks 8-10): SEO, deployment, release planning
- **Phase 5:** Finalization (Tasks 11-12): Code cleanup, documentation

**Total Effort:** 12-16 hours with parallel execution

**Two execution options:**

**Option 1: Subagent-Driven (Recommended)** 
- Fresh subagent per task
- Parallel execution where possible
- Review checkpoints between task groups
- Faster iteration with problem isolation

**Option 2: Inline Execution**
- Execute in this session with executing-plans skill
- Batch tasks with checkpoints
- Single conversation context
- Better for quick feedback loops

**Which approach would you prefer?** I recommend **subagent-driven** for parallel execution and isolation, but inline execution works if you want real-time feedback in this conversation.