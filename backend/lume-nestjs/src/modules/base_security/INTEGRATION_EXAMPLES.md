# Base Security Module - Integration Examples

This document provides practical examples of how to integrate the Base Security module with other parts of your NestJS application.

## Table of Contents

1. [Checking IP Access in Middleware](#checking-ip-access-in-middleware)
2. [Verifying 2FA During Login](#verifying-2fa-during-login)
3. [Creating Sessions After Authentication](#creating-sessions-after-authentication)
4. [Using API Keys in Custom Guards](#using-api-keys-in-custom-guards)
5. [Logging Security Events](#logging-security-events)
6. [Session Activity Tracking](#session-activity-tracking)

## Checking IP Access in Middleware

### Create IP Access Middleware

```typescript
// src/common/middleware/ip-access.middleware.ts
import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { BaseSecurityService } from '@modules/base_security';

@Injectable()
export class IpAccessMiddleware implements NestMiddleware {
  constructor(private security: BaseSecurityService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const clientIp = req.ip || req.connection.remoteAddress || '';
    const result = await this.security.checkIpAccess(clientIp);

    if (!result.allowed) {
      throw new ForbiddenException(
        `IP ${clientIp} is not allowed to access this service (${result.reason})`,
      );
    }

    next();
  }
}
```

### Register Middleware in App Module

```typescript
// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { BaseSecurityModule } from '@modules/base_security';
import { IpAccessMiddleware } from '@common/middleware/ip-access.middleware';

@Module({
  imports: [BaseSecurityModule, /* ... */],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(IpAccessMiddleware)
      .forRoutes('/api'); // Apply to all API routes
  }
}
```

## Verifying 2FA During Login

### Enhanced Auth Service with 2FA

```typescript
// src/modules/auth/services/auth.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseSecurityService } from '@modules/base_security';
import { PrismaService } from '@core/services/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private security: BaseSecurityService,
  ) {}

  async login(email: string, password: string) {
    // Validate credentials
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !this.validatePassword(password, user.password)) {
      throw new BadRequestException('Invalid credentials');
    }

    // Check if 2FA is enabled
    const twoFaEnabled = await this.security.is2FAEnabled(user.id);

    if (twoFaEnabled) {
      // Return temporary token requiring 2FA verification
      return {
        success: true,
        requiresTwoFa: true,
        tempToken: this.generateTempToken(user.id),
        message: 'Please enter your 2FA code',
      };
    }

    // Return full authentication tokens
    const token = this.generateAccessToken(user.id);
    return {
      success: true,
      requiresTwoFa: false,
      accessToken: token,
      user: { id: user.id, email: user.email },
    };
  }

  async verifyTwoFaLogin(userId: number, token: string) {
    const result = await this.security.verify2FALogin(userId, token);

    if (!result.valid) {
      throw new BadRequestException('Invalid 2FA code');
    }

    // Generate final access token
    const accessToken = this.generateAccessToken(userId);
    return {
      success: true,
      accessToken,
      usedBackupCode: result.usedBackupCode,
    };
  }

  private validatePassword(password: string, hash: string): boolean {
    // Implement password validation
    return true;
  }

  private generateAccessToken(userId: number): string {
    // Generate JWT token
    return '';
  }

  private generateTempToken(userId: number): string {
    // Generate temporary token for 2FA verification
    return '';
  }
}
```

### 2FA Verification Endpoint

```typescript
// src/modules/auth/controllers/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(@Body() { email, password }: { email: string; password: string }) {
    return this.auth.login(email, password);
  }

  @Post('2fa/verify')
  async verify2Fa(
    @Body() { userId, token }: { userId: number; token: string },
  ) {
    return this.auth.verifyTwoFaLogin(userId, token);
  }
}
```

## Creating Sessions After Authentication

### Session Creation Service

```typescript
// src/modules/auth/services/session.service.ts
import { Injectable } from '@nestjs/common';
import { BaseSecurityService } from '@modules/base_security';
import { Request } from 'express';
import crypto from 'crypto';

@Injectable()
export class SessionService {
  constructor(private security: BaseSecurityService) {}

  async createUserSession(userId: number, req: Request) {
    const token = this.generateSessionToken();
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const session = await this.security.createSession(
      userId,
      token,
      ipAddress,
      userAgent,
    );

    return {
      sessionId: session.id,
      token: token,
      expiresAt: session.expiresAt,
    };
  }

  async terminateAllOtherSessions(userId: number, currentToken: string) {
    const result = await this.security.terminateAllOtherSessions(
      userId,
      currentToken,
    );
    return {
      terminatedCount: result.terminated,
      message: `Logged out from ${result.terminated} other device(s)`,
    };
  }

  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
```

### Use in Login Endpoint

```typescript
@Post('login')
async login(
  @Body() dto: LoginDto,
  @Req() req: Request,
) {
  const user = await this.validate(dto);
  
  // Create session
  const session = await this.sessionService.createUserSession(user.id, req);
  
  // Log the event
  await this.security.logSecurityEvent(
    user.id,
    'login_successful',
    { ipAddress: req.ip },
    'success',
    req.ip,
    req.get('user-agent'),
  );

  return {
    success: true,
    data: {
      user,
      sessionToken: session.token,
      expiresAt: session.expiresAt,
    },
  };
}
```

## Using API Keys in Custom Guards

### API Key Authentication Guard

```typescript
// src/common/guards/api-key.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { BaseSecurityService } from '@modules/base_security';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private security: BaseSecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API Key is required');
    }

    const validApiKey = await this.security.validateApiKey(apiKey);
    if (!validApiKey) {
      throw new UnauthorizedException('Invalid or expired API Key');
    }

    // Attach API key data to request
    request['apiKey'] = validApiKey;
    request['userId'] = validApiKey.userId;

    return true;
  }

  private extractApiKey(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return request.headers['x-api-key']?.toString() || null;
  }
}
```

### Protect Endpoints with API Key Guard

```typescript
// src/modules/integrations/controllers/webhooks.controller.ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiKeyGuard } from '@common/guards/api-key.guard';
import { Request } from 'express';

@Controller('webhooks')
@UseGuards(ApiKeyGuard)
export class WebhooksController {
  @Post('process')
  async processWebhook(
    @Body() payload: any,
    @Req() req: Request,
  ) {
    const apiKey = req['apiKey'];
    const userId = req['userId'];

    // Process webhook for authenticated API key
    return {
      success: true,
      processedBy: userId,
      apiKeyId: apiKey.id,
    };
  }
}
```

## Logging Security Events

### Create Security Logger Service

```typescript
// src/common/services/security-logger.service.ts
import { Injectable } from '@nestjs/common';
import { BaseSecurityService } from '@modules/base_security';
import { Request } from 'express';

export enum SecurityEventType {
  LOGIN = 'login_successful',
  LOGOUT = 'logout',
  FAILED_LOGIN = 'login_failed',
  PASSWORD_CHANGE = 'password_changed',
  PERMISSION_DENIED = 'permission_denied',
  RESOURCE_ACCESSED = 'resource_accessed',
  RESOURCE_CREATED = 'resource_created',
  RESOURCE_UPDATED = 'resource_updated',
  RESOURCE_DELETED = 'resource_deleted',
  TWO_FA_ENABLED = '2fa_enabled',
  TWO_FA_DISABLED = '2fa_disabled',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
}

@Injectable()
export class SecurityLoggerService {
  constructor(private security: BaseSecurityService) {}

  async logEvent(
    userId: number | null,
    eventType: SecurityEventType,
    details: Record<string, any> = {},
    status: 'success' | 'failure' = 'success',
    req?: Request,
  ) {
    const ipAddress = req?.ip || req?.connection?.remoteAddress;
    const userAgent = req?.get('user-agent');

    return this.security.logSecurityEvent(
      userId,
      eventType,
      details,
      status,
      ipAddress,
      userAgent,
    );
  }

  async logLogin(userId: number, req: Request, success: boolean = true) {
    await this.logEvent(
      userId,
      success ? SecurityEventType.LOGIN : SecurityEventType.FAILED_LOGIN,
      { method: 'password' },
      success ? 'success' : 'failure',
      req,
    );
  }

  async logResourceAccess(
    userId: number,
    resource: string,
    action: string,
    req: Request,
  ) {
    await this.logEvent(
      userId,
      SecurityEventType.RESOURCE_ACCESSED,
      { resource, action },
      'success',
      req,
    );
  }

  async logPasswordChange(userId: number, req: Request) {
    await this.logEvent(
      userId,
      SecurityEventType.PASSWORD_CHANGE,
      {},
      'success',
      req,
    );
  }
}
```

### Use in Services

```typescript
@Injectable()
export class UsersService {
  constructor(private securityLogger: SecurityLoggerService) {}

  async updatePassword(userId: number, req: Request, newPassword: string) {
    // Update password...
    
    await this.securityLogger.logPasswordChange(userId, req);
    
    return { success: true };
  }
}
```

## Session Activity Tracking

### Create Interceptor for Session Activity

```typescript
// src/common/interceptors/session-activity.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BaseSecurityService } from '@modules/base_security';
import { Request } from 'express';

@Injectable()
export class SessionActivityInterceptor implements NestInterceptor {
  constructor(private security: BaseSecurityService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (token) {
      // Update last activity timestamp
      await this.security.updateSessionActivity(token);
    }

    return next.handle().pipe(
      tap(() => {
        // Log successful request
      }),
    );
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  }
}
```

### Register in App Module

```typescript
// src/app.module.ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SessionActivityInterceptor } from '@common/interceptors/session-activity.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SessionActivityInterceptor,
    },
  ],
})
export class AppModule {}
```

## Complete Auth Flow Example

```typescript
// Combined example: Complete authentication flow with security

@Controller('auth')
export class CompleteAuthController {
  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
    private securityLogger: SecurityLoggerService,
    private security: BaseSecurityService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    try {
      // Create user
      const user = await this.authService.createUser(dto);

      // Log event
      await this.securityLogger.logEvent(
        null,
        'user_registered',
        { email: user.email },
        'success',
        req,
      );

      return { success: true, user };
    } catch (error) {
      await this.securityLogger.logEvent(
        null,
        'registration_failed',
        { error: error.message },
        'failure',
        req,
      );
      throw error;
    }
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    try {
      const user = await this.authService.validateCredentials(
        dto.email,
        dto.password,
      );

      // Check 2FA
      const twoFaEnabled = await this.security.is2FAEnabled(user.id);
      if (twoFaEnabled) {
        return { requiresTwoFa: true, userId: user.id };
      }

      // Create session
      const session = await this.sessionService.createUserSession(user.id, req);

      // Log successful login
      await this.securityLogger.logLogin(user.id, req, true);

      return {
        success: true,
        accessToken: session.token,
        user: { id: user.id, email: user.email },
      };
    } catch (error) {
      await this.securityLogger.logLogin(null, req, false);
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@CurrentUser() user: any, @Req() req: Request) {
    // Log logout
    await this.securityLogger.logEvent(
      user.id,
      'logout',
      {},
      'success',
      req,
    );

    return { success: true, message: 'Logged out successfully' };
  }

  @Post('logout-all-devices')
  @UseGuards(AuthGuard)
  async logoutAllDevices(
    @CurrentUser() user: any,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.replace('Bearer ', '') || '';
    const result = await this.sessionService.terminateAllOtherSessions(
      user.id,
      token,
    );

    return result;
  }
}
```

## Testing Examples

```typescript
describe('Auth with Security Module', () => {
  it('should log failed login attempt', async () => {
    const securitySpy = jest.spyOn(
      securityService,
      'logSecurityEvent',
    );

    try {
      await authController.login({ email: 'test@example.com', password: 'wrong' }, req);
    } catch (error) {
      // Expected to throw
    }

    expect(securitySpy).toHaveBeenCalledWith(
      null,
      'login_failed',
      expect.any(Object),
      'failure',
      expect.any(String),
      expect.any(String),
    );
  });

  it('should create session on successful login', async () => {
    const sessionSpy = jest.spyOn(securityService, 'createSession');

    const result = await authController.login(validCredentials, req);

    expect(sessionSpy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
  });

  it('should reject IP-blocked requests', async () => {
    jest
      .spyOn(securityService, 'checkIpAccess')
      .mockResolvedValue({ allowed: false, reason: 'blacklisted' });

    await expect(
      ipAccessMiddleware.use(blockedRequest, response, next),
    ).rejects.toThrow(ForbiddenException);
  });
});
```

## Best Practices

1. **Always log security events** - Use SecurityLoggerService for all security-related operations
2. **Clean up sessions** - Run session cleanup periodically:
   ```typescript
   // In a scheduled task
   @Cron('0 */6 * * *') // Every 6 hours
   async cleanupSessions() {
     const result = await this.security.cleanupExpiredSessions();
     console.log(`Cleaned up ${result.cleaned} expired sessions`);
   }
   ```

3. **Validate IP access on sensitive operations** - Check IP before critical operations

4. **Use backup codes carefully** - Inform users when backup codes are consumed

5. **Rate limit authentication endpoints** - Prevent brute force attacks

6. **Rotate API keys regularly** - Encourage users to refresh keys

7. **Monitor security logs** - Set up alerts for suspicious patterns
