import { GraphQLSubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { AuditModule } from '@modules/audit/audit.module';
import { TenantRegistryService } from '@core/services/tenant-registry.service';
import { AuditLogResolver } from './resolvers/audit-log.resolver.js';
import { TenantResolver } from './resolvers/tenant.resolver.js';
import { AnalyticsResolver } from './resolvers/analytics.resolver.js';
import { ImportExportResolver } from './resolvers/import-export.resolver.js';

@Module({
  imports: [SharedModule, GraphQLSubscriptionsModule, AuditModule],
  providers: [TenantRegistryService, AuditLogResolver, TenantResolver, AnalyticsResolver, ImportExportResolver],
  exports: [AuditLogResolver, TenantResolver, AnalyticsResolver, ImportExportResolver],
})
export class EnterpriseGridModule {}
