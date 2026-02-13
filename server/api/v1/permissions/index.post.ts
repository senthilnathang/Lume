import { Permission } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'permission.create');
  const body = await readBody(event);

  if (!body.name || !body.codename) {
    throw createError({ statusCode: 400, statusMessage: 'Name and codename are required' });
  }

  const permission = await Permission.create({
    ...body,
    created_by: authUser.id,
  } as any);

  return successResponse(permission, 'Permission created successfully');
});
