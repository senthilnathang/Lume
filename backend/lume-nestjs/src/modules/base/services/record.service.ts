import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { SecurityService } from './security.service';
import { executeCascade } from './cascade-operation';
import { ValidationRuleEngineService } from '@modules/base_automation/services/validation-rule-engine.service';
import type { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@core/services/prisma.service';
import { FormulaService } from './formula.service';
import { RecordCreatedEvent, RecordUpdatedEvent, RecordDeletedEvent } from '../events/record.events';
import { durableEvents, enqueueAutomationEvent } from '@core/workflow/automation-outbox';

@Injectable()
export class RecordService {
  private transactionBound = false;
  constructor(
    private prisma: PrismaService,
    private formulaService: FormulaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /** Use only within the supplied transaction's callback lifetime.
   * The caller owns cascade orchestration and must suppress events until commit.
   */
  withTransaction(tx: Prisma.TransactionClient): RecordService {
    const records = new RecordService(tx as PrismaService, this.formulaService, this.eventEmitter);
    records.transactionBound = true;
    return records;
  }

  private async hasCascade(entityId: number, operation: 'update' | 'delete') {
    return !!await this.prisma.entityRelationship.findFirst({ where: {
      OR: [{ sourceEntityId: entityId }, { targetEntityId: entityId }],
      ...(operation === 'update' ? { cascadeUpdate: true } : { cascadeDelete: true }),
    } });
  }

  private publishCascade(events: Array<RecordUpdatedEvent | RecordDeletedEvent>) {
    if(durableEvents())return;
    for (const event of events) {
      this.eventEmitter.emit(event instanceof RecordDeletedEvent ? 'record.deleted' : 'record.updated', event);
    }
  }

  private async validateAutomation(entityId: number, data: Record<string, any>, companyId: number, recordId?: number) {
    const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });
    if (!entity || entity.deletedAt) throw new NotFoundException('Entity not found');
    const errors = await new ValidationRuleEngineService(this.prisma).validate(entity.name, data, { companyId, recordId }, this.transactionBound);
    if (errors.length) throw new BadRequestException({ message: 'Record validation failed', errors });
  }

  private async predicate(entityId: number, action: string, userId?: number, db: any = this.prisma) {
    const entity = await db.entity.findUnique({ where: { id: entityId } });
    if (!entity || entity.deletedAt) throw new NotFoundException('Entity not found');
    let context = {};
    if (userId !== undefined) {
      if (!Number.isSafeInteger(userId) || userId < 1) throw new ForbiddenException('Valid user identity required');
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) throw new ForbiddenException('User not found');
      context = { userId: user.id, roleId: user.role_id };
    }
    return new SecurityService(db).recordPredicate(['EntityRecord', 'entity_records', entity.name], action, context);
  }

  private assertAllowed(allowed: (data: any) => boolean, data: any) {
    if (!allowed(data)) throw new ForbiddenException('Access denied by record rule');
  }

  private concurrentChange(error: any): never {
    if (error.code === 'P2025') throw new ConflictException('Record changed during authorization; retry the operation');
    throw error;
  }

  /**
   * Create a new record for an entity
   */
  async createRecord(
    entityId: number,
    recordData: Record<string, any>,
    companyId: number,
    userId: number,
    options: { emitEvent?: boolean } = {},
  ): Promise<any> {
    if (!this.transactionBound) {
      const result = await this.prisma.$transaction(async tx =>{
        const row=await this.withTransaction(tx).createRecord(entityId, recordData, companyId, userId, { emitEvent: false });
        if(options.emitEvent!==false)await enqueueAutomationEvent(tx,'record.created',new RecordCreatedEvent(entityId,row,userId));
        return row;
      });
      if (options.emitEvent !== false&&!durableEvents()) this.eventEmitter.emit('record.created', new RecordCreatedEvent(entityId, result, userId));
      return result;
    }
    // Validate entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity || entity.deletedAt) {
      throw new Error('Entity not found');
    }

    // Validate fields
    const fields = await this.prisma.entityField.findMany({
      where: { entityId, deletedAt: null },
    });

    this.validateRecordData(recordData, fields);

    // Evaluate formula fields
    const dataWithFormulas = await this.evaluateFormulaFields(recordData, fields);

    this.assertAllowed(await this.predicate(entityId, 'create', userId), dataWithFormulas);
    await this.validateAutomation(entityId, dataWithFormulas, companyId);

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

    const createdRecord = {
      ...record,
      data: JSON.parse(record.data),
    };

    if (options.emitEvent !== false) this.eventEmitter.emit('record.created', new RecordCreatedEvent(entityId, createdRecord, userId));

    return createdRecord;
  }

  /**
   * Get a record by ID with company scoping
   */
  async getRecord(recordId: number, companyId: number, userId?: number, entityId?: number): Promise<any> {
    const record = await this.prisma.entityRecord.findUnique({
      where: { id: recordId },
    });

    if (!record || record.deletedAt || record.companyId !== companyId || (entityId !== undefined && record.entityId !== entityId)) {
      return null;
    }

    const data = JSON.parse(record.data);
    if (!(await this.predicate(record.entityId, 'read', userId))(data)) return null;

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
      userId?: number;
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

    const allowed = await this.predicate(entityId, 'read', options.userId);

    // Apply filters in-memory
    let filteredRecords = parsedRecords.filter(record => allowed(record.data));
    if (filters && filters.length > 0) {
      filteredRecords = filteredRecords.filter((record) => {
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
  async updateRecord(recordId: number, updates: Record<string, any>, companyId: number, userId?: number, entityId?: number, options: { emitEvent?: boolean } = {}): Promise<any> {
    // Get existing record
    const existing = await this.prisma.entityRecord.findUnique({
      where: { id: recordId },
    });

    if (!existing || existing.deletedAt || existing.companyId !== companyId || (entityId !== undefined && existing.entityId !== entityId)) {
      return null;
    }

    if (!this.transactionBound) {
      const committed = await this.prisma.$transaction(async tx => {
        const records = this.withTransaction(tx);
        const events = options.emitEvent !== false && await records.hasCascade(existing.entityId, 'update')
          ? await executeCascade(tx, records, existing.entityId, recordId, 'update', { companyId, userId }, updates)
          : [];
        const previous = await tx.entityRecord.findUnique({ where: { id: recordId } });
        const result = await records.updateRecord(recordId, updates, companyId, userId, entityId, { emitEvent: false });
        if (!result) throw new ConflictException('Cascade source disappeared');
        events.push(new RecordUpdatedEvent(existing.entityId, result, JSON.parse(previous.data), userId ?? previous.createdBy));
        if(options.emitEvent!==false)for(const event of events)await enqueueAutomationEvent(tx,'record.updated',event);
        return { result, events };
      });
      if (options.emitEvent !== false) this.publishCascade(committed.events);
      return committed.result;
    }

    // Parse existing data
    const existingData = JSON.parse(existing.data);
    const allowed = await this.predicate(existing.entityId, 'write', userId);
    this.assertAllowed(allowed, existingData);

    // Merge updates
    const mergedData = { ...existingData, ...updates };

    // Validate merged data
    const fields = await this.prisma.entityField.findMany({
      where: { entityId: existing.entityId, deletedAt: null },
    });

    this.validateRecordData(mergedData, fields);

    // Evaluate formula fields
    const dataWithFormulas = await this.evaluateFormulaFields(mergedData, fields);
    this.assertAllowed(allowed, dataWithFormulas);
    await this.validateAutomation(existing.entityId, dataWithFormulas, companyId, recordId);

    // Update record
    const write = await this.prisma.entityRecord.updateMany({
      where: { id: recordId, data: existing.data, companyId, entityId: existing.entityId, deletedAt: null },
      data: {
        data: JSON.stringify(dataWithFormulas),
      },
    }).catch(error => this.concurrentChange(error));
    if (write.count !== 1) throw new ConflictException('Record changed during authorization; retry the operation');
    const updated = await this.prisma.entityRecord.findUnique({ where: { id: recordId } });

    const updatedData = {
      ...updated,
      data: JSON.parse(updated.data),
    };

    if (options.emitEvent !== false) this.eventEmitter.emit(
      'record.updated',
      new RecordUpdatedEvent(existing.entityId, updatedData, existingData, userId ?? existing.createdBy),
    );

    return updatedData;
  }

  /**
   * Delete a record (soft or hard delete)
   */
  async deleteRecord(recordId: number, softDelete = true, companyId: number, actorId?: number, expectedEntityId?: number, options: { emitEvent?: boolean } = {}): Promise<boolean> {
    // Get existing record
    const existing = await this.prisma.entityRecord.findUnique({
      where: { id: recordId },
    });

    if (!existing || existing.deletedAt || existing.companyId !== companyId || (expectedEntityId !== undefined && existing.entityId !== expectedEntityId)) {
      return false;
    }

    if (!this.transactionBound && options.emitEvent !== false && (durableEvents() || await this.hasCascade(existing.entityId, 'delete'))) {
      const events = await this.prisma.$transaction(async tx => {
        const records = this.withTransaction(tx);
        const events = await executeCascade(tx, records, existing.entityId, recordId, 'delete', { companyId, userId: actorId });
        if (!await records.deleteRecord(recordId, softDelete, companyId, actorId, expectedEntityId, { emitEvent: false })) {
          throw new ConflictException('Cascade source disappeared');
        }
        events.push(new RecordDeletedEvent(existing.entityId, recordId, actorId, companyId));
        for(const event of events)await enqueueAutomationEvent(tx,'record.deleted',event);
        return events;
      });
      this.publishCascade(events);
      return true;
    }

    this.assertAllowed(await this.predicate(existing.entityId, 'unlink', actorId), JSON.parse(existing.data));
    const userId = actorId ?? existing.createdBy;
    const entityId = existing.entityId;

    if (softDelete) {
      // Soft delete
      const write = await this.prisma.entityRecord.updateMany({
        where: { id: recordId, data: existing.data, companyId, entityId, deletedAt: null },
        data: { deletedAt: new Date() },
      }).catch(error => this.concurrentChange(error));
      if (write.count !== 1) throw new ConflictException('Record changed during authorization; retry the operation');
    } else {
      // Hard delete
      const write = await this.prisma.entityRecord.deleteMany({
        where: { id: recordId, data: existing.data, companyId, entityId, deletedAt: null },
      }).catch(error => this.concurrentChange(error));
      if (write.count !== 1) throw new ConflictException('Record changed during authorization; retry the operation');
    }

    if (options.emitEvent !== false) this.eventEmitter.emit('record.deleted', new RecordDeletedEvent(entityId, recordId, userId, companyId));

    return true;
  }

  async bulkDeleteRecords(recordIds: number[], companyId: number, userId: number): Promise<any[]> {
    const ids = [...new Set(recordIds)];
    const cascadeEvents: Array<RecordUpdatedEvent | RecordDeletedEvent> = [];
    const records = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.entityRecord.findMany({ where: { id: { in: ids }, companyId, deletedAt: null } });
      if (rows.length !== ids.length) throw new NotFoundException('One or more records were not found');
      const predicates = new Map<number, (data: any) => boolean>();
      for (const row of rows) {
        if (!predicates.has(row.entityId)) predicates.set(row.entityId, await this.predicate(row.entityId, 'unlink', userId, tx));
        this.assertAllowed(predicates.get(row.entityId)!, JSON.parse(row.data));
      }
      const scoped = this.withTransaction(tx);
      for (const row of rows) {
        if (await scoped.hasCascade(row.entityId, 'delete')) {
          cascadeEvents.push(...await executeCascade(tx, scoped, row.entityId, row.id, 'delete', { companyId, userId }, {}, ids));
        }
      }
      const deletedAt = new Date();
      for (const row of rows) {
        const result = await tx.entityRecord.updateMany({ where: { id: row.id, data: row.data, entityId: row.entityId, companyId, deletedAt: null }, data: { deletedAt } });
        if (result.count !== 1) throw new ConflictException('Record changed during authorization; retry the operation');
      }
      for(const event of [...cascadeEvents,...rows.map(row=>new RecordDeletedEvent(row.entityId,row.id,userId,companyId))])await enqueueAutomationEvent(tx,'record.deleted',event);
      return rows.map(row => ({ ...row, deletedAt, data: JSON.parse(row.data) }));
    });
    this.publishCascade(cascadeEvents);
    if(!durableEvents())for (const record of records) this.eventEmitter.emit('record.deleted', new RecordDeletedEvent(record.entityId, record.id, userId, companyId));
    return records;
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
