import { Role } from '~/server/models/index';
import { auditCrudOperation } from '~/server/services/audit.service';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'role.create');
  const body = await readBody(event);

  if (!body.name || !body.codename) {
    throw createError({ statusCode: 400, statusMessage: 'Name and codename are required' });
  }

  const role = await Role.create({
    ...body,
    company_id: body.company_id || authUser.current_company_id,
    created_by: authUser.id,
  } as any);

  await auditCrudOperation({
    userId: authUser.id, companyId: authUser.current_company_id,
    action: 'create', entityType: 'role', entityId: role.id, entityName: body.name,
    newValues: body, ipAddress: event.context.clientIp, requestId: event.context.requestId,
  });

  return successResponse(role, 'Role created successfully');
});
