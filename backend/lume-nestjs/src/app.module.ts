import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';

// Core services
import { PrismaService } from '@core/services/prisma.service';
import { AuthService } from '@core/services/jwt.service';
import { LoggerService } from '@core/services/logger.service';
import { RbacService } from '@core/services/rbac.service';
import { DrizzleService } from '@core/services/drizzle.service';

// Pipes & Filters
import { ValidatePipe } from '@core/pipes/validation.pipe';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

// Controllers (Health check)
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
      global: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 5, // 5 requests per minute
      },
    ]),
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    AuthService,
    LoggerService,
    RbacService,
    DrizzleService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ValidatePipe,
    },
  ],
  exports: [PrismaService, AuthService, LoggerService, RbacService, DrizzleService],
})
export class AppModule {}
