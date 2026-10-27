import { ForbiddenException } from '@nestjs/common';

/** Absence remains legacy-compatible; explicit null is a managed unassignment. */
export function tenantMembership(metadata?: string | null): { managed: boolean; companyId: number | null } {
  let value: any;
  try { value = metadata ? JSON.parse(metadata) : {}; } catch { throw new ForbiddenException('Invalid user tenant metadata'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ForbiddenException('Invalid user tenant metadata');
  if (!Object.prototype.hasOwnProperty.call(value, 'company_id')) return { managed: false, companyId: null };
  if (value.company_id === null) return { managed: true, companyId: null };
  if (!['number', 'string'].includes(typeof value.company_id) || !/^[1-9]\d*$/.test(String(value.company_id)) || Number(value.company_id) > 2147483647) throw new ForbiddenException('Invalid user tenant assignment');
  return { managed: true, companyId: Number(value.company_id) };
}

export function tenantClaimMatches(metadata: string | null | undefined, claim?: number | null): boolean {
  const membership = tenantMembership(metadata);
  return !membership.managed || membership.companyId === (claim ?? null);
}

export function assertActorCompany(user: { metadata?: string | null; role?: { name: string } }, companyId?: number | null) {
  const membership = tenantMembership(user.metadata);
  if (!['admin', 'super_admin'].includes(user.role?.name) && membership.managed && membership.companyId !== (companyId ?? null)) {
    throw new ForbiddenException('Tenant membership changed');
  }
}
