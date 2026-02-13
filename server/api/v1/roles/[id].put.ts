import { Role } from '~/server/models/index';
import { auditCrudOperation } from '~/server/services/audit.service';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'role.update');

  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid role ID' });

  const role = await Role.findByPk(id);
  if (!role) throw createError({ statusCode: 404, statusMessage: 'Role not found' });

  const oldValues = role.toJSON();
  const body = await readBody(event);
  await role.update({ ...body, updated_by: authUser.id });

  await auditCrudOperation({
    userId: authUser.id, companyId: authUser.current_company_id,
    action: 'update', entityType: 'role', entityId: id, entityName: role.name,
    oldValues, newValues: body, ipAddress: event.context.clientIp, requestId: event.context.requestId,
  });

  return successResponse(role, 'Role updated successfully');
});
