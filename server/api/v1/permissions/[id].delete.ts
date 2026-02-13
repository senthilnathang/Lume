import { Permission } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'permission.delete');
  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid permission ID' });

  const perm = await Permission.findByPk(id);
  if (!perm) throw createError({ statusCode: 404, statusMessage: 'Permission not found' });

  if (perm.is_system_permission) {
    throw createError({ statusCode: 403, statusMessage: 'Cannot delete a system permission' });
  }

  await perm.update({ is_deleted: true, deleted_at: new Date(), updated_by: authUser.id });
  return successResponse(null, 'Permission deleted');
});
