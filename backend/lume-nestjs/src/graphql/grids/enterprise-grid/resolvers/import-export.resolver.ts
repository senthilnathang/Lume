import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlJwtGuard, GqlRbacGuard } from '../../guards/index.js';
import { GqlTenant } from '../../decorators/index.js';
import { ImportRecordsInput } from '../inputs/import-records.input.js';
import { ExportOptionsInput } from '../inputs/export-options.input.js';
import { ImportResultType } from '../types/import-result.type.js';

@Resolver()
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class ImportExportResolver {
  @Query(() => [Object], { nullable: true })
  async importHistory(@GqlTenant() tenantId?: number) {
    // TODO: Implement import/export service call
    return [];
  }

  @Mutation(() => ImportResultType)
  async importRecords(
    @Args('input') input: ImportRecordsInput,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement import/export service call
    return {
      success: true,
      total: 0,
      imported: 0,
      failed: 0,
      errors: [],
      duration: 0,
    };
  }

  @Mutation(() => String)
  async exportRecords(
    @Args('input') input: ExportOptionsInput,
    @GqlTenant() tenantId?: number,
  ): Promise<string> {
    // TODO: Implement import/export service call
    return input.format === 'csv' ? 'id,name\n' : '[]';
  }
}
