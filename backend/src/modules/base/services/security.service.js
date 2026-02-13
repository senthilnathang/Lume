/**
 * Security Service
 * Handles permissions, record rules, and access control
 */

export class SecurityService {
  constructor(models) {
    this.models = models;
    this.permissionCache = new Map();
    this.recordRuleCache = new Map();
  }
  
  /**
   * Check if user has a specific permission
   */
  async checkPermission(userId, permissionName) {
    // Get user with roles and groups
    const user = await this.models.User.findByPk(userId, {
      include: [
        { model: this.models.Role },
        { model: this.models.Group }
      ]
    });
    
    if (!user) return false;
    
    // Check if user is admin
    if (user.isAdmin) return true;
    
    // Collect all permission names
    const userPermissions = new Set();
    
    // Get permissions from roles
    for (const role of user.Roles || []) {
      const permissions = await role.getPermissions();
      permissions.forEach(p => userPermissions.add(p.name));
    }
    
    // Get permissions from groups
    for (const group of user.Groups || []) {
      const permissions = await group.getPermissions();
      permissions.forEach(p => userPermissions.add(p.name));
    }
    
    return userPermissions.has(permissionName);
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
    const user = await this.models.User.findByPk(userId, {
      include: [
        { model: this.models.Role },
        { model: this.models.Group }
      ]
    });
    
    if (!user) return [];
    
    const permissions = new Set();
    
    for (const role of user.Roles || []) {
      const perms = await role.getPermissions();
      perms.forEach(p => permissions.add(p.name));
    }
    
    for (const group of user.Groups || []) {
      const perms = await group.getPermissions();
      perms.forEach(p => permissions.add(p.name));
    }
    
    return Array.from(permissions);
  }
  
  /**
   * Check record rules for an action
   */
  async checkRecordRules(modelName, action, record, context = {}) {
    const rules = await this.models.RecordRule.getRulesForUser(
      modelName,
      action,
      context.userId,
      context.groupIds || []
    );
    
    for (const rule of rules) {
      const matches = this.evaluateDomain(rule.domain, record);
      
      if (!matches) {
        throw new Error(`Access denied by record rule: ${rule.name}`);
      }
    }
    
    return true;
  }
  
  /**
   * Get domain filter from record rules
   */
  async getRecordRuleDomain(modelName, action, context = {}) {
    const rules = await this.models.RecordRule.getRulesForUser(
      modelName,
      action,
      context.userId,
      context.groupIds || []
    );
    
    if (rules.length === 0) {
      return {};
    }
    
    // Combine all rule domains with AND
    const domains = rules.map(r => r.domain);
    return this.combineDomains(domains);
  }
  
  /**
   * Evaluate a domain against a record
   */
  evaluateDomain(domain, record) {
    if (!domain || Object.keys(domain).length === 0) {
      return true;
    }
    
    for (const [field, condition] of Object.entries(domain)) {
      const value = record[field];
      
      if (typeof condition === 'object') {
        // Complex condition like { age: { gt: 18 } }
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
              if (!operand.includes(value)) return false;
              break;
            case 'nin':
              if (operand.includes(value)) return false;
              break;
            default:
              return false;
          }
        }
      } else {
        // Simple equality
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
    
    // Simple AND combination
    return domains.reduce((combined, domain) => ({
      ...combined,
      ...domain
    }), {});
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
