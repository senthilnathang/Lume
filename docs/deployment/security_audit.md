# Code Security Review — Lume NestJS Backend

**Audit Date:** 2026-04-25  
**Reviewed By:** Security Audit Task 4  
**Branch:** framework  
**Application:** Lume NestJS Backend v2.0

---

## Executive Summary

Code security review of the Lume NestJS backend reveals **generally solid security practices** with notable findings:

- ✅ **No hardcoded secrets in source code** — all sensitive values properly externalized to environment variables
- ✅ **CORS properly configured** — whitelist-based with environment-driven origins (no wildcard)
- ✅ **JWT security** — secrets correctly sourced from `process.env.JWT_SECRET`
- ✅ **Password hashing** — bcryptjs with salt rounds (bcrypt.genSalt(10)) in place
- ✅ **Input validation** — ValidationPipe with class-validator for DTO validation
- ❌ **CRITICAL: .env files tracked in git** — `.env`, `.env.production` exposed in repository (database credentials visible)
- ❌ **Rate limiting not implemented** — missing ThrottlerModule or express-rate-limit
- ❌ **Helmet not configured** — missing HTTP security headers
- ⚠️ **SQL Logging enabled in production** — Prisma query logging via stdout in PrismaService

---

## Detailed Findings

### 1. Secrets Management

#### ✅ No Hardcoded Secrets in Source Code
All security-sensitive configurations properly use `process.env.*` pattern:
- **JWT Secret:** `process.env.JWT_SECRET` in auth.module.ts, jwt.strategy.ts, jwt.service.ts
- **Database Credentials:** Referenced via `DATABASE_URL` in prisma configuration
- **API Keys/Tokens:** Not found hardcoded

**Files Reviewed:**
- `/backend/lume-nestjs/src/main.ts`
- `/backend/lume-nestjs/src/app.module.ts`
- `/backend/lume-nestjs/src/core/services/jwt.service.ts`
- `/backend/lume-nestjs/src/modules/auth/auth.module.ts`
- `/backend/lume-nestjs/src/modules/auth/strategies/jwt.strategy.ts`

#### ❌ CRITICAL: .env Files Tracked in Git
**Issue:** Environment files with sensitive credentials are committed to the repository.

Files tracked in git:
- `backend/.env` — EXPOSED (DB credentials: gawdesy/gawdesy, JWT secret)
- `backend/.env.production` — EXPOSED (production JWT, DB host details)
- `backend/.env.example` — OK (safe template)
- `.env.example` — OK (safe template)

**Credentials Exposed in Git:**
- `.env` contains: `DB_USER=gawdesy`, `DB_PASSWORD=gawdesy`, `JWT_SECRET=lume-dev-jwt-secret-f8a3b1c9e4d7`
- `.env.production` contains: `JWT_SECRET=your-super-secret-jwt-key-change-in-production` (placeholder but exposed)
- `.env.staging` contains: `JWT_SECRET=staging-secret-key-change-before-production`

**Remediation Required:**
```bash
git rm --cached backend/.env backend/.env.production backend/lume-nestjs/.env.staging
git commit -m "security: remove exposed .env files from tracking"
```

#### ✅ JWT Secret Management (Code Level)
All JWT operations correctly reference environment variables:
- Access Token: `process.env.JWT_SECRET` in `generateAccessToken()`
- Refresh Token: `process.env.JWT_SECRET` in `generateRefreshToken()`
- Token Verification: `process.env.JWT_SECRET` in `verifyToken()`
- JwtModule Registration: `secret: process.env.JWT_SECRET`

**File:** `/backend/lume-nestjs/src/core/services/jwt.service.ts`

#### ✅ Database Credentials from Environment
Database configuration follows best practices:
- Prisma `DATABASE_URL` in environment variable
- Connection pooling configured via `DB_POOL_SIZE=10`
- No hardcoded connection strings in TypeScript

---

### 2. CORS Configuration

#### ✅ CORS Enabled with Whitelist (No Wildcard)
**File:** `/backend/lume-nestjs/src/main.ts`

```typescript
const corsOrigins: (string | RegExp)[] = [
  'http://localhost:5173',
  'http://localhost:3001',
];
if (process.env.ADMIN_URL) corsOrigins.push(process.env.ADMIN_URL);
if (process.env.PUBLIC_URL) corsOrigins.push(process.env.PUBLIC_URL);

app.enableCors({
  origin: corsOrigins,
  credentials: true,
});
```

**Strengths:**
- ✅ Whitelist-based origins (not wildcard `*`)
- ✅ Environment-driven configuration
- ✅ Credentials allowed (appropriate for same-domain admin + public site)
- ✅ Supports both localhost development and production URLs

