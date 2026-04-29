# Base Security Module - Migration Guide

This document describes how to migrate from the Express-based Base Security module to the NestJS version.

## Overview

The Base Security module has been migrated from Express.js to NestJS with the following improvements:

- Strict TypeScript typing
- Dependency injection via NestJS
- Drizzle ORM integration
- Enhanced error handling with NestJS exceptions
- Improved API consistency

## Breaking Changes

### None - Backward Compatible

The API endpoints remain the same:
- `GET /api/base_security/api-keys`
- `POST /api/base_security/api-keys`
- `DELETE /api/base_security/api-keys/:id`
- `GET /api/base_security/ip-access`
- `POST /api/base_security/ip-access`
- `PUT /api/base_security/ip-access/:id`
- `DELETE /api/base_security/ip-access/:id`
- `GET /api/base_security/sessions`
- `DELETE /api/base_security/sessions/:id`
- `DELETE /api/base_security/sessions/all-other`
- `GET /api/base_security/logs`
- `POST /api/base_security/2fa/setup`
- `POST /api/base_security/2fa/verify`
- `POST /api/base_security/2fa/disable`
- `GET /api/base_security/2fa/status`
- `GET /api/base_security/2fa/backup-codes`
- `POST /api/base_security/2fa/backup-codes/regenerate`

## Setup Instructions

### 1. Import Module in App Module

```typescript
// src/app.module.ts
import { BaseSecurityModule } from '@modules/base_security';

@Module({
  imports: [
    // ... other modules
    BaseSecurityModule,
  ],
})
export class AppModule {}
```

### 2. Database Setup

The module uses the same Drizzle tables as the Express version:
- `api_keys`
- `sessions`
- `ip_access`
- `two_factor`
- `security_logs`

If migrating from Express, these tables already exist in your database.

### 3. Update Service Injection Points

If any code was directly importing from the Express module:

**Before (Express):**
```typescript
import { SecurityService } from '@modules/base_security/services';
```

**After (NestJS):**
```typescript
import { BaseSecurityService } from '@modules/base_security';

@Injectable()
export class MyService {
  constructor(private securityService: BaseSecurityService) {}
}
```

### 4. Service Method Changes

All service methods remain the same but now return strongly-typed promises:

```typescript
// Get API keys
const keys: ApiKey[] = await this.securityService.getApiKeys(userId);

// Check IP access
const result: { allowed: boolean; reason: string } = 
  await this.securityService.checkIpAccess(ipAddress);

// 2FA setup
const setup: { qrCode: string; otpauthUrl: string; backupCodes: string[] } = 
  await this.securityService.setup2FA(userId, email);
```

### 5. Error Handling

The NestJS version uses standard NestJS exceptions:

```typescript
// Before (Express) - returned error objects
const result = await securityService.setup2FA(userId, email);
if (result.error) {
  return res.status(400).json({ error: result.error });
}

// After (NestJS) - throws exceptions
try {
  await this.securityService.setup2FA(userId, email);
} catch (error) {
  if (error instanceof BadRequestException) {
    // Handle 2FA already enabled
  }
}
```

## Dependency Injections

The module provides:

```typescript
// Available via dependency injection
{
  provide: BaseSecurityService,
  useClass: BaseSecurityService,
}

{
  provide: DrizzleService,
  useClass: DrizzleService,
}

{
  provide: RbacService,
  useClass: RbacService,
}
```

## Testing

The module exports all DTOs and types for testing:

```typescript
import {
  CreateApiKeyDto,
  CreateIpAccessDto,
  Setup2faDto,
} from '@modules/base_security';

describe('BaseSecurityController', () => {
  it('should create API key', async () => {
    const dto: CreateApiKeyDto = {
      name: 'Test Key',
      scopes: ['read'],
    };
    // Test implementation
  });
});
```

## Rollback Plan

If you need to rollback to the Express version:

1. Remove `BaseSecurityModule` from imports in `app.module.ts`
2. Restore the Express-based module at `/backend/src/modules/base_security/`
3. Ensure the Express app mounts the routes at `/api/base_security`

## Performance Considerations

- **Drizzle ORM**: Direct SQL queries via Drizzle provide better performance than the previous adapter pattern
- **Type Safety**: Strict typing reduces runtime errors and improves IDE autocomplete
- **Caching**: Consider implementing caching for frequently checked IP access rules

## Future Enhancements

- Add rate limiting decorators per endpoint
- Implement API key scopes validation in middleware
- Add session encryption
- Implement session fingerprinting (IP + User-Agent validation)
- Add audit logging for sensitive operations
- Implement JWT refresh token rotation

## Troubleshooting

### DrizzleService not initialized

Ensure `DrizzleService` is listed in the module's providers:

```typescript
@Module({
  providers: [BaseSecurityService, DrizzleService, RbacService],
})
export class BaseSecurityModule {}
```

### TotpService errors

Ensure `otplib` and `qrcode` packages are installed:

```bash
npm install otplib qrcode
npm install -D @types/qrcode
```

### Database connection errors

Verify environment variables are set:

```bash
DB_HOST=localhost
DB_USER=gawdesy
DB_PASS=gawdesy
DB_NAME=lume
```

## Support

For issues or questions about the migration, refer to:
- Module README: `./README.md`
- Drizzle Documentation: https://orm.drizzle.team/docs/mysql
- NestJS Documentation: https://docs.nestjs.com
