import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';

@Injectable()
export class SecurityService {
  private permissionCache = new Map<string, boolean>();
  private recordRuleCache = new Map<string, any>();

  constructor(private prisma: PrismaService) {}

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
  async checkRecordRules(modelName: string, action: string, record: any, context: any = {}): Promise<boolean> {
    const rules = await this.prisma.recordRule.findMany({
      where: {
        modelName,
        action,
        isActive: true,
      },
      orderBy: { sequence: 'asc' },
    });

    for (const rule of rules) {
      const domain = typeof rule.domain === 'string' ? JSON.parse(rule.domain || '{}') : rule.domain || {};
      const matches = this.evaluateDomain(domain, record);
      if (!matches) {
        throw new Error(`Access denied by record rule: ${rule.name}`);
      }
    }

    return true;
  }

  /**
   * Get domain filter from record rules
   */
  async getRecordRuleDomain(modelName: string, action: string, context: any = {}): Promise<Record<string, any>> {
    const rules = await this.prisma.recordRule.findMany({
      where: {
        modelName,
        action,
        isActive: true,
      },
    });

    if (rules.length === 0) return {};

    const domains = rules.map((r) => (typeof r.domain === 'string' ? JSON.parse(r.domain || '{}') : r.domain || {}));
    return this.combineDomains(domains);
  }

  /**
   * Evaluate a domain against a record
   */
  private evaluateDomain(domain: Record<string, any>, record: any): boolean {
    if (!domain || Object.keys(domain).length === 0) return true;

    for (const [field, condition] of Object.entries(domain)) {
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
    return domains.reduce((combined, domain) => ({ ...combined, ...domain }), {});
  }

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.permissionCache.clear();
    this.recordRuleCache.clear();
  }
}
