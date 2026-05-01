import { Injectable, Logger } from '@nestjs/common';
import prisma from '../../db/prisma';
import logger from '../../services/logger';

@Injectable()
export class DataGridService {
  private readonly logger = new Logger(DataGridService.name);

  /**
   * Get single data grid
   */
  async getDataGrid(id: string, tenantId: string) {
    try {
      return await prisma.dataGrid.findFirst({
        where: {
          id,
          tenantId,
        },
        include: {
          columns: true,
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get dataGrid ${id}`, error);
      throw error;
    }
  }

  /**
   * List data grids with pagination
   */
  async listDataGrids(input: any, tenantId: string) {
    try {
      const { page = 1, pageSize = 20, sort = [], filter } = input;
      const skip = (page - 1) * pageSize;

      // Build where clause from filter
      const where: any = { tenantId };
      if (filter) {
        where.OR = [
          { title: { contains: filter } },
          { description: { contains: filter } },
        ];
      }

      // Get total count
      const total = await prisma.dataGrid.count({ where });

      // Get paginated results
      const dataGrids = await prisma.dataGrid.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          columns: true,
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: sort.length > 0 ? sort[0] : { createdAt: 'desc' },
      });

      return {
        edges: dataGrids.map(node => ({ node, cursor: Buffer.from(node.id).toString('base64') })),
        pageInfo: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNextPage: page * pageSize < total,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error('Failed to list dataGrids', error);
      throw error;
    }
  }

  /**
   * Create data grid
   */
  async create(input: any, tenantId: string, userId: string) {
    try {
      return await prisma.dataGrid.create({
        data: {
          title: input.title,
          description: input.description,
          tenantId,
          createdById: userId,
          updatedById: userId,
          columns: {
            create: input.columns || [],
          },
        },
        include: {
          columns: true,
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to create dataGrid', error);
      throw error;
    }
  }

  /**
   * Update data grid
   */
  async update(id: string, input: any, tenantId: string, userId: string) {
    try {
      return await prisma.dataGrid.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description,
          updatedById: userId,
          columns: {
            deleteMany: {},
            create: input.columns || [],
          },
        },
        include: {
          columns: true,
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update dataGrid ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete data grid
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    try {
      // Delete associated rows and columns first
      await prisma.gridRow.deleteMany({
        where: { gridId: id },
      });

      await prisma.dataGridColumn.deleteMany({
        where: { gridId: id },
      });

      await prisma.dataGrid.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to delete dataGrid ${id}`, error);
      throw error;
    }
  }

  /**
   * Get grid rows with pagination
   */
  async getRows(gridId: string, input: any, tenantId: string) {
    try {
      const { page = 1, pageSize = 20, filter } = input;
      const skip = (page - 1) * pageSize;

      const where: any = { gridId };

      const rows = await prisma.gridRow.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { sequence: 'asc' },
      });

      return rows;
    } catch (error) {
      this.logger.error(`Failed to get rows for grid ${gridId}`, error);
      throw error;
    }
  }

  /**
   * Create grid row
   */
  async createRow(input: any, tenantId: string) {
    try {
      // Validate data against grid schema
      const grid = await prisma.dataGrid.findUnique({
        where: { id: input.gridId },
        include: { columns: true },
      });

      if (!grid) {
        throw new Error('DataGrid not found');
      }

      // Simple validation - check required fields
      const errors: string[] = [];
      for (const column of grid.columns) {
        if (column.required && !(input.data[column.name])) {
          errors.push(`${column.displayName} is required`);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      const row = await prisma.gridRow.create({
        data: {
          gridId: input.gridId,
          data: input.data,
          sequence: 0,
          status: 'VALID',
        },
      });

      return row;
    } catch (error) {
      this.logger.error('Failed to create row', error);
      throw error;
    }
  }

  /**
   * Update grid row
   */
  async updateRow(id: string, data: any, tenantId: string) {
    try {
      const row = await prisma.gridRow.update({
        where: { id },
        data: {
          data,
          status: 'VALID',
        },
      });

      return row;
    } catch (error) {
      this.logger.error(`Failed to update row ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete grid row
   */
  async deleteRow(id: string, tenantId: string): Promise<boolean> {
    try {
      await prisma.gridRow.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to delete row ${id}`, error);
      throw error;
    }
  }

  /**
   * Bulk delete grid rows
   */
  async bulkDeleteRows(gridId: string, ids: string[], tenantId: string): Promise<number> {
    try {
      const result = await prisma.gridRow.deleteMany({
        where: {
          id: { in: ids },
          gridId,
        },
      });

      return result.count;
    } catch (error) {
      this.logger.error(`Failed to bulk delete rows for grid ${gridId}`, error);
      throw error;
    }
  }

  /**
   * Bulk update grid rows
   */
  async bulkUpdateRows(gridId: string, rows: any[], tenantId: string) {
    try {
      let updatedCount = 0;
      const failedRows = [];

      for (const row of rows) {
        try {
          await prisma.gridRow.update({
            where: { id: row.id },
            data: {
              data: row.data,
              status: 'VALID',
            },
          });
          updatedCount++;
        } catch (error) {
          failedRows.push({
            success: false,
            message: error.message,
            errors: [
              {
                field: 'data',
                message: error.message,
                code: 'UPDATE_ERROR',
              },
            ],
            row: null,
          });
        }
      }

      return {
        success: updatedCount === rows.length,
        message: `Updated ${updatedCount}/${rows.length} rows`,
        errors: [],
        updatedCount,
        failedCount: failedRows.length,
        failedRows,
      };
    } catch (error) {
      this.logger.error(`Failed to bulk update rows for grid ${gridId}`, error);
      throw error;
    }
  }
}
