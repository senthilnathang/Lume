# Lume Framework -- Security Documentation

## Table of Contents

- [Authentication](#authentication)
- [Authorization](#authorization)
- [Two-Factor Authentication](#two-factor-authentication)
- [Session Management](#session-management)
- [API Key Authentication](#api-key-authentication)
- [IP Access Control](#ip-access-control)
- [Password Policies](#password-policies)
- [Rate Limiting](#rate-limiting)
- [Security Headers](#security-headers)
- [CORS Configuration](#cors-configuration)
- [Audit Logging](#audit-logging)
- [Record Rules](#record-rules)

---

## Authentication

### JWT Flow

Lume uses JWT (JSON Web Tokens) for stateless authentication. The flow is:

```
Client                          Server
  |                               |
  |  POST /api/users/login        |
  |  { email, password }          |
  |------------------------------>|
  |                               |  Verify credentials
  |                               |  Generate access token (7d)
  |                               |  Generate refresh token (30d)
  |  { token, refreshToken }      |
  |<------------------------------|
  |                               |
  |  GET /api/resource            |
  |  Authorization: Bearer <token>|
  |------------------------------>|
  |                               |  Verify token
  |                               |  Load user from DB
  |                               |  Set req.user
  |  { success: true, data: ... } |
  |<------------------------------|
  |                               |
  |  POST /api/auth/refresh-token |
  |  { refreshToken }             |
  |------------------------------>|
  |                               |  Verify refresh token
  |  { token, refreshToken }      |
  |<------------------------------|
```

### Login Endpoint

```
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ss1"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "admin"
    }
  }
}
```

### Token Configuration

| Setting              | Default    | Env Variable         |
|----------------------|------------|----------------------|
| Access token expiry  | 7 days     | `JWT_EXPIRES_IN`     |
| Refresh token expiry | 30 days    | (hardcoded)          |
| Signing algorithm    | HS256      | (default jsonwebtoken) |
| Access token secret  | -          | `JWT_SECRET` (required in production) |
| Refresh token secret | -          | `JWT_REFRESH_SECRET` |

### Token Payload

The access token payload contains:

```json
{
  "id": 1,
  "email": "user@example.com",
  "iat": 1700000000,
  "exp": 1700604800,
  "jti": "uuid-v4"
}
```

### Public Paths (No Authentication Required)

These paths bypass authentication entirely:

- `GET /health`
- `POST /api/users/login`
- `POST /api/users/register`
- `POST /api/auth/refresh-token`

### Optional Auth Paths

These paths parse the token if present but do not reject unauthenticated requests:

- `GET /api/menus`
- `GET /api/modules`
- `GET /api/permissions`
- `GET /api/{module}/health` (for each module)

---

## Authorization

### authorize Middleware

The `authorize` middleware checks if the authenticated user has a specific permission:

```js
import { authenticate, authorize } from '../../core/middleware/auth.js';

// Check resource + action (constructs "resource.action" permission name)
router.put('/items/:id', authenticate, authorize('items', 'write'), handler);

// Check a specific permission name
router.delete('/items/:id', authenticate, authorize('items.delete'), handler);
```

### Admin Bypass

Users with the `admin` or `super_admin` role **bypass all permission checks**. The authorize middleware short-circuits for these roles:

```js
if (userRole === 'admin' || userRole === 'super_admin') {
  return next();  // Always allowed
}
```

### Permission Resolution

For non-admin users, the middleware:

1. Looks up the user's role in the `roles` table.
2. Queries `role_permissions` joined with `permissions` to find a matching permission name.
3. Returns 403 Forbidden if the permission is not found.

### req.user Object

After authentication, `req.user` contains:

```js
{
  id: 1,              // User ID
  email: 'user@example.com',
  role: 'editor',     // Role name (string)
  role_id: 3,         // Role ID (foreign key)
}
```

---

## Two-Factor Authentication

Lume supports TOTP-based 2FA using the `otplib` and `qrcode` libraries. The implementation is in `src/core/services/totp.service.js`.

### Setup Flow

```
1. User enables 2FA
     |
     v
2. Server generates TOTP secret + QR code
   TotpService.generateSecret(email, 'Lume')
   Returns: { secret, otpauthUrl, qrCode }
     |
     v
3. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
     |
     v
4. User enters 6-digit code to verify
   TotpService.verifyToken(secret, '123456')
     |
     v
5. Server stores secret and generates backup codes
   TotpService.generateBackupCodes(10)
   Returns: ['A1B2C3D4', 'E5F6G7H8', ...]
     |
     v
6. 2FA is now active for the user
```

### Verification on Login

When 2FA is active, the login flow adds an extra step:

1. User submits email + password.
2. Server returns a partial response requiring 2FA verification.
3. User submits the 6-digit TOTP code.
4. Server verifies with `TotpService.verifyToken(storedSecret, code)`.
5. If valid, the full JWT tokens are issued.

### Backup Codes

- 10 single-use backup codes are generated on 2FA setup.
- Each code is an 8-character uppercase hex string.
- When a backup code is used, it is removed from the stored list.
- Users should store backup codes securely in case they lose access to their authenticator app.

```js
const totpService = new TotpService();

// Verify a backup code
const { valid, remainingCodes } = totpService.verifyBackupCode(storedCodes, userCode);
if (valid) {
  // Update stored codes in DB
  await updateUser(userId, { backupCodes: remainingCodes });
}
```

---

## Session Management

Sessions track active user logins. The `base_security` module provides endpoints for session management.

### Session Operations

| Operation        | Description                                      |
|------------------|--------------------------------------------------|
| Create session   | Record login with IP, user agent, and timestamp. |
| List sessions    | View all active sessions for the current user.   |
| Terminate session | Invalidate a specific session (remote logout).  |
| Cleanup expired  | Remove sessions older than the configured timeout. |

### Session Data

Each session record tracks:

- User ID
- IP address
- User agent string
- Login timestamp
- Last activity timestamp
- Session status (active, expired, terminated)

---

## API Key Authentication

API keys provide an alternative to JWT tokens for machine-to-machine communication.

### Key Generation

API keys are generated as cryptographically random strings and stored hashed in the database.

### Usage

Include the API key in the request header:

```
GET /api/resource
X-API-Key: lume_ak_abc123def456...
```

### Properties

| Property    | Description                                    |
|-------------|------------------------------------------------|
| Name        | Human-readable label for the key.              |
| Scopes      | Array of permission names the key is allowed.  |
| Expires at  | Optional expiration date.                      |
| Last used   | Timestamp of most recent use.                  |
| Active      | Whether the key is currently valid.            |

### Scope Enforcement

API keys are restricted to specific scopes (permissions). A request using an API key can only access endpoints that match the key's assigned scopes.

---

## IP Access Control

IP-based access control is enforced by the `ipAccessMiddleware` in `src/core/middleware/ipAccess.js`.

### How It Works

1. The middleware extracts the client IP from the request.
2. It checks the IP against configured whitelist/blacklist rules.
3. If the IP is blacklisted or not in the whitelist, the request is rejected with 403.
4. Rules are cached in memory for 5 minutes to reduce database queries.

### Configuration

- **Whitelist mode**: Only listed IPs can access the system.
- **Blacklist mode**: Listed IPs are blocked; all others allowed.
- Rules are managed through the security settings UI.

### Development Bypass

In development mode (`NODE_ENV !== 'production'`), localhost IPs (`127.0.0.1`, `::1`, `::ffff:127.0.0.1`) always bypass IP restrictions.

---

## Password Policies

Password policies are configurable through the settings table and enforced by `PasswordPolicyService` in `src/core/services/password-policy.service.js`.

### Policy Settings

| Setting                        | Default | Description                              |
|--------------------------------|---------|------------------------------------------|
| `password_min_length`          | `8`     | Minimum password length.                 |
| `password_require_uppercase`   | `true`  | Require at least one uppercase letter.   |
| `password_require_lowercase`   | `true`  | Require at least one lowercase letter.   |
| `password_require_number`      | `true`  | Require at least one digit.              |
| `password_require_special`     | `true`  | Require at least one special character.  |
| `password_expiry_days`         | `0`     | Days until password expires (0 = never). |
| `password_history_count`       | `0`     | Prevent reuse of last N passwords (0 = off). |

### Usage

```js
import { PasswordPolicyService } from '../../core/services/password-policy.service.js';

const policyService = new PasswordPolicyService();

// Validate a new password
const { isValid, errors } = await policyService.validatePassword('MyP@ss123');

// Check if password was used before
const { reused } = await policyService.checkPasswordHistory(userId, 'newPassword');

// Check if current password has expired
const { expired, daysRemaining } = await policyService.checkPasswordExpiry(userId);
```

### Policy Caching

Policy settings are cached in memory for 5 minutes. Call `policyService.clearCache()` after updating settings to apply changes immediately.

---

## Rate Limiting

Rate limiting is implemented using `express-rate-limit`.

### General Rate Limit

- **Window**: 15 minutes
- **Max requests**: 100 per window
- **Enabled**: Always in production; opt-in in development via `ENABLE_RATE_LIMIT=true`
- **Response code**: 429 Too Many Requests

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later."
  }
}
```

### Auth Rate Limit

Applied to `/api/auth` routes to prevent brute force attacks:

- **Window**: 15 minutes
- **Max requests**: 10 in production, 50 in development
- **Always enabled** (regardless of `ENABLE_RATE_LIMIT` setting)

```json
{
  "success": false,
  "error": {
    "code": "AUTH_RATE_LIMIT",
    "message": "Too many login attempts, please try again later."
  }
}
```

### Headers

Standard rate limit headers are included in responses:

- `RateLimit-Limit` -- Maximum requests per window
- `RateLimit-Remaining` -- Remaining requests in current window
- `RateLimit-Reset` -- Time when the window resets

Legacy headers (`X-RateLimit-*`) are disabled.

---

## Security Headers

Helmet is used to set security-related HTTP headers:

```js
app.use(helmet({
  contentSecurityPolicy: false,             // Disabled (frontend handles CSP)
  crossOriginEmbedderPolicy: false,         // Disabled for cross-origin assets
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: isProduction
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,                                // HSTS only in production
}));
```

Headers set by Helmet include:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 0` (modern browsers use CSP instead)
- `Strict-Transport-Security` (production only)
- `X-Download-Options: noopen`
- `X-DNS-Prefetch-Control: off`

---

## CORS Configuration

CORS is configured in `src/index.js`:

```js
const corsOrigin = process.env.CORS_ORIGIN || (isProduction ? false : '*');
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400,       // Preflight cache: 24 hours
}));
```

| Setting           | Development         | Production                  |
|-------------------|---------------------|-----------------------------|
| `origin`          | `*` (all origins)   | `CORS_ORIGIN` env var or `false` (disabled) |
| `credentials`     | `true`              | `true`                      |
| `methods`         | GET, POST, PUT, PATCH, DELETE, OPTIONS | Same |
| `maxAge`          | 86400 (24h)         | 86400 (24h)                 |

---

## Audit Logging

Prisma middleware automatically logs all create, update, and delete operations to the `audit_logs` table.

### What Is Logged

| Field        | Description                                     |
|--------------|-------------------------------------------------|
| `action`     | The operation: `create`, `update`, or `delete`. |
| `model`      | The Prisma model name (e.g., `User`, `Role`).  |
| `recordId`   | The ID of the affected record.                  |
| `oldValues`  | JSON snapshot of the record before the change.  |
| `newValues`  | JSON snapshot of the record after the change.   |
| `userId`     | The authenticated user who made the change.     |
| `ipAddress`  | Client IP address.                              |
| `userAgent`  | Client user agent string.                       |

### Field-Level Diffs

For update operations, the audit log includes a `_changes` object inside `oldValues` that shows exactly which fields changed:

```json
{
  "name": "Old Name",
  "_changes": {
    "name": { "from": "Old Name", "to": "New Name" },
    "status": { "from": "draft", "to": "published" }
  }
}
```

### Sensitive Field Redaction

The following fields are automatically redacted (replaced with `[REDACTED]`) in audit logs:

- `password`
- `secret`
- `token`
- `key`
- `backupCodes`

### Excluded Models

These models are excluded from audit logging to prevent recursive logging and noise:

- `AuditLog`
- `Session`
- `SecurityLog`
- `WebhookLog`

### Audit Context

The audit context (userId, ipAddress, userAgent) is set by the `authenticate` middleware via `setAuditContext()`. This makes audit data available to the Prisma middleware without passing it through every service call.

---

## Record Rules

Record rules provide row-level access control. They are managed by `SecurityService` in `src/core/services/security.service.js`.

### How Record Rules Work

1. A record rule defines a **domain** (filter) that restricts which records a user or role can access.
2. When a user attempts to read or write a record, `SecurityService.check_access()` evaluates all applicable rules.
3. If a rule's domain matches the record, the `applyRead` and `applyWrite` flags determine whether the operation is allowed.

### Rule Properties

| Field       | Description                                    |
|-------------|------------------------------------------------|
| `modelName` | The model this rule applies to.                |
| `domain`    | Array of `[field, operator, value]` conditions.|
| `userId`    | Specific user this rule applies to (optional). |
| `roleId`    | Specific role this rule applies to (optional). |
| `applyRead` | Whether read access is granted when domain matches. |
| `applyWrite`| Whether write access is granted when domain matches. |
| `active`    | Whether the rule is currently active.          |

### Example

A rule that restricts editors to only see their own records:

```json
{
  "modelName": "Document",
  "domain": [["created_by", "=", "{user.id}"]],
  "roleId": 3,
  "applyRead": true,
  "applyWrite": true,
  "active": true
}
```

### Domain Operators in Record Rules

The same operators as domain filtering are supported: `=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not in`, `like`.
