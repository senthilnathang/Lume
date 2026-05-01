import { Module } from '@nestjs/common';
import { EntityResolver } from './resolvers/entity.resolver';
import { EntityRecordResolver } from './resolvers/entity-record.resolver';

/**
 * DataGrid module for Entity and EntityRecord GraphQL resolvers
 * Provides queries and mutations for CRUD operations with RBAC + field-level masking
 */
@Module({
  providers: [EntityResolver, EntityRecordResolver],
  exports: [EntityResolver, EntityRecordResolver],
})
export class DataGridModule {}
