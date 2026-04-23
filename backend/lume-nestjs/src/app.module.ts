import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';

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

// Controllers (Health check)
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    AuthService,
    LoggerService,
    RbacService,
    DrizzleService,
    {
      provide: APP_PIPE,
      useClass: ValidatePipe,
    },
  ],
  exports: [PrismaService, AuthService, LoggerService, RbacService, DrizzleService],
})
export class AppModule {}
