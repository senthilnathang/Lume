import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { TotpService } from '@core/services/totp.service';
import crypto from 'crypto';
import {
  apiKeys,
  sessions,
  ipAccess,
  twoFactor,
  securityLogs,
} from '../schema/base-security.schema';
import { eq, and } from 'drizzle-orm';

interface ApiKey {
  id?: number;
  name: string;
  key?: string;
  prefix?: string;
  userId: number;
  expiresAt?: Date;
  lastUsedAt?: Date;
  status?: string;
  scopes?: string | string[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface Session {
  id?: number;
  userId: number;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  lastActivityAt?: Date;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface IpAccessRule {
  id?: number;
  ipAddress: string;
  description?: string;
  type: 'whitelist' | 'blacklist';
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface TwoFactorRecord {
  id?: number;
  userId: number;
  secret: string;
  backupCodes: string | string[];
  enabled: boolean;
  verifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface SecurityLog {
  id?: number;
  userId?: number;
  event: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string | Record<string, any>;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

@Injectable()
export class BaseSecurityService {
  private totpService: TotpService;

  constructor(private drizzle: DrizzleService) {
    this.totpService = new TotpService();
  }

  private async getDb() {
    return this.drizzle.getDrizzle();
  }

  // ─── API Keys ─────────────────────────────────────────────

  async generateApiKey(
    name: string,
    userId: number,
    scopes: string[] = [],
  ): Promise<ApiKey & { plainKey: string }> {
    const db = await this.getDrizzle();
    const key = crypto.randomBytes(32).toString('hex');
    const prefix = 'lume_' + key.substring(0, 8);
    const fullKey = prefix + key.substring(8);
    const hashedKey = crypto
      .createHash('sha256')
      .update(fullKey)
      .digest('hex');

    const result = await db
      .insert(apiKeys)
      .values({
        name,
        key: hashedKey,
        prefix,
        userId,
        scopes: JSON.stringify(scopes),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      ...result[0],
      plainKey: fullKey,
    };
  }

  async validateApiKey(keyString: string): Promise<ApiKey | null> {
    const db = await this.getDrizzle();
    const hash = crypto
      .createHash('sha256')
      .update(keyString)
      .digest('hex');

    const result = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.key, hash), eq(apiKeys.status, 'active')))
      .limit(1);

    if (!result || result.length === 0) return null;

    const apiKey = result[0];

    if (
      apiKey.expiresAt &&
      new Date(apiKey.expiresAt) < new Date()
    ) {
      await db
        .update(apiKeys)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(apiKeys.id, apiKey.id));
      return null;
    }

    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date(), updatedAt: new Date() })
      .where(eq(apiKeys.id, apiKey.id));

    return apiKey;
  }

  async getApiKeys(userId: number): Promise<ApiKey[]> {
    const db = await this.getDrizzle();
    return db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(apiKeys.createdAt)
      .limit(100);
  }

  async revokeApiKey(id: number): Promise<ApiKey> {
    const db = await this.getDrizzle();
    const result = await db
      .update(apiKeys)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();

    if (!result || result.length === 0) {
      throw new NotFoundException(`API Key #${id} not found`);
    }

    return result[0];
  }

  // ─── IP Access ────────────────────────────────────────────

  async checkIpAccess(
    ipAddress: string,
  ): Promise<{ allowed: boolean; reason: string }> {
    const db = await this.getDrizzle();

    const blacklistRules = await db
      .select()
      .from(ipAccess)
      .where(
        and(
          eq(ipAccess.type, 'blacklist'),
          eq(ipAccess.status, 'active'),
        ),
      )
      .limit(1000);

    const blocked = blacklistRules.find((entry) => {
      if (entry.ipAddress.includes('*')) {
        const pattern = entry.ipAddress
          .replace(/\./g, '\\.')
          .replace(/\*/g, '\\d+');
        return new RegExp(`^${pattern}$`).test(ipAddress);
      }
      return entry.ipAddress === ipAddress;
    });

    if (blocked) return { allowed: false, reason: 'blacklisted' };

    const whitelistRules = await db
      .select()
      .from(ipAccess)
      .where(
        and(
          eq(ipAccess.type, 'whitelist'),
          eq(ipAccess.status, 'active'),
        ),
      )
      .limit(1000);

    if (whitelistRules.length === 0) return { allowed: true, reason: 'no_whitelist' };

    const allowed = whitelistRules.find((entry) => {
      if (entry.ipAddress.includes('*')) {
        const pattern = entry.ipAddress
          .replace(/\./g, '\\.')
          .replace(/\*/g, '\\d+');
        return new RegExp(`^${pattern}$`).test(ipAddress);
      }
      return entry.ipAddress === ipAddress;
    });

    return {
      allowed: !!allowed,
      reason: allowed ? 'whitelisted' : 'not_whitelisted',
    };
  }

  async getIpAccessRules(): Promise<IpAccessRule[]> {
    const db = await this.getDrizzle();
    return db.select().from(ipAccess).limit(1000);
  }

  async createIpAccessRule(
    ipAddress: string,
    type: 'whitelist' | 'blacklist',
    description?: string,
  ): Promise<IpAccessRule> {
    const db = await this.getDrizzle();
    const result = await db
      .insert(ipAccess)
      .values({
        ipAddress,
        type,
        description,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  async updateIpAccessRule(
    id: number,
    data: Partial<IpAccessRule>,
  ): Promise<IpAccessRule> {
    const db = await this.getDrizzle();
    const result = await db
      .update(ipAccess)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ipAccess.id, id))
      .returning();

    if (!result || result.length === 0) {
      throw new NotFoundException(`IP Access Rule #${id} not found`);
    }

    return result[0];
  }

  async deleteIpAccessRule(id: number): Promise<void> {
    const db = await this.getDrizzle();
    const result = await db
      .delete(ipAccess)
      .where(eq(ipAccess.id, id))
      .returning();

    if (!result || result.length === 0) {
      throw new NotFoundException(`IP Access Rule #${id} not found`);
    }
  }

  // ─── Security Logs ────────────────────────────────────────

  async logSecurityEvent(
    userId: number | null,
    event: string,
    details: Record<string, any> = {},
    status: 'success' | 'failure' = 'success',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SecurityLog> {
    const db = await this.getDrizzle();
    const result = await db
      .insert(securityLogs)
      .values({
        userId,
        event,
        ipAddress,
        userAgent,
        details: JSON.stringify(details),
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  async getSecurityLogs(filters: {
    userId?: number;
    event?: string;
    status?: 'success' | 'failure';
    limit?: number;
  } = {}): Promise<SecurityLog[]> {
    const db = await this.getDrizzle();
    const conditions: any[] = [];

    if (filters.userId) {
      conditions.push(eq(securityLogs.userId, filters.userId));
    }
    if (filters.event) {
      conditions.push(eq(securityLogs.event, filters.event));
    }
    if (filters.status) {
      conditions.push(eq(securityLogs.status, filters.status));
    }

    const query = db.select().from(securityLogs);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return query
      .orderBy(securityLogs.createdAt)
      .limit(filters.limit || 100);
  }

  // ─── Two-Factor Authentication ────────────────────────────

  async setup2FA(
    userId: number,
    email: string,
  ): Promise<{
    qrCode: string;
    otpauthUrl: string;
    backupCodes: string[];
  }> {
    const db = await this.getDrizzle();

    const existing = await db
      .select()
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1);

    if (existing.length > 0 && existing[0].enabled) {
      throw new BadRequestException(
        '2FA is already enabled for this account',
      );
    }

    const { secret, otpauthUrl, qrCode } =
      await this.totpService.generateSecret(email);
    const backupCodes = this.totpService.generateBackupCodes(10);

    if (existing.length > 0) {
      await db
        .update(twoFactor)
        .set({
          secret,
          backupCodes: JSON.stringify(backupCodes),
          enabled: false,
          verifiedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(twoFactor.id, existing[0].id));
    } else {
      await db.insert(twoFactor).values({
        userId,
        secret,
        backupCodes: JSON.stringify(backupCodes),
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return { qrCode, otpauthUrl, backupCodes };
  }

  async verify2FA(userId: number, token: string): Promise<void> {
    const db = await this.getDrizzle();

    const record = await db
      .select()
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1);

    if (!record || record.length === 0) {
      throw new BadRequestException('2FA has not been set up');
    }

    const tfRecord = record[0];
    const valid = this.totpService.verifyToken(tfRecord.secret, token);

    if (!valid) {
      throw new BadRequestException('Invalid verification code');
    }

    await db
      .update(twoFactor)
      .set({
        enabled: true,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(twoFactor.id, tfRecord.id));

    await this.logSecurityEvent(userId, '2fa_enabled', {}, 'success');
  }

  async disable2FA(userId: number, token: string): Promise<void> {
    const db = await this.getDrizzle();

    const record = await db
      .select()
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1);

    if (!record || record.length === 0 || !record[0].enabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const tfRecord = record[0];
    const valid = this.totpService.verifyToken(tfRecord.secret, token);

    if (!valid) {
      throw new BadRequestException('Invalid verification code');
    }

    await db
      .update(twoFactor)
      .set({
        enabled: false,
        verifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(twoFactor.id, tfRecord.id));

    await this.logSecurityEvent(userId, '2fa_disabled', {}, 'success');
  }

  async verify2FALogin(
    userId: number,
    token: string,
  ): Promise<{ valid: boolean; usedBackupCode?: boolean }> {
    const db = await this.getDrizzle();

    const record = await db
      .select()
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1);

    if (!record || record.length === 0 || !record[0].enabled) {
      return { valid: false };
    }

    const tfRecord = record[0];

    if (this.totpService.verifyToken(tfRecord.secret, token)) {
      return { valid: true };
    }

    const storedCodes =
      typeof tfRecord.backupCodes === 'string'
        ? JSON.parse(tfRecord.backupCodes)
        : tfRecord.backupCodes || [];

    const { valid, remainingCodes } =
      this.totpService.verifyBackupCode(storedCodes, token);

    if (valid) {
      await db
        .update(twoFactor)
        .set({
          backupCodes: JSON.stringify(remainingCodes),
          updatedAt: new Date(),
        })
        .where(eq(twoFactor.id, tfRecord.id));

      return { valid: true, usedBackupCode: true };
    }

    return { valid: false };
  }

  async is2FAEnabled(userId: number): Promise<boolean> {
    const db = await this.getDrizzle();

    const record = await db
      .select()
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1);

    return record.length > 0 && record[0].enabled;
  }

  async getBackupCodes(userId: number): Promise<string[]> {
    const db = await this.getDrizzle();

    const record = await db
      .select()
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1);

    if (!record || record.length === 0 || !record[0].enabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const codes =
      typeof record[0].backupCodes === 'string'
        ? JSON.parse(record[0].backupCodes)
        : record[0].backupCodes || [];

    return codes;
  }

  async regenerateBackupCodes(
    userId: number,
    token: string,
  ): Promise<string[]> {
    const db = await this.getDrizzle();

    const record = await db
      .select()
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1);

    if (!record || record.length === 0 || !record[0].enabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const tfRecord = record[0];
    const valid = this.totpService.verifyToken(tfRecord.secret, token);

    if (!valid) {
      throw new BadRequestException('Invalid verification code');
    }

    const backupCodes = this.totpService.generateBackupCodes(10);

    await db
      .update(twoFactor)
      .set({
        backupCodes: JSON.stringify(backupCodes),
        updatedAt: new Date(),
      })
      .where(eq(twoFactor.id, tfRecord.id));

    await this.logSecurityEvent(
      userId,
      '2fa_backup_codes_regenerated',
      {},
      'success',
    );

    return backupCodes;
  }

  // ─── Sessions ─────────────────────────────────────────────

  async createSession(
    userId: number,
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Session> {
    const db = await this.getDrizzle();

    const result = await db
      .insert(sessions)
      .values({
        userId,
        token,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastActivityAt: new Date(),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  async getActiveSessions(userId: number): Promise<Session[]> {
    const db = await this.getDrizzle();

    return db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.status, 'active'),
        ),
      )
      .orderBy(sessions.lastActivityAt)
      .limit(100);
  }

  async terminateSession(sessionId: number): Promise<Session> {
    const db = await this.getDrizzle();

    const result = await db
      .update(sessions)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(eq(sessions.id, sessionId))
      .returning();

    if (!result || result.length === 0) {
      throw new NotFoundException(`Session #${sessionId} not found`);
    }

    return result[0];
  }

  async terminateAllOtherSessions(
    userId: number,
    currentToken: string,
  ): Promise<{ terminated: number }> {
    const db = await this.getDrizzle();

    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId));

    let terminated = 0;

    for (const session of userSessions) {
      if (session.token !== currentToken) {
        await db
          .update(sessions)
          .set({ status: 'revoked', updatedAt: new Date() })
          .where(eq(sessions.id, session.id));
        terminated++;
      }
    }

    return { terminated };
  }

  async updateSessionActivity(token: string): Promise<Session | null> {
    const db = await this.getDrizzle();

    const session = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.token, token),
          eq(sessions.status, 'active'),
        ),
      )
      .limit(1);

    if (session.length === 0) return null;

    const result = await db
      .update(sessions)
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(sessions.id, session[0].id))
      .returning();

    return result[0] || null;
  }

  async cleanupExpiredSessions(): Promise<{ cleaned: number }> {
    const db = await this.getDrizzle();

    const allSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, 'active'))
      .limit(10000);

    let cleaned = 0;

    for (const session of allSessions) {
      if (new Date(session.expiresAt) < new Date()) {
        await db
          .update(sessions)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(sessions.id, session.id));
        cleaned++;
      }
    }

    return { cleaned };
  }
}
