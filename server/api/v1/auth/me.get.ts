import { getCurrentUser } from '~/server/services/auth.service';
import { getUserPermissions, getUserMenus } from '~/server/services/rbac.service';

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event);

  const user = await getCurrentUser(authUser.id);
  const permissions = await getUserPermissions(authUser.id, authUser.current_company_id);
  const menus = await getUserMenus(authUser.id, authUser.current_company_id);

  return {
    success: true,
    data: {
      user,
      permissions: permissions.map((p: any) => p.codename),
      menus,
    },
  };
});
