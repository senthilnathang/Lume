import { Op } from 'sequelize';
import {
  User,
  Role,
  Permission,
  Group,
  UserCompanyRole,
  UserGroup,
  RolePermission,
  GroupPermission,
  MenuItem,
  UserMenuPermission,
  RoleMenuPermission,
  GroupMenuPermission,
  AccessRule,
  ContentType,
} from '../models/index';

/**
 * Check if a user has a specific permission (by codename).
 */
export async function checkUserPermission(
  userId: number,
  permissionCodename: string,
  companyId?: number | null,
): Promise<boolean> {
  // 1. Get user's roles in the company
  const whereClause: any = { user_id: userId, is_active: true };
  if (companyId) {
    whereClause.company_id = companyId;
  }

  const userRoles = await UserCompanyRole.findAll({
    where: whereClause,
    attributes: ['role_id'],
  });

  const roleIds = userRoles.map((ur: any) => ur.role_id);

  // 2. Check role permissions
  if (roleIds.length > 0) {
    const permission = await Permission.findOne({
      where: { codename: permissionCodename, is_active: true },
    });

    if (permission) {
      const roleHasPermission = await RolePermission.findOne({
        where: {
          role_id: { [Op.in]: roleIds },
          permission_id: permission.id,
        },
      });

      if (roleHasPermission) return true;
    }
  }

  // 3. Check group permissions
  const userGroups = await UserGroup.findAll({
    where: { user_id: userId },
    attributes: ['group_id'],
  });

  const groupIds = userGroups.map((ug: any) => ug.group_id);

  if (groupIds.length > 0) {
    const permission = await Permission.findOne({
      where: { codename: permissionCodename, is_active: true },
    });

    if (permission) {
      const groupHasPermission = await GroupPermission.findOne({
        where: {
          group_id: { [Op.in]: groupIds },
          permission_id: permission.id,
        },
      });

      if (groupHasPermission) return true;
    }
  }

  return false;
}

/**
 * Get all permissions for a user (aggregated from roles + groups).
 */
export async function getUserPermissions(
  userId: number,
  companyId?: number | null,
): Promise<Permission[]> {
  const whereClause: any = { user_id: userId, is_active: true };
  if (companyId) whereClause.company_id = companyId;

  // Get role-based permissions
  const userRoles = await UserCompanyRole.findAll({
    where: whereClause,
    attributes: ['role_id'],
  });
  const roleIds = userRoles.map((ur: any) => ur.role_id);

  // Get group-based permissions
  const userGroups = await UserGroup.findAll({
    where: { user_id: userId },
    attributes: ['group_id'],
  });
  const groupIds = userGroups.map((ug: any) => ug.group_id);

  // Collect permission IDs from roles
  const rolePermIds: number[] = [];
  if (roleIds.length > 0) {
    const rps = await RolePermission.findAll({
      where: { role_id: { [Op.in]: roleIds } },
      attributes: ['permission_id'],
    });
    rolePermIds.push(...rps.map((rp: any) => rp.permission_id));
  }

  // Collect permission IDs from groups
  const groupPermIds: number[] = [];
  if (groupIds.length > 0) {
    const gps = await GroupPermission.findAll({
      where: { group_id: { [Op.in]: groupIds } },
      attributes: ['permission_id'],
    });
    groupPermIds.push(...gps.map((gp: any) => gp.permission_id));
  }

  // Deduplicate
  const allPermIds = [...new Set([...rolePermIds, ...groupPermIds])];

  if (allPermIds.length === 0) return [];

  return Permission.findAll({
    where: {
      id: { [Op.in]: allPermIds },
      is_active: true,
    },
  });
}

/**
 * Get resolved menu items for a user (based on User > Group > Role priority).
 */
