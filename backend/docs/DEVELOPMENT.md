# Lume Framework -- Backend Development Guide

## Table of Contents

- [Project Structure](#project-structure)
- [ESM Requirements](#esm-requirements)
- [Creating API Endpoints](#creating-api-endpoints)
- [Using BaseService](#using-baseservice)
- [Using createCrudRouter](#using-createcrudrouter)
- [Domain Filtering](#domain-filtering)
- [Response Utilities](#response-utilities)
- [Middleware](#middleware)
- [Shared Utilities](#shared-utilities)
- [NPM Scripts](#npm-scripts)
- [Environment Variables](#environment-variables)

---

## Project Structure

```
backend/
  src/
    index.js                  # Express app entry point, server startup
    core/
      db/
        prisma.js             # Prisma client with audit + password middleware
        drizzle.js            # Drizzle ORM initialization
        drizzle-helpers.js    # Shared column helpers (baseColumns, withSoftDelete)
        adapters/
          base-adapter.js     # Abstract adapter interface
          prisma-adapter.js   # Prisma ORM adapter
          drizzle-adapter.js  # Drizzle ORM adapter
      middleware/
        auth.js               # authenticate, authorize, optionalAuth
        errorHandler.js       # Global error + 404 handler
        requestLogger.js      # Request logging middleware
        ipAccess.js           # IP whitelist/blacklist enforcement
      modules/
        __loader__.js         # Module discovery, dependency resolution, lifecycle
        __init__.js           # Module system bootstrap
        __manifest__.js       # Core manifest schema reference
      router/
        crud-router.js        # Auto CRUD router generator
      services/
        base.service.js       # Generic CRUD service class
        security.service.js   # Permission + record rule checking
        totp.service.js       # TOTP two-factor authentication
        password-policy.service.js  # Configurable password policies
        email.service.js      # Email sending (nodemailer)
        webhook.service.js    # Outbound webhook delivery
        notification.service.js # In-app notifications
        websocket.service.js  # WebSocket (ws) server
        scheduler.service.js  # Cron job scheduling (node-cron)
        rule-engine.service.js # Business rule evaluation
        record-rule.service.js # Row-level access control
        sequence.service.js   # Auto-increment sequence generation
      api/
        search.js             # Global search endpoint
    modules/                  # Application modules (user, auth, activities, etc.)
      base/                   # Core base module
      base_automation/        # Workflow and automation
      base_security/          # Security features (2FA, sessions, API keys)
      base_features_data/     # Data import/export/backup
      base_customization/     # UI customization
      advanced_features/      # Advanced features
      user/                   # User management
      auth/                   # Authentication (login, register, refresh)
      activities/             # Activities / events
      donations/              # Donations and donors
      documents/              # Document management
      team/                   # Team member management
      messages/               # Contact messages
      settings/               # Application settings
      audit/                  # Audit log viewer
      media/                  # Media uploads
      rbac/                   # Role-based access control
    shared/
      utils/index.js          # Utility libraries (password, JWT, date, etc.)
      constants/index.js      # HTTP codes, messages, enums, cache keys
    scripts/
      initDb.js               # Database initialization + seeding
      seedData.js             # Seed demo data
      createAdmin.js          # Create admin user
      refreshDb.js            # Drop and recreate database
  tests/
    unit/                     # Jest test suites
    setup.js                  # Test setup file
  prisma/
    schema.prisma             # Prisma schema (core tables)
  jest.config.cjs             # Jest configuration
  package.json
  .env                        # Environment variables
```

---

## ESM Requirements

The backend uses `"type": "module"` in `package.json`. All `.js` files are ES modules.

**Do:**

```js
import express from 'express';
import { BaseService } from '../../core/services/base.service.js';

export const myFunction = () => { /* ... */ };
export default router;
```

**Do NOT:**

```js
// WRONG - CommonJS syntax will fail
const express = require('express');
module.exports = router;
```

Key rules:

- Always use `import`/`export` syntax.
- Always include `.js` file extensions in relative imports.
- Manifest files (`__manifest__.js`) must use `export default {}`.
- The only exception is `jest.config.cjs` which uses CommonJS (required by Jest with ESM).

---

## Creating API Endpoints

### Manual Express Router

```js
import { Router } from 'express';
import { authenticate, authorize } from '../../core/middleware/auth.js';
import { responseUtil } from '../../shared/utils/index.js';

const router = Router();

// Public endpoint
router.get('/health', (req, res) => {
  res.json({ success: true, status: 'healthy' });
});

// Protected endpoint with permission check
router.get('/', authenticate, authorize('mymodule', 'read'), async (req, res) => {
  try {
    const data = await fetchData();
    res.json(responseUtil.success(data));
  } catch (error) {
    res.status(500).json(responseUtil.error(error.message));
  }
});

// Create with request body
router.post('/', authenticate, authorize('mymodule', 'write'), async (req, res) => {
  try {
    const record = await createRecord(req.body);
    res.status(201).json(responseUtil.success(record, 'Created'));
  } catch (error) {
    res.status(400).json(responseUtil.error(error.message));
  }
});

export default router;
```

### Factory Pattern (Used by Module System)

Modules export a factory function that receives adapters and services:

```js
import { Router } from 'express';
import { authenticate, authorize } from '../../core/middleware/auth.js';
import { createCrudRouter } from '../../core/router/crud-router.js';

const createRoutes = (adapters, services) => {
  const router = Router();

  // Health check (no auth)
  router.get('/health', (req, res) => {
    res.json({ success: true, status: 'healthy', module: 'my_module' });
  });

  // Auto CRUD for a model
  router.use('/items', authenticate, createCrudRouter(adapters.Item));

  // Custom endpoint using a service
  router.post('/custom-action', authenticate, async (req, res) => {
    const result = await services.myService.doSomething(req.body);
    res.json({ success: true, data: result });
  });

  return router;
};

export default createRoutes;
```

---

## Using BaseService

`BaseService` provides generic CRUD operations on top of any adapter (Prisma or Drizzle).

### Setup

```js
import { BaseService } from '../../core/services/base.service.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { myTable } from './models/schema.js';

const adapter = new DrizzleAdapter(myTable);
const service = new BaseService(adapter, { softDelete: true, audit: true });
```

### Options

| Option       | Default | Description                                     |
|--------------|---------|-------------------------------------------------|
| `softDelete` | `true`  | Use `softDelete: false` to hard-delete records. **Do NOT use `paranoid`.** |
| `audit`      | `true`  | Auto-set `created_by`, `updated_by`, `deleted_by` from context. |

### Methods

```js
// Search with pagination and domain filtering
const result = await service.search({
  page: 1,
  limit: 20,
  domain: [['status', '=', 'active']],
  order: [['created_at', 'DESC']],
});
// result = { items: [...], total: 42, page: 1, limit: 20, totalPages: 3 }

// Count matching records
const count = await service.searchCount([['status', '=', 'active']]);

// Read single record by ID
const record = await service.read(123);

// Create a record (context provides userId for audit fields)
const created = await service.create(
  { name: 'New Item', status: 'draft' },
  { userId: req.user.id }
);

// Update a record
const updated = await service.update(123, { status: 'published' }, { userId: req.user.id });

// Delete a record (soft delete if enabled)
await service.delete(123, { userId: req.user.id });

// Bulk create
const records = await service.bulkCreate([
  { name: 'Item 1' },
  { name: 'Item 2' },
], { userId: req.user.id });

// Bulk delete
await service.bulkDelete([1, 2, 3], { userId: req.user.id });

// Get model field definitions (for frontend schema introspection)
const fields = service.fieldsGet();
```

---

## Using createCrudRouter

`createCrudRouter` auto-generates a complete set of REST endpoints for a model adapter.

```js
import { createCrudRouter } from '../../core/router/crud-router.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { myTable } from './models/schema.js';

const router = createCrudRouter(new DrizzleAdapter(myTable), { softDelete: true });
```

### Generated Endpoints

| Method   | Path       | Description                              |
|----------|------------|------------------------------------------|
| `GET`    | `/`        | Search with pagination and domain filtering |
| `GET`    | `/fields`  | Return model field definitions           |
| `GET`    | `/:id`     | Read a single record by ID               |
| `POST`   | `/`        | Create a new record                      |
| `PUT`    | `/:id`     | Update an existing record                |
| `DELETE` | `/:id`     | Delete a record (soft or hard)           |
| `POST`   | `/bulk`    | Bulk create (body = array of objects)    |
| `DELETE` | `/bulk`    | Bulk delete (body = `{ ids: [...] }`)    |

### Query Parameters for GET /

| Parameter  | Default      | Description                        |
|------------|--------------|------------------------------------|
| `page`     | `1`          | Page number                        |
| `limit`    | `20`         | Records per page                   |
| `order_by` | `created_at` | Field to sort by                   |
| `order`    | `DESC`       | Sort direction (`ASC` or `DESC`)   |
| `domain`   | `[]`         | JSON-encoded domain filter array   |
| `{field}`  | -            | Any other param becomes `[field, '=', value]` |

---

## Domain Filtering

Domains are arrays of `[field, operator, value]` tuples used to filter records. They are supported by both `BaseService.search()` and the `GET /` CRUD endpoint (via the `domain` query parameter).

### Supported Operators

| Operator     | Description           | Example                              |
|--------------|-----------------------|--------------------------------------|
| `=`          | Equal                 | `['status', '=', 'active']`          |
| `!=`         | Not equal             | `['status', '!=', 'draft']`          |
| `>`          | Greater than          | `['amount', '>', 100]`               |
| `>=`         | Greater or equal      | `['amount', '>=', 100]`              |
| `<`          | Less than             | `['priority', '<', 5]`               |
| `<=`         | Less or equal         | `['priority', '<=', 5]`              |
| `like`       | SQL LIKE              | `['name', 'like', '%test%']`         |
| `in`         | In array              | `['status', 'in', ['active','draft']]` |
| `not in`     | Not in array          | `['role', 'not in', ['guest']]`      |
| `startsWith` | Starts with           | `['email', 'startsWith', 'admin']`   |
| `endsWith`   | Ends with             | `['email', 'endsWith', '.org']`      |
| `contains`   | Contains substring    | `['name', 'contains', 'test']`       |

### Usage in API Requests

```
GET /api/base_automation/workflows?domain=[["status","=","active"],["model","=","User"]]
```

### Usage in Code

```js
const result = await service.search({
  domain: [
    ['status', '=', 'active'],
    ['amount', '>=', 100],
    ['category', 'in', ['donations', 'grants']],
  ],
  page: 1,
  limit: 50,
});
```

All conditions are combined with AND logic.

---

## Response Utilities

Import from `src/shared/utils/index.js`:

```js
import { responseUtil } from '../../shared/utils/index.js';
```

### Methods

```js
// Success response
responseUtil.success(data, 'Operation completed', meta);
// { success: true, message: '...', data: {...}, meta: {...} }

// Paginated response
responseUtil.paginated(items, { page: 1, limit: 20, total: 100 });
// { success: true, data: [...], meta: { pagination: { page, limit, total, pages } } }

// Error response
responseUtil.error('Something went wrong', detailsArray, 'ERROR_CODE');
// { success: false, error: { code: 'ERROR_CODE', message: '...', details: [...] } }

// Validation error
responseUtil.validationError([{ field: 'email', message: 'Required' }]);

// Not found
responseUtil.notFound('User');
// { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }

// Unauthorized
responseUtil.unauthorized('Token expired');

// Forbidden
responseUtil.forbidden('Missing permission: users.write');
```

---

## Middleware

### authenticate

Verifies the JWT Bearer token, loads the user from the database, and attaches `req.user`.

```js
import { authenticate } from '../../core/middleware/auth.js';

router.get('/protected', authenticate, (req, res) => {
  // req.user = { id, email, role, role_id }
});
```

### authorize

Checks if the authenticated user has a specific permission. Admin and super_admin roles bypass all checks.

```js
import { authenticate, authorize } from '../../core/middleware/auth.js';

// Check resource.action permission
router.post('/items', authenticate, authorize('items', 'write'), handler);

// Check a specific permission name
router.delete('/items/:id', authenticate, authorize('items.delete'), handler);
```

### optionalAuth

Parses the token if present but does not reject unauthenticated requests.

```js
import { optionalAuth } from '../../core/middleware/auth.js';

router.get('/public', optionalAuth, (req, res) => {
  // req.user may or may not be set
});
```

### ipAccessMiddleware

Enforces IP whitelist/blacklist rules. Bypasses localhost in development.

```js
import { ipAccessMiddleware } from '../../core/middleware/ipAccess.js';

app.use('/api/admin', ipAccessMiddleware, adminRouter);
```

---

## Shared Utilities

All utilities are exported from `src/shared/utils/index.js`:

```js
import {
  passwordUtil,
  jwtUtil,
  dateUtil,
  stringUtil,
  fileUtil,
  validationUtil,
  objectUtil,
  responseUtil,
} from '../../shared/utils/index.js';
```

### passwordUtil

| Method                       | Description                                      |
|------------------------------|--------------------------------------------------|
| `hashPassword(password)`     | Hash with bcrypt (12 rounds). Returns promise.   |
| `verifyPassword(pw, hash)`   | Compare password against hash. Returns promise.  |
| `validatePassword(password)` | Check strength rules. Returns `{ isValid, errors }`. |

### jwtUtil

| Method                        | Description                                  |
|-------------------------------|----------------------------------------------|
| `generateToken(payload, exp)` | Sign JWT (default 7d expiry).                |
| `verifyToken(token)`          | Verify and decode. Returns payload or null.  |
| `decodeToken(token)`          | Decode without verification.                 |
| `generateRefreshToken(userId)` | Sign refresh token (30d expiry).            |

### dateUtil

| Method                    | Description                 |
|---------------------------|-----------------------------|
| `now()`                   | Current UTC timestamp.      |
| `format(date, fmt)`       | Format date (default YYYY-MM-DD). |
| `formatWithTime(date)`    | Format as YYYY-MM-DD HH:mm:ss. |
| `fromNow(date)`           | Relative time (e.g., "3 hours ago"). |
| `addDays(date, n)`        | Add n days.                 |
| `subtractDays(date, n)`   | Subtract n days.            |
| `startOfDay(date)`        | Start of day.               |
| `endOfDay(date)`          | End of day.                 |
| `isToday(date)`           | Check if date is today.     |
| `startOfMonth(date)`      | Start of month.             |
| `endOfMonth(date)`        | End of month.               |

### stringUtil

| Method                  | Description                      |
|-------------------------|----------------------------------|
| `randomString(length)`  | Hex random string.               |
| `alphanumeric(length)`  | Alias for randomString.          |
| `slugify(text)`         | URL-safe slug.                   |
| `capitalize(text)`      | Uppercase first letter.          |
| `truncate(text, len)`   | Truncate with ellipsis.          |
| `maskEmail(email)`      | Mask email (e.g., a***n@x.com).  |
| `maskPhone(phone)`      | Mask phone digits.               |

### validationUtil

| Method                | Description                        |
|-----------------------|------------------------------------|
| `isValidEmail(email)` | Regex email validation.            |
| `isValidPhone(phone)` | Regex phone validation.            |
| `isValidUrl(url)`     | URL constructor validation.        |
| `sanitizeString(str)` | Strip HTML tags and JS injections. |

### fileUtil

| Method                           | Description                       |
|----------------------------------|-----------------------------------|
| `getExtension(filename)`         | Extract file extension.           |
| `formatSize(bytes)`              | Human-readable size (KB, MB...).  |
| `isAllowedType(mime, allowed[])` | Check MIME type allowlist.        |
| `generateUniqueFilename(name)`   | Timestamped unique filename.      |

### objectUtil

| Method             | Description                        |
|--------------------|------------------------------------|
| `clean(obj)`       | Remove null/undefined values.      |
| `deepClone(obj)`   | JSON-based deep clone.             |
| `pick(obj, keys)`  | Pick specific fields.              |
| `omit(obj, keys)`  | Omit specific fields.              |

---

## NPM Scripts

| Script            | Command                                  | Description                              |
|-------------------|------------------------------------------|------------------------------------------|
| `npm run dev`     | `nodemon src/index.js`                   | Start dev server with auto-reload.       |
| `npm start`       | `node src/index.js`                      | Start production server.                 |
| `npm test`        | `NODE_OPTIONS='--experimental-vm-modules' jest` | Run all tests with ESM support.   |
| `npm run test:coverage` | `jest --coverage`                  | Run tests with coverage report.          |
| `npm run db:init` | `node src/scripts/initDb.js --seed`      | Initialize DB, run migrations and seeds. |
| `npm run db:init:force` | `node src/scripts/initDb.js --seed --force` | Drop and recreate all tables, re-seed. |
| `npm run db:seed` | `node src/scripts/seedData.js`           | Seed demo/test data.                     |
| `npm run db:admin` | `node src/scripts/createAdmin.js`       | Create or reset admin user.              |
| `npm run db:refresh` | `node src/scripts/refreshDb.js`       | Drop and recreate the database.          |
| `npm run lint`    | `eslint src/`                            | Lint source files.                       |

---

## Environment Variables

| Variable             | Default / Example                          | Description                                  |
|----------------------|--------------------------------------------|----------------------------------------------|
| `NODE_ENV`           | `development`                              | Environment (`development`, `production`, `test`). |
| `PORT`               | `3000`                                     | HTTP server port.                            |
| `API_VERSION`        | `v1`                                       | API version prefix.                          |
| `BACKEND_URL`        | `http://localhost:3000`                    | Backend base URL.                            |
| `FRONTEND_URL`       | `http://localhost:5173`                    | Frontend URL (used for CORS, emails).        |
| `DB_TYPE`            | `mysql`                                    | Database type (`mysql` or `postgres`).       |
| `DB_HOST`            | `localhost`                                | Database host.                               |
| `DB_PORT`            | `3306`                                     | Database port.                               |
| `DB_NAME`            | `lume`                                     | Database name.                               |
| `DB_USER`            | `gawdesy`                                  | Database username.                           |
| `DB_PASSWORD`        | `gawdesy`                                  | Database password.                           |
| `DB_POOL_SIZE`       | `10`                                       | Connection pool size.                        |
| `DB_LOGGING`         | `false`                                    | Enable SQL query logging.                    |
| `DATABASE_URL`       | `mysql://user:pass@host:port/db`           | Prisma connection string.                    |
| `JWT_SECRET`         | -                                          | Secret for signing access tokens. **Must be set in production.** |
| `JWT_REFRESH_SECRET` | -                                          | Secret for signing refresh tokens.           |
| `JWT_EXPIRES_IN`     | `7d`                                       | Access token expiry duration.                |
| `UPLOAD_DIR`         | `./uploads`                                | File upload directory.                       |
| `MAX_FILE_SIZE`      | `10485760` (10MB)                          | Maximum upload file size in bytes.           |
| `SMTP_HOST`          | `smtp.gmail.com`                           | SMTP server host.                            |
| `SMTP_PORT`          | `587`                                      | SMTP server port.                            |
| `SMTP_USER`          | -                                          | SMTP username.                               |
| `SMTP_PASS`          | -                                          | SMTP password / app password.                |
| `EMAIL_FROM`         | `noreply@lume.dev`                         | Default sender email address.                |
| `CORS_ORIGIN`        | `http://localhost:5173`                    | Allowed CORS origin. Set `false` to disable. |
| `SESSION_SECRET`     | -                                          | Express session secret.                      |
| `ENABLE_RATE_LIMIT`  | `false` (auto in production)               | Force-enable rate limiting in development.   |
| `APP_NAME`           | `Lume`                                     | Application name (used in 2FA QR codes).     |
