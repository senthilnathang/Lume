import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, record_rules_action } from '@prisma/client';
import { PrismaService } from '@core/services/prisma.service';

interface Changes { name?: string; action?: string; domain?: string; groups?: string; users?: string; isActive?: boolean; sequence?: number }

@Injectable()
export class RecordRuleManagementService {
  constructor(private readonly prisma: PrismaService) {}

  private id(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestException('Rule IDs must be positive integers');
  }

  private json(value: string, label: string) {
    try { return JSON.parse(value); } catch { throw new BadRequestException(`${label} must be valid JSON`); }
  }

  private validate(input: Changes) {
    if (input.name !== undefined && (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 200)) throw new BadRequestException('Name must contain 1 to 200 characters');
    const action = input.action === 'delete' ? 'unlink' : input.action;
    if (action !== undefined && !Object.values(record_rules_action).includes(action as record_rules_action)) throw new BadRequestException('Invalid rule action');
    if (input.isActive !== undefined && typeof input.isActive !== 'boolean') throw new BadRequestException('isActive must be a boolean');
    if (input.sequence !== undefined && (!Number.isInteger(input.sequence) || input.sequence < 0 || input.sequence > 2147483647)) throw new BadRequestException('Sequence must be a nonnegative 32-bit integer');
    if (input.domain !== undefined) {
      const domain = this.json(input.domain, 'Domain');
      if (!domain || typeof domain !== 'object' || Array.isArray(domain)) throw new BadRequestException('Domain must be a JSON object');
      for (const [field, condition] of Object.entries(domain)) {
        if (!field || ['__proto__', 'constructor', 'prototype', '$and'].includes(field)) throw new BadRequestException('Invalid domain field');
        if (Array.isArray(condition)) throw new BadRequestException('Domain arrays require an in or nin operator');
        if (condition !== null && typeof condition === 'object') {
          if (!Object.keys(condition).length) throw new BadRequestException('Domain condition must not be empty');
          for (const [op, operand] of Object.entries(condition)) {
            if (!['eq','ne','gt','gte','lt','lte','in','nin'].includes(op)) throw new BadRequestException('Unsupported domain operator');
            if (['in','nin'].includes(op)) {
              if (!Array.isArray(operand) || operand.some(value => value !== null && typeof value === 'object')) throw new BadRequestException('in and nin require arrays of scalar values');
            } else if (operand !== null && typeof operand === 'object') throw new BadRequestException('Comparison operands must be scalar values');
          }
        }
      }
    }
    for (const key of ['groups', 'users'] as const) {
      if (input[key] != null) {
        const ids = this.json(input[key], key);
        if (!Array.isArray(ids) || ids.some(id => !Number.isSafeInteger(id) || id < 1)) throw new BadRequestException(`${key} must be a JSON array of positive IDs`);
      }
    }
    return { ...input, name: input.name?.trim(), action: action as record_rules_action | undefined };
  }

  private audit(tx: Prisma.TransactionClient, event: string, actor: number, details: object) {
    return tx.security_logs.create({ data: { user_id: actor, event, details: JSON.stringify(details) } });
  }

  list(modelName: string | undefined, page: number, limit: number) {
    return this.prisma.recordRule.findMany({ where: modelName == null ? {} : { modelName },
      orderBy: [{ sequence: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit });
  }

  get(id: number) {
    this.id(id);
    return this.prisma.recordRule.findUnique({ where: { id } });
  }

  async create(input: Changes & { name: string; action: string; domain: string; modelName: string }, actor: number) {
    const { modelName, ...changes } = input;
    if (typeof modelName !== 'string' || !modelName.trim() || modelName.trim().length > 100) throw new BadRequestException('Invalid model name');
    const model = modelName.trim();
    const data = this.validate(changes);
    return this.prisma.$transaction(async tx => {
      const knownModel = Prisma.dmmf.datamodel.models.some(entry => entry.name === model || entry.dbName === model);
      if (!knownModel && !await tx.entity.findFirst({ where: { name: model, deletedAt: null }, select: { id: true } })) throw new NotFoundException('Model not found');
      const max = data.sequence === undefined ? await tx.recordRule.aggregate({ where: { modelName: model }, _max: { sequence: true } }) : null;
      const sequence = data.sequence ?? (max?._max.sequence ?? 0) + 10;
      if (sequence > 2147483647) throw new BadRequestException('Sequence exceeds supported range');
      const now = new Date();
      const rule = await tx.recordRule.create({ data: { ...data, name: data.name!, action: data.action!, domain: input.domain,
        modelName: model, sequence, isActive: true, createdAt: now, updatedAt: now } });
      await this.audit(tx, 'record_rule.created', actor, { ruleId: rule.id });
      return rule;
    });
  }

  async update(id: number, input: Changes, actor: number) {
    this.id(id);
    const data = this.validate(input);
    return this.prisma.$transaction(async tx => {
      if (!await tx.recordRule.findUnique({ where: { id } })) throw new NotFoundException('Rule not found');
      const rule = await tx.recordRule.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
      await this.audit(tx, 'record_rule.updated', actor, { ruleId: id });
      return rule;
    });
  }

  async delete(id: number, actor: number) {
    this.id(id);
    return this.prisma.$transaction(async tx => {
      const rule = await tx.recordRule.findUnique({ where: { id } });
      if (!rule) throw new NotFoundException('Rule not found');
      if (rule.isActive === false) return false;
      await tx.recordRule.update({ where: { id }, data: { isActive: false, updatedAt: new Date() } });
      await this.audit(tx, 'record_rule.deleted', actor, { ruleId: id });
      return true;
    });
  }

  async reorder(ids: number[], actor: number) {
    ids.forEach(id => this.id(id));
    if (ids.length > 1000 || new Set(ids).size !== ids.length) throw new BadRequestException('Provide at most 1000 distinct rule IDs');
    if (!ids.length) return [];
    return this.prisma.$transaction(async tx => {
      const rows = await tx.recordRule.findMany({ where: { id: { in: ids } } });
      if (rows.length !== ids.length) throw new NotFoundException('Rule not found');
      const result = [];
      for (const [index, id] of ids.entries()) result.push(await tx.recordRule.update({ where: { id }, data: { sequence: (index + 1) * 10, updatedAt: new Date() } }));
      await this.audit(tx, 'record_rule.reordered', actor, { ruleIds: ids });
      return result;
    });
  }
}
