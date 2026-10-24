import { SharedModule } from '@core/modules/shared.module';
import { EntityService } from '@modules/base/services/entity.service';
import { RecordService } from '@modules/base/services/record.service';
import { FormulaService } from '@modules/base/services/formula.service';
import { FieldPermissionService } from '@modules/base/services/field-permission.service';
import { Module } from '@nestjs/common';
import { EntityResolver } from './resolvers/entity.resolver';
import { EntityRecordResolver } from './resolvers/entity-record.resolver';

/**
 * DataGrid module for Entity and EntityRecord GraphQL resolvers
 * Provides queries and mutations for CRUD operations with RBAC + field-level masking
 */
@Module({
  imports: [SharedModule],
  providers: [EntityResolver, EntityRecordResolver, EntityService, RecordService, FormulaService, FieldPermissionService],
  exports: [EntityResolver, EntityRecordResolver],
})
export class DataGridModule {}
