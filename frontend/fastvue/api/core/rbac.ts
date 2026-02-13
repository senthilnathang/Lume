import { requestClient } from '#/api/request';

/**
 * RBAC API Namespace - Roles, Permissions, Groups
 */
export namespace RBACApi {
  // =============================================================================
  // PERMISSIONS
  // =============================================================================

  /** Permission categories */
  export type PermissionCategory =
    | 'USER'
    | 'COMPANY'
    | 'ROLE'
    | 'GROUP'
    | 'PERMISSION'
    | 'AUDIT'
    | 'SYSTEM';

  /** Permission actions */
  export type PermissionAction =
    | 'CREATE'
    | 'READ'
    | 'UPDATE'
    | 'DELETE'
    | 'MANAGE'
    | 'EXPORT'
    | 'IMPORT';

  /** Permission */
  export interface Permission {
    id: number;
    name: string;
    codename: string;
    description: string | null;
    category: PermissionCategory;
    action: PermissionAction;
    resource: string | null;
    is_system_permission: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
  }

  /** Permission create params */
  export interface PermissionCreate {
    name: string;
    codename: string;
    description?: string;
    category: PermissionCategory;
    action: PermissionAction;
    resource?: string;
    is_active?: boolean;
  }

  /** Permission list response */
  export interface PermissionList {
    total: number;
    items: Permission[];
    page: number;
    page_size: number;
  }

  /** Permissions grouped by category */
  export interface PermissionGrouped {
    category: string;
    permissions: Permission[];
  }

  // =============================================================================
  // ROLES
  // =============================================================================

  /** Role */
  export interface Role {
    id: number;
    name: string;
    codename: string;
    description: string | null;
    company_id: number | null;
    is_system_role: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
  }

  /** Role with permissions */
  export interface RoleWithPermissions extends Role {
    permissions: PermissionInfo[];
  }

  /** Permission info for role */
  export interface PermissionInfo {
    id: number;
    name: string;
    codename: string;
    category: string;
    action: string;
  }

  /** Role create params */
  export interface RoleCreate {
    name: string;
    codename: string;
    description?: string;
    company_id?: number;
    is_active?: boolean;
    permission_ids?: number[];
  }

  /** Role update params */
  export interface RoleUpdate {
    name?: string;
    description?: string;
    is_active?: boolean;
    permission_ids?: number[];
  }

  /** Role list response */
  export interface RoleList {
    total: number;
    items: Role[];
    page: number;
    page_size: number;
  }

  // =============================================================================
  // GROUPS
  // =============================================================================

  /** Group */
  export interface Group {
    id: number;
    name: string;
    codename: string;
    description: string | null;
    company_id: number | null;
    is_system_group: boolean;
    is_active: boolean;
    member_count: number;
    created_at: string;
    updated_at: string | null;
  }

  /** User info for group */
  export interface GroupUserInfo {
    id: number;
    username: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  }

  /** Group with members */
  export interface GroupWithMembers extends Group {
    members: GroupUserInfo[];
    permissions: PermissionInfo[];
  }

  /** Group create params */
  export interface GroupCreate {
    name: string;
    codename: string;
    description?: string;
    company_id?: number;
    is_active?: boolean;
    permission_ids?: number[];
    user_ids?: number[];
  }

  /** Group update params */
  export interface GroupUpdate {
    name?: string;
    description?: string;
    is_active?: boolean;
    permission_ids?: number[];
    user_ids?: number[];
  }

  /** Group list response */
  export interface GroupList {
    total: number;
    items: Group[];
    page: number;
    page_size: number;
  }

  // =============================================================================
  // QUERY PARAMS
  // =============================================================================

  export interface PermissionQueryParams {
    page?: number;
    page_size?: number;
    category?: PermissionCategory;
    is_active?: boolean;
    search?: string;
  }

  export interface RoleQueryParams {
    page?: number;
    page_size?: number;
    company_id?: number;
    is_active?: boolean;
    search?: string;
  }

  export interface GroupQueryParams {
    page?: number;
    page_size?: number;
    company_id?: number;
    is_active?: boolean;
    search?: string;
  }

  // =============================================================================
  // CONTENT TYPES & ACCESS RULES
  // =============================================================================

  /** Content type for access rules */
  export interface ContentType {
    id: number;
    app_label: string;
    model: string;
    name: string;
  }

