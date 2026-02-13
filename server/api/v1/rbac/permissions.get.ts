import { getUserPermissions } from '~/server/services/rbac.service';

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event);

  const permissions = await getUserPermissions(authUser.id, authUser.current_company_id);

  return {
    success: true,
    data: permissions.map((p: any) => ({
      id: p.id,
      codename: p.codename,
      name: p.name,
      category: p.category,
      action: p.action,
    })),
  };
});
