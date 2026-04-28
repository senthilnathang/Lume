# Lume v2.0 Security Guide

**Last Updated:** April 28, 2026  
**Version:** 2.0.0

Comprehensive security documentation covering RBAC, authentication, encryption, compliance, and audit logging.

---

## Table of Contents

1. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [Data Encryption](#data-encryption)
5. [API Security](#api-security)
6. [Audit Logging](#audit-logging)
7. [Compliance](#compliance)
8. [Security Checklist](#security-checklist)

---

## Role-Based Access Control (RBAC)

Lume implements granular RBAC with 140+ permissions.

### Default Roles

**Admin:**
- Full system access
- User management
- Settings configuration
- Module installation

**Editor:**
- Create and edit records
- Manage views and automations
- Own content

**Viewer:**
- Read-only access
- Cannot create or edit
- Limited to assigned entities

### Custom Roles

Create custom roles with specific permission combinations:

```javascript
// Create custom role
POST /api/roles
{
  "name": "Manager",
  "description": "Team lead with approval rights",
  "permissions": [
    "contacts.view",
    "contacts.create",
    "contacts.edit",
    "contacts.delete",      // Own records only
    "automations.view",
    "reports.view"
  ]
}
```

### Permission Matrix

| Permission | Admin | Editor | Viewer |
|-----------|-------|--------|--------|
| entity.create | ✅ | ❌ | ❌ |
| entity.view | ✅ | ✅ | ✅ |
| record.create | ✅ | ✅ | ❌ |
| record.edit | ✅ | ✅ (own) | ❌ |
| user.manage | ✅ | ❌ | ❌ |
| settings.view | ✅ | ❌ | ❌ |

---

## Authentication

### Login Flow

1. User submits email + password
2. Server validates password hash (bcrypt)
3. Server generates JWT access token (1 hour expiry)
4. Server generates refresh token (7 day expiry)
5. Client stores tokens securely
6. Client includes access token in API requests

### Token Structure

**Access Token (JWT):**
```json
{
  "sub": 1,
  "email": "user@example.com",
  "role": "editor",
  "exp": 1682793600,
  "iat": 1682790000
}
```

**Refresh Token:**
Secure token stored server-side, used to issue new access tokens.

### Password Policy

- Minimum 12 characters
- Must contain uppercase, lowercase, number, special character
- Cannot be reused (last 5 passwords)
- Password reset every 90 days (configurable)

### Multi-Factor Authentication (Planned)

Coming in v2.1:
- TOTP (Time-based One-Time Password)
- WebAuthn/FIDO2 support
- Backup codes

---

## Authorization

### Permission Checking

All protected endpoints check permissions:

```javascript
@RequireAuth()
@RequirePermission('contacts.edit')
POST /api/contacts/:id
```

### Field-Level Access

Hide sensitive fields from unauthorized users:

```javascript
// User sees: firstName, lastName, email
// Admin also sees: salary, ssn, notes

if (!user.hasPermission('hr.sensitive')) {
  record.salary = undefined
  record.ssn = undefined
}
```

### Record-Level Access

Limit access by record owner:

```javascript
// Only owner or admin can edit
if (record.ownerId !== user.id && !user.isAdmin) {
  throw new ForbiddenError()
}
```

---

## Data Encryption

### In Transit (TLS/SSL)

- All communication over HTTPS
- TLS 1.2+ required
- Certificates renewed automatically

### At Rest (Database)

```bash
# Enable MySQL encryption
[mysqld]
skip-name-resolve
default_table_encryption = ON
```

### Password Storage

Passwords hashed with bcrypt:
- Salting: Automatic per password
- Iterations: 12 rounds
- Verification: bcrypt.compare() timing-safe

```javascript
// Password creation
const hash = await bcrypt.hash(password, 12)

// Verification
const isValid = await bcrypt.compare(password, hash)
```

---

## API Security

### Input Validation

All input validated before processing:

```javascript
// Request validation
const schema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().max(100).required(),
  status: Joi.string().valid('new', 'customer', 'archived')
})

const { error, value } = schema.validate(request.body)
if (error) {
  throw new ValidationError(error)
}
```

### SQL Injection Prevention

Using parameterized queries (Prisma/Drizzle):

```javascript
// SAFE: Parameterized query
const user = await prisma.user.findUnique({
  where: { email: userInput }
})

// UNSAFE: String concatenation (DO NOT USE)
const user = await query(`SELECT * FROM users WHERE email = '${userInput}'`)
```

### XSS Prevention

Output encoding for user-generated content:

```javascript
// Encode HTML entities
const encoded = escapeHtml(userInput)

// Store TipTap JSON (structured, not HTML)
const content = { type: 'doc', content: [...] }
```

### CSRF Protection

CSRF tokens for state-changing operations:

```html
<form method="POST" action="/api/users">
  <input type="hidden" name="_csrf" value="<csrf-token>" />
  <input type="submit" value="Save" />
</form>
```

### Rate Limiting

Per-IP and per-user rate limiting:

```
Public endpoints: 100 req/15 min per IP
Auth endpoints: 5 req/5 min per IP
API endpoints: 1000 req/hour per user
```

### CORS Configuration

Whitelist allowed origins:

```javascript
app.use(cors({
  origin: [
    'https://yourdomain.com',
    'https://admin.yourdomain.com'
  ],
  credentials: true
}))
```

---

## Audit Logging

Every action logged with:
- Who (user ID)
- What (action type, affected record)
- When (timestamp)
- Where (IP address, user agent)
- Change details (old → new values)

### Sample Audit Log

```json
{
  "id": 1,
  "userId": 1,
  "action": "RECORD_UPDATE",
  "entityId": "contacts",
  "recordId": 123,
  "oldValues": { "status": "new" },
  "newValues": { "status": "customer" },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-04-28T10:30:00Z"
}
```

### Audit Log Queries

```bash
# List recent changes
GET /api/audit?limit=50&sort=created_at&order=DESC

# Find all changes by user
GET /api/audit?userId=1

# Find all changes to specific record
GET /api/audit?entityId=contacts&recordId=123&sort=created_at
```

### Data Retention

- Audit logs retained for 1+ year
- Automatic archiving to cold storage
- Cannot be modified or deleted

---

## Compliance

### GDPR (General Data Protection Regulation)

**Data Subject Rights:**
- Right to access personal data
- Right to be forgotten (deletion)
- Right to rectification
- Data portability

**Implementation:**
```bash
# Export user data
GET /api/users/:id/export

# Delete user (anonymization)
DELETE /api/users/:id?anonymize=true
```

### HIPAA (Health Insurance Portability and Accountability Act)

**Requirements:**
- Encryption at rest and in transit
- Audit logging (all access)
- Access controls (RBAC)
- Business Associate Agreements

### CCPA (California Consumer Privacy Act)

Similar to GDPR:
- Data export capability
- Opt-out of data sales
- Deletion/anonymization

### SOC 2 Compliance

Lume can be deployed to be SOC 2 compliant:
- Access controls (RBAC)
- Monitoring (audit logs)
- Security (encryption, TLS)
- Availability (backups, DR)

---

## Security Checklist

### Pre-Launch

- [ ] SSL/TLS certificate installed (A+ rating)
- [ ] All passwords changed from defaults
- [ ] CORS origins configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Database backups enabled
- [ ] Monitoring and alerting configured
- [ ] Security audit completed
- [ ] Penetration testing completed

### After Launch

- [ ] Monitor Sentry for errors
- [ ] Review audit logs regularly
- [ ] Update dependencies monthly
- [ ] Patch critical security issues immediately
- [ ] Rotate API keys quarterly
- [ ] Review user permissions monthly
- [ ] Test disaster recovery procedures

### Ongoing Security

- [ ] Subscribe to security advisories
- [ ] Keep Node.js/OS updated
- [ ] Run security scans (npm audit)
- [ ] Monitor for suspicious activity
- [ ] Regular security training for team
- [ ] Document security procedures

---

## Reporting Security Issues

Found a security vulnerability? Please report to:
- **Email:** security@lume.dev
- **PGP Key:** [available on website]
- **Do NOT:** Create public GitHub issue

We'll respond within 48 hours and provide fix timeline.

---

**See [SECURITY_HARDENING_GUIDE.md](../SECURITY_HARDENING_GUIDE.md) for detailed hardening procedures.**