  /** Access rule scope */
  export type AccessRuleScope = 'own' | 'department' | 'company' | 'all' | 'custom';

  /** Access rule for RBAC */
  export interface AccessRule {
    id: number;
    name: string;
    description: string | null;
    user: number | null;
    role: number | null;
    content_type: number;
    content_type_name: string;
    scope: AccessRuleScope;
    filters: Record<string, any>;
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
  }

  /** Access rule create params */
  export interface AccessRuleCreate {
    name: string;
    description?: string;
    user?: number;
    role?: number;
    content_type: number;
    scope: AccessRuleScope;
    filters?: Record<string, any>;
    can_create?: boolean;
    can_read?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
    is_active?: boolean;
  }

  /** Access rule update params */
  export interface AccessRuleUpdate {
    name?: string;
    description?: string;
    scope?: AccessRuleScope;
    filters?: Record<string, any>;
    can_create?: boolean;
    can_read?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
    is_active?: boolean;
  }

  /** Access rule list response */
  export interface AccessRuleList {
    total: number;
    items: AccessRule[];
    page: number;
    page_size: number;
  }

  /** Menu item for tree structure */
  export interface MenuItem {
    id: number;
    name: string;
    code: string;
    path: string;
    icon?: string;
    parent_id?: number | null;
    order: number;
    is_active: boolean;
    children?: MenuItem[];
  }

  // =============================================================================
  // TIME PERMISSIONS
  // =============================================================================

  /** Time permission for restricted access hours */
  export interface TimePermission {
    id: number;
    name: string;
    description: string | null;
    user: number | null;
    role: number | null;
    group: number | null;
    days_of_week: number[];
    start_time: string;
    end_time: string;
    timezone: string;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
  }

  /** Time permission create params */
  export interface TimePermissionCreate {
    name: string;
    description?: string;
    user?: number;
    role?: number;
    group?: number;
    days_of_week: number[];
    start_time: string;
    end_time: string;
    timezone?: string;
    is_active?: boolean;
  }

  /** Time permission update params */
  export interface TimePermissionUpdate {
    name?: string;
    description?: string;
    days_of_week?: number[];
    start_time?: string;
    end_time?: string;
    timezone?: string;
    is_active?: boolean;
  }

  // =============================================================================
  // IP RESTRICTIONS
  // =============================================================================

  /** IP restriction for access control */
  export interface IPRestriction {
    id: number;
    name: string;
    description: string | null;
    user: number | null;
    role: number | null;
    group: number | null;
    ip_address: string | null;
    ip_range_start: string | null;
    ip_range_end: string | null;
    cidr: string | null;
    is_whitelist: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
  }

  /** IP restriction create params */
  export interface IPRestrictionCreate {
    name: string;
    description?: string;
    user?: number;
    role?: number;
    group?: number;
    ip_address?: string;
    ip_range_start?: string;
    ip_range_end?: string;
    cidr?: string;
    is_whitelist?: boolean;
    is_active?: boolean;
  }

  /** IP restriction update params */
  export interface IPRestrictionUpdate {
    name?: string;
    description?: string;
    ip_address?: string;
    ip_range_start?: string;
    ip_range_end?: string;
    cidr?: string;
    is_whitelist?: boolean;
    is_active?: boolean;
  }

  // =============================================================================
  // DELEGATIONS
  // =============================================================================

  /** Delegation for temporary permission transfer */
  export interface Delegation {
    id: number;
    name: string;
    description: string | null;
    delegator: number;
    delegator_name: string;
    delegate: number;
    delegate_name: string;
    permissions: number[];
    start_date: string;
    end_date: string;
    is_active: boolean;
    revoked: boolean;
    revoked_at: string | null;
    revoked_by: number | null;
    created_at: string;
    updated_at: string | null;
  }

  /** Delegation create params */
  export interface DelegationCreate {
    name: string;
    description?: string;
    delegate: number;
    permissions: number[];
    start_date: string;
    end_date: string;
    is_active?: boolean;
  }

  /** Delegation list params */
  export interface DelegationListParams {
    delegator?: number;
    delegate?: number;
    is_active?: boolean;
    include_expired?: boolean;
  }
}

// =============================================================================
// PERMISSIONS API
// =============================================================================

/**
 * Get permissions list
 */
