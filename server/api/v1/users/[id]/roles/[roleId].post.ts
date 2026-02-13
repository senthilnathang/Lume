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

  const result = await userService.assignRole(userId, companyId, roleId, authUser.id);
  return successResponse(result, 'Role assigned successfully');
});
