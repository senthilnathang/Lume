import { userService } from '~/server/services/user.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'user.read');

  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' });
  }

  const user = await userService.getById(id);
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' });
  }

  return successResponse(user);
});