export async function getPermissionsApi(params?: RBACApi.PermissionQueryParams) {
  return requestClient.get<RBACApi.PermissionList>('/permissions/', { params });
}

/**
 * Get permissions grouped by category
 */
export async function getPermissionsGroupedApi() {
  return requestClient.get<RBACApi.PermissionGrouped[]>('/permissions/grouped');
}

/**
 * Get permission by ID
 */
export async function getPermissionApi(id: number) {
  return requestClient.get<RBACApi.Permission>(`/permissions/${id}`);
}

/**
 * Create permission
 */
export async function createPermissionApi(data: RBACApi.PermissionCreate) {
  return requestClient.post<RBACApi.Permission>('/permissions/', data);
}

/**
 * Update permission
 */
export async function updatePermissionApi(
  id: number,
  data: Partial<RBACApi.PermissionCreate>,
) {
  return requestClient.put<RBACApi.Permission>(`/permissions/${id}`, data);
}

/**
 * Delete permission
 */
export async function deletePermissionApi(id: number) {
  return requestClient.delete(`/permissions/${id}`);
}

// =============================================================================
// ROLES API
// =============================================================================

/**
 * Get roles list
 */
export async function getRolesApi(params?: RBACApi.RoleQueryParams) {
  return requestClient.get<RBACApi.RoleList>('/roles/', { params });
}

/**
 * Get role by ID
 */
export async function getRoleApi(id: number) {
  return requestClient.get<RBACApi.RoleWithPermissions>(`/roles/${id}`);
}

/**
 * Create role
 */
export async function createRoleApi(data: RBACApi.RoleCreate) {
  return requestClient.post<RBACApi.Role>('/roles/', data);
}

/**
 * Update role
 */
export async function updateRoleApi(id: number, data: RBACApi.RoleUpdate) {
  return requestClient.put<RBACApi.Role>(`/roles/${id}`, data);
}

/**
 * Delete role
 */
export async function deleteRoleApi(id: number) {
  return requestClient.delete(`/roles/${id}`);
}

/**
 * Get role permissions
 */
export async function getRolePermissionsApi(id: number) {
  return requestClient.get<RBACApi.PermissionInfo[]>(`/roles/${id}/permissions`);
}

/**
 * Update role permissions
 */
export async function updateRolePermissionsApi(
  id: number,
  permissionIds: number[],
) {
  return requestClient.put<{ success: boolean }>(`/roles/${id}/permissions`, {
    permission_ids: permissionIds,
  });
}

/**
 * Get system roles (admin, editor, viewer, member)
 */
export async function getSystemRolesApi() {
  return requestClient.get<RBACApi.Role[]>('/roles/system');
}

/**
 * Get company-specific roles
 */
export async function getCompanyRolesApi(companyId: number) {
  return requestClient.get<RBACApi.Role[]>(`/companies/${companyId}/roles`);
}

// =============================================================================
// GROUPS API
// =============================================================================

/**
 * Get groups list
 */
export async function getGroupsApi(params?: RBACApi.GroupQueryParams) {
  return requestClient.get<RBACApi.GroupList>('/groups/', { params });
}

/**
 * Get group by ID
 */
export async function getGroupApi(id: number) {
  return requestClient.get<RBACApi.GroupWithMembers>(`/groups/${id}`);
}

/**
 * Create group
 */
export async function createGroupApi(data: RBACApi.GroupCreate) {
  return requestClient.post<RBACApi.Group>('/groups/', data);
}

/**
 * Update group
 */
export async function updateGroupApi(id: number, data: RBACApi.GroupUpdate) {
  return requestClient.put<RBACApi.Group>(`/groups/${id}`, data);
}

/**
 * Delete group
 */
export async function deleteGroupApi(id: number) {
  return requestClient.delete(`/groups/${id}`);
}

/**
 * Get group members
 */
export async function getGroupMembersApi(id: number) {
  return requestClient.get<RBACApi.GroupUserInfo[]>(`/groups/${id}/members`);
}

/**
 * Add users to group
 */
export async function addGroupMembersApi(id: number, userIds: number[]) {
  return requestClient.post<{ success: boolean }>(`/groups/${id}/members`, {
    user_ids: userIds,
  });
}

/**
 * Remove user from group
 */
