import { Group } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'group.delete');
  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid group ID' });

  const group = await Group.findByPk(id);
  if (!group) throw createError({ statusCode: 404, statusMessage: 'Group not found' });

  await group.update({ is_deleted: true, deleted_at: new Date(), updated_by: authUser.id });
  return successResponse(null, 'Group deleted');
});
