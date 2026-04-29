# Security Hardening Guide

Comprehensive guide for hardening Lume framework against common vulnerabilities and attacks.

## OWASP Top 10 Compliance Checklist

### 1. Broken Access Control

**Risk**: Users can access resources they shouldn't have access to

**Mitigation**:

```typescript
// ✅ Check permissions on every endpoint
@Get('/entities/:entity/records/:id')
async getRecord(
  @Param('entity') entity: string,
  @Param('id') id: number,
  @Req() req: RequestWithUser
) {
  // Verify user has permission
  const allowed = await policyEvaluator.canRead(entity, req.user, { id });
  if (!allowed) {
    throw new ForbiddenException('Access denied');
  }

  return recordService.get(entity, id);
}

// ✅ Enforce on list queries
@Post('/query')
async query(
  @Body() query: QueryDto,
  @Req() req: RequestWithUser
) {
  // Apply permission filters
  const filters = await policyEvaluator.filterQueryForPolicies(
    query.entity,
    req.user
  );
  query.filters.push(...filters);

  return recordService.query(query);
}
```

**Testing**:
- [ ] User A cannot access User B's data
- [ ] Non-admin cannot access admin endpoints
- [ ] User cannot escalate own privileges
- [ ] Deleted records are inaccessible
- [ ] Cross-tenant data isolation working

### 2. Cryptographic Failures

**Risk**: Sensitive data exposed through weak encryption or insecure transmission

**Mitigation**:

```typescript
// ✅ Encrypt sensitive fields
@Entity()
export class User {
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'text', transformer: EncryptionTransformer })
  phoneNumber: string;  // Encrypted at rest

  @Column({ type: 'text', transformer: EncryptionTransformer })
  socialSecurityNumber: string;  // Encrypted at rest

  // Never store passwords - use hashing instead
  @Column({ type: 'varchar', length: 255 })
  password_hash: string;  // Bcrypt hash
}

// ✅ Use strong TLS
// In nginx.conf:
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;

// ✅ Hash passwords with bcrypt
const hashed = await bcrypt.hash(password, 10);  // 10 rounds

// ✅ Use secure random tokens
const token = crypto.randomBytes(32).toString('hex');

// ✅ Encrypt API keys and secrets
const encrypted = crypto.encrypt(apiKey, masterKey);
```

**Testing**:
- [ ] HTTPS enforced on all routes (no HTTP)
- [ ] TLS 1.2+ only (no SSLv3, TLS 1.0, 1.1)
- [ ] Strong cipher suites only
- [ ] No hardcoded secrets in code
- [ ] Encryption at rest for sensitive data
- [ ] Password hashing (bcrypt, argon2, not MD5/SHA1)

### 3. Injection

**Risk**: Attackers inject malicious code through input fields

**Mitigation**:

```typescript
// ✅ Use parameterized queries (never string concatenation)
// ❌ VULNERABLE - DO NOT USE
// const records = await db.query(`
//   SELECT * FROM entity_records 
//   WHERE owner_id = '${userId}'
// `);

// ✅ SAFE - Use this instead
const records = await db.select()
  .from(EntityRecords)
  .where(eq(EntityRecords.owner_id, userId));

// ✅ For subprocess execution, use execFile not exec
import { execFile } from 'child_process';

// ❌ VULNERABLE - NEVER DO THIS
// exec(`convert ${filename} output.png`);

// ✅ SAFE - Use this approach
const { execFileNoThrow } = require('./utils/execFileNoThrow');
await execFileNoThrow('convert', [filename, 'output.png']);

// ✅ Validate all input
@Post('/entities/:entity/records')
@UsePipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}))
async create(
  @Param('entity') entity: string,
  @Body() dto: CreateRecordDto
) {
  // Validation happens automatically
}

// ✅ Sanitize output (XSS prevention)
import DOMPurify from 'dompurify';
const safe = DOMPurify.sanitize(userInput);
```

**Testing**:
- [ ] SQL injection attempts blocked
- [ ] Command injection attempts blocked
- [ ] Script injection attempts blocked
- [ ] Input validation on all endpoints
- [ ] Output encoding for display

### 4. Insecure Design

**Risk**: Fundamental design flaws in security architecture

**Mitigation**:

```typescript
// ✅ Secure by default (deny-all)
@Policy({
  entity: '*',
  actions: ['*'],
  deny: true  // Deny by default
})
export class DenyAllPolicy {}