export async function removeGroupMemberApi(groupId: number, userId: number) {
  return requestClient.delete<{ success: boolean }>(
    `/groups/${groupId}/members/${userId}`,
  );
}

/**
 * Get group permissions
 */
export async function getGroupPermissionsApi(id: number) {
  return requestClient.get<RBACApi.PermissionInfo[]>(`/groups/${id}/permissions`);
}

/**
 * Update group permissions
 */
export async function updateGroupPermissionsApi(
  id: number,
  permissionIds: number[],
) {
  return requestClient.put<{ success: boolean }>(`/groups/${id}/permissions`, {
    permission_ids: permissionIds,
  });
}

/**
 * Get company-specific groups
 */
export async function getCompanyGroupsApi(companyId: number) {
  return requestClient.get<RBACApi.Group[]>(`/companies/${companyId}/groups`);
}

// =============================================================================
// USER PERMISSIONS
// =============================================================================

/**
 * Get effective permissions for a user
 */
export async function getUserEffectivePermissionsApi(userId?: number) {
  const url = userId
    ? `/users/${userId}/effective-permissions`
    : '/auth/me/permissions';
  return requestClient.get<{ permissions: string[] }>(url);
}

/**
 * Check if current user has a specific permission
 */
export async function checkPermissionApi(permission: string) {
  return requestClient.get<{ has_permission: boolean }>(
    `/auth/me/check-permission/${permission}`,
  );
}

// =============================================================================
// CONTENT TYPES API
// =============================================================================

/**
 * Get all content types
 */
export async function getContentTypesApi() {
  return requestClient.get<RBACApi.ContentType[]>('/content-types');
}

// =============================================================================
// ACCESS RULES API
// =============================================================================

/**
 * Get access rules list
 */
export async function getAccessRulesApi(params?: {
  user?: number;
  role?: number;
  content_type?: number;
  is_active?: boolean;
}) {
  return requestClient.get<RBACApi.AccessRuleList>('/access-rules', { params });
}

/**
 * Get access rule by ID
 */
export async function getAccessRuleApi(id: number) {
  return requestClient.get<RBACApi.AccessRule>(`/access-rules/${id}`);
}

/**
 * Create access rule
 */
export async function createAccessRuleApi(data: RBACApi.AccessRuleCreate) {
  return requestClient.post<RBACApi.AccessRule>('/access-rules', data);
}

/**
 * Update access rule
 */
export async function updateAccessRuleApi(id: number, data: RBACApi.AccessRuleUpdate) {
  return requestClient.put<RBACApi.AccessRule>(`/access-rules/${id}`, data);
}

/**
 * Delete access rule
 */
export async function deleteAccessRuleApi(id: number) {
  return requestClient.delete(`/access-rules/${id}`);
}

// =============================================================================
// MENU PERMISSIONS - WITH HIERARCHICAL PRIORITY SUPPORT
// =============================================================================

/**
 * Menu permission with priority (for user/group/role)
 */
export interface MenuPermissionWithPriority {
  id?: number;
  menu_item_id: number;
  menu_code?: string;
  menu_name?: string;
  menu_path?: string | null;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
  priority: number;
}

/**
 * Response for role menu permissions
 */
export interface RoleMenuPermissionsResponse {
  permissions: MenuPermissionWithPriority[];
  role_id: number;
  role_name: string;
}

/**
 * Accessible menu (combined from all permission levels)
 */
export interface AccessibleMenu {
  code: string;
  menu_item_id: number;
  name: string;
  path: string | null;
  icon: string | null;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
  source: 'user' | 'group' | 'role';
  priority: number;
}

/**
 * Get menu items as tree structure
 */
export async function getMenuItemsTreeApi() {
  return requestClient.get<RBACApi.MenuItem[]>('/rbac/menus/tree');
}

/**
 * Get menu items as flat list
 */
export async function getMenuItemsFlatApi() {
  return requestClient.get<RBACApi.MenuItem[]>('/rbac/menus/flat');
}

/**
 * Get accessible menus for current user (combined permissions)
 */
export async function getAccessibleMenusApi() {
  return requestClient.get<AccessibleMenu[]>('/rbac/menus/accessible');
}

/**
 * Get accessible menu codes for current user
 */
export async function getAccessibleMenuCodesApi() {
  return requestClient.get<string[]>('/rbac/menus/accessible/codes');
}

