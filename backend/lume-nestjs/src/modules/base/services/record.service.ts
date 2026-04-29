import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { FormulaService } from './formula.service';

@Injectable()
export class RecordService {
  constructor(
    private prisma: PrismaService,
    private formulaService: FormulaService,
  ) {}

  /**
   * Create a new record for an entity
   */
  async createRecord(
    entityId: number,
    recordData: Record<string, any>,
    companyId: number,
    userId: number,
  ): Promise<any> {
    // Validate entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new Error('Entity not found');
    }

    // Validate fields
    const fields = await this.prisma.entityField.findMany({
      where: { entityId, deletedAt: null },
    });

    this.validateRecordData(recordData, fields);

    // Evaluate formula fields
    const dataWithFormulas = await this.evaluateFormulaFields(recordData, fields);

    // Create record
    const record = await this.prisma.entityRecord.create({
      data: {
        entityId,
        data: JSON.stringify(dataWithFormulas),
        createdBy: userId,
        companyId,
        visibility: 'private',
      },
    });

    return {
      ...record,
      data: JSON.parse(record.data),
    };
  }

  /**
   * Get a record by ID with company scoping
   */
  async getRecord(recordId: number, companyId: number): Promise<any> {
    const record = await this.prisma.entityRecord.findUnique({
      where: { id: recordId },
    });

    if (!record || record.deletedAt || record.companyId !== companyId) {
      return null;
    }

    return {
      ...record,
      data: JSON.parse(record.data),
    };
  }

  /**
   * List records for an entity with pagination and filtering
   */
  async listRecords(
    entityId: number,
    companyId: number,
    options: {
      page?: number;
      limit?: number;
      filters?: any[];
      sort?: Record<string, any>;
    } = {},
  ): Promise<any> {
    const { page = 1, limit = 20, filters = [], sort = {} } = options;

    const where = {
      entityId,
      companyId,
      deletedAt: null,
    };

    // Get all records for this entity/company
    const allRecords = await this.prisma.entityRecord.findMany({
      where,
      orderBy: Object.keys(sort).length > 0 ? sort : { createdAt: 'desc' },
    });

    // Parse data
    const parsedRecords = allRecords.map((record) => ({
      ...record,
      data: JSON.parse(record.data),
    }));

    // Apply filters in-memory
    let filteredRecords = parsedRecords;
    if (filters && filters.length > 0) {
      filteredRecords = parsedRecords.filter((record) => {
        return filters.every((filter) => {
          const fieldValue = record.data[filter.field];
          const filterValue = filter.value;
          const operator = filter.operator || 'contains';

          if (operator === 'contains') {
            return String(fieldValue || '').includes(String(filterValue));
          } else if (operator === 'equals') {
            return fieldValue === filterValue;
          } else if (operator === 'startsWith') {
            return String(fieldValue || '').startsWith(String(filterValue));
          }
          return true;
        });
      });
    }

    // Apply pagination
    const total = filteredRecords.length;
    const paginatedRecords = filteredRecords.slice((page - 1) * limit, page * limit);

    return {
      records: paginatedRecords,
      pagination: {
        page,
        limit,
        total,
        hasMore: (page - 1) * limit + limit < total,
      },
    };
  }

  /**
   * Update a record
   */
  async updateRecord(recordId: number, updates: Record<string, any>, companyId: number): Promise<any> {
    // Get existing record
    const existing = await this.prisma.entityRecord.findUnique({
      where: { id: recordId },
    });

    if (!existing || existing.deletedAt || existing.companyId !== companyId) {
      return null;
    }

    // Parse existing data
    const existingData = JSON.parse(existing.data);

    // Merge updates
    const mergedData = { ...existingData, ...updates };

    // Validate merged data
    const fields = await this.prisma.entityField.findMany({
      where: { entityId: existing.entityId, deletedAt: null },
    });

    this.validateRecordData(mergedData, fields);

    // Evaluate formula fields
    const dataWithFormulas = await this.evaluateFormulaFields(mergedData, fields);

    // Update record
    const updated = await this.prisma.entityRecord.update({
      where: { id: recordId },
      data: {
        data: JSON.stringify(dataWithFormulas),
      },
    });

    return {
      ...updated,
      data: JSON.parse(updated.data),
    };
  }

  /**
   * Delete a record (soft or hard delete)
   */
  async deleteRecord(recordId: number, softDelete = true, companyId: number): Promise<boolean> {
    // Get existing record
    const existing = await this.prisma.entityRecord.findUnique({
      where: { id: recordId },
    });

    if (!existing || existing.companyId !== companyId) {
      return false;
    }

    if (softDelete) {
      // Soft delete
      await this.prisma.entityRecord.update({
        where: { id: recordId },
        data: { deletedAt: new Date() },
      });
    } else {
      // Hard delete
      await this.prisma.entityRecord.delete({
        where: { id: recordId },
      });
    }

    return true;
  }

  /**
   * Evaluate formula fields and return data with computed values
   */
  private async evaluateFormulaFields(
    data: Record<string, any>,
    fields: any[],
  ): Promise<Record<string, any>> {
    const resultData = { ...data };

    for (const field of fields) {
      if (field.type === 'formula' && field.formulaExpression && field.isStored) {
        try {
          const result = this.formulaService.evaluate(field.formulaExpression, resultData, fields);
          resultData[field.name] = result;
        } catch (error) {
          // Log but don't fail on formula evaluation errors
          console.error(`Formula evaluation failed for field ${field.name}: ${(error as Error).message}`);
        }
      }
    }

    return resultData;
  }

  /**
   * Validate record data against entity fields
   */
  private validateRecordData(data: Record<string, any>, fields: any[]): void {
    const errors: Record<string, string> = {};

    for (const field of fields) {
      const value = data[field.name];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors[field.name] = `${field.label} is required`;
      }

      // Type-specific validation
      if (value !== undefined && value !== null && value !== '') {
        switch (field.type) {
          case 'email':
            if (!this.isValidEmail(value)) {
              errors[field.name] = 'Invalid email format';
            }
            break;
          case 'number':
          case 'integer':
          case 'float':
            if (isNaN(Number(value))) {
              errors[field.name] = `${field.label} must be a number`;
            } else if (field.type === 'integer' && !Number.isInteger(Number(value))) {
              errors[field.name] = `${field.label} must be an integer`;
            }
            break;
          case 'date':
            if (isNaN(Date.parse(value))) {
              errors[field.name] = 'Invalid date format';
            }
            break;
          case 'datetime':
            if (isNaN(Date.parse(value))) {
              errors[field.name] = 'Invalid date/time format';
            }
            break;
          case 'url':
            if (!this.isValidUrl(value)) {
              errors[field.name] = 'Invalid URL format';
            }
            break;
          case 'phone':
            if (!this.isValidPhone(value)) {
              errors[field.name] = 'Invalid phone number format';
            }
            break;
          case 'select':
            if (field.selectOptions && !field.selectOptions.includes(value)) {
              errors[field.name] = `${field.label} value must be one of: ${field.selectOptions.join(', ')}`;
            }
            break;
          case 'multiselect':
            if (Array.isArray(value)) {
              if (field.selectOptions) {
                const invalidValues = value.filter((v: any) => !field.selectOptions.includes(v));
                if (invalidValues.length > 0) {
                  errors[field.name] = `${field.label} contains invalid values: ${invalidValues.join(', ')}`;
                }
              }
            } else {
              errors[field.name] = `${field.label} must be an array`;
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 0 && value !== 1) {
              errors[field.name] = `${field.label} must be a boolean`;
            }
            break;
          case 'json':
            try {
              if (typeof value === 'string') {
                JSON.parse(value);
              }
            } catch {
              errors[field.name] = `${field.label} must be valid JSON`;
            }
            break;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate phone number format
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
    return phoneRegex.test(phone);
  }
}
