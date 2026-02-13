import { Role } from '~/server/models/index';
import { auditCrudOperation } from '~/server/services/audit.service';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'role.delete');

  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid role ID' });

  const role = await Role.findByPk(id);
  if (!role) throw createError({ statusCode: 404, statusMessage: 'Role not found' });

  if (role.is_system_role) {
    throw createError({ statusCode: 403, statusMessage: 'Cannot delete a system role' });
  }

  await role.update({ is_deleted: true, deleted_at: new Date(), updated_by: authUser.id });

  await auditCrudOperation({
    userId: authUser.id, companyId: authUser.current_company_id,
    action: 'delete', entityType: 'role', entityId: id, entityName: role.name,
    ipAddress: event.context.clientIp, requestId: event.context.requestId,
  });

  return successResponse(null, 'Role deleted successfully');
});