// ✅ Only explicitly allow access
@Policy({
  entity: 'Lead',
  actions: ['read'],
  conditions: [
    { field: 'owner', operator: '==', value: '$userId' }
  ]
})
export class LeadOwnerReadPolicy {}

// ✅ Rate limiting on all endpoints
@UseGuards(ThrottleGuard)
@Throttle(100, 60)  // 100 requests per 60 seconds
@Post('/login')
async login(@Body() credentials: LoginDto) {
  // ...
}

// ✅ Require MFA for sensitive operations
@UseGuards(Mfa2faGuard)
@Delete('/api/entities/:entity/records/:id')
async delete(
  @Param('entity') entity: string,
  @Param('id') id: number,
  @Req() req: RequestWithUser
) {
  // Requires 2FA verification
}
```

**Testing**:
- [ ] Default deny policy in place
- [ ] Rate limiting on all endpoints
- [ ] MFA required for critical operations
- [ ] Audit logging enabled
- [ ] Failed access attempts logged

### 5. Broken Authentication

**Risk**: Weak authentication allowing unauthorized access

**Mitigation**:

```typescript
// ✅ Use strong password requirements
const passwordValidation = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventReuse: 5,  // Can't reuse last 5 passwords
};

// ✅ Enforce password expiration
const passwordExpiresAt = new Date();
passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 90);  // 90 days

// ✅ Implement account lockout
let failedAttempts = 0;
if (passwordIncorrect) {
  failedAttempts++;
  if (failedAttempts >= 5) {
    user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);  // 30 min lockout
  }
}

// ✅ Use secure session management
@UseGuards(JwtAuthGuard)
@Post('/logout')
async logout(@Req() req: RequestWithUser) {
  // Invalidate token
  await tokenBlacklist.add(req.user.jti);
  return { status: 'logged out' };
}

// ✅ Enforce secure token practices
const token = jwt.sign(payload, secret, {
  expiresIn: '1h',  // Short expiration
  algorithm: 'HS256',  // Strong algorithm
  jti: crypto.randomUUID(),  // Unique ID for revocation
});

// ✅ Use refresh tokens for long-lived sessions
@Post('/refresh')
async refresh(@Body() dto: RefreshTokenDto) {
  const newToken = await tokenService.refresh(dto.refreshToken);
  return { accessToken: newToken };
}
```

**Testing**:
- [ ] Password requirements enforced
- [ ] Weak passwords rejected
- [ ] Account lockout after failed attempts
- [ ] Sessions invalidated on logout
- [ ] JWT tokens have short expiration
- [ ] Refresh token mechanism working

### 6. Software and Data Integrity Failures

**Risk**: Using untrusted components or data sources

**Mitigation**:

```typescript
// ✅ Verify package integrity
npm audit
npm ci  // Use package-lock.json, not package.json

// ✅ Use version pinning for critical deps
{
  "dependencies": {
    "bcryptjs": "2.4.3",     // Pinned version
    "helmet": "~7.0.0",      // Compatible patch versions
    "express": "^4.18.0"     // Compatible minor/patch versions
  }
}

// ✅ Verify third-party data
const data = await externalAPI.fetch();
const validated = await validateDataSchema(data, schema);

// ✅ Use subresource integrity for CDN resources
<script src="https://cdn.example.com/lib.js"
  integrity="sha384-..."></script>

// ✅ Sign and verify workflow definitions
const signature = crypto.sign(
  JSON.stringify(workflowDef),
  privateKey
);

// On load, verify signature
const isValid = crypto.verify(
  signature,
  JSON.stringify(workflowDef),
  publicKey
);
```

**Testing**:
- [ ] No npm audit vulnerabilities
- [ ] All dependencies pinned to known versions
- [ ] Regular dependency updates scheduled
- [ ] Code review before package upgrades
- [ ] Third-party data validated

### 7. Identification and Authentication Failures

**Risk**: Session hijacking, credential theft

**Mitigation**:

```typescript
// ✅ Secure session storage
// ❌ Store in localStorage (vulnerable to XSS)
// localStorage.setItem('token', token);

// ✅ Store in httpOnly cookie (immune to XSS)
res.cookie('token', token, {
  httpOnly: true,  // Not accessible via JavaScript
  secure: true,    // HTTPS only
  sameSite: 'Strict',  // CSRF protection
  maxAge: 1000 * 60 * 60,  // 1 hour
});

// ✅ Use CSRF tokens
<form action="/api/delete" method="POST">
  <input type="hidden" name="csrf" value="<%= csrfToken %>" />
</form>

