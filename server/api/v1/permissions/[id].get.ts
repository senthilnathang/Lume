import { Permission } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'permission.read');

  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid permission ID' });

  const perm = await Permission.findByPk(id);
  if (!perm) throw createError({ statusCode: 404, statusMessage: 'Permission not found' });

  return successResponse(perm);
});
