# Lume Framework v2.0.0

**A modular, enterprise-grade web application framework built with Node.js, Express, Vue 3, and a Hybrid ORM (Prisma + Drizzle).**

Lume provides a complete foundation for building business applications with a pluggable module system, advanced RBAC, automation engine, real-time features, observability, and a polished admin UI out of the box.

**Current Version:** 2.0.0 (Released: 2026-04-22) | **[Release Notes](docs/RELEASE_NOTES.md)** | **[v1.0 → v2.0 Migration](docs/MIGRATION_GUIDE.md)**

---

## Tech Stack (v2.0)

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 20.12.0+, Express.js 4.21, ES Modules |
| **Frontend** | Vue 3.5+, TypeScript 5.6+, Vite 5.4, Ant Design Vue 4.2 |
| **CSS** | Tailwind CSS 4.2 with CSS Variables |
| **Database** | MySQL 8.0+ (primary), PostgreSQL 14+ (supported) |
| **ORM** | Prisma 5.18 (core) + Drizzle 0.45 (modules) — Hybrid ORM |
| **Package Manager** | pnpm 10.28+ (monorepo) |
| **Build** | Turbo v2.0 (orchestration), Vite 5.4, Nuxt 3.15 |
| **Auth** | JWT with refresh tokens, 2FA/TOTP, API keys |
| **Real-time** | WebSocket (ws) with JWT auth |
| **Email** | Nodemailer with HTML templates |
| **Scheduling** | node-cron for background tasks |
| **Cache** | Redis (optional), in-memory storage |
| **Testing** | Jest 29.7 (ESM), Vitest 2.1 (frontend), Playwright 1.49 (E2E) |
| **Observability** | Winston 3.14 (logging), built-in tracing & metrics |
| **Security** | Helmet 7.1, express-rate-limit 7.1, CORS, API key auth |

---

## Features

### Core Framework
- **Hybrid ORM** — Prisma for core tables, Drizzle for module tables, unified adapter pattern
- **Module System** — 21 pluggable modules with dependency resolution, install/uninstall lifecycle
- **Auto CRUD** — `BaseService` + `createCrudRouter` generate full REST APIs from any ORM adapter
- **Real-time** — WebSocket server with JWT auth, per-user messaging, broadcast

### Security
- JWT authentication with refresh tokens
- Two-factor authentication (TOTP with QR codes and backup codes)
- Role-based access control (6 system roles, 100+ permissions)
- Record-level access rules
- IP whitelist/blacklist enforcement
- API key management with scoping
- Session tracking and management
- Configurable password policies
- Rate limiting, Helmet security headers, CORS

### Automation & Business Logic
- State machine workflows
- Visual flow designer
- Business rule engine with condition groups
- Multi-step approval chains
- Scheduled actions (cron expressions)
- Validation and assignment rules
- Rollup field aggregation
- Webhook dispatch with HMAC-SHA256 signatures and retry

### Data Management
- CSV/JSON import with column mapping and validation
- Export with field selection and templates
- Feature flag management
- System backup tracking
- Audit logging with field-level diffs (old/new values)

### Admin UI
- 50+ custom Vue views — zero fallback to generic views
- Command palette (Ctrl+K) with global search
- Sidebar navigation from module manifests
- Column visibility/ordering with persistence
- CSV/JSON export from any table
- Responsive design with collapsible sidebar

### Application Modules
- **Activities** — Event management with publishing, calendar, registration
- **Donations** — Donation/donor/campaign tracking with reports
- **Team** — Directory, departments, leadership hierarchy
- **Documents** — File storage with categories and access control
- **Media** — Media library with statistics and featured items
- **Messages** — Contact form management with status tracking
- **Audit** — Comprehensive activity logging with cleanup

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **MySQL** 8.0+ (or PostgreSQL 14+)
- **Git**

### 1. Clone & Install

```bash
git clone <repo-url> /opt/Lume
cd /opt/Lume

# Backend
cd backend
npm install
npx prisma generate

# Frontend
cd ../frontend/apps/web-lume
npm install
```

### 2. Configure Environment

```bash
# backend/.env
cp .env.example .env

# Required settings:
DATABASE_URL="mysql://user:password@localhost:3306/lume"
JWT_SECRET="your-secure-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
PORT=3000
NODE_ENV=development
```

### 3. Initialize Database

```bash
cd /opt/Lume/backend

# Create tables and seed data
npx prisma db push
npm run db:init
```

### 4. Start Development

```bash
# Terminal 1 - Backend
cd /opt/Lume/backend
npm run dev

# Terminal 2 - Frontend
cd /opt/Lume/frontend/apps/web-lume
npm run dev
```

### 5. Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Login**: `admin@lume.dev` / `admin123`

---

## Project Structure

