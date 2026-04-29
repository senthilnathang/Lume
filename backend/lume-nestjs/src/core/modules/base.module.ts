import { Module } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { DrizzleService } from '../services/drizzle.service';
import { LoggerService } from '../services/logger.service';
import { RbacService } from '../services/rbac.service';
import { AuthService } from '../services/jwt.service';

/**
 * BaseModule exports core services used by all feature modules
 */
@Module({
  providers: [
    PrismaService,
    DrizzleService,
    LoggerService,
    RbacService,
    AuthService,
  ],
  exports: [
    PrismaService,
    DrizzleService,
    LoggerService,
    RbacService,
    AuthService,
  ],
})
export class BaseModule {}
