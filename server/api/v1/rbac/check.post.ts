import { checkUserPermission } from '~/server/services/rbac.service';

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event);
  const body = await readBody(event);
  const { permission } = body;

  if (!permission) {
    throw createError({ statusCode: 400, statusMessage: 'Permission codename is required' });
  }

  const hasPermission = authUser.is_superuser || await checkUserPermission(
    authUser.id,
    permission,
    authUser.current_company_id,
  );

  return {
    success: true,
    data: { has_permission: hasPermission },
  };
});
