# Base Security Module

Advanced security features for the Lume framework, including session management, two-factor authentication (2FA), IP access control, and API key management.

## Features

- **API Keys Management** - Generate, validate, and revoke API keys with scopes
- **Two-Factor Authentication (2FA)** - TOTP-based 2FA with backup codes
- **Session Management** - Track and manage active user sessions
- **IP Access Control** - IP whitelist and blacklist rules
- **Security Logging** - Audit trail of security events

## Module Structure

```
base_security/
├── controllers/
│   └── base-security.controller.ts      # API endpoints
├── services/
│   └── base-security.service.ts         # Business logic
├── dtos/
│   ├── create-api-key.dto.ts
│   ├── create-ip-access.dto.ts
│   ├── update-ip-access.dto.ts
│   ├── setup-2fa.dto.ts
│   ├── verify-2fa.dto.ts
│   ├── disable-2fa.dto.ts
│   ├── regenerate-backup-codes.dto.ts
│   ├── get-security-logs.query.ts
│   └── index.ts
├── schema/
│   └── base-security.schema.ts          # Drizzle table definitions
├── base-security.module.ts              # Module definition
└── index.ts                             # Public exports
```

## Database Tables

### api_keys
- `id` - Primary key
- `name` - Key name/label
- `key` - SHA256 hashed key
- `prefix` - Key prefix (lume_xxxx)
- `userId` - FK to users table
- `expiresAt` - Expiration timestamp
- `lastUsedAt` - Last usage timestamp
- `status` - 'active' | 'inactive' | 'expired'
- `scopes` - JSON array of permission scopes

### sessions
- `id` - Primary key
- `userId` - FK to users table
- `token` - Unique session token
- `ipAddress` - IP address of session
- `userAgent` - User agent string
- `expiresAt` - Expiration timestamp
- `lastActivityAt` - Last activity timestamp
- `status` - 'active' | 'revoked' | 'expired'

### ip_access
- `id` - Primary key
- `ipAddress` - IP address (supports wildcards: 192.168.1.*)
- `type` - 'whitelist' | 'blacklist'
- `description` - Optional description
- `status` - 'active' | 'inactive'

### two_factor
- `id` - Primary key
- `userId` - FK to users table (unique)
- `secret` - TOTP secret
- `backupCodes` - JSON array of backup codes
- `enabled` - Whether 2FA is enabled
- `verifiedAt` - Verification timestamp

### security_logs
- `id` - Primary key
- `userId` - FK to users table (nullable)
- `event` - Event type ('2fa_enabled', '2fa_disabled', etc.)
- `ipAddress` - IP address of event
- `userAgent` - User agent string
- `details` - JSON details object
- `status` - 'success' | 'failure'

## API Endpoints

### API Keys

**GET /api/base_security/api-keys**
- List API keys for current user
- Requires authentication

**POST /api/base_security/api-keys**
- Create new API key
- Body: `{ name: string, scopes?: string[] }`
- Returns: `{ plainKey: string, ...apiKeyData }`

**DELETE /api/base_security/api-keys/:id**
- Revoke API key
- Requires authentication

### IP Access Control

**GET /api/base_security/ip-access**
- List all IP access rules
- Requires authentication

**POST /api/base_security/ip-access**
- Create IP access rule
- Body: `{ ipAddress: string, type: 'whitelist'|'blacklist', description?: string }`

**PUT /api/base_security/ip-access/:id**
- Update IP access rule
- Body: `{ description?: string, status?: 'active'|'inactive' }`

**DELETE /api/base_security/ip-access/:id**
- Delete IP access rule

### Sessions

**GET /api/base_security/sessions**
- List active sessions for current user
- Requires authentication

**DELETE /api/base_security/sessions/:id**
- Terminate specific session
- Requires authentication

**DELETE /api/base_security/sessions/all-other**
- Terminate all other sessions (except current)
- Header: `Authorization: Bearer {token}`

### Two-Factor Authentication

**POST /api/base_security/2fa/setup**
- Initiate 2FA setup
- Returns: `{ qrCode: string, otpauthUrl: string, backupCodes: string[] }`

**POST /api/base_security/2fa/verify**
- Verify and enable 2FA
- Body: `{ token: string }` (6-digit TOTP code)

**POST /api/base_security/2fa/disable**
- Disable 2FA
- Body: `{ token: string }` (6-digit TOTP code)

**GET /api/base_security/2fa/status**
- Check if 2FA is enabled for current user

**GET /api/base_security/2fa/backup-codes**
- Get remaining backup codes
- Requires 2FA to be enabled

**POST /api/base_security/2fa/backup-codes/regenerate**
- Regenerate new backup codes
- Body: `{ token: string }` (6-digit TOTP code)

### Security Logs

**GET /api/base_security/logs**
- Retrieve security logs
- Query params:
  - `userId?: number` - Filter by user ID
  - `event?: string` - Filter by event type
  - `status?: 'success'|'failure'` - Filter by status
  - `limit?: number` - Results limit (default: 100)

## Service Usage

### Inject BaseSecurityService

```typescript
import { BaseSecurityService } from '@modules/base_security';

@Injectable()
export class MyService {
  constructor(private securityService: BaseSecurityService) {}

  async myMethod() {
    // API Keys
    const apiKey = await this.securityService.generateApiKey(
      'My Key',
      userId,
      ['read', 'write'],
    );

    const validated = await this.securityService.validateApiKey(keyString);

    // 2FA
    const setup = await this.securityService.setup2FA(userId, userEmail);
    await this.securityService.verify2FA(userId, token);
    const enabled = await this.securityService.is2FAEnabled(userId);

    // IP Access
    const ipCheck = await this.securityService.checkIpAccess(ipAddress);

    // Sessions
    const session = await this.securityService.createSession(
      userId,
      token,
      ipAddress,
      userAgent,
    );
    const active = await this.securityService.getActiveSessions(userId);

    // Logging
    await this.securityService.logSecurityEvent(
      userId,
      'login_attempt',
      { ipAddress },
      'success',
    );
  }
}
```

## Integration with Other Modules

### Using IP Access in Middleware

```typescript
// In your auth/middleware
import { BaseSecurityService } from '@modules/base_security';

const ipCheck = await securityService.checkIpAccess(req.ip);
if (!ipCheck.allowed) {
  throw new ForbiddenException(`IP ${req.ip} is ${ipCheck.reason}`);
}
```

### 2FA Verification During Login

```typescript
const twoFaResult = await securityService.verify2FALogin(userId, userToken);
if (!twoFaResult.valid) {
  throw new UnauthorizedException('Invalid 2FA code');
}
```

## Types

All DTOs and types are exported from the module index:

```typescript
import {
  CreateApiKeyDto,
  CreateIpAccessDto,
  Verify2faDto,
  RegenerateBackupCodesDto,
  GetSecurityLogsQuery,
} from '@modules/base_security';
```

## Dependencies

- `@nestjs/common` - NestJS core
- `drizzle-orm` - ORM for Drizzle schema
- `otplib` - TOTP implementation
- `qrcode` - QR code generation
- `crypto` - Node.js crypto module

## Environment Variables

- `APP_NAME` - Application name (used in TOTP QR codes, default: 'Lume')
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` - Database configuration

## Error Handling

The service throws NestJS exceptions:
- `BadRequestException` - Invalid input or invalid 2FA code
- `NotFoundException` - Resource not found
- `ForbiddenException` - Access denied (from guards)