// ✅ Implement session timeout
const sessionTimeout = 30 * 60 * 1000;  // 30 minutes
let lastActivity = Date.now();

setInterval(() => {
  if (Date.now() - lastActivity > sessionTimeout) {
    logout();  // Auto-logout on inactivity
  }
}, 60000);

document.addEventListener('click', () => {
  lastActivity = Date.now();  // Update on user activity
});
```

**Testing**:
- [ ] Tokens stored in httpOnly cookies
- [ ] CSRF tokens validated
- [ ] Session timeout working
- [ ] Token rotation on refresh
- [ ] Session invalidation on logout

### 8. Software and Data Integrity Failures (API)

**Risk**: Unauthorized modifications to API requests/responses

**Mitigation**:

```typescript
// ✅ Sign API responses
const response = {
  data: records,
  signature: crypto.sign(JSON.stringify(records), privateKey),
  timestamp: Date.now(),
};

// Client verifies
const isValid = crypto.verify(
  response.signature,
  JSON.stringify(response.data),
  publicKey
);

// ✅ Include nonce in requests to prevent replay
const nonce = crypto.randomBytes(16).toString('hex');
const request = {
  data: { /* ... */ },
  nonce,
  timestamp: Date.now(),
};
```

**Testing**:
- [ ] API responses signed
- [ ] Nonces validated
- [ ] Replay attacks prevented
- [ ] Request tampering detected

### 9. Logging and Monitoring Failures

**Risk**: Security incidents not detected or investigated

**Mitigation**:

```typescript
// ✅ Log security events
logger.info('User login', {
  userId: user.id,
  timestamp: new Date(),
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

logger.warn('Failed login attempt', {
  email: email,
  attempts: failedAttempts,
  timestamp: new Date(),
  ip: req.ip,
});

logger.error('Access denied', {
  userId: user.id,
  resource: entity,
  permission: 'write',
  timestamp: new Date(),
});

// ✅ Monitor for anomalies
const failedLogins = await getMetric('failed_logins_5min');
if (failedLogins > 10) {
  alert('High failed login rate');
}

const slowQueries = await getMetric('slow_queries_5min');
if (slowQueries > 100) {
  alert('High slow query rate - possible DoS');
}

// ✅ Audit sensitive operations
auditLog.record({
  action: 'DELETE_RECORD',
  entity: 'Lead',
  recordId: 123,
  userId: user.id,
  timestamp: new Date(),
  changes: { /* before/after */ },
});
```

**Testing**:
- [ ] All authentication attempts logged
- [ ] All authorization failures logged
- [ ] All data modifications logged
- [ ] Sensitive operations audited
- [ ] Logs retained for 90+ days
- [ ] Log tampering detection enabled

### 10. Server-Side Request Forgery (SSRF)

**Risk**: Application makes unintended requests to internal systems

**Mitigation**:

```typescript
// ✅ Validate webhook URLs
const allowedHosts = ['api.example.com', 'webhook.example.com'];
const url = new URL(webhookUrl);

if (!allowedHosts.includes(url.hostname)) {
  throw new BadRequestException('Invalid webhook URL');
}

// ✅ Block internal IP ranges
const isInternalIP = isPrivateIP(url.hostname);
if (isInternalIP) {
  throw new BadRequestException('Cannot access internal IPs');
}

// ✅ Timeout external requests
const response = await fetch(url, {
  timeout: 5000,  // 5 second timeout
  // Don't follow redirects to prevent SSRF via redirect
  redirect: 'error',
});

// ✅ Validate response before processing
const contentType = response.headers.get('content-type');
if (!contentType.includes('application/json')) {
  throw new BadRequestException('Invalid response type');
}
```

**Testing**:
- [ ] Cannot access internal IPs (127.0.0.1, 10.x.x.x)
- [ ] External requests timeout appropriately
- [ ] Redirects blocked or validated
- [ ] Response validation working

---

## Authentication & Authorization Hardening

### Password Policy

```typescript
// Password requirements
const passwordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()',
  preventCommon: true,  // Block common passwords
  preventReuse: 5,      // Can't reuse last 5 passwords
  expiresAfterDays: 90,
  lockoutAttempts: 5,
  lockoutDuration: 30,  // minutes
};
```

### Multi-Factor Authentication (MFA)

```typescript
// ✅ Implement TOTP (Time-based One-Time Password)
import speakeasy from 'speakeasy';

const secret = speakeasy.generateSecret({
  name: `Lume (${user.email})`,
  issuer: 'Lume',
  length: 32,
});

// User scans QR code
const qrCode = speakeasy.toDataURL({
  secret: secret.base32,
  encoding: 'base32',
  label: `Lume (${user.email})`,
  issuer: 'Lume',
});

// Verify token
const verified = speakeasy.totp.verify({
  secret: user.mfaSecret,
  encoding: 'base32',
  token: userToken,
  window: 2,  // Allow ±2 time steps
});

// ✅ Backup codes (recovery)
const backupCodes = Array.from({ length: 10 }, () =>
  crypto.randomBytes(4).toString('hex').toUpperCase()
);
user.backupCodes = backupCodes.map(code =>
  bcrypt.hashSync(code, 10)
);
```

### API Key Security

```typescript
// ✅ Generate strong API keys
const apiKey = crypto.randomBytes(32).toString('hex');
const apiKeyHash = bcrypt.hashSync(apiKey, 10);

// ✅ Rate limit by API key
const getRateLimitKey = (req) => {
  const apiKey = req.headers['x-api-key'];
  return `ratelimit:${apiKey}`;
};

// ✅ Rotate API keys periodically
const keyRotationPeriod = 90 * 24 * 60 * 60 * 1000;  // 90 days
if (Date.now() - apiKey.createdAt > keyRotationPeriod) {
  warn(`API key ${apiKey.name} should be rotated`);
}

// ✅ Allow key scoping
const apiKey = {
  key: hash,
  scope: ['read:leads', 'write:leads'],  // Limited permissions
  ipWhitelist: ['192.168.1.0/24'],
  rotateAfter: keyCreatedAt + 90 * 24 * 60 * 60 * 1000,
};
```

---

## Data Security

### Field-Level Encryption

```typescript
// ✅ Encrypt sensitive fields
@Entity()
export class Lead {
  @Column()
  name: string;  // Not sensitive, not encrypted

  @Column({ type: 'text', transformer: EncryptionTransformer })
  email: string;  // Sensitive, encrypted

  @Column({ type: 'text', transformer: EncryptionTransformer })
  phone: string;  // Sensitive, encrypted

  @Column()
  company: string;  // Not sensitive, not encrypted
}

// Encryption transformer
const EncryptionTransformer = {
  to: (value: string) => {
    if (!value) return null;
    return crypto.encrypt(value, masterKey);
  },
  from: (value: string) => {
    if (!value) return null;
    return crypto.decrypt(value, masterKey);
  },
};
```

### Data Retention Policy

```sql
-- Delete old records after 7 years (GDPR)
DELETE FROM entity_records
WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR);

