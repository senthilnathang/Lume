import { Role, Permission, RolePermission } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'role.read');

  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid role ID' });

  const role = await Role.findByPk(id, {
    include: [{ association: 'permissions' }],
  });

  if (!role) throw createError({ statusCode: 404, statusMessage: 'Role not found' });

  return successResponse(role);
});
