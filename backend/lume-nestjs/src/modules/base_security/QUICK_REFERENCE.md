# Base Security Module - Quick Reference

## Module Import

```typescript
import { BaseSecurityModule } from '@modules/base_security';

@Module({
  imports: [BaseSecurityModule],
})
export class AppModule {}
```

## Service Injection

```typescript
import { BaseSecurityService } from '@modules/base_security';

@Injectable()
export class MyService {
  constructor(private security: BaseSecurityService) {}
}
```

## API Keys

### Generate
```typescript
const apiKey = await this.security.generateApiKey(
  'My Key',        // name
  userId,          // userId
  ['read', 'write'] // scopes
);
// Returns: { id, name, prefix, userId, plainKey, ... }
```

### Validate
```typescript
const valid = await this.security.validateApiKey(keyString);
if (!valid) console.log('Invalid key');
```

### List
```typescript
const keys = await this.security.getApiKeys(userId);
```

### Revoke
```typescript
await this.security.revokeApiKey(keyId);
```

## IP Access Control

### Check IP
```typescript
const result = await this.security.checkIpAccess('192.168.1.100');
if (!result.allowed) console.log(`Blocked: ${result.reason}`);
```

### Create Rule
```typescript
await this.security.createIpAccessRule(
  '192.168.1.*',    // ipAddress (supports wildcards)
  'whitelist',      // 'whitelist' | 'blacklist'
  'Office network'  // description
);
```

### Update Rule
```typescript
await this.security.updateIpAccessRule(ruleId, {
  description: 'Updated description',
  status: 'inactive', // 'active' | 'inactive'
});
```

### Delete Rule
```typescript
await this.security.deleteIpAccessRule(ruleId);
```

### List Rules
```typescript
const rules = await this.security.getIpAccessRules();
```

## 2FA (Two-Factor Authentication)

### Setup
```typescript
const setup = await this.security.setup2FA(userId, userEmail);
// Returns: { qrCode, otpauthUrl, backupCodes }
// Display qrCode as image to user
```

### Verify Setup
```typescript
try {
  await this.security.verify2FA(userId, token); // 6-digit token
  // 2FA is now enabled
} catch (error) {
  // Invalid token
}
```

### Check Status
```typescript
const enabled = await this.security.is2FAEnabled(userId);
```

### Verify Login Token
```typescript
const result = await this.security.verify2FALogin(userId, token);
if (result.valid) {
  // Token is valid (TOTP or backup code)
  if (result.usedBackupCode) console.log('Backup code used');
}
```

### Get Backup Codes
```typescript
const codes = await this.security.getBackupCodes(userId);
// Returns: string[] of remaining codes
```

### Regenerate Backup Codes
```typescript
const newCodes = await this.security.regenerateBackupCodes(userId, token);
// Old codes are invalidated
```

### Disable 2FA
```typescript
try {
  await this.security.disable2FA(userId, token); // 6-digit token
} catch (error) {
  // Invalid token or 2FA not enabled
}
```

## Sessions

### Create Session
```typescript
const session = await this.security.createSession(
  userId,              // userId
  token,               // unique token
  '192.168.1.1',       // ipAddress (optional)
  'Mozilla/5.0...'     // userAgent (optional)
);
// Returns: { id, userId, token, expiresAt, ... }
```

### List Active Sessions
```typescript
const sessions = await this.security.getActiveSessions(userId);
// Returns: Session[] (sorted by last activity)
```

### Terminate Single Session
```typescript
await this.security.terminateSession(sessionId);
```

### Terminate All Other Sessions
```typescript
const result = await this.security.terminateAllOtherSessions(userId, currentToken);
// Returns: { terminated: number }
```

### Update Activity
```typescript
const session = await this.security.updateSessionActivity(token);
// Updates lastActivityAt timestamp
```

### Cleanup Expired
```typescript
const result = await this.security.cleanupExpiredSessions();
// Returns: { cleaned: number }
```

## Security Logging

### Log Event
```typescript
await this.security.logSecurityEvent(
  userId,              // nullable
  'login_attempt',     // event type
  { ip: '192.168.1.1' }, // details object
  'success',           // 'success' | 'failure'
  '192.168.1.1',       // ipAddress (optional)
  'Mozilla/5.0...'     // userAgent (optional)
);
```

### Get Logs
```typescript
const logs = await this.security.getSecurityLogs({
  userId: 1,           // optional
  event: 'login_attempt',  // optional
  status: 'failure',   // 'success' | 'failure', optional
  limit: 50            // default: 100
});
// Returns: SecurityLog[]
```

## DTOs

### Create API Key
```typescript
import { CreateApiKeyDto } from '@modules/base_security';

const dto: CreateApiKeyDto = {
  name: 'My Integration',
  scopes: ['read:users', 'write:posts'],
};
```

### Create IP Access
```typescript
import { CreateIpAccessDto } from '@modules/base_security';

const dto: CreateIpAccessDto = {
  ipAddress: '192.168.1.0/24', // or '192.168.1.*'
  type: 'whitelist',
  description: 'Office', // optional
};
```

### Update IP Access
```typescript
import { UpdateIpAccessDto } from '@modules/base_security';

const dto: UpdateIpAccessDto = {
  status: 'inactive',    // optional
  description: 'Updated', // optional
};
```

### Setup 2FA
```typescript
import { Setup2faDto } from '@modules/base_security';
// Sent in response, not input
```