---

### 3. Authentication & JWT

#### ✅ JWT Guard on Protected Routes
Routes properly decorated with `@UseGuards(JwtAuthGuard)`:

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
async getProfile(@Request() req: any) {
  return this.authService.getProfile(req.user.id);
}

@Get('verify')
@UseGuards(JwtAuthGuard)
async verifyToken(@Request() req: any) {
  return { valid: true, user: req.user };
}
```

#### ✅ JWT Strategy Properly Configured
```typescript
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,                           // Enforces expiration
  secretOrKey: process.env.JWT_SECRET,               // From environment
});
```

#### ✅ Password Hashing with bcryptjs
```typescript
async hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);             // 10 rounds
  return bcrypt.hash(password, salt);
}
```

#### ✅ Input Validation on Auth DTOs
Login DTO with class-validator:
```typescript
export class LoginDto {
  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;
}
```

---

### 4. Input Validation & Sanitization

#### ✅ ValidationPipe Globally Configured
Uses `class-validator` + `class-transformer`:
- Validates all DTOs against declared constraints
- Prevents invalid payloads from reaching services
- Returns structured error messages
- Globally registered via APP_PIPE

**Package:** `"class-validator": "^0.14.0"`, `"class-transformer": "^0.5.0"`

---

### 5. Rate Limiting

#### ❌ Rate Limiting NOT Implemented
**Finding:** No rate limiting middleware or ThrottlerModule detected.

```bash
grep -r "ThrottlerModule\|@Throttle\|rateLimit" backend/lume-nestjs/src/
# Returns: (no results)
```

**Risk:** API endpoints vulnerable to brute-force attacks (especially `/auth/login`).

**Recommendation:**
Install `@nestjs/throttler` and add to AppModule with limits on login endpoint (5 attempts per 60 seconds).

---

### 6. HTTP Security Headers

#### ❌ Helmet NOT Configured
**Finding:** No `@nestjs/helmet` package or HTTP security headers middleware.

**Missing Headers:**
- Content-Security-Policy (CSP)
- X-Content-Type-Options
- X-Frame-Options
- Strict-Transport-Security (HSTS)
- X-XSS-Protection

**Recommendation:**
Install `@nestjs/helmet` and register in main.ts before listening.

---

### 7. Logging & Error Handling

#### ⚠️ SQL Logging Enabled in Production
**File:** `/backend/lume-nestjs/src/core/services/prisma.service.ts`

```typescript
super({
  log: [
    { emit: 'stdout', level: 'query' },   // Logs all SQL queries
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
    { emit: 'stdout', level: 'error' },
  ],
});
```

**Issue:** SQL queries logged to stdout include sensitive data patterns.

**Recommendation:** Make logging environment-aware; disable query logging in production.

#### ✅ Proper Error Responses
Auth errors are generic (no user enumeration):
- "Invalid credentials" (rather than "email not found")
- Prevents user enumeration via login endpoint

---

## Summary Table

| Category | Status | Details |
|----------|--------|---------|
| **Hardcoded Secrets** | ✅ PASS | No secrets in source code |
| **.env Files in Git** | ❌ FAIL | Tracked (CRITICAL) |
| **JWT Secret (Code)** | ✅ PASS | All JWT ops use `process.env.JWT_SECRET` |
| **CORS Configuration** | ✅ PASS | Whitelist-based, no wildcard |
| **JWT Guard** | ✅ PASS | Guard on protected endpoints |
| **Password Hashing** | ✅ PASS | bcryptjs with 10 rounds |
| **Input Validation** | ✅ PASS | ValidationPipe with class-validator |
| **Rate Limiting** | ❌ FAIL | Not implemented |
| **HTTP Headers** | ❌ FAIL | No Helmet |
| **Logging** | ⚠️ WARN | SQL queries logged in all environments |

---

## Remediation Priority

### CRITICAL (Address Immediately)
1. **Remove .env files from git tracking** — use `git rm --cached`
2. **Implement rate limiting** — add `@nestjs/throttler` to `/auth/login`

### HIGH (Before Production Deployment)
3. **Install Helmet** — add `@nestjs/helmet` for HTTP security headers
4. **Disable SQL logging in production** — make logging environment-aware

### MEDIUM (Best Practices)
5. **Add HTTPS-only CORS** — validate origins with protocols in production
6. **Rotate secrets** — generate new JWT secrets for production

---

**Report Compiled:** 2026-04-25  
**Next Audit:** Recommend quarterly security reviews
