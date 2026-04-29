# Base Security Module - Technical Specification

## Overview

The Base Security module provides comprehensive security features for the Lume NestJS framework, including:
- API key management with scopes
- TOTP-based two-factor authentication (2FA)
- Session tracking and management
- IP whitelist/blacklist access control
- Comprehensive security event logging

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────┐
│      HTTP Request/Response              │
├─────────────────────────────────────────┤
│         API Controllers                 │
│  (base-security.controller.ts)          │
├─────────────────────────────────────────┤
│    Service Layer                        │
│  (base-security.service.ts)             │
├─────────────────────────────────────────┤
│    Data Access Layer                    │
│  (Drizzle ORM + MySQL Driver)           │
├─────────────────────────────────────────┤
│    Database Layer                       │
│  (MySQL 5 tables)                       │
└─────────────────────────────────────────┘
```

### Dependency Flow

```
Module (base-security.module.ts)
  ├── DrizzleService (DB connection)
  ├── BaseSecurityService (business logic)
  ├── BaseSecurityController (API endpoints)
  ├── RbacService (access control)
  └── TotpService (2FA logic)
```

## Data Models

### api_keys Table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | int | PK, AI | Primary key |
| name | varchar(100) | NOT NULL | Human-readable name |
| key | varchar(255) | NOT NULL, UNIQUE | SHA256 hashed key |
| prefix | varchar(20) | NOT NULL | Key prefix (lume_xxxx) |
| userId | int | FK | Reference to users table |
| expiresAt | timestamp | NULL | Expiration date |
| lastUsedAt | timestamp | NULL | Last validation time |
| status | varchar(20) | DEFAULT 'active' | active/inactive/expired |
| scopes | json | DEFAULT [] | Array of permission scopes |
| createdAt | timestamp | DEFAULT NOW() | Creation timestamp |
| updatedAt | timestamp | DEFAULT NOW() | Last update timestamp |
| deletedAt | timestamp | NULL | Soft delete marker |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE (key)
- INDEX (userId, status)
- INDEX (expiresAt)

### sessions Table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | int | PK, AI | Primary key |
| userId | int | NOT NULL, FK | Reference to users table |
| token | varchar(500) | NOT NULL, UNIQUE | Unique session token |
| ipAddress | varchar(45) | NULL | IPv4 or IPv6 address |
| userAgent | varchar(500) | NULL | Browser/client identifier |
| expiresAt | timestamp | NOT NULL | Expiration timestamp |
| lastActivityAt | timestamp | NULL | Last activity timestamp |
| status | varchar(20) | DEFAULT 'active' | active/revoked/expired |
| createdAt | timestamp | DEFAULT NOW() | Creation timestamp |
| updatedAt | timestamp | DEFAULT NOW() | Last update timestamp |
| deletedAt | timestamp | NULL | Soft delete marker |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE (token)
- INDEX (userId, status)
- INDEX (expiresAt)

### ip_access Table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | int | PK, AI | Primary key |
| ipAddress | varchar(45) | NOT NULL, UNIQUE | IP or pattern (192.168.1.*) |
| description | varchar(255) | NULL | Rule description |
| type | varchar(20) | NOT NULL | whitelist or blacklist |
| status | varchar(20) | DEFAULT 'active' | active or inactive |
| createdAt | timestamp | DEFAULT NOW() | Creation timestamp |
| updatedAt | timestamp | DEFAULT NOW() | Last update timestamp |
| deletedAt | timestamp | NULL | Soft delete marker |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE (ipAddress)
- INDEX (type, status)

### two_factor Table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | int | PK, AI | Primary key |
| userId | int | NOT NULL, UNIQUE, FK | Reference to users table |
| secret | varchar(255) | NOT NULL | Base32 encoded TOTP secret |
| backupCodes | json | NULL | Array of single-use backup codes |
| enabled | boolean | DEFAULT false | Whether 2FA is active |
| verifiedAt | timestamp | NULL | When 2FA was verified |
| createdAt | timestamp | DEFAULT NOW() | Creation timestamp |
| updatedAt | timestamp | DEFAULT NOW() | Last update timestamp |
| deletedAt | timestamp | NULL | Soft delete marker |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE (userId)

### security_logs Table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | int | PK, AI | Primary key |
| userId | int | NULL, FK | Reference to users table (nullable for system events) |
| event | varchar(100) | NOT NULL | Event type (e.g., 'login_attempt') |
| ipAddress | varchar(45) | NULL | IPv4 or IPv6 address |
| userAgent | varchar(500) | NULL | Browser/client identifier |
| details | json | NULL | Additional event details |
| status | varchar(20) | DEFAULT 'success' | success or failure |
| createdAt | timestamp | DEFAULT NOW() | Creation timestamp |
| updatedAt | timestamp | DEFAULT NOW() | Last update timestamp |
| deletedAt | timestamp | NULL | Soft delete marker |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (userId, createdAt)
- INDEX (event, status)
- INDEX (createdAt)

## Service Specification

### BaseSecurityService

**Constructor**
```typescript
constructor(drizzle: DrizzleService)
```

#### API Key Management Methods

**generateApiKey(name: string, userId: number, scopes: string[]): Promise<ApiKey & { plainKey: string }>**

- Generates cryptographically random 32-byte key
- Creates SHA256 hash for storage
- Prefix format: `lume_` + first 8 chars of hex
- Full key format: prefix + remaining hex chars
- Expiration: 365 days from creation
- Returns plainKey only on generation (never retrievable again)
- Throws: None (always succeeds if userId exists)

**validateApiKey(keyString: string): Promise<ApiKey | null>**

- Hashes input key with SHA256
- Looks up in database by hash + active status
- Checks expiration date
- Updates lastUsedAt timestamp
- Returns null if invalid, expired, or inactive
- Does NOT throw exceptions

**getApiKeys(userId: number): Promise<ApiKey[]>**

- Returns all API keys for user (active and inactive)
- Ordered by createdAt
- Limited to 100 results
- Does not return plainKey

**revokeApiKey(id: number): Promise<ApiKey>**

- Sets status to 'inactive'
- Throws NotFoundException if not found
- Updates updatedAt timestamp

#### IP Access Methods

**checkIpAccess(ipAddress: string): Promise<{ allowed: boolean; reason: string }>**

- Checks blacklist first
- Returns { allowed: false, reason: 'blacklisted' } if found
- Checks whitelist second
- Returns { allowed: false, reason: 'not_whitelisted' } if whitelist exists but IP not in it
- Returns { allowed: true, reason: 'no_whitelist' } if no whitelist rules exist
- Returns { allowed: true, reason: 'whitelisted' } if found in whitelist
- Supports wildcard patterns: `192.168.1.*` → `/^192\.168\.1\.\d+$/`
- Does NOT throw exceptions

**getIpAccessRules(): Promise<IpAccessRule[]>**

- Returns all IP access rules
- Limited to 1000 results
- Includes both active and inactive

**createIpAccessRule(ipAddress: string, type: 'whitelist'|'blacklist', description?: string): Promise<IpAccessRule>**

- Creates new rule with status 'active'
- Throws: None (MySQL unique constraint would raise)

**updateIpAccessRule(id: number, data: Partial<IpAccessRule>): Promise<IpAccessRule>**

- Updates specified fields
- Throws NotFoundException if not found

**deleteIpAccessRule(id: number): Promise<void>**

- Hard delete (removes record)
- Throws NotFoundException if not found

#### 2FA Methods

**setup2FA(userId: number, email: string): Promise<{ qrCode: string; otpauthUrl: string; backupCodes: string[] }>**

- Generates new TOTP secret using otplib
- Generates 10 backup codes (8 hex chars each)
- Generates QR code as data URL
- If existing record: updates it with new secret
- If no existing record: creates new one
- Sets enabled = false until verified
- Throws BadRequestException if already enabled
- Returns base32 secret, otpauth URI, QR code data URL, and backup codes

**verify2FA(userId: number, token: string): Promise<void>**

- Looks up 2FA record
- Validates token against secret using otplib.verifySync()
- Sets enabled = true
- Sets verifiedAt = now
- Logs security event '2fa_enabled'
- Throws BadRequestException if not found or token invalid

**disable2FA(userId: number, token: string): Promise<void>**

- Looks up 2FA record
- Validates token
- Sets enabled = false
- Sets verifiedAt = null
- Logs security event '2fa_disabled'
- Throws BadRequestException if not found, not enabled, or token invalid

**verify2FALogin(userId: number, token: string): Promise<{ valid: boolean; usedBackupCode?: boolean }>**

- Looks up 2FA record
- Returns { valid: false } if not found or not enabled
- Tries TOTP verification first
- If TOTP fails, tries backup code verification
- If backup code matches: removes it from stored codes, returns { valid: true, usedBackupCode: true }
- Returns { valid: false } if neither matches
- Does NOT throw exceptions
- Backup codes are single-use (automatically consumed)

**is2FAEnabled(userId: number): Promise<boolean>**

- Returns true if enabled flag is true, else false
- Does NOT throw exceptions

**getBackupCodes(userId: number): Promise<string[]>**

- Looks up 2FA record
- Returns remaining backup codes array
- Throws BadRequestException if not found or not enabled

**regenerateBackupCodes(userId: number, token: string): Promise<string[]>**

- Validates token
- Generates 10 new backup codes
- Replaces old codes entirely (old codes are invalid)
- Logs security event
- Throws BadRequestException if not enabled or token invalid

#### Session Methods

**createSession(userId: number, token: string, ipAddress?: string, userAgent?: string): Promise<Session>**

- Creates new session record
- Status = 'active'
- expiresAt = now + 7 days
- lastActivityAt = now
- Returns created session

**getActiveSessions(userId: number): Promise<Session[]>**

- Returns sessions where status = 'active'
- Ordered by lastActivityAt DESC
- Limited to 100 results

**terminateSession(sessionId: number): Promise<Session>**

- Sets status = 'revoked'
- Throws NotFoundException if not found

**terminateAllOtherSessions(userId: number, currentToken: string): Promise<{ terminated: number }>**

- Gets all sessions for userId
- Skips session with matching token
- Revokes all others
- Returns count of terminated sessions

**updateSessionActivity(token: string): Promise<Session | null>**

- Looks up session by token
- Updates lastActivityAt = now
- Returns session or null if not found
- Does NOT throw exceptions

**cleanupExpiredSessions(): Promise<{ cleaned: number }>**

- Gets all active sessions
- For each: if expiresAt < now, set status = 'expired'
- Returns count of cleaned sessions
- Limited to 10000 sessions per run

#### Logging Methods

**logSecurityEvent(userId: number | null, event: string, details?: Record<string, any>, status?: 'success'|'failure', ipAddress?: string, userAgent?: string): Promise<SecurityLog>**

- Creates new security log entry
- Stringifies details object if provided
- Sets createdAt = now
- Returns created log entry

**getSecurityLogs(filters?: { userId?: number; event?: string; status?: 'success'|'failure'; limit?: number }): Promise<SecurityLog[]>**

- Filters by userId, event, status (AND logic)
- Ordered by createdAt DESC
- Default limit: 100, max: 1000 (configurable)
- Returns array of matching logs

## API Endpoint Specification

### Request/Response Format

All endpoints follow standard REST conventions:

**Success Response (2xx)**
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error Response (4xx/5xx)**
```json
{
  "success": false,
  "error": "Error message"
}
```

### Endpoints Detail

#### GET /api/base_security/health
- **Description**: Health check
- **Auth**: None required
- **Response**: `{ success: true, message: 'Base Security module running' }`

#### GET /api/base_security/api-keys
- **Description**: List API keys for authenticated user
- **Auth**: Required (Bearer token)
- **Response**: `{ success: true, data: ApiKey[] }`
- **Errors**: 
  - 401 Unauthorized (no auth header)
  - 500 (database error)

#### POST /api/base_security/api-keys
- **Description**: Generate new API key
- **Auth**: Required
- **Body**: `{ name: string, scopes?: string[] }`
- **Response**: `{ success: true, data: { ...ApiKey, plainKey: string } }`
- **Errors**:
  - 400 Bad Request (invalid input)
  - 401 Unauthorized

#### DELETE /api/base_security/api-keys/:id
- **Description**: Revoke API key
- **Auth**: Required
- **Params**: `id` (integer)
- **Response**: `{ success: true, message: 'API key revoked' }`
- **Errors**:
  - 404 Not Found
  - 400 Bad Request (invalid id)

#### GET /api/base_security/ip-access
- **Description**: List IP access rules
- **Auth**: Required
- **Response**: `{ success: true, data: IpAccessRule[] }`

#### POST /api/base_security/ip-access
- **Description**: Create IP access rule
- **Auth**: Required
- **Body**: `{ ipAddress: string, type: 'whitelist'|'blacklist', description?: string }`
- **Response**: `{ success: true, data: IpAccessRule }`
- **Errors**:
  - 400 Bad Request (invalid IP format)

#### PUT /api/base_security/ip-access/:id
- **Description**: Update IP access rule
- **Auth**: Required
- **Params**: `id` (integer)
- **Body**: `{ description?: string, status?: 'active'|'inactive' }`
- **Response**: `{ success: true, data: IpAccessRule }`
- **Errors**:
  - 404 Not Found

#### DELETE /api/base_security/ip-access/:id
- **Description**: Delete IP access rule
- **Auth**: Required
- **Params**: `id` (integer)
- **Response**: `{ success: true, message: 'IP access rule deleted' }`

#### GET /api/base_security/sessions
- **Description**: List active sessions for user
- **Auth**: Required
- **Response**: `{ success: true, data: Session[] }`

#### DELETE /api/base_security/sessions/:id
- **Description**: Terminate specific session
- **Auth**: Required
- **Params**: `id` (integer)
- **Response**: `{ success: true, message: 'Session revoked' }`

#### DELETE /api/base_security/sessions/all-other
- **Description**: Terminate all other sessions
- **Auth**: Required
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `{ success: true, data: { terminated: number } }`

#### GET /api/base_security/logs
- **Description**: Retrieve security logs
- **Auth**: Required
- **Query**: `userId?`, `event?`, `status?`, `limit?`
- **Response**: `{ success: true, data: SecurityLog[] }`

#### POST /api/base_security/2fa/setup
- **Description**: Initiate 2FA setup
- **Auth**: Required
- **Body**: None
- **Response**: `{ success: true, data: { qrCode, otpauthUrl, backupCodes } }`
- **Errors**:
  - 400 Bad Request (already enabled)

#### POST /api/base_security/2fa/verify
- **Description**: Verify and enable 2FA
- **Auth**: Required
- **Body**: `{ token: string }`
- **Response**: `{ success: true, message: '2FA has been enabled' }`
- **Errors**:
  - 400 Bad Request (invalid token)

#### POST /api/base_security/2fa/disable
- **Description**: Disable 2FA
- **Auth**: Required
- **Body**: `{ token: string }`
- **Response**: `{ success: true, message: '2FA has been disabled' }`
- **Errors**:
  - 400 Bad Request (not enabled or invalid token)

#### GET /api/base_security/2fa/status
- **Description**: Check 2FA status
- **Auth**: Required
- **Response**: `{ success: true, data: { enabled: boolean } }`

#### GET /api/base_security/2fa/backup-codes
- **Description**: Get remaining backup codes
- **Auth**: Required
- **Response**: `{ success: true, data: { backupCodes: string[] } }`
- **Errors**:
  - 400 Bad Request (not enabled)

#### POST /api/base_security/2fa/backup-codes/regenerate
- **Description**: Regenerate backup codes
- **Auth**: Required
- **Body**: `{ token: string }`
- **Response**: `{ success: true, data: { backupCodes: string[] } }`
- **Errors**:
  - 400 Bad Request (invalid token)

## Security Considerations

### Cryptography

1. **API Keys**
   - Generated: `crypto.randomBytes(32).toString('hex')`
   - Hashed: SHA256
   - Storage: Only hash stored, plainKey returned once
   - Format: `lume_{first8chars}_{remaining56chars}`

2. **TOTP**
   - Algorithm: HMAC-SHA1 (RFC 4226)
   - Time Step: 30 seconds
   - Code Length: 6 digits
   - Window: ±1 time step
   - Library: otplib

3. **Backup Codes**
   - Generated: `crypto.randomBytes(4).toString('hex').toUpperCase()`
   - Format: 8 uppercase hex characters
   - Count: 10 codes per user
   - Single-use: Consumed on validation

4. **Session Tokens**
   - Generated: `crypto.randomBytes(32).toString('hex')`
   - Storage: Plaintext (consider hashing in production)
   - Uniqueness: Enforced by database constraint

### Access Control

1. **Authentication**
   - All endpoints except `/health` require Bearer token
   - Token validated by AuthGuard

2. **Authorization**
   - RBAC guard checks permissions
   - User can only access own resources
   - Admin can access all resources

3. **IP Filtering**
   - Middleware checks checkIpAccess()
   - Blacklist takes precedence over whitelist
   - Wildcard patterns: `192.168.1.*`
   - No CIDR support (future enhancement)

### Audit Logging

All security-sensitive operations logged:
- 2FA enable/disable
- API key creation/revocation
- Session creation/termination
- Failed authentication attempts
- IP access rule changes

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| generateApiKey | O(1) | Hash + insert |
| validateApiKey | O(1) | Hash lookup |
| checkIpAccess | O(n) | n = rules count (≤1000) |
| setup2FA | O(1) | Insert/update |
| verify2FA | O(1) + O(m) | m = backup codes (10) |
| createSession | O(1) | Insert |
| getActiveSessions | O(log n) | n = user sessions |

### Space Complexity

| Data | Size | Notes |
|------|------|-------|
| API key hash | 64 bytes | SHA256 hex |
| TOTP secret | 32 bytes | Base32 |
| Session token | 64 bytes | 32 bytes hex |
| Backup code | 8 bytes | Hex uppercase |
| Total per user | ~200 bytes | Base allocation |

## Database Indexes Strategy

**Primary Indexes:**
1. `api_keys.key` - UNIQUE (fast validation)
2. `api_keys.userId` + `status` - Composite (list by user)
3. `sessions.token` - UNIQUE (fast lookup)
4. `sessions.userId` + `status` - Composite (list active)
5. `ip_access.ipAddress` - UNIQUE (fast check)
6. `ip_access.type` + `status` - Composite (rule filtering)
7. `two_factor.userId` - UNIQUE (one per user)
8. `security_logs.userId` + `createdAt` - Composite (log queries)
9. `security_logs.event` + `status` - Composite (event filtering)
10. `security_logs.createdAt` - Simple (cleanup/archival)

## Deployment Considerations

### Database Setup

```sql
-- Ensure tables exist
CREATE TABLE IF NOT EXISTS api_keys (...)
CREATE TABLE IF NOT EXISTS sessions (...)
CREATE TABLE IF NOT EXISTS ip_access (...)
CREATE TABLE IF NOT EXISTS two_factor (...)
CREATE TABLE IF NOT EXISTS security_logs (...)

-- Create indexes
CREATE INDEX idx_api_keys_userId_status ON api_keys(userId, status);
CREATE INDEX idx_sessions_userId_status ON sessions(userId, status);
CREATE INDEX idx_ip_access_type_status ON ip_access(type, status);
CREATE INDEX idx_security_logs_userId_createdAt ON security_logs(userId, createdAt);
```

### Migration Path

1. Deploy NestJS module alongside Express version
2. Point middleware to NestJS endpoints
3. Monitor logs for errors
4. Verify all features work
5. Remove Express module
6. Keep database tables (data persists)

### Monitoring

Key metrics to track:
- API key validation rate
- 2FA setup/verify success rate
- Session termination rate
- IP access rule matches
- Security event log volume
- Database query response times
- Error rate by endpoint

## Testing Strategy

### Unit Tests

- Service method logic
- Error conditions
- Edge cases
- Type validation

### Integration Tests

- Database operations
- Transaction handling
- Data consistency

### API Tests

- Endpoint responses
- Guard validation
- Error handling
- Status codes

### Security Tests

- Key generation uniqueness
- Hash verification
- Token expiration
- Backup code consumption