```
/opt/Lume/
├── README.md
├── docs/                           # Project-level documentation
│   ├── ARCHITECTURE.md
│   ├── INSTALLATION.md
│   └── MIGRATION_GUIDE.md
│
├── backend/
│   ├── src/
│   │   ├── index.js                # Express server + WebSocket + module init
│   │   ├── core/
│   │   │   ├── db/                 # Prisma, Drizzle, adapters
│   │   │   ├── middleware/         # Auth, error handler, IP access, logger
│   │   │   ├── modules/           # Module loader (__loader__.js)
│   │   │   ├── router/            # CRUD router generator
│   │   │   ├── services/          # 12 core services
│   │   │   ├── api/               # Global search endpoint
│   │   │   └── templates/         # Email HTML templates
│   │   ├── modules/               # 21 pluggable modules
│   │   │   ├── base/              # Core: models, permissions, menus
│   │   │   ├── auth/              # JWT authentication
│   │   │   ├── user/              # User management
│   │   │   ├── rbac/              # Role-based access control
│   │   │   ├── base_security/     # 2FA, sessions, API keys, IP access
│   │   │   ├── base_automation/   # Workflows, rules, scheduler
│   │   │   ├── base_customization/# Custom fields, forms, views
│   │   │   ├── base_features_data/# Import/export, feature flags
│   │   │   ├── advanced_features/ # Webhooks, notifications, tags
│   │   │   ├── activities/        # Event management
│   │   │   ├── donations/         # Financial tracking
│   │   │   ├── team/              # Team directory
│   │   │   ├── documents/         # File management
│   │   │   ├── media/             # Media library
│   │   │   ├── messages/          # Contact forms
│   │   │   ├── audit/             # Audit logging
│   │   │   ├── settings/          # App configuration
│   │   │   └── common/            # Shared components/utils
│   │   ├── shared/
│   │   │   ├── utils/             # Password, JWT, date, string, file utils
│   │   │   └── constants/         # Status codes, roles, messages
│   │   └── scripts/               # DB init, seed, admin creation
│   ├── prisma/
│   │   └── schema.prisma          # 48 Prisma models
│   ├── tests/                     # Jest test suites
│   ├── uploads/                   # File storage
│   └── docs/                      # Backend-specific docs
│
└── frontend/
    ├── apps/
    │   └── web-lume/
    │       ├── src/
    │       │   ├── router/        # Dynamic routing + customViews
    │       │   ├── store/         # Pinia stores (auth, permission)
    │       │   ├── composables/   # 15+ Vue composables
    │       │   ├── components/    # Layout: Sidebar, Header
    │       │   ├── layouts/       # BasicLayout
    │       │   ├── api/           # Axios client with interceptor
    │       │   └── views/         # Login, Dashboard, 404
    │       ├── tailwind.config.js
    │       └── vite.config.ts
    └── docs/                      # Frontend-specific docs
```

---

## Module System

Every module follows a standard structure:

```
modules/{name}/
├── __manifest__.js     # Metadata, dependencies, menus, permissions
├── __init__.js         # Initialization: create adapters, services, routes
├── models/
│   ├── index.js        # Drizzle table exports
│   └── schema.js       # Drizzle schema definitions
├── services/
│   └── index.js        # Business logic (extends BaseService or custom)
├── api/
│   └── index.js        # Express router factory
└── static/             # Frontend assets (served to Vue app)
    ├── views/          # Vue SFC components
    ├── api/            # TypeScript API clients
    └── components/     # Module-specific components
```

Modules are loaded dynamically on startup. Install/uninstall persists to the database. Dependencies are checked before uninstall.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture reference.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, hybrid ORM, module lifecycle, data flow |
| [Installation](docs/INSTALLATION.md) | Prerequisites, setup, database configuration |
| [Backend Development](backend/docs/DEVELOPMENT.md) | API patterns, services, middleware, utilities |
| [Module System](backend/docs/MODULE_SYSTEM.md) | Creating modules, manifests, adapters, hooks |
| [Security](backend/docs/SECURITY.md) | Auth, 2FA, RBAC, IP access, API keys, audit |
| [Testing](backend/docs/TESTING.md) | Jest setup, test patterns, running tests |
| [Deployment](backend/docs/DEPLOYMENT.md) | Production setup, Docker, environment |
| [Frontend Development](frontend/docs/DEVELOPMENT.md) | Vue patterns, composables, module views |
| [Frontend Architecture](frontend/docs/ARCHITECTURE.md) | Router, stores, component organization |

---

## API Overview

All endpoints return a consistent response format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed"
}
```

Paginated responses include metadata:

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/users/login` | JWT authentication |
| `POST` | `/api/auth/refresh-token` | Refresh JWT |
| `GET` | `/api/modules` | List installed modules |
| `GET` | `/api/menus` | Sidebar menu tree |
| `GET` | `/api/permissions` | All permissions |
| `GET` | `/api/search?q=term` | Global search |
| `GET` | `/api/dashboard/stats` | Dashboard statistics |
| `GET` | `/health` | Health check |

Each module registers its own routes under `/api/{module_name}/`. The CRUD router auto-generates standard endpoints for every model.

---

## Default Credentials

| Field | Value |
|-------|-------|
| Admin Email | `admin@lume.dev` |
| Admin Password | `admin123` |
| Database User | `gawdesy` |
| Database Password | `gawdesy` |
| Database Name | `lume` |

---

## Roadmap

- [ ] Redis caching layer with TTL and invalidation
- [ ] PostgreSQL full support with migration tooling
- [ ] Nuxt.js SSR frontend option
- [ ] Multi-tenancy (tenant_id scoping)
- [ ] S3/cloud storage adapter
- [ ] Elasticsearch full-text search
- [ ] Docker Compose production setup
- [ ] Plugin marketplace
- [ ] REST API documentation (Swagger/OpenAPI)
- [ ] GraphQL API layer

---

## License

MIT

---

Built with Lume Framework v1.0.0
