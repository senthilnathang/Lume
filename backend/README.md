# Lume Backend

Modular Express.js backend API with a hybrid ORM (Prisma + Drizzle), 23 pluggable modules, visual page builder, and CMS.

## Features

- **Modular Architecture** — 23 pluggable modules with dependency resolution and lifecycle management
- **Hybrid ORM** — Prisma for 11 core models, Drizzle for 14 module schemas (~54 total tables)
- **JWT Authentication** — Secure token-based auth with refresh tokens and 2FA support
- **Role-Based Access Control** — 6 default roles, 147+ granular permissions
- **Visual Page Builder** — TipTap-based editor with 30+ widget block types
- **Website CMS** — Pages, hierarchical menus, media library, SEO management
- **Audit Logging** — Automatic change tracking with field-level diffs via Prisma middleware
- **Real-Time** — WebSocket server for live notifications and data refresh
- **Rate Limiting** — Protection against abuse (100 req/15min general, 10 req/15min auth)

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8.0+ (or PostgreSQL 14+)
- pnpm (project uses pnpm workspaces)

### Installation

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed roles, permissions, admin user, settings
npm run db:init

# Start development server (port 3000)
npm run dev
```

### Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | `admin@lume.dev` |
| Password | `admin123` |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `mysql://gawdesy:gawdesy@localhost:3306/lume` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | (required) |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `SMTP_HOST` | SMTP mail server host | — |
| `SMTP_PORT` | SMTP mail server port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASSWORD` | SMTP password | — |
| `APP_NAME` | Application display name | `Lume` |

## Project Structure

```
backend/
├── src/
│   ├── index.js                 # Server entry point
│   ├── core/                    # Framework core
│   │   ├── db/
│   │   │   ├── prisma.js        # Prisma client + audit middleware
│   │   │   ├── drizzle.js       # Drizzle client + connection
│   │   │   └── adapters/        # BaseAdapter, PrismaAdapter, DrizzleAdapter
│   │   ├── middleware/          # Auth, error handler, IP access, request logger
│   │   ├── modules/
│   │   │   └── __loader__.js    # Module discovery + dependency resolution
│   │   ├── router/
│   │   │   └── crud-router.js   # Auto CRUD endpoint generator
│   │   └── services/            # 12 core services (email, webhooks, TOTP, etc.)
│   ├── modules/                 # 23 pluggable modules
│   │   ├── base/                # Core: roles, permissions, users, groups
│   │   ├── auth/                # JWT authentication
│   │   ├── editor/              # TipTap visual page builder (30+ blocks)
│   │   ├── website/             # CMS: pages, menus, media, settings
│   │   ├── base_security/       # API keys, 2FA, sessions, IP access
│   │   ├── base_automation/     # Workflows, business rules, approvals
│   │   ├── activities/          # Events and activities
│   │   ├── donations/           # Donations, donors, campaigns
│   │   ├── documents/           # Document management
│   │   ├── media/               # Media library
│   │   ├── messages/            # Contact messages
│   │   ├── team/                # Team directory
│   │   └── ...                  # 10 more modules
│   ├── shared/
│   │   ├── utils/index.js       # Password, JWT, date, string, file utils
│   │   └── constants/index.js   # HTTP codes, roles, messages, config
│   └── scripts/                 # DB init, seed, admin creation
├── prisma/
│   └── schema.prisma            # Core table definitions (11 models)
├── tests/
│   └── unit/                    # 25 test files (Jest + ESM)
└── package.json
```

## Available Scripts

```bash
npm run dev              # Start development server with nodemon
npm start                # Start production server
npm test                 # Run tests (Jest + ESM)
npm run test:coverage    # Run tests with coverage report
npm run lint             # Lint source code
npm run db:init          # Initialize DB: seed roles, permissions, admin, settings
npm run db:init:force    # Force re-init (drops and recreates)
npm run db:seed          # Seed sample data
npm run db:admin         # Create admin user
npm run db:refresh       # Refresh database
```

## API Endpoints

### Public Endpoints

- `GET /api/health` — Health check
- `POST /api/users/login` — Login (returns JWT)
- `POST /api/auth/refresh-token` — Refresh JWT
- `GET /api/website/public/pages/:slug` — Public page by slug
- `GET /api/website/public/menus/:location` — Public menu (header/footer)
- `GET /api/website/public/settings` — Public site settings

### Authenticated Endpoints

All protected endpoints require `Authorization: Bearer <token>` header.

Each module auto-generates CRUD endpoints via `createCrudRouter`:

```
GET    /api/{module}           # List (paginated, filterable)
GET    /api/{module}/:id       # Get by ID
POST   /api/{module}           # Create
PUT    /api/{module}/:id       # Update
DELETE /api/{module}/:id       # Delete
GET    /api/{module}/fields     # Schema fields
POST   /api/{module}/bulk       # Bulk create
DELETE /api/{module}/bulk       # Bulk delete
```

### Website CMS Endpoints

```
GET/POST       /api/website/pages          # Page CRUD
GET/PUT/DELETE /api/website/pages/:id
GET/POST       /api/website/menus          # Menu CRUD
PUT            /api/website/menus/:id/reorder  # Reorder menu items
GET            /api/editor/templates       # Editor templates
GET            /api/editor/snippets        # Editor snippets
```

## Module System

Each module is a self-contained unit with its own models, services, routes, and frontend views:

```
modules/{name}/
├── __manifest__.js     # Metadata, dependencies, permissions, menus
├── __init__.js          # Initialize: create adapters, services, mount routes
├── models/schema.js     # Drizzle table definitions
├── services/*.js        # Business logic
├── *.routes.js          # Express routes
└── static/              # Frontend code (@modules Vite alias)
    ├── views/           # Vue SFC components
    ├── api/             # TypeScript API clients
    └── components/      # Module-specific components
```

## Database

- **ORM**: Prisma (core tables) + Drizzle (module tables)
- **Primary**: MySQL 8.0+
- **Supported**: PostgreSQL 14+
- **Schema**: `npx prisma db pull` for introspection, Drizzle schemas defined in code
- **Password hashing**: Automatic via Prisma middleware on create/update

## Testing

```bash
# Run all tests
NODE_OPTIONS='--experimental-vm-modules' npx jest

# Run specific suite
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/unit/module-loader.test.js

# With coverage
npm run test:coverage
```

Tests use Jest with ESM support. Configuration in `jest.config.cjs`.

## License

MIT
