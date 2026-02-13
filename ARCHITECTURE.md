# GAWDESY Enterprise System Architecture

## Overview

**Gawdesy** is a modular backend framework inspired by FastVue architecture, built with Express.js and Sequelize. It provides enterprise-grade features including dynamic module loading, RBAC, hooks, sequences, and record rules.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        GAWDESY SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│  FRONTEND (Vue.js 3)                                           │
│  ├── Dynamic Router with Module Routes                         │
│  ├── Modular Component System                                   │
│  ├── API Client Composables                                    │
│  └── Shared Type Definitions                                  │
├─────────────────────────────────────────────────────────────────┤
│  BACKEND (Express.js)                                         │
│  ├── Module Loader & Registry                                 │
│  ├── Core Services (CRUD, Hooks, Security)                    │
│  ├── Database (Sequelize - MySQL/PostgreSQL)                 │
│  └── Authentication (JWT + RBAC)                              │
├─────────────────────────────────────────────────────────────────┤
│  MODULES (12 Total)                                            │
│  ├── gawdesy (Core Enterprise Module)                        │
│  ├── user (User Management)                                   │
│  ├── auth (Authentication & Roles)                            │
│  ├── donations (Donations & Campaigns)                       │
│  ├── activities (Activity Logging)                           │
│  ├── documents (Document Management)                          │
│  ├── team (Team Members)                                     │
│  ├── messages (Messaging)                                    │
│  ├── settings (Settings Management)                          │
│  ├── audit (Audit Logging)                                   │
│  └── media (Media Library)                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
/opt/gawdesy.com/
├── backend/
│   ├── src/
│   │   ├── index.js                   # Main server entry
│   │   ├── config.js                  # Configuration export
│   │   ├── core/
│   │   │   ├── modules/
│   │   │   │   └── gawdesy/          # Core enterprise module
│   │   │   ├── services/
│   │   │   │   ├── crud.mixin.js     # CRUD operations
│   │   │   │   ├── hooks/            # Hook registry
│   │   │   │   ├── security.service.js
│   │   │   │   ├── sequence.service.js
│   │   │   │   └── record-rule.service.js
│   │   │   └── models/
│   │   │       ├── sequence.model.js
│   │   │       └── record-rule.model.js
│   │   ├── modules/
│   │   │   ├── user/
│   │   │   ├── auth/
│   │   │   ├── donations/
│   │   │   ├── activities/
│   │   │   ├── documents/
│   │   │   ├── team/
│   │   │   ├── messages/
│   │   │   ├── settings/
│   │   │   ├── audit/
│   │   │   └── media/
│   │   ├── database/
│   │   │   ├── config.js
│   │   │   └── models/index.js
│   │   └── shared/
│   │       ├── utils/
│   │       └── constants/
│   └── tests/
│       ├── api.test.js
│       └── gawdesy-module.test.js
│
├── frontend/apps/web-gawdesy/
│   ├── src/
│   │   ├── composables/
│   │   │   ├── useApi.ts
│   │   │   └── useModules.ts
│   │   ├── components/
│   │   │   ├── DataTable.vue
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.vue
│   │   │   │   └── Header.vue
│   │   │   └── cells/
│   │   │       ├── TextCell.vue
│   │   │       ├── DateCell.vue
│   │   │       ├── StatusCell.vue
│   │   │       ├── CurrencyCell.vue
│   │   │       └── ActionsCell.vue
│   │   ├── modules/
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── donations/
│   │   │   ├── documents/
│   │   │   ├── team/
│   │   │   ├── messages/
│   │   │   ├── activities/
│   │   │   ├── settings/
│   │   │   ├── audit/
│   │   │   └── media/
│   │   ├── router/
│   │   │   └── index.js
│   │   ├── views/
│   │   │   ├── LoginView.vue
│   │   │   └── NotFoundView.vue
│   │   └── AppLayout.vue
│   └── package.json
│
└── docs/
    ├── MODULAR_ARCHITECTURE.md
    └── MODULAR_IMPLEMENTATION.md
```

## Module Structure

Each module follows this FastVue-inspired structure:

```
module_name/
├── __manifest__.js       # Module metadata (name, version, permissions, menus)
├── index.js             # Module exports and lifecycle hooks
├── {name}.model.js     # Sequelize model
├── {name}.service.js   # Business logic service
├── {name}.routes.js    # API routes
└── hooks/
    └── index.js        # Module-specific hooks
