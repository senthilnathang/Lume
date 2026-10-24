import { Module } from '@nestjs/common';
import { SchemaExportService } from './schema-export.service';
import { SchemaController } from './schema.controller';

/**
 * Schema Module
 * Provides GraphQL schema export and documentation endpoints
 * Used by API consumers for client code generation and documentation
 */
@Module({
  providers: [SchemaExportService],
  controllers: [SchemaController],
  exports: [SchemaExportService],
})
export class SchemaModule {}
