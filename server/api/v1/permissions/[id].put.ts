import { Permission } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'permission.update');
  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid permission ID' });

  const perm = await Permission.findByPk(id);
  if (!perm) throw createError({ statusCode: 404, statusMessage: 'Permission not found' });

  const body = await readBody(event);
  await perm.update({ ...body, updated_by: authUser.id });

  return successResponse(perm, 'Permission updated');
});