### Verify 2FA
```typescript
import { Verify2faDto } from '@modules/base_security';

const dto: Verify2faDto = {
  token: '123456', // 6-digit code
};
```

### Get Security Logs
```typescript
import { GetSecurityLogsQuery } from '@modules/base_security';

const query: GetSecurityLogsQuery = {
  userId: 1,        // optional
  event: 'login',   // optional
  status: 'failure', // optional
  limit: 100,       // optional
};
```

## API Endpoints Summary

```
GET    /api/base_security/health                  - Health check
GET    /api/base_security/api-keys                - List API keys
POST   /api/base_security/api-keys                - Create API key
DELETE /api/base_security/api-keys/:id            - Revoke API key

GET    /api/base_security/ip-access               - List IP rules
POST   /api/base_security/ip-access               - Create IP rule
PUT    /api/base_security/ip-access/:id           - Update IP rule
DELETE /api/base_security/ip-access/:id           - Delete IP rule

GET    /api/base_security/sessions                - List sessions
DELETE /api/base_security/sessions/:id            - Terminate session
DELETE /api/base_security/sessions/all-other      - Terminate all other

GET    /api/base_security/logs                    - Get security logs

POST   /api/base_security/2fa/setup               - Initiate 2FA setup
POST   /api/base_security/2fa/verify              - Verify & enable 2FA
POST   /api/base_security/2fa/disable             - Disable 2FA
GET    /api/base_security/2fa/status              - Check 2FA status
GET    /api/base_security/2fa/backup-codes        - Get backup codes
POST   /api/base_security/2fa/backup-codes/regenerate - Regenerate codes
```

## Common Patterns

### Complete Login Flow
```typescript
async login(email: string, password: string, req: Request) {
  // 1. Validate credentials
  const user = await validateUser(email, password);

  // 2. Check 2FA
  if (await this.security.is2FAEnabled(user.id)) {
    return { requiresTwoFa: true, userId: user.id };
  }

  // 3. Create session
  const session = await this.security.createSession(
    user.id,
    generateToken(),
    req.ip,
    req.get('user-agent')
  );

  // 4. Log event
  await this.security.logSecurityEvent(
    user.id,
    'login_successful',
    {},
    'success',
    req.ip
  );

  return { accessToken: session.token };
}
```

### Protect Endpoint with 2FA
```typescript
@Post('critical-action')
@UseGuards(AuthGuard)
async criticalAction(
  @CurrentUser() user: any,
  @Body() dto: { twoFaToken: string },
) {
  const result = await this.security.verify2FALogin(
    user.id,
    dto.twoFaToken
  );

  if (!result.valid) {
    throw new BadRequestException('Invalid 2FA code');
  }

  // Proceed with action
}
```

### IP-Protected Endpoint
```typescript
@Post('admin/action')
@UseGuards(AuthGuard)
async adminAction(@CurrentUser() user: any, @Req() req: Request) {
  const ipCheck = await this.security.checkIpAccess(req.ip);
  
  if (!ipCheck.allowed) {
    throw new ForbiddenException('IP not allowed');
  }

  // Proceed with action
}
```

### Generate API Key for Client
```typescript
@Post('api-keys')
@UseGuards(AuthGuard)
async createApiKey(
  @CurrentUser() user: any,
  @Body() { name }: { name: string },
) {
  const apiKey = await this.security.generateApiKey(name, user.id, [
    'read:data',
    'write:data',
  ]);

  // Important: Return plainKey only once, then discard
  return {
    id: apiKey.id,
    name: apiKey.name,
    prefix: apiKey.prefix,
    plainKey: apiKey.plainKey, // Only displayed once!
    createdAt: apiKey.createdAt,
  };
}
```

## Error Handling

```typescript
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

try {
  await this.security.verify2FA(userId, token);
} catch (error) {
  if (error instanceof BadRequestException) {
    // Invalid token or 2FA not set up
  } else if (error instanceof NotFoundException) {
    // Record not found
  } else if (error instanceof ForbiddenException) {
    // Access denied
  }
}
```

## Type Safety

```typescript
import {
  // DTOs
  CreateApiKeyDto,
  CreateIpAccessDto,
  UpdateIpAccessDto,
  Verify2faDto,
  DisableTwoFaDto,
  RegenerateBackupCodesDto,
  GetSecurityLogsQuery,
  
  // Service
  BaseSecurityService,
} from '@modules/base_security';

// Use types for strong typing
const dto: CreateApiKeyDto = { name: 'key' };
```

## Environment Variables

```env
APP_NAME=Lume               # Used in 2FA QR codes
DB_HOST=localhost           # Database host
DB_USER=gawdesy            # Database user
DB_PASS=gawdesy            # Database password
DB_NAME=lume               # Database name
```

## Performance Tips

1. **Cache IP rules**: IP checks happen frequently
   ```typescript
   @Cacheable({ ttl: 300 })
   async checkIpAccess(ip: string) { ... }
   ```

2. **Schedule cleanup**: Run session cleanup periodically
   ```typescript
   @Cron('0 */6 * * *')
   async cleanupExpiredSessions() { ... }
   ```

3. **Use bulk operations**: Delete/update multiple records
   ```typescript
   for (const rule of rulesToDelete) {
     await this.security.deleteIpAccessRule(rule.id);
   }
   ```

## Security Notes

- API keys are hashed with SHA256
- 2FA secrets are stored in plaintext (use encryption in production)
- Backup codes are single-use and automatically removed
- Sessions have 7-day default TTL
- All operations are logged
- IP patterns support wildcards (192.168.1.*)
