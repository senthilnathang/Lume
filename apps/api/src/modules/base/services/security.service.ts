import type { record_rules_action } from '@prisma/client';
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';

export interface RecordRuleContext {
  userId?: number;
  roleId?: number;
  roleIds?: number[];
}

@Injectable()
export class SecurityService {
  private permissionCache = new Map<string, boolean>();
  private recordRuleCache = new Map<string, any>();

  constructor(private prisma: PrismaService) {}

  private parseRecordAction(action: string): record_rules_action {
    switch (action) {
      case 'create': case 'read': case 'write': case 'unlink': return action;
      case 'update': return 'write';
      case 'delete': return 'unlink';
      default: throw new BadRequestException(`Unsupported record action: ${action}`);
    }
  }

  /**
   * Check if user has a specific permission
   */
  async checkPermission(userId: number, permissionName: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    // Look up role by FK
    const role = await this.prisma.role.findUnique({ where: { id: user.role_id } });
    if (!role) return false;
    if (role.name === 'admin' || role.name === 'super_admin') return true;
    if (!role.isActive) return false;

    const hasPermission = await this.prisma.rolePermission.findFirst({
      where: {
        roleId: role.id,
        permission: { name: permissionName },
      },
    });

    return !!hasPermission;
  }

  /**
   * Check if user has any of the permissions
   */
  async checkAnyPermission(userId: number, permissionNames: string[]): Promise<boolean> {
    for (const permission of permissionNames) {
      if (await this.checkPermission(userId, permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all permissions
   */
  async checkAllPermissions(userId: number, permissionNames: string[]): Promise<boolean> {
    for (const permission of permissionNames) {
      if (!(await this.checkPermission(userId, permission))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];

    // Look up role by FK
    const role = await this.prisma.role.findUnique({ where: { id: user.role_id } });
    if (!role) return [];
    if (role.name === 'admin' || role.name === 'super_admin') {
      const allPerms = await this.prisma.permission.findMany({ where: { isActive: true } });
      return allPerms.map((p) => p.name);
    }
    if (!role.isActive) return [];

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: role.id },
      include: { permission: { select: { name: true } } },
    });

    return rolePermissions.map((rp) => rp.permission.name);
  }

  /**
   * Check record rules for an action
   */
  async checkRecordRules(modelName: string, action: string, record: any, context: RecordRuleContext = {}): Promise<boolean> {
    const domain = await this.getRecordRuleDomain(modelName, action, context);
    if (!this.evaluateDomain(domain, record)) {
      throw new ForbiddenException('Access denied by record rule');
    }

    return true;
  }

  /**
   * Get domain filter from record rules
   */
  async recordPredicate(modelNames: string[], action: string, context: RecordRuleContext = {}) {
    const domains = await Promise.all([...new Set(modelNames)].map(model => this.getRecordRuleDomain(model, action, context)));
    return (record: Record<string, any>) => domains.every(domain => this.evaluateDomain(domain, record));
  }

  async getRecordRuleDomain(modelName: string, action: string, context: RecordRuleContext = {}): Promise<Record<string, any>> {
    const rules = await this.prisma.recordRule.findMany({
      where: {
        modelName,
        action: this.parseRecordAction(action),
        isActive: true,
      },
      orderBy: [{ sequence: 'asc' }, { id: 'asc' }],
    });

    if (rules.length === 0) return {};

    const domains = rules.filter(rule => this.applies(rule, context)).map(rule => this.parseDomain(rule.domain));
    return this.combineDomains(domains);
  }

  private scope(value: string | null | undefined): number[] {
    if (value == null) return [];
    try {
      const ids = JSON.parse(value);
      if (!Array.isArray(ids) || ids.some(id => !Number.isSafeInteger(id) || id < 1)) throw new Error();
      return ids;
    } catch { throw new ForbiddenException('Invalid record-rule scope'); }
  }

  private applies(rule: { groups?: string; users?: string }, context: RecordRuleContext): boolean {
    const roles = this.scope(rule.groups);
    const users = this.scope(rule.users);
    if (!roles.length && !users.length) return true;
    if (!Number.isSafeInteger(context.userId) || context.userId < 1) throw new ForbiddenException('User identity required for scoped record rules');
    const actorRoles = context.roleIds ?? (context.roleId === undefined ? [] : [context.roleId]);
    if (roles.length && (!actorRoles.length || actorRoles.some(id => !Number.isSafeInteger(id) || id < 1))) {
      throw new ForbiddenException('Role identity required for scoped record rules');
    }
    return users.includes(context.userId) || roles.some(id => actorRoles.includes(id));
  }

  private parseDomain(value: string): Record<string, any> {
    try {
      const domain = JSON.parse(value);
      if (!domain || typeof domain !== 'object' || Array.isArray(domain)) throw new Error();
      for (const [field, condition] of Object.entries(domain)) {
        if (!field || ['__proto__', 'constructor', 'prototype', '$and'].includes(field) || Array.isArray(condition)) throw new Error();
        if (condition !== null && typeof condition === 'object') {
          if (!Object.keys(condition).length) throw new Error();
          for (const [op, operand] of Object.entries(condition)) {
            if (!['eq','ne','gt','gte','lt','lte','in','nin'].includes(op)) throw new Error();
            if (['in','nin'].includes(op)) {
              if (!Array.isArray(operand) || operand.some(item => item !== null && typeof item === 'object')) throw new Error();
            } else if (operand !== null && typeof operand === 'object') throw new Error();
          }
        }
      }
      return domain;
    } catch { throw new ForbiddenException('Invalid record-rule domain'); }
  }

  /**
   * Evaluate a domain against a record
   */
  private evaluateDomain(domain: Record<string, any>, record: any): boolean {
    if (!domain || Object.keys(domain).length === 0) return true;
    if (domain.$and) return domain.$and.every((child: Record<string, any>) => this.evaluateDomain(child, record));
    if (!record || typeof record !== 'object') return false;

    for (const [field, condition] of Object.entries(domain)) {
      if (!Object.prototype.hasOwnProperty.call(record, field)) return false;
      const value = record[field];

      if (typeof condition === 'object' && condition !== null) {
        for (const [op, operand] of Object.entries(condition)) {
          switch (op) {
            case 'eq':
              if (value !== operand) return false;
              break;
            case 'ne':
              if (value === operand) return false;
              break;
            case 'gt':
              if (!(value > operand)) return false;
              break;
            case 'gte':
              if (!(value >= operand)) return false;
              break;
            case 'lt':
              if (!(value < operand)) return false;
              break;
            case 'lte':
              if (!(value <= operand)) return false;
              break;
            case 'in':
              if (!(operand as any[]).includes(value)) return false;
              break;
            case 'nin':
              if ((operand as any[]).includes(value)) return false;
              break;
            default:
              return false;
          }
        }
      } else {
        if (value !== condition) return false;
      }
    }

    return true;
  }

  /**
   * Combine multiple domains
   */
  private combineDomains(domains: Record<string, any>[]): Record<string, any> {
    if (domains.length === 0) return {};
    if (domains.length === 1) return domains[0];
    // Preserve every condition, including multiple constraints on the same field.
    return { $and: domains };
  }

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.permissionCache.clear();
    this.recordRuleCache.clear();
  }
}
