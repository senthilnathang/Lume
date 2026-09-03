/**
 * Security Service
 * Handles permissions, record rules, and access control using Prisma
 */

import prisma from '../../../core/db/prisma.js';

const EFFECTIVE_PERMISSIONS_TTL_MS = 60 * 1000;

export class SecurityService {
  constructor(models, db = prisma) {
    this.models = models;
    this.db = db;
    this.permissionCache = new Map();
    this.recordRuleCache = new Map();
  }

  async getDirectGrants(userId) {
    try {
      const row = await this.db.setting.findFirst({ where: { key: `permsets.user.${userId}` } });
      const raw = row?.value;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : [];
    } catch {
      return [];
    }
  }

  async getEffectivePermissions(userId) {
    const cached = this.permissionCache.get(userId);
    if (cached && Date.now() - cached.at < EFFECTIVE_PERMISSIONS_TTL_MS) {
      return cached.permissions;
    }
    const permissions = await this.computeEffectivePermissions(userId);
    this.permissionCache.set(userId, { permissions, at: Date.now() });
    return permissions;
  }

  async computeEffectivePermissions(userId) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) return [];

    const role = await this.db.role.findUnique({ where: { id: user.role_id } });
    if (!role) return [];
    if (role.name === 'admin' || role.name === 'super_admin') {
      const allPerms = await this.db.permission.findMany({ where: { isActive: true } });
      return allPerms.map((p) => p.name);
    }
    if (!role.isActive) return [];

    const rolePermissions = await this.db.rolePermission.findMany({
      where: { roleId: role.id },
      include: { permission: { select: { name: true } } },
    });
    const merged = new Set(rolePermissions.map((rp) => rp.permission.name));
    for (const grant of await this.getDirectGrants(userId)) {
      merged.add(grant);
    }
    return [...merged];
  }

  /**
   * Check if user has a specific permission
   */
  async checkPermission(userId, permissionName) {
    const permissions = await this.getEffectivePermissions(userId);
    return permissions.includes(permissionName);
  }

  /**
   * Check if user has any of the permissions
   */
  async checkAnyPermission(userId, permissionNames) {
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
  async checkAllPermissions(userId, permissionNames) {
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
  async getUserPermissions(userId) {
    return this.getEffectivePermissions(userId);
  }

  /**
   * Check record rules for an action
   */
  async checkRecordRules(modelName, action, record, _context = {}) {
    const rules = await prisma.recordRule.findMany({
      where: {
        modelName,
        action,
        isActive: true,
      },
      orderBy: { sequence: 'asc' },
    });

    for (const rule of rules) {
      const domain = typeof rule.domain === 'string' ? JSON.parse(rule.domain || '{}') : (rule.domain || {});
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
  async getRecordRuleDomain(modelName, action, _context = {}) {
    const rules = await prisma.recordRule.findMany({
      where: {
        modelName,
        action,
        isActive: true,
      },
    });

    if (rules.length === 0) return {};

    const domains = rules.map(r => typeof r.domain === 'string' ? JSON.parse(r.domain || '{}') : (r.domain || {}));
    return this.combineDomains(domains);
  }

  /**
   * Evaluate a domain against a record
   */
  evaluateDomain(domain, record) {
    if (!domain || Object.keys(domain).length === 0) return true;

    for (const [field, condition] of Object.entries(domain)) {
      const value = record[field];

      if (typeof condition === 'object' && condition !== null) {
        for (const [op, operand] of Object.entries(condition)) {
          switch (op) {
            case 'eq': if (value !== operand) return false; break;
            case 'ne': if (value === operand) return false; break;
            case 'gt': if (!(value > operand)) return false; break;
            case 'gte': if (!(value >= operand)) return false; break;
            case 'lt': if (!(value < operand)) return false; break;
            case 'lte': if (!(value <= operand)) return false; break;
            case 'in': if (!operand.includes(value)) return false; break;
            case 'nin': if (operand.includes(value)) return false; break;
            default: return false;
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
  combineDomains(domains) {
    if (domains.length === 0) return {};
    if (domains.length === 1) return domains[0];
    return domains.reduce((combined, domain) => ({ ...combined, ...domain }), {});
  }

  /**
   * Clear permission cache
   */
  clearCache() {
    this.permissionCache.clear();
    this.recordRuleCache.clear();
  }
}

export default SecurityService;
