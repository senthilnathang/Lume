import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { assertActorCompany } from './tenant-membership';

/** Unregistered legacy companies remain compatible until ownership reconciliation. */
export async function tenantAllowsAccess(prisma: Pick<PrismaService, 'tenantRegistry'>, companyId?: number | null): Promise<boolean> {
  if (companyId == null) return true;
  if (!Number.isSafeInteger(companyId) || companyId < 1 || companyId > 2147483647) return false;
  const tenant = await prisma.tenantRegistry.findUnique({ where: { id: companyId }, select: { active: true, deletedAt: true } });
  return !tenant || (tenant.active && tenant.deletedAt === null);
}

export async function assertTenantAccess(prisma: Pick<PrismaService, 'tenantRegistry'>, companyId?: number | null): Promise<void> {
  if (!await tenantAllowsAccess(prisma, companyId)) throw new ForbiddenException('Tenant unavailable');
}

export async function assertTenantActorAccess(prisma: Pick<PrismaService, 'tenantRegistry' | 'user'>, companyId?: number | null, userId?: number): Promise<void> {
  await assertTenantAccess(prisma, companyId);
  if (companyId == null || userId == null) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user?.isActive || !user.role?.isActive) throw new ForbiddenException('Active workflow actor required');
  assertActorCompany(user, companyId);
}
