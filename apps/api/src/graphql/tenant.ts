import { ForbiddenException } from '@nestjs/common';

/** Delivery-time status check; contexts without the real authorization hook deny events. */
export async function tenantEventAllowed(context: { canReceiveTenantEvent?: (id: number | null | undefined) => Promise<boolean> }, companyId?: number | null): Promise<boolean> {
  return context?.canReceiveTenantEvent ? context.canReceiveTenantEvent(companyId) : false;
}

/** Header overrides are restricted to administrators; ordinary users stay in their signed tenant. */
export function resolveTenant(req: any): number | null {
  const claim = req?.user?.company_id;
  const raw = req?.headers?.['x-org-id'];
  const parse = (value: unknown) => {
    if (typeof value !== 'number' && (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))) throw new ForbiddenException('Invalid Company ID');
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new ForbiddenException('Invalid Company ID');
    return id;
  };
  const signed = claim == null ? null : parse(claim);
  if (raw == null) return signed;
  const requested = parse(raw);
  if (!['admin', 'super_admin'].includes(req?.user?.role_name) && requested !== signed) {
    throw new ForbiddenException('Company ID is not authorized for this user');
  }
  return requested;
}
