import { switchCompany } from '~/server/services/auth.service';
import { createAuditLog } from '~/server/services/audit.service';

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event);
  const body = await readBody(event);
  const { company_id } = body;

  if (!company_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Company ID is required',
    });
  }

  const result = await switchCompany(authUser.id, company_id);

  await createAuditLog({
    userId: authUser.id,
    action: 'company_switch',
    entityType: 'company',
    entityId: company_id,
    ipAddress: event.context.clientIp,
    requestId: event.context.requestId,
  });

  return {
    success: true,
    data: result,
  };
});