/**
 * Get role's menu permissions (with priority support)
 */
export async function getRoleMenuPermissionsApi(roleId: number) {
  return requestClient.get<RoleMenuPermissionsResponse>(`/rbac/roles/${roleId}/menu-permissions`);
}

/**
 * Set role's menu permissions (bulk - replaces existing)
 */
export async function setRoleMenuPermissionsApi(
  roleId: number,
  permissions: MenuPermissionWithPriority[],
) {
  return requestClient.put<RoleMenuPermissionsResponse>(
    `/rbac/roles/${roleId}/menu-permissions`,
    { permissions },
  );
}

/**
 * Add single menu permission to role
 */
export async function addRoleMenuPermissionApi(
  roleId: number,
  permission: MenuPermissionWithPriority,
) {
  return requestClient.post<MenuPermissionWithPriority>(
    `/rbac/roles/${roleId}/menu-permissions`,
    permission,
  );
}

/**
 * Delete menu permission from role
 */
export async function deleteRoleMenuPermissionApi(roleId: number, menuItemId: number) {
  return requestClient.delete(`/rbac/roles/${roleId}/menu-permissions/${menuItemId}`);
}

// Group menu permissions response type
export interface GroupMenuPermissionsResponse {
  group_id: number;
  permissions: MenuPermissionWithPriority[];
}

/**
 * Get group's menu permissions
 */
export async function getGroupMenuPermissionsApi(groupId: number) {
  return requestClient.get<GroupMenuPermissionsResponse>(`/groups/${groupId}/menu-permissions`);
}

/**
 * Set group's menu permissions
 */
export async function setGroupMenuPermissionsApi(
  groupId: number,
  permissions: MenuPermissionWithPriority[],
) {
  return requestClient.put<GroupMenuPermissionsResponse>(
    `/groups/${groupId}/menu-permissions`,
    permissions,
  );
}

// User menu permissions response type
export interface UserMenuPermissionsResponse {
  user_id: number;
  permissions: MenuPermissionWithPriority[];
}

/**
 * Get user's menu permissions
 */
export async function getUserMenuPermissionsApi(userId: number) {
  return requestClient.get<UserMenuPermissionsResponse>(`/users/${userId}/menu-permissions-v2`);
}

/**
 * Set user's menu permissions
 */
export async function setUserMenuPermissionsApi(
  userId: number,
  permissions: MenuPermissionWithPriority[],
) {
  return requestClient.put<UserMenuPermissionsResponse>(
    `/users/${userId}/menu-permissions-v2`,
    permissions,
  );
}

// =============================================================================
// MENU-CENTRIC PERMISSION MANAGEMENT (Odoo-style)
// =============================================================================

export interface MenuRolePermItem {
  role_id: number;
  name: string;
  codename: string;
  can_view: boolean;
  can_edit: boolean;
  can_create: boolean;
  can_delete: boolean;
  priority: number;
}

export interface MenuGroupPermItem {
  group_id: number;
  name: string;
  codename: string;
  can_view: boolean;
  can_edit: boolean;
  can_create: boolean;
  can_delete: boolean;
  priority: number;
}

export interface MenuUserPermItem {
  user_id: number;
  username: string;
  full_name: string | null;
  email: string;
  can_view: boolean;
  can_edit: boolean;
  can_create: boolean;
  can_delete: boolean;
  priority: number;
}

export interface InheritedMenuRolePermItem extends MenuRolePermItem {
  inherited_from: string;
  inherited_from_id: number | null;
}

export interface InheritedMenuGroupPermItem extends MenuGroupPermItem {
  inherited_from: string;
  inherited_from_id: number | null;
}

export interface InheritedMenuUserPermItem extends MenuUserPermItem {
  inherited_from: string;
  inherited_from_id: number | null;
}

export interface MenuPermissionDetailResponse {
  menu_item: RBACApi.MenuItem;
  roles: MenuRolePermItem[];
  groups: MenuGroupPermItem[];
  users: MenuUserPermItem[];
  inherited_roles: InheritedMenuRolePermItem[];
  inherited_groups: InheritedMenuGroupPermItem[];
  inherited_users: InheritedMenuUserPermItem[];
}

