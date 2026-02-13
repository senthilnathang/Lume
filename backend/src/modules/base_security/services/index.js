/**
 * Base Security Services
 */

import crypto from 'crypto';

export class SecurityService {
  constructor(models) {
    this.models = models;
  }

  async generateApiKey(name, userId, scopes = []) {
    const key = crypto.randomBytes(32).toString('hex');
    const prefix = 'gws_' + key.substring(0, 8);
    const fullKey = prefix + key.substring(8);
    
    const apiKey = await this.models.ApiKey.create({
      name,
      key: crypto.createHash('sha256').update(fullKey).digest('hex'),
      prefix,
      userId,
      scopes,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });

    return { ...apiKey.toJSON(), key: fullKey };
  }

  async validateApiKey(key) {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const apiKey = await this.models.ApiKey.findOne({
      where: { key: hash, status: 'active' }
    });
    
    if (!apiKey) return null;
    
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      await apiKey.update({ status: 'expired' });
      return null;
    }

    await apiKey.update({ lastUsedAt: new Date() });
    return apiKey;
  }

  async getApiKeys(userId) {
    return this.models.ApiKey.findAll({
      where: { userId },
      attributes: ['id', 'name', 'prefix', 'expiresAt', 'lastUsedAt', 'status', 'scopes', 'createdAt']
    });
  }

  async revokeApiKey(id) {
    const apiKey = await this.models.ApiKey.findByPk(id);
    if (apiKey) {
      await apiKey.update({ status: 'inactive' });
    }
    return apiKey;
  }

  async checkIpAccess(ipAddress) {
    const blacklist = await this.models.IpAccess.findAll({
      where: { type: 'blacklist', status: 'active' }
    });
    
    const blocked = blacklist.find(entry => {
      if (entry.ipAddress.includes('*')) {
        const pattern = entry.ipAddress.replace(/\*/g, '\\d+');
        return new RegExp(`^${pattern}$`).test(ipAddress);
      }
      return entry.ipAddress === ipAddress;
    });
    
    if (blocked) return { allowed: false, reason: 'blacklisted' };

    const whitelist = await this.models.IpAccess.findAll({
      where: { type: 'whitelist', status: 'active' }
    });

    if (whitelist.length === 0) return { allowed: true };

    const allowed = whitelist.find(entry => {
      if (entry.ipAddress.includes('*')) {
        const pattern = entry.ipAddress.replace(/\*/g, '\\d+');
        return new RegExp(`^${pattern}$`).test(ipAddress);
      }
      return entry.ipAddress === ipAddress;
    });

    return { allowed: !!allowed, reason: allowed ? 'whitelisted' : 'not_whitelisted' };
  }

  async logSecurityEvent(userId, event, details = {}, status = 'success', ipAddress = null) {
    return this.models.SecurityLog.create({
      userId,
      event,
      ipAddress,
      details,
      status
    });
  }

  async getSecurityLogs(filters = {}) {
    const where = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.event) where.event = filters.event;
    if (filters.status) where.status = filters.status;

    return this.models.SecurityLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: filters.limit || 100
    });
  }
}

export default { SecurityService };
