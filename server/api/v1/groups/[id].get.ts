import { Group } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'group.read');
  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid group ID' });

  const group = await Group.findByPk(id, { include: [{ association: 'members' }, { association: 'permissions' }] });
  if (!group) throw createError({ statusCode: 404, statusMessage: 'Group not found' });

  return successResponse(group);
});
