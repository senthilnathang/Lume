import { userService } from '~/server/services/user.service';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'user.manage');

  const userId = parseInt(getRouterParam(event, 'id') || '');
  const roleId = parseInt(getRouterParam(event, 'roleId') || '');
  if (!userId || !roleId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user or role ID' });
  }

  const companyId = authUser.current_company_id;
  if (!companyId) {
    throw createError({ statusCode: 400, statusMessage: 'No company context' });
  }

  const removed = await userService.removeRole(userId, companyId, roleId);
  if (!removed) {
    throw createError({ statusCode: 404, statusMessage: 'Role assignment not found' });
  }

  return successResponse(null, 'Role removed successfully');
});
