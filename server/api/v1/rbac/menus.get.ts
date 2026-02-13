import { getUserMenus } from '~/server/services/rbac.service';

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event);

  const menus = await getUserMenus(authUser.id, authUser.current_company_id);

  return {
    success: true,
    data: menus,
  };
});