-- Archive records for 1 year before deleting
INSERT INTO entity_records_archive
SELECT * FROM entity_records
WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 YEAR)
  AND created_at > DATE_SUB(NOW(), INTERVAL 7 YEAR);
```

---

## Input Validation & Output Encoding

### Input Validation

```typescript
// ✅ Validate all input
@Post('/entities/:entity/records')
@UsePipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
}))
async create(
  @Param('entity') entity: string,
  @Body() dto: CreateRecordDto
) {
  // DTO properties validated automatically
}

// DTO with validation rules
export class CreateRecordDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEmail()
  email: string;

  @IsPhoneNumber('US')
  phone: string;

  @IsOptional()
  @IsDate()
  createdAt?: Date;
}

// ✅ Sanitize HTML input
import DOMPurify from 'dompurify';

const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br'],
    ALLOWED_ATTR: ['href'],
  });
};
```

### Output Encoding

```typescript
// ✅ Encode for HTML context
import * as escapeHtml from 'escape-html';

const encoded = escapeHtml(userInput);

// ✅ Encode for JavaScript context
const jsEncoded = userInput
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'")
  .replace(/"/g, '\\"')
  .replace(/\n/g, '\\n')
  .replace(/\r/g, '\\r');

// ✅ Encode for URL context
const urlEncoded = encodeURIComponent(userInput);

// ✅ Encode for CSV context
const csvEncoded = `"${userInput.replace(/"/g, '""')}"`;
```

---

## API Security

### CORS Configuration

```typescript
// ✅ Restrict CORS
@Module({
  imports: [
    CorsModule.register({
      origin: ['https://your-domain.com'],  // Whitelist only your domain
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  ],
})
export class AppModule {}
```

### Rate Limiting

```typescript
// ✅ Rate limit by endpoint
@UseGuards(ThrottleGuard)
@Throttle(5, 60)  // 5 requests per 60 seconds
@Post('/login')
async login(@Body() credentials: LoginDto) {
  // ...
}

// ✅ Rate limit by user
const createRateLimitGuard = (limit: number, window: number) => {
  return {
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      const key = `ratelimit:${req.user.id}`;
      const count = redis.incr(key);
      redis.expire(key, window);

      if (count > limit) {
        throw new TooManyRequestsException();
      }
      return true;
    },
  };
};
```

### Request Validation

```typescript
// ✅ Validate request headers
@Get('/protected')
@Header('X-Signature', /^[a-f0-9]{64}$/)  // Must be valid hex
async protected(@Headers() headers: any) {
  // Verify signature
  const isValid = verify(headers['x-signature'], body, publicKey);
  if (!isValid) {
    throw new UnauthorizedException();
  }
}

// ✅ Validate request size
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));
```

---

## Infrastructure Security

### Environment Variables

```bash
# ✅ Secure secret management
# Never in .env file in repo - use cloud provider

# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id lume/database

# Google Cloud Secret Manager
gcloud secrets versions access latest --secret=lume-database

# Kubernetes Secret
kubectl get secret lume-secrets -o jsonpath='{.data.password}' | base64 -d
```

### Database Security

```sql
-- ✅ Use principle of least privilege
CREATE USER 'lume_user'@'localhost' IDENTIFIED BY '<password>';
GRANT SELECT, INSERT, UPDATE, DELETE ON lume.* TO 'lume_user'@'localhost';
REVOKE ALL PRIVILEGES ON *.* FROM 'lume_user'@'localhost';

-- ✅ Encrypt database connection
[client]
ssl-mode=REQUIRED
ssl-ca=/etc/mysql/ca.pem
ssl-cert=/etc/mysql/client-cert.pem
ssl-key=/etc/mysql/client-key.pem

-- ✅ Enable audit logging
SET GLOBAL server_audit_logging=ON;
SET GLOBAL server_audit_events='CONNECT,QUERY_DDL,QUERY_DML';
```

### File System Security

```bash
# ✅ Secure file permissions
chmod 700 /opt/lume          # Only owner can read/write/execute
chmod 600 /opt/lume/.env     # Only owner can read/write
chmod 750 /opt/lume/uploads  # Owner rw, group rx, others none

# ✅ Use dedicated user
useradd -M -s /bin/false lume  # No home, no shell
chown -R lume:lume /opt/lume   # Owner is lume user

# ✅ Disable unnecessary services
systemctl disable bluetooth
systemctl disable avahi-daemon
```

---

## Security Testing

### OWASP ZAP (Automated Testing)

```bash
# Install ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000 \
  -r zap-report.html

# Active scan
docker run -t owasp/zap2docker-stable zap-full-scan.py \
  -t http://localhost:3000 \
  -r zap-report.html
```

### Manual Security Testing

```bash
# SQL Injection
curl "http://localhost:3000/api/entities/Lead/records?owner_id=1' OR '1'='1"

# XSS
curl -X POST http://localhost:3000/api/entities/Lead/records \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>"}'

# CSRF
# Try API request without CSRF token

# Authentication bypass
# Try accessing protected endpoint without token

# Information disclosure
# Check response headers for version info
curl -I http://localhost:3000
```

### Dependency Scanning

```bash
# Check for known vulnerabilities
npm audit

# Use npm audit
npm audit fix --audit-level=moderate

# Use snyk (commercial)
snyk test

# Use github security
# Settings → Security & analysis → Enable Dependabot
```

---

## Security Monitoring

### Intrusion Detection

```typescript
// ✅ Monitor for attack patterns
const monitorForAttacks = () => {
  // Brute force attacks
  const failedLogins = getMetric('failed_logins_5min');
  if (failedLogins > 10) {
    sendAlert('High failed login rate - possible brute force');
  }

  // SQL injection attempts
  const sqlErrors = getMetric('sql_errors_5min');
  if (sqlErrors > 50) {
    sendAlert('High SQL error rate - possible SQL injection');
  }

  // DDoS attacks
  const requestRate = getMetric('requests_per_second');
  if (requestRate > 10000) {
    sendAlert('High request rate - possible DDoS');
    enableRateLimiting();
  }

  // Unusual access patterns
  const unusualUsers = await findUnusualUsers();
  if (unusualUsers.length > 0) {
    sendAlert(`Unusual activity from: ${unusualUsers.join(', ')}`);
  }
};
```

### Security Audit Log

```sql
-- Log all security events
CREATE TABLE security_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50),  -- LOGIN, ACCESS_DENIED, DATA_CHANGE, CONFIG_CHANGE
  user_id INT,
  resource VARCHAR(255),
  action VARCHAR(50),
  result VARCHAR(20),  -- SUCCESS, FAILURE
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  INDEX idx_event_type (event_type),
  INDEX idx_user_id (user_id)
);