export async function getUserMenus(
  userId: number,
  companyId?: number | null,
): Promise<any[]> {
  // Get all active menu items
  const menuItems = await MenuItem.findAll({
    where: { is_active: true, is_visible: true },
    order: [['order', 'ASC']],
  });

  // Get user's roles and groups
  const whereClause: any = { user_id: userId, is_active: true };
  if (companyId) whereClause.company_id = companyId;

  const userRoles = await UserCompanyRole.findAll({
    where: whereClause,
    attributes: ['role_id'],
  });
  const roleIds = userRoles.map((ur: any) => ur.role_id);

  const userGroups = await UserGroup.findAll({
    where: { user_id: userId },
    attributes: ['group_id'],
  });
  const groupIds = userGroups.map((ug: any) => ug.group_id);

  // Get all menu permissions (user-level overrides take priority)
  const userMenuPerms = await UserMenuPermission.findAll({
    where: { user_id: userId },
  });

  const roleMenuPerms = roleIds.length > 0
    ? await RoleMenuPermission.findAll({
        where: { role_id: { [Op.in]: roleIds } },
      })
    : [];

  const groupMenuPerms = groupIds.length > 0
    ? await GroupMenuPermission.findAll({
        where: { group_id: { [Op.in]: groupIds } },
      })
    : [];

  // Build permission map (menu_item_id → resolved permissions)
  // Priority: User (100) > Group (50) > Role (10)
  const permMap = new Map<number, { can_view: boolean; can_edit: boolean; can_delete: boolean; can_create: boolean }>();

  // Start with role perms (lowest priority)
  for (const rmp of roleMenuPerms as any[]) {
    permMap.set(rmp.menu_item_id, {
      can_view: rmp.can_view,
      can_edit: rmp.can_edit,
      can_delete: rmp.can_delete,
      can_create: rmp.can_create,
    });
  }

  // Override with group perms
  for (const gmp of groupMenuPerms as any[]) {
    permMap.set(gmp.menu_item_id, {
      can_view: gmp.can_view,
      can_edit: gmp.can_edit,
      can_delete: gmp.can_delete,
      can_create: gmp.can_create,
    });
  }

  // Override with user perms (highest priority)
  for (const ump of userMenuPerms as any[]) {
    permMap.set(ump.menu_item_id, {
      can_view: ump.can_view,
      can_edit: ump.can_edit,
      can_delete: ump.can_delete,
      can_create: ump.can_create,
    });
  }

  // Filter menu items to only those the user can view
  const visibleMenus = menuItems.filter((item: any) => {
    const perms = permMap.get(item.id);
    // If no explicit permission exists, check if menu requires auth
    if (!perms) {
      // If there are no permissions defined at all, show all menus
      return permMap.size === 0;
    }
    return perms.can_view;
  });

  // Build tree structure
  return buildMenuTree(visibleMenus as any[], permMap);
}

/**
 * Build a nested menu tree from flat menu items.
 */
function buildMenuTree(
  items: any[],
  permMap: Map<number, any>,
  parentId: number | null = null,
): any[] {
  return items
    .filter((item) => item.parent_id === parentId)
    .map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      path: item.path,
      icon: item.icon,
      component: item.component,
      redirect: item.redirect,
      order: item.order,
      badge: item.badge,
      badge_type: item.badge_type,
      menu_type: item.menu_type,
      permissions: permMap.get(item.id) || { can_view: true, can_edit: false, can_delete: false, can_create: false },
      children: buildMenuTree(items, permMap, item.id),
    }));
}

/**
 * Get access rules for a user and content type.
 */
export async function getAccessRules(
  userId: number,
  contentTypeId: number,
  companyId?: number | null,
) {
  const userGroups = await UserGroup.findAll({
    where: { user_id: userId },
    attributes: ['group_id'],
  });
  const groupIds = userGroups.map((ug: any) => ug.group_id);

  const userRoles = await UserCompanyRole.findAll({
    where: { user_id: userId, is_active: true, ...(companyId ? { company_id: companyId } : {}) },
    attributes: ['role_id'],
  });
  const roleIds = userRoles.map((ur: any) => ur.role_id);

  const whereClause: any = {
    content_type_id: contentTypeId,
    is_active: true,
    [Op.or]: [
      { user_id: userId },
      ...(groupIds.length > 0 ? [{ group_id: { [Op.in]: groupIds } }] : []),
      ...(roleIds.length > 0 ? [{ role_id: { [Op.in]: roleIds } }] : []),
      { user_id: null, group_id: null, role_id: null }, // Global rules
    ],
  };

  if (companyId) {
    whereClause[Op.and] = [
      { [Op.or]: [{ company_id: companyId }, { company_id: null }] },
    ];
  }

  return AccessRule.findAll({
    where: whereClause,
    order: [['priority', 'DESC']],
  });
}
