import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { Prisma } from '@prisma/client';

export interface ValidationError { field?: string; message: string; ruleName?: string }
export interface ValidationContext { companyId: number; recordId?: number }

@Injectable()
export class ValidationRuleEngineService {
  constructor(private prisma: PrismaService) {}

  /** Validate a candidate. Callers must reject errors before persisting it.
   * Set transactional only when this service is bound to an open transaction
   * that will also persist the candidate. Standalone calls remain preflight checks.
   */
  async validate(modelName: string, data: Record<string, any>, context?: ValidationContext, transactional = false): Promise<ValidationError[]> {
    if (!modelName || !this.object(data)) throw new BadRequestException('Invalid validation input');
    // Database failures propagate: failure to load rules must never mean success.
    const rules = await this.prisma.automation_validation_rules.findMany({
      where: { model: modelName, status: 'active' },
    });
    rules.sort((a,b) => (a.priority ?? 10) - (b.priority ?? 10) || a.id - b.id);
    const errors: ValidationError[] = [];
    for (const rule of rules) {
      let config: Record<string, any>;
      try {
        config = rule.config == null ? {} : JSON.parse(rule.config);
        if (!this.object(config)) throw new Error('Configuration must be an object');
        this.validateConfig(rule.rule_type, rule.field, config, modelName);
      } catch {
        errors.push({ field: rule.field ?? undefined, ruleName: rule.name, message: 'Invalid validation rule configuration' });
        continue;
      }
      const field = rule.field;
      const value = field && Object.prototype.hasOwnProperty.call(data,field) ? data[field] : undefined;
      const empty = value === undefined || value === null || value === '';
      let valid = true;
      switch (rule.rule_type) {
        case 'required': valid = !empty; break;
        case 'format': valid = empty || (typeof value === 'string' && this.format(value, config.format ?? 'email')); break;
        case 'range':
          if (!empty) {
            const number = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '') ? Number(value) : NaN;
            valid = Number.isFinite(number) && (config.min === undefined || number >= config.min) && (config.max === undefined || number <= config.max);
          }
          break;
        case 'regex': valid = empty || (typeof value === 'string' && new RegExp(config.pattern).test(value)); break;
        case 'custom': valid = this.matches(config.condition,data); break;
        case 'unique':
          if (transactional) {
            await this.prisma.$queryRaw(Prisma.sql`SELECT id FROM automation_validation_rules WHERE id = ${rule.id} FOR UPDATE`);
          }
          // Require scope even for an empty value, so a missing tenant cannot silently pass.
          await this.uniqueContext(modelName,context);
          if (!empty) {
            if (!['string','number','boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value))) valid = false;
            else valid = !await this.duplicate(modelName,field,value,context!,transactional);
          }
          break;
      }
      if (!valid) errors.push({ field: field ?? undefined, ruleName: rule.name, message: rule.error_message || (field ? field + ' failed ' + rule.rule_type + ' validation' : 'Custom validation failed') });
    }
    return errors;
  }

  private object(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private validateConfig(type: string, field: string, config: Record<string, any>, model: string) {
    if (!['required','format','range','unique','regex','custom'].includes(type)) throw new Error('Unknown rule');
    if (type !== 'custom' && (!field || ['__proto__','constructor','prototype'].includes(field))) throw new Error('Invalid field');
    if (type === 'format' && !['email','url','phone','date','datetime','uuid'].includes(config.format ?? 'email')) throw new Error('Unknown format');
    if (type === 'range') {
      if (config.min === undefined && config.max === undefined) throw new Error('Missing bounds');
      for (const bound of [config.min,config.max]) if (bound !== undefined && (typeof bound !== 'number' || !Number.isFinite(bound))) throw new Error('Invalid bound');
      if (config.min !== undefined && config.max !== undefined && config.min > config.max) throw new Error('Reversed bounds');
    }
    if (type === 'regex') {
      if (typeof config.pattern !== 'string' || !config.pattern) throw new Error('Missing pattern');
      new RegExp(config.pattern);
    }
    if (type === 'unique' && config.model !== undefined && config.model !== model) throw new Error('Unique model must match rule model');
    if (type === 'custom') {
      if (!this.object(config.condition) || !Object.keys(config.condition).length) throw new Error('Missing condition');
      for (const [key,value] of Object.entries(config.condition)) {
        if (!key || ['__proto__','constructor','prototype'].includes(key)) throw new Error('Invalid field');
        if (value !== null && typeof value === 'object') {
          if (!this.object(value) || !Object.keys(value).length) throw new Error('Invalid condition');
          for (const [op,operand] of Object.entries(value)) {
            if (!['$eq','$ne','$gt','$gte','$lt','$lte','$in','$nin'].includes(op)) throw new Error('Unknown operator');
            if (op === '$in' || op === '$nin') {
              if (!Array.isArray(operand) || operand.some(v=>v !== null && typeof v === 'object')) throw new Error('Invalid membership');
            } else if (operand !== null && typeof operand === 'object') throw new Error('Invalid operand');
          }
        }
      }
    }
  }

  private async uniqueContext(modelName: string, context?: ValidationContext) {
    if (!context || !Number.isSafeInteger(context.companyId) || context.companyId < 1 ||
        (context.recordId !== undefined && (!Number.isSafeInteger(context.recordId) || context.recordId < 1))) {
      throw new BadRequestException('Uniqueness validation requires a valid tenant and optional record ID');
    }
    const entity = await this.prisma.entity.findFirst({where:{name:modelName,deletedAt:null}});
    if (!entity) throw new BadRequestException('Validation entity not found');
    if (context.recordId !== undefined && !await this.prisma.entityRecord.findFirst({
      where: {id:context.recordId,entityId:entity.id,companyId:context.companyId,deletedAt:null},
    })) throw new BadRequestException('Validation record not found in tenant and entity');
  }

  private async duplicate(model: string, field: string, value: any, context: ValidationContext, transactional: boolean) {
    // Locking reads see the latest committed rows, even when an outer transaction
    // already established a REPEATABLE READ snapshot before waiting for the rule.
    const rows = transactional ? await this.prisma.$queryRaw<Array<{ data: string }>>(Prisma.sql`
      SELECT r.data FROM entity_records r JOIN entities e ON e.id = r.entity_id
      WHERE e.name = ${model} AND e.deleted_at IS NULL AND r.company_id = ${context.companyId}
        AND r.deleted_at IS NULL
        ${context.recordId === undefined ? Prisma.empty : Prisma.sql`AND r.id <> ${context.recordId}`}
      ORDER BY r.id FOR UPDATE
    `) : await this.prisma.entityRecord.findMany({where:{
      entity:{name:model,deletedAt:null},companyId:context.companyId,deletedAt:null,
      ...(context.recordId === undefined ? {} : {id:{not:context.recordId}}),
    },select:{data:true}});
    return rows.some(row => {
      const data = JSON.parse(row.data);
      return Object.prototype.hasOwnProperty.call(data,field) && data[field] === value;
    });
  }

  private format(value: string, format: string): boolean {
    switch (format) {
      case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url': try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) && !!url.hostname; } catch { return false; }
      case 'phone': return /^\+?[\d\s\-().]{7,20}$/.test(value) && (value.match(/\d/g)?.length ?? 0) >= 7;
      case 'date': {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(value);
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
      }
      case 'datetime': return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && this.format(value.slice(0,10),'date') && Number.isFinite(Date.parse(value));
      case 'uuid': return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      default: return false;
    }
  }

  private matches(condition: Record<string, any>, data: Record<string, any>) {
    for (const [field,expected] of Object.entries(condition)) {
      if (!Object.prototype.hasOwnProperty.call(data,field)) return false;
      const actual = data[field];
      if (!this.object(expected)) { if (actual !== expected) return false; continue; }
      for (const [op,value] of Object.entries(expected)) {
        switch (op) {
          case '$eq': if (actual !== value) return false; break;
          case '$ne': if (actual === value) return false; break;
          case '$gt': if (!(actual > value)) return false; break;
          case '$gte': if (!(actual >= value)) return false; break;
          case '$lt': if (!(actual < value)) return false; break;
          case '$lte': if (!(actual <= value)) return false; break;
          case '$in': if (!value.includes(actual)) return false; break;
          case '$nin': if (value.includes(actual)) return false; break;
        }
      }
    }
    return true;
  }
}
