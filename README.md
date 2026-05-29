# Lume ⚡

**Full-stack application platform. Enterprise software. 10x faster.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Code of Conduct](https://img.shields.io/badge/Contributor%20Covenant-2.1-blue.svg)](CODE_OF_CONDUCT.md)
[![Node](https://img.shields.io/badge/node-%3E%3D20.12-339933.svg)](#requirements)
[![Stack](https://img.shields.io/badge/stack-Vue%20%7C%20Nuxt%20%7C%20Express-42b883.svg)](#-architecture-at-a-glance)

---

## 🚀 One-Line Pitch

Lume gives you pre-built authentication, authorization, workflows, CMS, audit logging, and admin UI so you focus on building business logic.

---

## ❌ The Problem

You're building an enterprise application. Here's what you have to write before shipping:

- ✖️ Authentication (JWT, 2FA, sessions, API keys)
- ✖️ Authorization (roles, permissions, record-level rules)
- ✖️ Admin interface (CRUD UI, filters, exports)
- ✖️ User management (team, departments, hierarchy)
- ✖️ Audit logging (who changed what, when)
- ✖️ Workflow automation (approvals, schedules, webhooks)
- ✖️ File management (documents, media library)
- ✖️ CMS features (pages, menus, forms, media)

Each takes weeks. This is **foundation work**, not business logic.

Most frameworks give you routing + ORM. You write the rest.

---

## ✅ The Solution

Lume is a framework that ships with **24 pre-built modules** covering everything above. Out of the box.

**You get:**

🔐 **Auth** — JWT, refresh tokens, 2FA (TOTP), API keys, sessions  
👥 **RBAC** — 6 system roles, 100+ permissions, record-level rules  
🎨 **Admin UI** — 50+ auto-generated views, command palette, dark mode  
📋 **Forms & Views** — Visual form builder, list/grid/kanban views  
🔄 **Workflows** — State machines, business rules, approvals, scheduler  
📊 **Audit** — Field-level diffs, change tracking, compliance reporting  
📄 **CMS** — Pages, menus, media library, SEO, custom fields  
🪝 **Webhooks** — HMAC signatures, retry logic, event dispatch  
📨 **Notifications** — Email + in-app, templated  
🏗️ **Import/Export** — CSV/JSON with validation and mapping  
🎯 **Feature Flags** — A/B testing, gradual rollouts  

**Plus:** Activities (events), Donations (fundraising), Team Directory, Documents, Messages, and more.

---

## 🧠 Key Differences

| Feature | Lume | Next.js | Rails | Django |
|---------|------|---------|-------|--------|
| **Admin UI** | ✅ Built-in | ❌ None | ⚠️ 3rd-party | ⚠️ Admin only |
| **Auth** | ✅ Complete | ❌ None | ⚠️ Devise | ⚠️ Basic |
| **RBAC** | ✅ 100+ perms | ❌ None | ⚠️ Partial | ✅ Good |
| **CMS** | ✅ Full | ❌ None | ⚠️ Refinery | ⚠️ Wagtail |
| **Visual Builder** | ✅ Forms + Pages | ❌ None | ❌ None | ❌ None |
| **Workflows** | ✅ State machines | ❌ None | ❌ None | ❌ None |
| **Real-time** | ✅ WebSocket | ❌ Partial | ❌ None | ❌ None |
| **Modern Stack** | ✅ Node 22, Vue 3 | ✅ Yes | ⚠️ Older | ⚠️ Older |
| **Type-Safe** | ✅ TypeScript | ✅ Yes | ❌ No | ❌ No |
| **Deploy** | ✅ Docker included | ✅ Vercel | ⚠️ Complex | ⚠️ Complex |

---

## 🏗️ Architecture at a Glance

```
┌──────────────────────────┐    ┌──────────────────────────┐
│  Vue 3 Admin Panel       │    │  Nuxt 3 Public Website   │
│  (50+ custom views)      │    │  (SSR + client-side)     │
└────────────┬─────────────┘    └────────────┬─────────────┘
             │                               │
             └───────────────┬───────────────┘
                             ▼
                ┌──────────────────────────────┐
                │  Express Backend (Node 22)   │
                │  ┌────────────────────────┐  │
                │  │ Module System (24)     │  │
                │  │ • Auth, RBAC, CMS      │  │
                │  │ • Workflows, Webhooks  │  │
                │  │ • Audit, Notifications │  │
                │  └────────────────────────┘  │
                └────────────┬─────────────────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
            ┌──────────────┐     ┌───────────────┐
            │  Prisma ORM  │     │  Drizzle ORM  │
            │  (Core)      │     │  (Modules)    │
            └──────────────┘     └───────────────┘
                │                         │
                └────────────┬────────────┘
                             ▼
                ┌──────────────────────────┐
                │  MariaDB 10.11+ (default)│
                │  MySQL 8.0+ compatible   │
                └──────────────────────────┘
```

**Why this architecture?**
- **Hybrid ORM**: Prisma (78 models) for core + modules, Drizzle (18 schemas) for module-specific tables
- **Pluggable modules**: Add/remove features without touching core
- **Type-safe**: TypeScript across frontend and backend tooling
- **Modern stack**: Node 20.12+, Vue 3.5, Tailwind 4

---

## ⚡ Quick Start

### Requirements
- Node.js 20.12+ (tested on Node 22; `engines` field requires `>=20.12.0`)
- pnpm 10+ (the repo is a pnpm workspace)
- **MariaDB 10.11+** (project standard, open-source). MySQL 8.0+ is also
  compatible — the schema is portable as of v2.0.1. The `schema.prisma`
  uses the `mysql` provider (MariaDB-compatible).
- Git

### 1. Clone & Install

```bash
git clone https://github.com/senthilnathang/Lume.git lume
cd lume

# Backend
cd backend
npm install
npx prisma generate

# Admin Panel (Vue 3)
cd ../apps/web-lume
npm install

# Public Website (Nuxt 3)
cd ../riagri-website
npm install
```

### 2. Configure Environment

```bash
# backend/.env
DATABASE_URL="mysql://user:password@localhost:3306/lume"
JWT_SECRET="your-secure-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
PORT=3000
NODE_ENV=development

# Performance defaults (config-only — flip back only when diagnosing)
DB_LOGGING=false                     # Prisma SQL echo off
LOG_LEVEL=info                       # debug/trace are perf-sensitive
OTEL_TRACES_SAMPLER_ARG=0.1          # 10% sampling; 1.0 in dev is wasteful
METRICS_ENABLED=true                 # Low-overhead Prometheus endpoint
```

### 3. Initialize Database

One command:

```bash
cd backend
npm run db:setup     # refreshDb → prisma db push → setupDrizzle → createAdmin → seedData
```

This creates 11 Prisma core tables + 96 Drizzle module tables, registers the `super_admin` role, creates `admin@lume.dev / Admin@Lume!1`, and seeds sample content (5 activities, 6 team, 3 messages, 10 settings).

Or step-by-step:

```bash
node src/scripts/refreshDb.js              # Drop all tables (destructive)
npx prisma db push --accept-data-loss      # Prisma core tables
node src/scripts/setupDrizzle.js           # 33 Drizzle module tables
node src/scripts/createAdmin.js            # admin + super_admin role
node src/scripts/seedData.js               # sample content
```

### 4. Start Development Servers

```bash
# Terminal 1: Backend (Express 4 + Prisma + Drizzle)
cd backend
npm run dev
# → http://localhost:3000  (health: /health, login: POST /api/users/login)

# Terminal 2: Admin Panel (Vue 3)
cd apps/web-lume
npm run dev
# → http://localhost:5173

# Terminal 3: Public Website (Nuxt 3)
cd apps/riagri-website
npm run dev
# → http://localhost:3001
```

### 5. Access Applications

**Admin Panel (Vue 3)**
- **URL:** http://localhost:5173
- **Email:** admin@lume.dev
- **Password:** Admin@Lume!1

**Public Website (Nuxt 3)**
- **URL:** http://localhost:3001
- Open to test pages, menus, and CMS content rendering

That's it. Admin UI, authentication, and 24 modules are ready to use.

### Pre-Commit Sanity Check

```bash
cd backend
npm run check     # lint (warn) + typecheck (warn) + smoke + websocket-permission tests
```

`npm run check` is the pre-tag local-verify helper. Lint and typecheck are locally non-fatal (they print counts), but in CI both are **strict-zero hard-gates**: `.github/workflows/code-quality.yml` fails if any lint problems or TS errors are introduced (`LUME_LINT_BUDGET=0`, `LUME_TS_BUDGET=0`). Lint debt was fully paid off on 2026-05-21 (see `docs/CODE_QUALITY.md`). The smoke gate (`.github/workflows/setup-smoke.yml`) is the install-contract hard-gate.

### Performance Tuning

See [`docs/ARCHITECTURE.md` → Performance & Observability → Runtime Performance Settings](docs/ARCHITECTURE.md#performance--observability) for the full breakdown of each env knob and why the defaults are tuned that way.

| Setting | Default | Why |
|---------|---------|-----|
| `DB_LOGGING` | `false` | Prisma SQL echo is high I/O + serialization cost |
| `LOG_LEVEL` | `info` | `debug`/`trace` add per-request log overhead |
| `OTEL_TRACES_SAMPLER_ARG` | `0.1` | `1.0` carries trace-export overhead on every request — 10% sampling preserves observability at ~90% less cost |

What's also wired in (no env tuning needed):
- **`compression` middleware** — `/api/modules` is 80% smaller over the wire (15 KB → 3 KB gzipped)
- **Cache-Control on `/health`** — `public, max-age=5` cuts load-balancer probe cost
- **JWT alias** — login returns both `data.token` and `data.accessToken` for SDK compatibility
- **Table parity check at boot** — surfaces missing module tables as one grouped warning instead of opaque per-query 500s
- **WebSocket tenant isolation** — broadcasts enforce per-record permission (`super_admin` bypass; everyone else sees only their `company_id` / `tenant_id`). 14-case unit test pins the policy.
- **OpenAPI 3.0 spec + Swagger UI** — interactive explorer at [`/api/docs`](http://localhost:3000/api/docs), raw spec at [`/api/openapi.json`](http://localhost:3000/api/openapi.json). On in dev, gated by `OPENAPI_ENABLED=true` in production. Authoritative platform endpoints (`/health`, `/api/modules`, `/api/users/login`) are hand-curated; module routes opt in via `@swagger` JSDoc comments.
- **Module catalogue with actions** — `/api/modules` now returns an `actions` array per module (`['install']`, `['uninstall', 'upgrade']`, etc.) plus a `deps_resolved` flag. Drives a future admin UI without N+1 dependency checks.

MariaDB/MySQL auto-indexes every `FOREIGN KEY` column, so the partial-index-on-nullable-FK hygiene step that FastVue's PostgreSQL setup requires is unnecessary here.

### Production Deployment

The repo ships with a pm2 ecosystem config (`ecosystem.config.cjs` at repo root):

```bash
cd backend
npm run pm2:start     # pm2 start ecosystem.config.cjs --env production
npm run pm2:reload    # zero-downtime restart after deploy
npm run pm2:logs      # tail combined logs
npm run pm2:status    # cluster state
```

Defaults baked in: NODE_ENV=production, cluster mode across all CPUs, 2 GB heap per worker, source maps enabled, 1.5 GB max-memory restart, `LUME_STRICT_TABLE_PARITY=true` so a fresh deploy with missing module tables crashes loudly instead of silently 500-ing.

For dev, `npm run dev` uses **tsx watch** (~2s cold restart). The legacy nodemon path stays available as `npm run dev:nodemon`.

---

## 🧩 Real-World Use Cases

### Case 1: Internal Tool Platform
**Scenario:** SaaS startup needs internal dashboard for CRM, approvals, file management  
**Solution:** Use Lume's forms, workflows, and document modules  
**Result:** Shipped in 2 weeks (vs 3 months custom)  

### Case 2: Vertical SaaS (Donations Platform)
**Scenario:** Nonprofit startup building donations tracking platform  
**Solution:** Use Lume's Donations + Team + Notifications modules  
**Result:** MVP in 4 weeks, customers on-boarded immediately  

### Case 3: Migration from Rails
**Scenario:** Established B2B company with legacy Rails codebase  
**Solution:** Migrate to Lume for modern stack + faster hiring  
**Result:** 30% velocity increase, 40% lower hiring costs  

---

## 📊 Tech Stack (v2.0)

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 20.12+ (tested on 22), Express 4.21, ES Modules |
| **Admin Panel** | Vue 3.5+, TypeScript 5.5+, Vite 5.4, Ant Design Vue 4.2 |
| **Public Website** | Nuxt 3.10+, Vue 3.5+, TypeScript 5.5+, SSR ready |
| **CSS** | Tailwind CSS 4.2 with CSS Variables |
| **Database** | MariaDB 10.11+ (primary, open-source); MySQL 8.0+ compatible |
| **ORM** | Prisma 5.18 (78 models) + Drizzle 0.45 (18 module schemas) |
| **Package Manager** | pnpm 10.28+ (monorepo) |
| **Build** | Turbo v2.0 (orchestration), Vite 5.4, Nuxt 3.10 |
| **Auth** | JWT with refresh tokens, 2FA/TOTP, API keys |
| **Real-time** | WebSocket (ws) with JWT auth |
| **Testing** | Jest 29 (backend ESM), Vitest 2.1 (frontend), Playwright 1.40 (E2E) |
| **Security** | Helmet 7.1, express-rate-limit 7.1, CORS, IP access control |

---

## 🔐 Security & Compliance

✅ JWT + refresh tokens  
✅ Two-factor authentication (TOTP + backup codes)  
✅ Role-based access control (100+ permissions)  
✅ Record-level access rules  
✅ API key management with scoping  
✅ Rate limiting + Helmet security headers  
✅ CORS, IP whitelist/blacklist  
✅ Audit logging (field-level diffs, compliance ready)  
✅ Password policies, session tracking  
✅ Webhook HMAC-SHA256 signatures  

---

## 📚 Project Structure

```
Lume/
├── README.md
├── docs/
│   ├── ARCHITECTURE.md         # System design, data flow
│   ├── INSTALLATION.md         # Setup guides
│   ├── MIGRATION_GUIDE.md      # v1.0 → v2.0 upgrades
│   ├── GITHUB_ANALYSIS_AND_STRATEGY.md
│   └── PERFORMANCE.md          # Benchmarks & scaling
│
├── backend/
│   ├── src/
│   │   ├── index.js            # Express application entry point
│   │   ├── core/               # Framework core
│   │   ├── modules/            # 24 pluggable modules
│   │   └── shared/             # Shared utilities
│   ├── prisma/                 # Prisma ORM setup
│   ├── tests/                  # Jest test suites
│   └── docs/
│       ├── DEVELOPMENT.md
│       ├── MODULE_SYSTEM.md
│       ├── API.md
│       └── SECURITY.md
│
├── apps/
│   ├── web-lume/               # Vue 3 admin panel
│   │   ├── src/
│   │   ├── tailwind.config.js
│   │   └── vite.config.ts
│   │
│   └── riagri-website/         # Nuxt 3 public website (SSR)
│       ├── app.vue
│       ├── nuxt.config.ts
│       └── pages/
│
└── packages/@lume/              # Shared configs (eslint, tsconfig)
```

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [Architecture](docs/ARCHITECTURE.md) | System design, module system, data flow, request lifecycle |
| [Installation](docs/INSTALLATION.md) | Setup for development, staging, and production |
| [GitHub Strategy](docs/GITHUB_ANALYSIS_AND_STRATEGY.md) | Positioning, launch strategy, marketing content |
| [Performance](docs/PERFORMANCE.md) | Benchmarks, scaling guidelines, optimization tips |
| [Backend Development](backend/docs/DEVELOPMENT.md) | API patterns, services, middleware |
| [Module System](backend/docs/MODULE_SYSTEM.md) | Creating custom modules |
| [Security](backend/docs/SECURITY.md) | Auth, RBAC, audit, compliance |
| [API Reference](backend/docs/API.md) | All endpoints, request/response formats |
| [Code Quality](docs/CODE_QUALITY.md) | Lint/typecheck cleanup complete — **0 lint / 0 TS errors** as of 2026-05-21. CI strict-zero gate enforced. |
| [Pre-Launch Improvements](docs/deployment/PRE_LAUNCH_IMPROVEMENTS.md) | v2.0 hardening roadmap (all closed) + v2.1 carryover |

---

## 🤝 Contributing

We welcome contributions!

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code style guide
- Testing requirements
- PR process
- Module development

By participating you agree to our [Code of Conduct](CODE_OF_CONDUCT.md).
Found a security issue? Please follow [SECURITY.md](SECURITY.md) — do **not** open a public issue.
See the [Changelog](CHANGELOG.md) for release history.

---

## 🗺️ Roadmap

- [x] **Q2 2026:** Code quality zero-debt (0 lint / 0 TS errors, CI strict gate)
- [x] **Q2 2026:** MariaDB standardization + MySQL 8.0 schema portability
- [x] **Q2 2026:** CI/CD pipeline (setup-smoke, code-quality, deploy workflows)
- [ ] **Q3 2026:** NestJS backend migration (in progress — `lume-nestjs/`)
- [ ] **Q3 2026:** GraphQL API layer
- [ ] **Q3 2026:** Multi-tenancy support
- [ ] **Q4 2026:** S3/Cloud storage adapters
- [ ] **Q1 2027:** Plugin marketplace
- [ ] **Q1 2027:** Kubernetes-ready distribution

---

## 📄 License

MIT — Use in commercial and private projects.

---

## 🔗 Links

- **GitHub:** https://github.com/senthilnathang/Lume
- **Docs:** https://lume-framework.dev (coming soon)
- **Examples:** https://github.com/senthilnathang/lume-examples
- **Community:** https://discord.gg/lume (coming soon)

---

**Built with ❤️ for developers who want to ship enterprise software fast.**