export interface MenuTreeNodeWithSummary {
  id: number;
  name: string;
  code: string;
  path: string | null;
  icon: string | null;
  parent_id: number | null;
  order: number;
  is_active: boolean;
  role_count: number;
  group_count: number;
  user_count: number;
  children: MenuTreeNodeWithSummary[];
}

/**
 * Get menu tree with permission counts per node
 */
export async function getMenuTreeWithSummaryApi() {
  return requestClient.get<MenuTreeNodeWithSummary[]>('/rbac/menus/tree-with-summary');
}

/**
 * Get all roles/groups/users assigned to a menu item + inherited
 */
export async function getMenuPermissionDetailsApi(menuItemId: number) {
  return requestClient.get<MenuPermissionDetailResponse>(`/rbac/menus/${menuItemId}/permissions`);
}

/**
 * Bulk set role permissions for a menu item
 */
export async function setMenuRolePermissionsApi(
  menuItemId: number,
  permissions: MenuRolePermItem[],
) {
  return requestClient.put(`/rbac/menus/${menuItemId}/permissions/roles`, { permissions });
}

/**
 * Bulk set group permissions for a menu item
 */
export async function setMenuGroupPermissionsApi(
  menuItemId: number,
  permissions: MenuGroupPermItem[],
) {
  return requestClient.put(`/rbac/menus/${menuItemId}/permissions/groups`, { permissions });
}

/**
 * Bulk set user permissions for a menu item
 */
export async function setMenuUserPermissionsApi(
  menuItemId: number,
  permissions: MenuUserPermItem[],
) {
  return requestClient.put(`/rbac/menus/${menuItemId}/permissions/users`, { permissions });
}

/**
 * Add a single role to a menu item
 */
export async function addMenuRolePermissionApi(
  menuItemId: number,
  data: { role_id: number; can_view?: boolean; can_edit?: boolean; can_create?: boolean; can_delete?: boolean; priority?: number },
) {
  return requestClient.post(`/rbac/menus/${menuItemId}/permissions/roles`, data);
}

/**
 * Add a single group to a menu item
 */
export async function addMenuGroupPermissionApi(
  menuItemId: number,
  data: { group_id: number; can_view?: boolean; can_edit?: boolean; can_create?: boolean; can_delete?: boolean; priority?: number },
) {
  return requestClient.post(`/rbac/menus/${menuItemId}/permissions/groups`, data);
}

/**
 * Add a single user to a menu item
 */
export async function addMenuUserPermissionApi(
  menuItemId: number,
  data: { user_id: number; can_view?: boolean; can_edit?: boolean; can_create?: boolean; can_delete?: boolean; priority?: number },
) {
  return requestClient.post(`/rbac/menus/${menuItemId}/permissions/users`, data);
}

/**
 * Remove a role from a menu item
 */
export async function removeMenuRolePermissionApi(menuItemId: number, roleId: number) {
  return requestClient.delete(`/rbac/menus/${menuItemId}/permissions/roles/${roleId}`);
}

/**
 * Remove a group from a menu item
 */
export async function removeMenuGroupPermissionApi(menuItemId: number, groupId: number) {
  return requestClient.delete(`/rbac/menus/${menuItemId}/permissions/groups/${groupId}`);
}

/**
 * Remove a user from a menu item
 */
export async function removeMenuUserPermissionApi(menuItemId: number, userId: number) {
  return requestClient.delete(`/rbac/menus/${menuItemId}/permissions/users/${userId}`);
}

// =============================================================================
// TIME PERMISSIONS API
// =============================================================================

/**
 * Get time permissions list
 */
export async function getTimePermissionsApi(params?: {
  user?: number;
  role?: number;
  group?: number;
  is_active?: boolean;
}) {
  return requestClient.get<RBACApi.TimePermission[]>('/time-permissions', {
    params,
  });
}

/**
 * Get time permission by ID
 */
export async function getTimePermissionApi(id: number) {
  return requestClient.get<RBACApi.TimePermission>(`/time-permissions/${id}`);
}

/**
 * Create time permission
 */
export async function createTimePermissionApi(
  data: RBACApi.TimePermissionCreate,
) {
  return requestClient.post<RBACApi.TimePermission>('/time-permissions', data);
}

/**
 * Update time permission
 */
export async function updateTimePermissionApi(
  id: number,
  data: RBACApi.TimePermissionUpdate,
) {
  return requestClient.put<RBACApi.TimePermission>(
    `/time-permissions/${id}`,
    data,
  );
}