-- Query for suspicious activity
SELECT * FROM security_audit
WHERE event_type = 'ACCESS_DENIED'
  AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY user_id
HAVING COUNT(*) > 5;
```

---

## Compliance Checklist

### GDPR Compliance

- [ ] Privacy policy published
- [ ] User consent collected before data processing
- [ ] Data retention policy implemented
- [ ] Right to deletion implemented
- [ ] Data export feature available
- [ ] Audit logs maintained
- [ ] Data breach notification procedure in place

### PCI DSS Compliance (if handling payments)

- [ ] Firewall configured
- [ ] Strong access controls (passwords, MFA)
- [ ] Data encrypted in transit and at rest
- [ ] Vulnerability scanning conducted
- [ ] Intrusion detection/prevention in place
- [ ] Regular testing and monitoring
- [ ] Information security policy maintained

### HIPAA Compliance (if handling health data)

- [ ] Access controls (authentication, authorization)
- [ ] Audit controls (logging, monitoring)
- [ ] Integrity controls (data validation, checksums)
- [ ] Transmission security (encryption)
- [ ] Business associate agreements signed

---

## Security Incident Response

### Incident Response Plan

```markdown
1. **Detect**: Monitor logs, alerts, and user reports
2. **Assess**: Determine scope, severity, and impact
3. **Contain**: Stop the attack, isolate affected systems
4. **Eradicate**: Remove attacker access, patch vulnerability
5. **Recover**: Restore systems, verify integrity
6. **Learn**: Root cause analysis, process improvements
```

### Breach Notification

```typescript
async function notifyDataBreach(affectedUsers: User[], details: string) {
  // Notify affected users
  for (const user of affectedUsers) {
    await sendEmail(user.email, {
      subject: 'Security Incident Notification',
      body: `
        We detected a security incident that may have affected your account.
        Details: ${details}
        Actions: Reset your password, check account activity
      `,
    });
  }

  // Notify authorities (GDPR requirement)
  if (affectedUsers.length > 0) {
    await notifyDataProtectionAuthority({
      date: new Date(),
      affectedUsers: affectedUsers.length,
      details,
    });
  }

  // Log incident
  auditLog.record({
    event: 'DATA_BREACH',
    severity: 'HIGH',
    affectedCount: affectedUsers.length,
    details,
  });
}
```

---

## Security Hardening Checklist

### Authentication & Authorization
- [ ] MFA enabled for all users
- [ ] Password policy enforced
- [ ] Account lockout after failed attempts
- [ ] Session timeout configured
- [ ] Privilege escalation prevented
- [ ] API key rotation scheduled

### Data Protection
- [ ] Sensitive fields encrypted at rest
- [ ] Data in transit encrypted (TLS 1.2+)
- [ ] Data retention policy implemented
- [ ] Backups encrypted
- [ ] Database user with minimal privileges

### API Security
- [ ] CORS restricted to known domains
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Output encoding applied
- [ ] CSRF tokens implemented
- [ ] API versioning for breaking changes

### Infrastructure
- [ ] SSH hardened (key auth only)
- [ ] Firewall configured
- [ ] Unnecessary services disabled
- [ ] OS patches current
- [ ] Fail2Ban or similar configured
- [ ] File permissions secure

### Monitoring & Logging
- [ ] Security events logged
- [ ] Logs monitored for anomalies
- [ ] Audit trail maintained
- [ ] Alerts configured
- [ ] Incident response plan in place
- [ ] Regular security reviews scheduled

### Compliance
- [ ] Privacy policy published
- [ ] Terms of service reviewed
- [ ] Data protection laws checked
- [ ] Vendor security agreements signed
- [ ] Regular security audits conducted
- [ ] Penetration testing scheduled

---

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Helmet.js Security Headers](https://helmetjs.github.io/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework/)

---

## Next Steps

1. **Audit Current State** — Assess security against checklist
2. **Fix Critical Issues** — Address vulnerabilities immediately
3. **Implement Controls** — Add monitoring and logging
4. **Establish Process** — Regular security reviews and updates
5. **Security Training** — Educate team on security best practices
6. **Incident Planning** — Prepare response procedures
