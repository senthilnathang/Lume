import { userService } from '~/server/services/user.service';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'user.manage');

  const userId = parseInt(getRouterParam(event, 'id') || '');
  const groupId = parseInt(getRouterParam(event, 'groupId') || '');
  if (!userId || !groupId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user or group ID' });
  }

  const result = await userService.addToGroup(userId, groupId, authUser.id);
  return successResponse(result, 'User added to group');
});
