# Lume - Modular Light Framework

<p align="center">
  <strong>Lume</strong> - A modular, lightweight framework for building enterprise applications with Vue.js and Express.js
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#modules">Modules</a> •
  <a href="#api">API</a>
</p>

---

## About Lume

**Lume** (Modular Light Framework) is an enterprise-grade modular framework inspired by FastVue and Odoo architectures. It provides a complete foundation for building scalable applications with dynamic module loading, RBAC, hooks, sequences, and record rules.

## Features

### Core Features
- **Dynamic Module Loading** - Load/unload modules at runtime
- **Event-Driven Hooks** - Decorator-based lifecycle hooks
- **CRUD Mixin** - Reusable CRUD operations
- **Sequences** - Auto-numbering with patterns
- **Record Rules** - Row-level security

### Security
- **JWT Authentication** - With refresh tokens
- **RBAC** - Role-based access control
- **Profile Permissions** - Granular permissions
- **Rate Limiting** - API protection
- **Audit Logging** - Track all changes

### Database
- **Sequelize ORM** - MySQL/PostgreSQL support
- **Soft Deletes** - With `deleted_at`
- **Audit Fields** - `created_by`, `updated_by`
- **Company Scoping** - Multi-tenant support

## Quick Start

### Installation

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend/apps/web-lume
npm install
npm run dev
```

### Environment Variables

```env
# Backend (.env)
PORT=3000
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lume
DB_USER=root
DB_PASSWORD=password
JWT_SECRET=your-secret-key

# Frontend (.env)
VITE_API_URL=http://localhost:3000/api
```

### Default Admin
- Email: admin@lume.dev
- Password: Admin@123

## Architecture

```
┌────────────────────────────────────────────────────┐
│                LUME FRAMEWORK                     │
├────────────────────────────────────────────────────┤
│  FRONTEND (Vue.js 3)                              │
│  ├── Dynamic Router                               │
│  ├── Modular Components                           │
│  └── API Composables                              │
├────────────────────────────────────────────────────┤
│  BACKEND (Express.js)                             │
│  ├── Module Loader                                │
│  ├── Core Services (CRUD, Hooks, Security)        │
│  └── Database (Sequelize)                         │
├────────────────────────────────────────────────────┤
│  MODULES                                         │
│  ├── lume (Core)                                 │
│  ├── user, auth, donations, activities            │
│  └── documents, team, messages, settings, audit   │
└────────────────────────────────────────────────────┘
```

## Module Structure

```
module_name/
├── __manifest__.js    # Module metadata
├── index.js          # Lifecycle hooks
├── {name}.model.js   # Sequelize model
├── {name}.service.js # Business logic
├── {name}.routes.js  # API routes
└── hooks/
    └── index.js      # Module hooks
```

### Manifest Example

```javascript
module.exports = {
    name: "my_module",
    version: "1.0.0",
    permissions: [
        { name: "my_module.read" },
        { name: "my_module.write" }
    ],
    menus: [
        { title: "My Module", path: "/my-module", icon: "cog" }
    ],
    hooks: {
        post_init_hook: "postInit"
    },
    auto_install: true
};
```

## API Endpoints

### Core APIs
```bash
GET  /health              # Health check
GET  /api/modules         # List modules
GET  /api/menus          # List menus
GET  /api/permissions   # List permissions
```

### Lume APIs
```bash
GET  /api/lume/info         # Framework info
GET  /api/lume/statistics   # System statistics
GET  /api/lume/settings     # Get settings
POST /api/sequences/generate?name=XXX  # Generate sequence
```

### Module APIs
```bash
# Users
GET    /api/users          # List users
POST   /api/users          # Create user
GET    /api/users/:id     # Get user
PUT    /api/users/:id     # Update user
DELETE /api/users/:id     # Delete user

# Donations
GET    /api/donations     # List donations
POST   /api/donations     # Create donation
```

## Using Core Services

### CRUDMixin
```javascript
const { CRUDMixin } = require('./core/services');

class UserService extends CRUDMixin {
    constructor(db, context) {
        super(User, db, context);
    }
}

const service = new UserService(db, { user_id: 1 });
const users = await service.search({
    domain: [['status', '=', 'active']],
    page: 1,
    limit: 20
});
```

### Hooks
```javascript
const { before_create } = require('./core/hooks');

class User extends Model {
    @before_create('user')
    setDefaults(record, context) {
        record.status = 'pending';
    }
}
```

### Sequences
```javascript
const receipt = await sequenceService.getNextCode('receipt', {
    company_code: 'LUME'
});
// Returns: "LUME-2024-0001"
```

## Frontend Integration

### Using Modules
```javascript
import { useModules } from '@/composables/useModules';

const { modules, menus, loadModules } = useModules();

onMounted(async () => {
    await loadModules();
});
```

### API Client
```javascript
import { useApi } from '@/composables/useApi';

const api = useApi();
const users = await api.get('/users');
```

## Available Modules

| Module | Description |
|--------|-------------|
| lume | Core framework module |
| user | User management |
| auth | Authentication & roles |
| donations | Donation tracking |
| activities | Activity logging |
| documents | Document management |
| team | Team members |
| messages | Messaging system |
| settings | System settings |
| audit | Audit logging |
| media | Media library |

## Security

### Roles
- **Admin** - Full access
- **Manager** - Management access
- **User** - Standard access
- **Viewer** - Read-only access

### Features
- Password hashing (bcrypt, 12 rounds)
- JWT tokens (24h expiry)
- Refresh tokens (7d expiry)
- Account lockout (5 failed attempts)
- Rate limiting

## Performance

- Pagination: 20 records/page
- Compression: Gzip enabled
- Rate limiting: 100 req/15min
- Redis support for sessions

## Tech Stack

### Frontend
- Vue.js 3 with Composition API
- Vue Router
- Pinia State Management
- TypeScript
- Tailwind CSS

### Backend
- Node.js with Express.js
- Sequelize ORM
- JWT Authentication
- Winston Logger

### Database
- MySQL 8.0
- PostgreSQL (optional)
- Proper indexing for performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details.

---

<p align="center">
  Built with ❤️ using Vue.js, Express.js, and Sequelize
</p>
