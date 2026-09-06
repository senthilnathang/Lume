import crypto from 'crypto';

export class GdprService {
  constructor(prisma, auditLog = null) {
    if (!prisma) {
      throw new Error('GdprService requires a Prisma client instance');
    }
    this.prisma = prisma;
    this.auditLog = auditLog;
  }

  async collectUserData(userId, companyId = null) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return null;
    }
    const recordWhere = { createdBy: userId };
    if (companyId !== null && companyId !== undefined) {
      recordWhere.companyId = companyId;
    }
    const records = await this.prisma.entityRecord.findMany({ where: recordWhere });
    const byEntity = {};
    for (const record of records || []) {
      byEntity[record.entityId] = (byEntity[record.entityId] || 0) + 1;
    }
    const { password: _password, refresh_token: _refreshToken, password_reset_token: _resetToken, ...safeUser } = user;
    return { user: safeUser, recordCounts: byEntity, totalRecords: (records || []).length };
  }

  async eraseUserData(userId, options = {}) {
    const { companyId = null, actorId = null } = options;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return null;
    }
    const recordWhere = { createdBy: userId };
    if (companyId !== null && companyId !== undefined) {
      recordWhere.companyId = companyId;
    }
    const deletedRecords = await this.prisma.entityRecord.deleteMany({ where: recordWhere });
    const stamp = Date.now();
    const scrubbed = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: 'Erased',
        lastName: `User-${userId}`,
        email: `erased-${userId}-${stamp}@invalid.local`,
        phone: null,
        avatar: null,
        password: `erased:${crypto.randomBytes(32).toString('hex')}`,
        refresh_token: null,
        password_reset_token: null,
        password_reset_expires: null,
        isActive: false,
      },
    });
    const proof = {
      userId,
      recordsDeleted: deletedRecords.count || 0,
      erasedAt: new Date().toISOString(),
      actorId,
    };
    if (this.auditLog) {
      try {
        await this.auditLog.log({
          action: 'delete',
          model: 'User',
          recordId: String(userId),
          newValues: JSON.stringify(proof),
          userId: actorId,
        });
      } catch {
        /* audit proof is best-effort */
      }
    }
    return { ...proof, email: scrubbed.email };
  }
}

export default GdprService;