```

## Manifest Example

```javascript
module.exports = {
    name: "gawdesy",
    version: "1.0.0",
    summary: "Gawdesy Enterprise Module",
    permissions: [
        { name: "gawdesy.read" },
        { name: "gawdesy.write" },
        { name: "gawdesy.admin" }
    ],
    menus: [
        { id: "gawdesy.main", title: "Gawdesy", path: "/gawdesy", icon: "settings" }
    ],
    views: [
        { name: "GawdesySettings", path: "/gawdesy/settings" }
    ],
    hooks: {
        pre_init_hook: "preInit",
        post_init_hook: "postInit",
        post_load_hook: "postLoad"
    },
    auto_install: true,
    state: "installed"
};
```

## Core Services

### CRUDMixin
Provides standard CRUD operations with:
- Pagination (20 records/page)
- Sorting (any field, ASC/DESC)
- Domain filtering (Odoo-style: `[['field', '=', value]]`)
- Soft deletes (with `deleted_at`)
- Audit fields (`created_by`, `updated_by`)

### Hook System
Event-driven architecture with decorators:
- `@before_create(model)` - Before record creation
- `@after_create(model)` - After record creation
- `@before_update(model)` - Before record update
- `@after_update(model)` - After record update
- `@before_delete(model)` - Before record deletion
- `@after_delete(model)` - After record deletion
- `@onchange(model, fields)` - Field change events
- `@constrains(model, field)` - Field constraints

### Security Service
Enterprise RBAC features:
- JWT authentication with refresh tokens
- Profile-based permissions
- IP restrictions (allow/deny lists)
- Time-based login hours
- Record-level rules

### Sequence Service
Auto-numbering with patterns:
- Pattern: `{PREFIX}{YYYY}{MM}{0000}{SUFFIX}`
- Date placeholders: `{year}`, `{month}`, `{day}`
- Configurable padding (default: 4)
- Company-scoped sequences

### Record Rules
Row-level security with:
- JSON domain expressions: `[['status', '=', 'active']]`
- User/role scoping
- Read/Write access control

## API Endpoints

### Core APIs
```
GET  /api/health                           # Health check
GET  /api/modules                          # List modules
GET  /api/menus                           # List menus
GET  /api/permissions                    # List permissions
```

### Gawdesy Module APIs
```
GET  /api/gawdesy/info                    # Module info
GET  /api/gawdesy/health                 # Module health
GET  /api/gawdesy/statistics             # System statistics
GET  /api/gawdesy/settings               # Get settings
PUT  /api/gawdesy/settings               # Update settings
POST /api/sequences/generate?name=XXX    # Generate sequence
GET  /api/record-rules/:model           # Get record rules
POST /api/record-rules                   # Create rule
```

### User APIs
```
GET    /api/users                         # List users (paginated)
POST   /api/users                        # Create user
GET    /api/users/:id                    # Get user
PUT    /api/users/:id                    # Update user
DELETE /api/users/:id                    # Delete user
POST   /api/users/login                  # Login
POST   /api/users/logout                  # Logout
```

### Donation APIs
```
GET    /api/donations                    # List donations
POST   /api/donations                    # Create donation
GET    /api/donations/:id                # Get donation
PUT    /api/donations/:id                # Update donation
DELETE /api/donations/:id                # Delete donation
GET    /api/donors                       # List donors
GET    /api/campaigns                    # List campaigns
```

## Database Schema

### Core Tables
- `users` - User accounts with profile FK
- `roles` - User roles
- `permissions` - System permissions
- `role_permissions` - Role-permission mapping
- `profiles` - Security profiles
- `profile_permissions` - Profile permissions
- `sequences` - Auto-numbering sequences
- `record_rules` - Row-level security rules
- `audit_logs` - Audit trail

### Module Tables
- `donations` - Donation records
- `donors` - Donor information
- `campaigns` - Fundraising campaigns
- `activities` - Activity logs
- `documents` - Document metadata
- `team_members` - Team members
- `messages` - Messages
- `settings` - System settings
- `media_library` - Media files

## Security Features

### Authentication
- JWT access tokens (24h expiry)
- Refresh tokens (7d expiry)
- Password hashing (bcrypt, 12 rounds)
- Account lockout (5 failed attempts)

### Authorization
- Role-based access control (6 roles: Admin, Manager, User, etc.)
- Permission-based endpoints
- Profile-based restrictions

### Protection
- Rate limiting (100 req/15min general, 10 req/15min auth)
- Helmet.js security headers
- CORS configuration
- Input validation

## Getting Started

### Installation
```bash
# Backend
cd /opt/gawdesy.com/backend
npm install
npm run dev

# Frontend
cd /opt/gawdesy.com/frontend/apps/web-gawdesy
npm install
npm run dev
```

### Environment Variables (.env)
```env
# Backend
PORT=3000
NODE_ENV=development
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gawdesy
DB_USER=root
DB_PASSWORD=password
JWT_SECRET=your-secret-key
JWT_EXPIRES=24h

# Frontend
VITE_API_URL=http://localhost:3000/api
```

### Default Admin
- Email: admin@gawdesy.org
- Password: Admin@123

## API Testing

```bash
# Health check
curl http://localhost:3000/api/health

# Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gawdesy.org","password":"Admin@123"}'

# Get modules (with token)
curl http://localhost:3000/api/modules \
  -H "Authorization: Bearer <token>"

# Get statistics
curl http://localhost:3000/api/gawdesy/statistics \
  -H "Authorization: Bearer <token>"
```

## Performance

- **Pagination**: 20 records per page by default
- **Rate Limiting**: Prevents API abuse
- **Compression**: Gzip enabled
- **Caching**: Redis support for sessions

## License

MIT
