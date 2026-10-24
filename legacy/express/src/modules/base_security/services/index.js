/**
 * Base Security Services
 * Works with DrizzleAdapter API: findAll({where, order, limit, offset}), findById(id),
 * findOne(where), create(data), update(id, data), destroy(id)
 */

import crypto from 'crypto';
import { TotpService } from '../../../core/services/totp.service.js';

const totpService = new TotpService();

export class SecurityService {
  constructor(models) {
    this.models = models;
  }

  // ─── API Keys ─────────────────────────────────────────────

  async generateApiKey(name, userId, scopes = []) {
    const key = crypto.randomBytes(32).toString('hex');
    const prefix = 'lume_' + key.substring(0, 8);
    const fullKey = prefix + key.substring(8);

    const apiKey = await this.models.ApiKey.create({
      name,
      key: crypto.createHash('sha256').update(fullKey).digest('hex'),
      prefix,
      userId,
      scopes: JSON.stringify(scopes),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    return { ...apiKey, plainKey: fullKey };
  }

  async validateApiKey(keyString) {
    const hash = crypto.createHash('sha256').update(keyString).digest('hex');
    const apiKey = await this.models.ApiKey.findOne([['key', '=', hash], ['status', '=', 'active']]);

    if (!apiKey) return null;

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      await this.models.ApiKey.update(apiKey.id, { status: 'expired' });
      return null;
    }

    await this.models.ApiKey.update(apiKey.id, { lastUsedAt: new Date() });
    return apiKey;
  }

  async getApiKeys(userId) {
    const result = await this.models.ApiKey.findAll({
      where: userId ? [['userId', '=', userId]] : [],
      order: [['createdAt', 'DESC']],
      limit: 100,
      offset: 0,
    });
    return result.rows;
  }

  async revokeApiKey(id) {
    return this.models.ApiKey.update(id, { status: 'inactive' });
  }

  // ─── IP Access ────────────────────────────────────────────

  async checkIpAccess(ipAddress) {
    const blacklistResult = await this.models.IpAccess.findAll({
      where: [['type', '=', 'blacklist'], ['status', '=', 'active']],
      limit: 1000,
      offset: 0,
    });

    const blocked = blacklistResult.rows.find(entry => {
      if (entry.ipAddress.includes('*')) {
        const pattern = entry.ipAddress.replace(/\./g, '\\.').replace(/\*/g, '\\d+');
        return new RegExp(`^${pattern}$`).test(ipAddress);
      }
      return entry.ipAddress === ipAddress;
    });

    if (blocked) return { allowed: false, reason: 'blacklisted' };

    const whitelistResult = await this.models.IpAccess.findAll({
      where: [['type', '=', 'whitelist'], ['status', '=', 'active']],
      limit: 1000,
      offset: 0,
    });

    if (whitelistResult.rows.length === 0) return { allowed: true };

    const allowed = whitelistResult.rows.find(entry => {
      if (entry.ipAddress.includes('*')) {
        const pattern = entry.ipAddress.replace(/\./g, '\\.').replace(/\*/g, '\\d+');
        return new RegExp(`^${pattern}$`).test(ipAddress);
      }
      return entry.ipAddress === ipAddress;
    });

    return { allowed: !!allowed, reason: allowed ? 'whitelisted' : 'not_whitelisted' };
  }

  async getIpAccessRules() {
    const result = await this.models.IpAccess.findAll({
      where: [],
      order: [['type', 'ASC']],
      limit: 1000,
      offset: 0,
    });
    return result.rows;
  }

  // ─── Security Logs ────────────────────────────────────────

  async logSecurityEvent(userId, event, details = {}, status = 'success', ipAddress = null, userAgent = null) {
    return this.models.SecurityLog.create({
      userId,
      event,
      ipAddress,
      userAgent,
      details: JSON.stringify(details),
      status,
    });
  }

  async getSecurityLogs(filters = {}) {
    const where = [];
    if (filters.userId) where.push(['userId', '=', Number(filters.userId)]);
    if (filters.event) where.push(['event', '=', filters.event]);
    if (filters.status) where.push(['status', '=', filters.status]);

    const result = await this.models.SecurityLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Number(filters.limit) || 100,
      offset: 0,
    });
    return result.rows;
  }

  // ─── Two-Factor Authentication ────────────────────────────

  async setup2FA(userId, email) {
    const existing = await this.models.TwoFactor.findOne([['userId', '=', userId]]);
    if (existing && existing.enabled) {
      return { error: '2FA is already enabled for this account' };
    }

    const { secret, otpauthUrl, qrCode } = await totpService.generateSecret(email);
    const backupCodes = totpService.generateBackupCodes(10);

    if (existing) {
      await this.models.TwoFactor.update(existing.id, {
        secret,
        backupCodes: JSON.stringify(backupCodes),
        enabled: false,
        verifiedAt: null,
      });
    } else {
      await this.models.TwoFactor.create({
        userId,
        secret,
        backupCodes: JSON.stringify(backupCodes),
        enabled: false,
      });
    }

    return { qrCode, otpauthUrl, backupCodes };
  }

  async verify2FA(userId, token) {
    const record = await this.models.TwoFactor.findOne([['userId', '=', userId]]);
    if (!record) {
      return { error: '2FA has not been set up' };
    }

    const valid = totpService.verifyToken(record.secret, token);
    if (!valid) {
      return { error: 'Invalid verification code' };
    }

    await this.models.TwoFactor.update(record.id, {
      enabled: true,
      verifiedAt: new Date(),
    });

    await this.logSecurityEvent(userId, '2fa_enabled', {}, 'success');

    return { success: true, message: '2FA has been enabled' };
  }

  async disable2FA(userId, token) {
    const record = await this.models.TwoFactor.findOne([['userId', '=', userId]]);
    if (!record || !record.enabled) {
      return { error: '2FA is not enabled' };
    }

    const valid = totpService.verifyToken(record.secret, token);
    if (!valid) {
      return { error: 'Invalid verification code' };
    }

    await this.models.TwoFactor.update(record.id, {
      enabled: false,
      verifiedAt: null,
    });

    await this.logSecurityEvent(userId, '2fa_disabled', {}, 'success');

    return { success: true, message: '2FA has been disabled' };
  }

  async verify2FALogin(userId, token) {
    const record = await this.models.TwoFactor.findOne([['userId', '=', userId]]);
    if (!record || !record.enabled) {
      return { required: false };
    }

    // Try TOTP token first
    if (totpService.verifyToken(record.secret, token)) {
      return { valid: true };
    }

    // Try backup code
    const storedCodes = typeof record.backupCodes === 'string'
      ? JSON.parse(record.backupCodes)
      : (record.backupCodes || []);

    const { valid, remainingCodes } = totpService.verifyBackupCode(storedCodes, token);
    if (valid) {
      await this.models.TwoFactor.update(record.id, {
        backupCodes: JSON.stringify(remainingCodes),
      });
      return { valid: true, usedBackupCode: true };
    }

    return { valid: false, error: 'Invalid 2FA code' };
  }

  async is2FAEnabled(userId) {
    const record = await this.models.TwoFactor.findOne([['userId', '=', userId]]);
    return record?.enabled || false;
  }

  async getBackupCodes(userId) {
    const record = await this.models.TwoFactor.findOne([['userId', '=', userId]]);
    if (!record || !record.enabled) {
      return { error: '2FA is not enabled' };
    }
    const codes = typeof record.backupCodes === 'string'
      ? JSON.parse(record.backupCodes)
      : (record.backupCodes || []);
    return { backupCodes: codes };
  }

  async regenerateBackupCodes(userId, token) {
    const record = await this.models.TwoFactor.findOne([['userId', '=', userId]]);
    if (!record || !record.enabled) {
      return { error: '2FA is not enabled' };
    }

    const valid = totpService.verifyToken(record.secret, token);
    if (!valid) {
      return { error: 'Invalid verification code' };
    }

    const backupCodes = totpService.generateBackupCodes(10);
    await this.models.TwoFactor.update(record.id, {
      backupCodes: JSON.stringify(backupCodes),
    });

    await this.logSecurityEvent(userId, '2fa_backup_codes_regenerated', {}, 'success');

    return { backupCodes };
  }

  // ─── Sessions ─────────────────────────────────────────────

  async createSession(userId, token, ipAddress, userAgent) {
    return this.models.Session.create({
      userId,
      token,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      lastActivityAt: new Date(),
      status: 'active',
    });
  }

  async getActiveSessions(userId) {
    const result = await this.models.Session.findAll({
      where: [['userId', '=', userId], ['status', '=', 'active']],
      order: [['lastActivityAt', 'DESC']],
      limit: 100,
      offset: 0,
    });
    return result.rows;
  }

  async terminateSession(sessionId) {
    return this.models.Session.update(sessionId, { status: 'revoked' });
  }

  async terminateAllOtherSessions(userId, currentToken) {
    const sessions = await this.getActiveSessions(userId);
    let terminated = 0;
    for (const session of sessions) {
      if (session.token !== currentToken) {
        await this.models.Session.update(session.id, { status: 'revoked' });
        terminated++;
      }
    }
    return { terminated };
  }

  async updateSessionActivity(token) {
    const session = await this.models.Session.findOne([['token', '=', token], ['status', '=', 'active']]);
    if (session) {
      await this.models.Session.update(session.id, { lastActivityAt: new Date() });
    }
    return session;
  }

  async cleanupExpiredSessions() {
    const result = await this.models.Session.findAll({
      where: [['status', '=', 'active']],
      limit: 10000,
      offset: 0,
    });
    let cleaned = 0;
    for (const session of result.rows) {
      if (new Date(session.expiresAt) < new Date()) {
        await this.models.Session.update(session.id, { status: 'expired' });
        cleaned++;
      }
    }
    return { cleaned };
  }
}

export default { SecurityService };
