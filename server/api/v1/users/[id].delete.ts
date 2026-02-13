import { userService } from '~/server/services/user.service';
import { auditCrudOperation } from '~/server/services/audit.service';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'user.delete');

  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' });
  }

  if (id === authUser.id) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot delete your own account' });
  }

  const deleted = await userService.softDelete(id, authUser.id);
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' });
  }

  await auditCrudOperation({
    userId: authUser.id,
    companyId: authUser.current_company_id,
    action: 'delete',
    entityType: 'user',
    entityId: id,
    ipAddress: event.context.clientIp,
    requestId: event.context.requestId,
  });

  return successResponse(null, 'User deleted successfully');
});
