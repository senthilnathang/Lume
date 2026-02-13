import { userService } from '~/server/services/user.service';
import { auditCrudOperation } from '~/server/services/audit.service';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'user.update');

  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' });
  }

  const oldUser = await userService.getById(id);
  if (!oldUser) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' });
  }

  const body = await readBody(event);
  // Prevent updating sensitive fields directly
  delete body.hashed_password;
  delete body.two_factor_secret;
  delete body.backup_codes;

  const user = await userService.update(id, body);

  await auditCrudOperation({
    userId: authUser.id,
    companyId: authUser.current_company_id,
    action: 'update',
    entityType: 'user',
    entityId: id,
    entityName: (oldUser as any).email,
    oldValues: (oldUser as any).toJSON(),
    newValues: body,
    ipAddress: event.context.clientIp,
    requestId: event.context.requestId,
  });

  return successResponse(user, 'User updated successfully');
});