/**
 * Delete time permission
 */
export async function deleteTimePermissionApi(id: number) {
  return requestClient.delete(`/time-permissions/${id}`);
}

// =============================================================================
// IP RESTRICTIONS API
// =============================================================================

/**
 * Get IP restrictions list
 */
export async function getIPRestrictionsApi(params?: {
  user?: number;
  role?: number;
  group?: number;
  is_active?: boolean;
  is_whitelist?: boolean;
}) {
  return requestClient.get<RBACApi.IPRestriction[]>('/ip-restrictions', {
    params,
  });
}

/**
 * Get IP restriction by ID
 */
export async function getIPRestrictionApi(id: number) {
  return requestClient.get<RBACApi.IPRestriction>(`/ip-restrictions/${id}`);
}

/**
 * Create IP restriction
 */
export async function createIPRestrictionApi(
  data: RBACApi.IPRestrictionCreate,
) {
  return requestClient.post<RBACApi.IPRestriction>('/ip-restrictions', data);
}

/**
 * Update IP restriction
 */
export async function updateIPRestrictionApi(
  id: number,
  data: RBACApi.IPRestrictionUpdate,
) {
  return requestClient.put<RBACApi.IPRestriction>(
    `/ip-restrictions/${id}`,
    data,
  );
}

/**
 * Delete IP restriction
 */
export async function deleteIPRestrictionApi(id: number) {
  return requestClient.delete(`/ip-restrictions/${id}`);
}

// =============================================================================
// DELEGATIONS API
// =============================================================================

/**
 * Get delegations list
 */
export async function getDelegationsApi(params?: RBACApi.DelegationListParams) {
  return requestClient.get<RBACApi.Delegation[]>('/delegations', { params });
}

/**
 * Get delegation by ID
 */
export async function getDelegationApi(id: number) {
  return requestClient.get<RBACApi.Delegation>(`/delegations/${id}`);
}

/**
 * Create delegation
 */
export async function createDelegationApi(data: RBACApi.DelegationCreate) {
  return requestClient.post<RBACApi.Delegation>('/delegations', data);
}

/**
 * Revoke delegation
 */
export async function revokeDelegationApi(id: number) {
  return requestClient.post<{ success: boolean }>(`/delegations/${id}/revoke`);
}

// =============================================================================
// MENU PERMISSION LIST (flat view)
// =============================================================================

export interface MenuPermissionListItem {
  id: number;
  permission_type: 'role' | 'group' | 'user';
  entity_id: number;
  entity_name: string;
  entity_codename: string;
  menu_item_id: number;
  menu_name: string;
  menu_code: string;
  menu_path: string | null;
  can_view: boolean;
  can_edit: boolean;
  can_create: boolean;
  can_delete: boolean;
  priority: number;
  created_at: string | null;
}

export interface MenuPermissionListResponse {
  items: MenuPermissionListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface MenuPermissionListParams {
  page?: number;
  page_size?: number;
  search?: string;
  type?: 'role' | 'group' | 'user';
  menu_item_id?: number;
}

/**
 * Get all menu permissions as a flat paginated list
 */
export async function getAllMenuPermissionsApi(params?: MenuPermissionListParams) {
  return requestClient.get<MenuPermissionListResponse>('/rbac/menus/permissions/all', { params });
}

export interface BulkAddMenuPermissionsParams {
  permission_type: 'role' | 'group' | 'user';
  entity_ids: number[];
  menu_item_ids: number[];
  can_view?: boolean;
  can_edit?: boolean;
  can_create?: boolean;
  can_delete?: boolean;
  priority?: number;
}

/**
 * Bulk add menu permissions: multiple entities x multiple menu items
 */
export async function bulkAddMenuPermissionsApi(data: BulkAddMenuPermissionsParams) {
  return requestClient.post<{ success: boolean; created: number; skipped: number; total_combinations: number }>(
    '/rbac/menus/permissions/bulk',
    data,
  );
}

/**
 * Delete a menu permission by type and ID
 */
export async function deleteMenuPermissionApi(
  menuItemId: number,
  permissionType: 'role' | 'group' | 'user',
  entityId: number,
) {
  return requestClient.delete(`/rbac/menus/${menuItemId}/permissions/${permissionType}s/${entityId}`);
}
