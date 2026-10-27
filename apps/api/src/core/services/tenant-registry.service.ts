import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';
import { tenantMembership } from './tenant-membership';

@Injectable()
export class TenantRegistryService {
  constructor(private prisma: PrismaService) {}

  private async authorize(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user?.isActive || !user.role?.isActive || !['admin', 'super_admin'].includes(user.role.name)) {
      throw new ForbiddenException('Platform administrator required for tenant registry management');
    }
  }

  private id(value: string) {
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
      throw new BadRequestException('Tenant ID must be a positive numeric company ID');
    }
    return Number(value);
  }

  async membership(userId: number, actorId: number) {
    await this.authorize(actorId);
    this.id(String(userId));
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { metadata: true } });
    if (!user) throw new NotFoundException('User not found');
    return { userId, ...tenantMembership(user.metadata) };
  }

  async setMembership(userId: number, tenantId: string | null | undefined, actorId: number) {
    await this.authorize(actorId);
    this.id(String(userId));
    if (tenantId === undefined) throw new BadRequestException('Supply tenantId or explicit null to clear assignment');
    const companyId = tenantId === null ? null : this.id(tenantId);
    return this.prisma.$transaction(async tx => {
      // Serialize metadata changes without overwriting unrelated user attributes.
      const rows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT id FROM users WHERE id=${userId} FOR UPDATE`);
      if (!rows.length) throw new NotFoundException('User not found');
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      let metadata: Record<string, unknown>;
      try { metadata = user.metadata ? JSON.parse(user.metadata) : {}; }
      catch { throw new ConflictException('Repair invalid user metadata before changing membership'); }
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new ConflictException('Repair invalid user metadata before changing membership');
      if (companyId !== null) {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM tenant_registry WHERE id=${companyId} FOR UPDATE`);
        const tenant = await tx.tenantRegistry.findUnique({ where: { id: companyId } });
        if (!tenant?.active || tenant.deletedAt) throw new BadRequestException('Active registered tenant required');
      }
      await tx.user.update({ where: { id: userId }, data: { metadata: JSON.stringify({ ...metadata, company_id: companyId }) } });
      await tx.sessions.updateMany({ where: { user_id: userId, status: 'active' }, data: { status: 'revoked' } });
      return { userId, managed: true, companyId };
    });
  }

  private values(input: { name?: string; domain?: string; config?: Record<string, unknown>; active?: boolean }) {
    const result: { name?: string; domain?: string; config?: string; active?: boolean } = {};
    if (input.name !== undefined) {
      if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 200) throw new BadRequestException('Invalid tenant name');
      result.name = input.name.trim();
    }
    if (input.domain !== undefined) {
      if (typeof input.domain !== 'string') throw new BadRequestException('Invalid tenant domain');
      const domain = input.domain.trim().toLowerCase();
      if (domain.length > 253 || !domain.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new BadRequestException('Invalid tenant domain');
      result.domain = domain;
    }
    if (input.config !== undefined) {
      if (!input.config || typeof input.config !== 'object' || Array.isArray(input.config)) throw new BadRequestException('Tenant config must be an object');
      try { result.config = JSON.stringify(input.config); } catch { throw new BadRequestException('Invalid tenant config'); }
      if (Buffer.byteLength(result.config, 'utf8') > 60000) throw new BadRequestException('Tenant config exceeds 60000 bytes');
    }
    if (input.active !== undefined) {
      if (typeof input.active !== 'boolean') throw new BadRequestException('Invalid tenant status');
      result.active = input.active;
    }
    return result;
  }

  private view(row: any) { return { ...row, id: String(row.id), config: JSON.parse(row.config) }; }
  private rethrow(error: any): never {
    if (error.code === 'P2002') throw new ConflictException('Tenant company ID or domain already registered');
    throw error;
  }

  async list(userId: number) {
    await this.authorize(userId);
    return (await this.prisma.tenantRegistry.findMany({ orderBy: { id: 'asc' } })).map(row => this.view(row));
  }
  async find(id: string, userId: number) {
    await this.authorize(userId);
    const row = await this.prisma.tenantRegistry.findUnique({ where: { id: this.id(id) } });
    return row ? this.view(row) : null;
  }
  async create(input: { id: string; name: string; domain: string; config?: Record<string, unknown> }, userId: number) {
    await this.authorize(userId);
    const id = this.id(input.id), values = this.values(input);
    if (!values.name || !values.domain) throw new BadRequestException('Tenant name and domain are required');
    try {
      return this.view(await this.prisma.tenantRegistry.create({ data: { id, name: values.name, domain: values.domain, config: values.config ?? '{}' } }));
    } catch (error) { this.rethrow(error); }
  }
  async update(id: string, input: { name?: string; domain?: string; config?: Record<string, unknown>; active?: boolean }, userId: number) {
    await this.authorize(userId);
    const companyId = this.id(id), values = this.values(input);
    if (!Object.keys(values).length) throw new BadRequestException('No tenant changes supplied');
    try {
      return await this.prisma.$transaction(async tx => {
        const result = await tx.tenantRegistry.updateMany({ where: { id: companyId, deletedAt: null }, data: values });
        if (!result.count) throw new NotFoundException('Tenant not found or archived');
        return this.view(await tx.tenantRegistry.findUniqueOrThrow({ where: { id: companyId } }));
      });
    } catch (error) { this.rethrow(error); }
  }
  async archive(id: string, userId: number) {
    await this.authorize(userId);
    const result = await this.prisma.tenantRegistry.updateMany({ where: { id: this.id(id), deletedAt: null }, data: { active: false, deletedAt: new Date() } });
    if (!result.count) throw new NotFoundException('Tenant not found or archived');
    return true;
  }
}
