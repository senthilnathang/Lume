import { Injectable } from '@nestjs/common';

/**
 * Context for evaluating feature flags
 */
export interface FeatureFlagContext {
  userId?: number;
  roleId?: number;
  companyId?: number;
  ipAddress?: string;
  currentDate?: Date;
  customAttributes?: Record<string, any>;
}

/**
 * Feature flag rule for targeting
 */
export interface FeatureFlagRule {
  type:
    | 'user_id'
    | 'role_id'
    | 'company_id'
    | 'ip_range'
    | 'date_range'
    | 'percentage'
    | 'custom_attribute';
  value: any;
  condition?: string;
}

/**
 * Feature flag object from database
 */
export interface FeatureFlag {
  id: number;
  name: string;
  key: string;
  enabled: boolean;
  enabledFor?: FeatureFlagRule[];
  disabledFor?: FeatureFlagRule[];
  expiresAt?: Date;
  config?: Record<string, any>;
}

@Injectable()
export class FeatureFlagEvaluatorService {
  /**
   * Evaluate whether a feature flag is enabled for a given context
   */
  evaluate(flag: FeatureFlag, context: FeatureFlagContext): boolean {
    // Check if flag is expired
    if (flag.expiresAt && new Date() > new Date(flag.expiresAt)) {
      return false;
    }

    const now = context.currentDate || new Date();

    // Check disabledFor rules first (they override enabled status)
    if (flag.disabledFor && flag.disabledFor.length > 0) {
      for (const rule of flag.disabledFor) {
        if (this.matchesRule(rule, context)) {
          return false;
        }
      }
    }

    // If globally disabled, check enabledFor exceptions
    if (!flag.enabled) {
      if (flag.enabledFor && flag.enabledFor.length > 0) {
        for (const rule of flag.enabledFor) {
          if (this.matchesRule(rule, context)) {
            return true;
          }
        }
      }
      return false;
    }

    // If globally enabled, flag is enabled (unless disabledFor matched above)
    return true;
  }

  /**
   * Check if a context matches a specific rule
   */
  private matchesRule(rule: FeatureFlagRule, context: FeatureFlagContext): boolean {
    switch (rule.type) {
      case 'user_id':
        return context.userId === rule.value;

      case 'role_id':
        return context.roleId === rule.value;

      case 'company_id':
        return context.companyId === rule.value;

      case 'ip_range':
        return this.isIpInRange(context.ipAddress, rule.value);

      case 'date_range':
        return this.isInDateRange(context.currentDate || new Date(), rule.value);

      case 'percentage':
        return this.matchesPercentage(context.userId, rule.value);

      case 'custom_attribute':
        return this.matchesCustomAttribute(
          context.customAttributes,
          rule.condition,
          rule.value,
        );

      default:
        return false;
    }
  }

  /**
   * Check if IP address is within a range (CIDR notation or exact match)
   */
  private isIpInRange(ip: string | undefined, range: string): boolean {
    if (!ip) return false;

    // Simple implementation: exact match or CIDR range support
    if (ip === range) return true;

    // Basic CIDR check (simplified)
    if (range.includes('/')) {
      const [rangeIp, cidr] = range.split('/');
      const cidrNum = parseInt(cidr);
      return this.isIpInCIDR(ip, rangeIp, cidrNum);
    }

    return false;
  }

  /**
   * Check if IP is in CIDR range
   */
  private isIpInCIDR(ip: string, cidrIp: string, cidrNum: number): boolean {
    // Simplified CIDR check - in production, use a library like 'ip-address'
    const ipParts = ip.split('.').map((p) => parseInt(p));
    const cidrParts = cidrIp.split('.').map((p) => parseInt(p));

    if (ipParts.length !== cidrParts.length) return false;

    const bitsToCheck = cidrNum;
    let bitOffset = 0;

    for (let i = 0; i < ipParts.length; i++) {
      const mask = (0xff << (8 - Math.min(8, bitsToCheck - bitOffset))) & 0xff;
      if ((ipParts[i] & mask) !== (cidrParts[i] & mask)) {
        return false;
      }
      bitOffset += 8;
    }

    return true;
  }

  /**
   * Check if current date is within a date range
   */
  private isInDateRange(
    currentDate: Date,
    range: { start?: string; end?: string },
  ): boolean {
    if (range.start && new Date(range.start) > currentDate) {
      return false;
    }

    if (range.end && new Date(range.end) < currentDate) {
      return false;
    }

    return true;
  }

  /**
   * Check if user ID matches a percentage-based rollout
   */
  private matchesPercentage(userId: number | undefined, percentage: number): boolean {
    if (!userId) return false;

    // Hash-based percentage assignment: consistent across requests for same user
    const hash = this.simpleHash(userId.toString());
    return (hash % 100) < percentage;
  }

  /**
   * Simple hash function for percentage-based rollout
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if custom attribute matches a condition
   */
  private matchesCustomAttribute(
    attributes: Record<string, any> | undefined,
    condition: string | undefined,
    value: any,
  ): boolean {
    if (!attributes || !condition) return false;

    const [attrName, operator] = condition.split('=');

    if (operator === '=') {
      return attributes[attrName] === value;
    } else if (operator === 'in') {
      return Array.isArray(value) && value.includes(attributes[attrName]);
    } else if (operator === 'contains') {
      return (
        typeof attributes[attrName] === 'string' &&
        attributes[attrName].includes(value)
      );
    }

    return false;
  }
}
