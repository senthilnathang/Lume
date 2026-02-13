import { Group } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'group.update');
  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid group ID' });

  const group = await Group.findByPk(id);
  if (!group) throw createError({ statusCode: 404, statusMessage: 'Group not found' });

  const body = await readBody(event);
  await group.update({ ...body, updated_by: authUser.id });

  return successResponse(group, 'Group updated');
});
