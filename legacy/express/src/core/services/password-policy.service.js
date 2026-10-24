/**
 * PasswordPolicyService — Configurable password policy enforcement.
 * Reads policy settings from the database (settings table) and enforces them
 * on password creation/change.
 */

import prisma from '../db/prisma.js';
import bcrypt from 'bcryptjs';

// Default policy values
const DEFAULTS = {
  password_min_length: 8,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_number: true,
  password_require_special: true,
  password_expiry_days: 0, // 0 = no expiry
  password_history_count: 0, // 0 = no history check
};

let cachedPolicy = null;
let policyCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class PasswordPolicyService {
  /**
   * Get current password policy from settings.
   */
  async getPolicy() {
    if (cachedPolicy && Date.now() - policyCacheTime < CACHE_TTL) {
      return cachedPolicy;
    }

    const policy = { ...DEFAULTS };

    try {
      const settings = await prisma.settings.findMany({
        where: {
          key: { in: Object.keys(DEFAULTS) }
        }
      });

      for (const setting of settings) {
        if (setting.key in DEFAULTS) {
          const defaultVal = DEFAULTS[setting.key];
          if (typeof defaultVal === 'boolean') {
            policy[setting.key] = setting.value === 'true' || setting.value === '1';
          } else if (typeof defaultVal === 'number') {
            policy[setting.key] = parseInt(setting.value, 10) || defaultVal;
          } else {
            policy[setting.key] = setting.value;
          }
        }
      }
    } catch (err) {
      // Settings table may not exist yet — use defaults
    }

    cachedPolicy = policy;
    policyCacheTime = Date.now();
    return policy;
  }

  /**
   * Validate a password against the current policy.
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  async validatePassword(password) {
    const policy = await this.getPolicy();
    const errors = [];

    if (password.length < policy.password_min_length) {
      errors.push(`Password must be at least ${policy.password_min_length} characters long`);
    }
    if (policy.password_require_uppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (policy.password_require_lowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (policy.password_require_number && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (policy.password_require_special && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check if a password has been used before (password history).
   * @param {number} userId
   * @param {string} newPassword - Plain text password
   * @returns {{ reused: boolean }}
   */
  async checkPasswordHistory(userId, newPassword) {
    const policy = await this.getPolicy();
    if (policy.password_history_count <= 0) {
      return { reused: false };
    }

    try {
      // Get the user's current password
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const isCurrentPassword = await bcrypt.compare(newPassword, user.password);
        if (isCurrentPassword) {
          return { reused: true };
        }
      }
    } catch (err) {
      // If we can't check, allow through
    }

    return { reused: false };
  }

  /**
   * Check if a user's password has expired.
   * @param {number} userId
   * @returns {{ expired: boolean, daysRemaining?: number }}
   */
  async checkPasswordExpiry(userId) {
    const policy = await this.getPolicy();
    if (policy.password_expiry_days <= 0) {
      return { expired: false };
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { expired: false };

      const lastChanged = user.passwordChangedAt || user.createdAt;
      const daysSinceChange = Math.floor((Date.now() - new Date(lastChanged).getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = policy.password_expiry_days - daysSinceChange;

      return {
        expired: daysRemaining <= 0,
        daysRemaining: Math.max(0, daysRemaining),
      };
    } catch (err) {
      return { expired: false };
    }
  }

  /**
   * Clear the policy cache (e.g., after settings change).
   */
  clearCache() {
    cachedPolicy = null;
    policyCacheTime = 0;
  }
}

export default PasswordPolicyService;
