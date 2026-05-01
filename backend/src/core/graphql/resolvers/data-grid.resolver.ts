import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  Parent,
  ResolveField,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphQLService } from '../graphql.service';
import { DataGridService } from '../services/data-grid.service';
import { DataLoaderService } from '../loaders/dataloader.service';

interface GraphQLContext {
  userId: string;
  tenantId: string;
  userRoles: string[];
}

@Resolver('DataGrid')
export class DataGridResolver {
  constructor(
    private graphqlService: GraphQLService,
    private dataGridService: DataGridService,
    private dataLoaderService: DataLoaderService,
  ) {}

  @Query('dataGrid')
  async getDataGrid(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('dataGrid', 'query', context, { id });

    if (!this.graphqlService.hasRole(context, ['user'])) {
      throw new Error('Access denied');
    }

    const dataGrid = await this.dataGridService.getDataGrid(id, context.tenantId);

    if (!dataGrid || dataGrid.tenantId !== context.tenantId) {
      throw new Error('DataGrid not found');
    }

    return dataGrid;
  }

  @Query('dataGrids')
  async listDataGrids(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('dataGrids', 'query', context, input);

    if (!this.graphqlService.hasRole(context, ['user'])) {
      throw new Error('Access denied');
    }

    return this.dataGridService.listDataGrids(input, context.tenantId);
  }

  @Query('dataGridRows')
  async getDataGridRows(
    @Args('gridId') gridId: string,
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation(
      'dataGridRows',
      'query',
      context,
      { gridId, input },
    );

    const dataGrid = await this.dataGridService.getDataGrid(gridId, context.tenantId);
    if (!dataGrid || dataGrid.tenantId !== context.tenantId) {
      throw new Error('DataGrid not found');
    }

    return this.dataGridService.getRows(gridId, input, context.tenantId);
  }

  @Mutation('createDataGrid')
  async createDataGrid(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation(
      'createDataGrid',
      'mutation',
      context,
      input,
    );

    if (!this.graphqlService.hasRole(context, ['user'])) {
      throw new Error('Access denied');
    }

    const dataGrid = await this.dataGridService.create(
      input,
      context.tenantId,
      context.userId,
    );

    await this.graphqlService.createAuditLog(
      context.userId,
      'CREATE',
      'dataGrid',
      dataGrid.id,
      { input },
    );

    return dataGrid;
  }

  @Mutation('updateDataGrid')
  async updateDataGrid(
    @Args('id') id: string,
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation(
      'updateDataGrid',
      'mutation',
      context,
      { id, input },
    );

    const dataGrid = await this.dataGridService.getDataGrid(id, context.tenantId);
    if (!dataGrid || dataGrid.tenantId !== context.tenantId) {
      throw new Error('DataGrid not found');
    }

    const updated = await this.dataGridService.update(
      id,
      input,
      context.tenantId,
      context.userId,
    );

    await this.graphqlService.createAuditLog(
      context.userId,
      'UPDATE',
      'dataGrid',
      id,
      { input },
    );

    return updated;
  }

  @Mutation('deleteDataGrid')
  async deleteDataGrid(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ): Promise<boolean> {
    this.graphqlService.logOperation(
      'deleteDataGrid',
      'mutation',
      context,
      { id },
    );

    const dataGrid = await this.dataGridService.getDataGrid(id, context.tenantId);
    if (!dataGrid || dataGrid.tenantId !== context.tenantId) {
      throw new Error('DataGrid not found');
    }

    const deleted = await this.dataGridService.delete(id, context.tenantId);

    await this.graphqlService.createAuditLog(
      context.userId,
      'DELETE',
      'dataGrid',
      id,
      { dataGrid },
    );

    return deleted;
  }

  @Mutation('createRow')
  async createRow(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('createRow', 'mutation', context, input);

    const dataGrid = await this.dataGridService.getDataGrid(
      input.gridId,
      context.tenantId,
    );
    if (!dataGrid || dataGrid.tenantId !== context.tenantId) {
      throw new Error('DataGrid not found');
    }

    try {
      const row = await this.dataGridService.createRow(input, context.tenantId);

      await this.graphqlService.createAuditLog(
        context.userId,
        'CREATE',
        'dataGridRow',
        row.id,
        { input },
      );

      return {
        success: true,
        message: 'Row created successfully',
        errors: [],
        row,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [{ field: 'data', message: error.message, code: 'VALIDATION_ERROR' }],
        row: null,
      };
    }
  }

  @Mutation('updateRow')
  async updateRow(
    @Args('id') id: string,
    @Args('data') data: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('updateRow', 'mutation', context, {
      id,
      data,
    });

    try {
      const row = await this.dataGridService.updateRow(id, data, context.tenantId);

      await this.graphqlService.createAuditLog(
        context.userId,
        'UPDATE',
        'dataGridRow',
        id,
        { data },
      );

      return {
        success: true,
        message: 'Row updated successfully',
        errors: [],
        row,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [{ field: 'data', message: error.message, code: 'VALIDATION_ERROR' }],
        row: null,
      };
    }
  }

  @Mutation('deleteRow')
  async deleteRow(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ): Promise<boolean> {
    this.graphqlService.logOperation('deleteRow', 'mutation', context, { id });

    const deleted = await this.dataGridService.deleteRow(id, context.tenantId);

    await this.graphqlService.createAuditLog(
      context.userId,
      'DELETE',
      'dataGridRow',
      id,
      {},
    );

    return deleted;
  }

  @Mutation('bulkDeleteRows')
  async bulkDeleteRows(
    @Args('gridId') gridId: string,
    @Args('ids') ids: string[],
    @Context() context: GraphQLContext,
  ): Promise<number> {
    this.graphqlService.logOperation('bulkDeleteRows', 'mutation', context, {
      gridId,
      ids,
    });

    const dataGrid = await this.dataGridService.getDataGrid(gridId, context.tenantId);
    if (!dataGrid || dataGrid.tenantId !== context.tenantId) {
      throw new Error('DataGrid not found');
    }

    const deletedCount = await this.dataGridService.bulkDeleteRows(
      gridId,
      ids,
      context.tenantId,
    );

    await this.graphqlService.createAuditLog(
      context.userId,
      'BULK_DELETE',
      'dataGridRows',
      gridId,
      { ids, count: deletedCount },
    );

    return deletedCount;
  }

  @Mutation('bulkUpdateRows')
  async bulkUpdateRows(
    @Args('gridId') gridId: string,
    @Args('rows') rows: any[],
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('bulkUpdateRows', 'mutation', context, {
      gridId,
      rows,
    });

    const dataGrid = await this.dataGridService.getDataGrid(gridId, context.tenantId);
    if (!dataGrid || dataGrid.tenantId !== context.tenantId) {
      throw new Error('DataGrid not found');
    }

    const result = await this.dataGridService.bulkUpdateRows(
      gridId,
      rows,
      context.tenantId,
    );

    await this.graphqlService.createAuditLog(
      context.userId,
      'BULK_UPDATE',
      'dataGridRows',
      gridId,
      { count: result.updatedCount, rows },
    );

    return result;
  }

  @ResolveField('createdBy')
  async createdBy(@Parent() dataGrid: any, @Context() context: GraphQLContext) {
    return this.dataLoaderService.userLoader.load(dataGrid.createdById);
  }

  @ResolveField('updatedBy')
  async updatedBy(@Parent() dataGrid: any, @Context() context: GraphQLContext) {
    if (!dataGrid.updatedById) return null;
    return this.dataLoaderService.userLoader.load(dataGrid.updatedById);
  }
}
