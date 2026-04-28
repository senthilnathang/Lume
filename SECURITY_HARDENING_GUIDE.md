# Lume Framework v2.0 - Security Hardening Guide

Based on [Anthropic Cybersecurity Skills Framework](https://github.com/mukul975/Anthropic-Cybersecurity-Skills) and OWASP Top 10

## Overview

This guide covers security best practices integrated into the Lume framework through the new Security Audit module. The framework now includes:

- **OWASP Top 10** vulnerability scanning
- **API security** assessment
- **Dependency** vulnerability detection
- **Input/Output** encoding utilities
- **Authentication** security hardening
- **CORS** validation
- **Rate limiting** protection
- **Security header** management

---

## Table of Contents

1. [OWASP Top 10 Mitigations](#owasp-top-10)
2. [API Security](#api-security)
3. [Input Validation](#input-validation)
4. [Authentication](#authentication)
5. [CORS Security](#cors-security)
6. [Rate Limiting](#rate-limiting)
7. [Security Headers](#security-headers)
8. [Logging & Monitoring](#logging--monitoring)
9. [Dependency Management](#dependency-management)

---

## OWASP Top 10

### A1: Broken Access Control

**Vulnerability:** Users can act outside their intended permissions

**Lume Mitigation:**
```javascript
// Role-based access control (RBAC)
// Every user MUST have a role assigned
await authorize(req, ['role:admin', 'role:editor']);

// Check access before data retrieval
const allowedFields = getFieldsForRole(user.role);
```

**Verification:**
```bash
curl http://localhost:3000/api/security/owasp
# Check for "Users without role assignment" finding
```

### A2: Cryptographic Failures

**Vulnerability:** Sensitive data exposed due to weak encryption

**Lume Implementation:**
- ✅ Password hashing via Prisma middleware
- ✅ HTTPS enforcement (configure in .env: `ENFORCE_HTTPS=true`)
- ✅ JWT token encryption (use strong `JWT_SECRET`)

**Checklist:**
- [ ] `JWT_SECRET` is a random 32+ character string
- [ ] `ENFORCE_HTTPS=true` in production
- [ ] All sensitive data in transit uses HTTPS
- [ ] At rest: database encryption enabled

### A3: Injection

**Vulnerability:** SQL injection, command injection, XSS

**Lume Protection:**
```javascript
// ✅ SAFE: Parameterized queries (Prisma/Drizzle use this)
const user = await prisma.user.findUnique({
  where: { id: userId }
});

// ❌ DANGEROUS: String concatenation (NEVER use)
// const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ SAFE: Input validation with utilities
import { InputValidation } from '@modules/security-audit/security-hardening.js';
const isValidEmail = InputValidation.validateEmail(email);

// ✅ SAFE: Output encoding
import { OutputEncoding } from '@modules/security-audit/security-hardening.js';
const safeHtml = OutputEncoding.htmlEncode(userInput);
```

**Vue Frontend Protection:**
```vue
<!-- ✅ SAFE: Vue auto-escapes -->
<div>{{ userContent }}</div>

<!-- ❌ DANGEROUS: Direct HTML rendering -->
<!-- <div v-html="userContent"></div> -->

<!-- ✅ SAFE: If HTML needed, use DOMPurify -->
<div v-html="DOMPurify.sanitize(htmlContent)"></div>
```

### A4: Insecure Design

**Vulnerability:** Missing security requirements in design

**Lume Design:**
- ✅ Rate limiting on all auth endpoints
- ✅ Session timeouts configured
- ✅ CORS whitelist enforced
- ✅ Input size limits enforced

**Configuration:**
```bash
# .env
RATE_LIMIT_WINDOW=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100   # per window
SESSION_TIMEOUT=1800          # 30 minutes
CORS_ORIGINS=https://yoursite.com,https://api.yoursite.com
```

### A5: Security Misconfiguration

**Vulnerability:** Weak defaults, unnecessary features enabled, error messages exposing internals

**Lume Hardening:**
```javascript
// Security headers automatically applied
// See: src/core/middleware/headers.js

// Debug mode must be disabled in production
NODE_ENV=production  // Not 'development'
DEBUG=false
```

**Verify:**
```bash
curl -I http://localhost:3000/health | grep -i "X-Content-Type-Options\|X-Frame-Options"
```

### A6: Vulnerable & Outdated Components

**Vulnerability:** Using components with known vulnerabilities

**Lume Approach:**
```bash
# Weekly dependency audit
npm audit
npm audit --audit-level=moderate

# Update vulnerable packages
npm update

# Check specific vulnerability
npm audit fix --force  # Use with caution
```

**Automated Scanning:**
```bash
curl http://localhost:3000/api/security/dependencies
```

### A7: Authentication Failures

**Vulnerability:** Weak authentication mechanisms

**Lume Security:**
```javascript
// Password requirements enforced
const strength = SecurityHardening.AuthenticationSecurity.validatePasswordStrength(pwd);
if (!strength.valid) {
  throw new Error('Password must be 12+ chars with uppercase, lowercase, number, special char');
}

// Session timeout enforced
const isActive = SecurityHardening.AuthenticationSecurity.validateSessionTimeout(
  lastActivity,
  30  // 30 minute timeout
);
```

**Configuration:**
```bash
# .env
PASSWORD_MIN_LENGTH=12
SESSION_TIMEOUT=1800
JWT_EXPIRY=3600
JWT_REFRESH_EXPIRY=604800
```

### A8: Data Integrity Failures

**Vulnerability:** Software and data integrity failures

**Lume Protection:**
- ✅ Audit logging on all critical operations
- ✅ Data validation before writes
- ✅ Transaction support via Prisma

```javascript
// All user modifications logged
await auditLog.create({
  action: 'USER_UPDATE',
  userId: actor.id,
  targetId: user.id,
  changes: { ...before, ...after }
});
```

### A9: Logging & Monitoring Failures

**Vulnerability:** Insufficient logging of security events

**Lume Implementation:**
```javascript
// Security events logged with sensitive data redacted
const auditEntry = LoggingSecurity.formatAuditLog(
  'LOGIN_ATTEMPT',
  user,
  'user_authentication',
  'success'
);

// Sensitive data automatically redacted
const safe = LoggingSecurity.redactSensitiveData({
  email: 'user@example.com',
  password: 'secret123'  // → '***REDACTED***'
});
```

### A10: SSRF

**Vulnerability:** Server-Side Request Forgery

**Lume Protection:**
```javascript
// Validate external URLs
const isValid = InputValidation.validateURL(userProvidedUrl);

// Whitelist allowed domains
const allowedDomains = ['api.example.com', 'cdn.example.com'];
const domain = new URL(userUrl).hostname;
if (!allowedDomains.includes(domain)) {
  throw new Error('Domain not whitelisted');
}

// Never allow file://, gopher://, etc.
const parsed = new URL(url);
if (!['http:', 'https:'].includes(parsed.protocol)) {
  throw new Error('Invalid protocol');
}
```

---

## API Security

### Request Validation

```javascript
import { APISecurity } from '@modules/security-audit/security-hardening.js';

// Validate query parameters
const allowed = ['search', 'limit', 'offset', 'sort'];
if (!APISecurity.validateQueryParams(req.query, allowed)) {
  return res.status(400).json({ error: 'Invalid parameters' });
}

// Validate payload size
if (!APISecurity.validatePayloadSize(req.body, 1048576)) { // 1MB
  return res.status(413).json({ error: 'Payload too large' });
}

// Prevent deep nesting DoS
if (!APISecurity.validateObjectDepth(req.body, 10)) {
  return res.status(400).json({ error: 'Nesting too deep' });
}
```

### Response Security

```javascript
// Never expose sensitive information
const response = {
  id: user.id,
  email: user.email,
  // ❌ NEVER include:
  // password: user.password,
  // passwordHash: user.passwordHash,
  // internalId: user.internalId
};

// Validate CSP header
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

---

## Input Validation

### Email Validation
```javascript
import { InputValidation } from '@modules/security-audit/security-hardening.js';

const email = 'user@example.com';
if (!InputValidation.validateEmail(email)) {
  throw new Error('Invalid email format');
}
```

### URL Validation
```javascript
if (!InputValidation.validateURL(userUrl)) {
  throw new Error('Invalid URL');
}

// Allowed: http://, https://
// Blocked: file://, gopher://, etc.
```

### SQL Injection Prevention
```javascript
// Use Prisma/Drizzle for all queries - NEVER raw SQL
// If raw SQL needed, ALWAYS use parameterized queries
const result = await db.raw`
  SELECT * FROM users WHERE id = ${userId} AND status = ${status}
`;
```

---

## Authentication

### Password Requirements

```javascript
const strength = SecurityHardening.AuthenticationSecurity.validatePasswordStrength(password);
// Requires: 12+ chars, uppercase, lowercase, number, special character
// Score: 0-100%

if (strength.score < 80) {
  return res.status(400).json({
    error: 'Password too weak',
    requirements: strength.checks
  });
}
```

### Secure Token Generation

```javascript
import { AuthenticationSecurity } from '@modules/security-audit/security-hardening.js';

// Generate secure reset token
const token = AuthenticationSecurity.generateSecureToken(32);

// Store hashed version in database
const hashedToken = await hash(token);
await db.resetToken.create({ 
  userId, 
  hashedToken,
  expiresAt: Date.now() + 3600000 // 1 hour
});
```

### Session Management

```javascript
// Check session validity
const isValid = AuthenticationSecurity.validateSessionTimeout(
  lastActivity,  // Timestamp of last request
  30             // 30 minute timeout
);

if (!isValid) {
  // Force re-authentication
  throw new UnauthorizedException('Session expired');
}
```

---

## CORS Security

### Configuration

```javascript
import { CORSSecurity } from '@modules/security-audit/security-hardening.js';

const whitelist = [
  'https://example.com',
  'https://app.example.com',
  // Note: Never use '*' in production
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const headers = CORSSecurity.getSafeCORSHeaders(origin, whitelist);
  
  if (Object.keys(headers).length > 0) {
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }
  
  next();
});
```

### Subdomain Wildcards

```javascript
// Support multiple subdomains
const whitelist = [
  'https://example.com',
  'https://*.api.example.com'  // Matches a.api.example.com, b.api.example.com
];
```

---

## Rate Limiting

### API Rate Limiting

```javascript
import { RateLimitingSecurity } from '@modules/security-audit/security-hardening.js';

const loginLimiter = RateLimitingSecurity.createRateLimiter(
  5,     // 5 attempts
  300000 // per 5 minutes
);

app.post('/api/users/login', (req, res) => {
  const limit = loginLimiter(req.ip);
  
  if (!limit.allowed) {
    return res.status(429).json({
      error: 'Too many login attempts',
      retryAfter: limit.resetTime
    });
  }
  
  // Process login...
});
```

### Express Throttler (Already Configured)

```javascript
// Already enabled in Lume
@Throttle(100, 900)  // 100 requests per 15 minutes
```

---

## Security Headers

### Automatic Headers

Lume applies these headers automatically:

```javascript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': "default-src 'self'"
}
```

### Customize if Needed

```javascript
import { SecurityHeaders } from '@modules/security-audit/security-hardening.js';

const headers = SecurityHeaders.getSecurityHeaders();
Object.entries(headers).forEach(([key, value]) => {
  res.setHeader(key, value);
});
```

---

## Logging & Monitoring

### Audit Logging

```javascript
import { LoggingSecurity } from '@modules/security-audit/security-hardening.js';

const auditLog = LoggingSecurity.formatAuditLog(
  'USER_PERMISSION_GRANT',
  { id: adminId, email: admin.email },
  `user:${userId}`,
  'success'
);

await db.auditLog.create(auditLog);
```

### Sensitive Data Redaction

```javascript
const userInfo = {
  id: 123,
  email: 'user@example.com',
  password: 'secret123',
  creditCard: '4111-1111-1111-1111',
  ssn: '123-45-6789'
};

const safe = LoggingSecurity.redactSensitiveData(userInfo);
// Result:
// {
//   id: 123,
//   email: 'user@example.com',
//   password: '***REDACTED***',
//   creditCard: '***REDACTED***',
//   ssn: '***REDACTED***'
// }
```

---

## Dependency Management

### Regular Audits

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Fix with breaking changes (use caution)
npm audit fix --force

# Schedule regular audits
# Add to CI/CD pipeline:
# npm audit --audit-level=moderate
```

### Check Endpoint

```bash
# Get vulnerability report
curl http://localhost:3000/api/security/dependencies
```

---

## Security Audit Endpoints

The new Security Audit module provides these endpoints:

### Get Full Audit Report
```bash
curl http://localhost:3000/api/security/audit
```

Response includes:
- Risk score (0-100)
- Critical/High/Medium issue counts
- Detailed findings
- Remediation recommendations

### OWASP Scan
```bash
curl http://localhost:3000/api/security/owasp
```

### API Security Scan
```bash
curl http://localhost:3000/api/security/api-scan
```

### Dependency Audit
```bash
curl http://localhost:3000/api/security/dependencies
```

### Risk Score
```bash
curl http://localhost:3000/api/security/risk-score
```

Returns:
```json
{
  "riskScore": 42,
  "riskLevel": "MEDIUM",
  "color": "#f59e0b",
  "recommendation": "Address HIGH and MEDIUM issues before production"
}
```

---

## Production Deployment Checklist

- [ ] JWT_SECRET set to random 32+ character string
- [ ] JWT_REFRESH_SECRET set
- [ ] SESSION_SECRET set
- [ ] NODE_ENV=production
- [ ] DEBUG=false
- [ ] ENFORCE_HTTPS=true
- [ ] CORS_ORIGINS explicitly configured
- [ ] Rate limiting configured
- [ ] Session timeout configured
- [ ] Password requirements enforced
- [ ] Audit logging enabled
- [ ] Security headers verified
- [ ] npm audit passes with no critical issues
- [ ] Database encryption enabled
- [ ] Backups configured and tested
- [ ] Monitoring and alerting set up
- [ ] Security audit report generated and reviewed

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Anthropic Cybersecurity Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Last Updated:** April 28, 2026  
**Lume Version:** 2.0.0  
**Security Level:** Production-Ready
