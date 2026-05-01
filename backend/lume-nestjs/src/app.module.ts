import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Core modules & services
import { BaseModule } from '@core/modules/base.module';
import { RuntimeModule } from '@core/modules/runtime.module';
import { PrismaService } from '@core/services/prisma.service';
import { LoggerService } from '@core/services/logger.service';
import { RbacService } from '@core/services/rbac.service';
import { DrizzleService } from '@core/services/drizzle.service';

// Pipes & Filters
import { ValidatePipe } from '@core/pipes/validation.pipe';
import { FeatureFlagGuard } from '@core/guards/feature-flag.guard';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SettingsModule } from './modules/settings/settings.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { BaseRbacModule } from './modules/base_rbac/base-rbac.module';
import { BaseSecurityModule } from './modules/base_security/base-security.module';
import { AuditModule } from './modules/audit/audit.module';
import { BaseModule as BaseCoreModule } from './modules/base/base.module';
import { EditorModule } from './modules/editor/editor.module';
import { WebsiteModule } from './modules/website/website.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TeamModule } from './modules/team/team.module';
import { MediaModule } from './modules/media/media.module';
import { DonationsModule } from './modules/donations/donations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { BaseAutomationModule } from './modules/base_automation/base_automation.module';
import { BaseCustomizationModule } from './modules/base_customization/base_customization.module';
import { BaseFeaturesDataModule } from './modules/base_features_data/base_features_data.module';
import { AdvancedFeaturesModule } from './modules/advanced_features/advanced-features.module';
import { LumeModule } from './modules/lume/lume.module';
import { GawdesyModule } from './modules/gawdesy/gawdesy.module';
import { SecurityAuditModule } from './modules/security_audit/security-audit.module';

// Controllers (Health check)
import { HealthController } from './health.controller';

// GraphQL
import { GraphQLCoreModule } from './graphql/graphql.module';

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
    EventEmitterModule.forRoot(),
    RuntimeModule,
    BaseModule,
    GraphQLCoreModule,
    AuthModule,
    UsersModule,
    SettingsModule,
    RbacModule,
    BaseRbacModule,
    BaseSecurityModule,
    AuditModule,
    BaseCoreModule,
    EditorModule,
    WebsiteModule,
    ActivitiesModule,
    DocumentsModule,
    TeamModule,
    MediaModule,
    DonationsModule,
    MessagesModule,
    BaseAutomationModule,
    BaseCustomizationModule,
    BaseFeaturesDataModule,
    AdvancedFeaturesModule,
    LumeModule,
    GawdesyModule,
    SecurityAuditModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    LoggerService,
    RbacService,
    DrizzleService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FeatureFlagGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ValidatePipe,
    },
  ],
  exports: [RuntimeModule, PrismaService, LoggerService, RbacService, DrizzleService],
})
export class AppModule {}
