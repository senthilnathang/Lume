import { Group } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'group.create');
  const body = await readBody(event);

  if (!body.name || !body.codename) {
    throw createError({ statusCode: 400, statusMessage: 'Name and codename are required' });
  }

  const group = await Group.create({
    ...body,
    company_id: body.company_id || authUser.current_company_id,
    created_by: authUser.id,
  } as any);

  return successResponse(group, 'Group created successfully');
});
