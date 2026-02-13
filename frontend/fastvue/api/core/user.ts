import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * User API Namespace
 */
export namespace UserApi {
  /** Company role info for a user */
  export interface CompanyRoleInfo {
    company_id: number;
    company_name: string;
    company_code: string;
    role_id: number;
    role_name: string;
    role_codename: string;
    is_default: boolean;
  }

  /** User response */
  export interface User {
    id: number;
    email: string;
    username: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    timezone: string;
    language: string;
    is_active: boolean;
    is_verified: boolean;
    is_superuser: boolean;
    two_factor_enabled: boolean;
    current_company_id: number | null;
    last_login_at: string | null;
    created_at: string;
    updated_at: string | null;
  }

  /** User with roles */
  export interface UserWithRoles extends User {
    company_roles: CompanyRoleInfo[];
    permissions: string[];
  }

  /** User create params */
  export interface UserCreate {
    email: string;
    username: string;
    password: string;
    full_name?: string;
    phone?: string;
    timezone?: string;
    language?: string;
    is_active?: boolean;
    is_verified?: boolean;
  }

  /** User update params */
  export interface UserUpdate {
    email?: string;
    username?: string;
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    bio?: string;
    location?: string;
    website?: string;
    timezone?: string;
    language?: string;
    is_active?: boolean;
  }

  /** User list query params */
  export interface ListParams {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
    company_id?: number;
  }

  /** Paginated list response */
  export interface ListResponse {
    total: number;
    items: User[];
    page: number;
    page_size: number;
  }

  /** Assign role to user in company */
  export interface AssignRoleParams {
    user_id: number;
    company_id: number;
    role_id: number;
    is_default?: boolean;
  }
}

/**
 * Get list of users
 */
export async function getUsersApi(params?: UserApi.ListParams) {
  return requestClient.get<UserApi.ListResponse>('/users/', { params });
}

/**
 * Get user by ID
 */
export async function getUserApi(id: number) {
  return requestClient.get<UserApi.UserWithRoles>(`/users/${id}`);
}

/**
 * Create a new user
 */
export async function createUserApi(data: UserApi.UserCreate) {
  return requestClient.post<UserApi.User>('/users/', data);
}

/**
 * Update user
 */
export async function updateUserApi(id: number, data: UserApi.UserUpdate) {
  return requestClient.put<UserApi.User>(`/users/${id}`, data);
}

/**
 * Delete user
 */
export async function deleteUserApi(id: number) {
  return requestClient.delete(`/users/${id}`);
}

/**
 * Toggle user active status
 */
export async function toggleUserActiveApi(id: number, isActive: boolean) {
  return requestClient.patch<UserApi.User>(`/users/${id}`, { is_active: isActive });
}

/**
 * Get current user info
 */
export async function getCurrentUserApi() {
  return requestClient.get<UserApi.UserWithRoles>('/auth/me');
}

/**
 * Update current user profile
 */
export async function updateCurrentUserApi(data: UserApi.UserUpdate) {
  return requestClient.put<UserApi.User>('/auth/me', data);
}

/**
 * Get user info for auth store
 * This function is called by the vben framework to get user info
 */
export async function getUserInfoApi(): Promise<UserInfo> {
  const user = await getCurrentUserApi();
  return {
    userId: String(user.id),
    username: user.username,
    realName: user.full_name || user.username,
    avatar: user.avatar_url || '',
    desc: user.bio || '',
    roles: user.company_roles.map((cr) => cr.role_codename),
    homePath: '/dashboard',
    token: '',
  };
}

// =============================================================================
// USER COMPANY ROLES
// =============================================================================

/**
 * Assign role to user in a company
 */
export async function assignUserRoleApi(data: UserApi.AssignRoleParams) {
  return requestClient.post<{ success: boolean }>(
    `/users/${data.user_id}/roles`,
    data,
  );
}

/**
 * Remove role from user in a company
 */
export async function removeUserRoleApi(
  userId: number,
  companyId: number,
  roleId: number,
) {
  return requestClient.delete<{ success: boolean }>(
    `/users/${userId}/roles/${companyId}/${roleId}`,
  );
}

/**
 * Get user's roles across all companies
 */
export async function getUserRolesApi(userId: number) {
  return requestClient.get<UserApi.CompanyRoleInfo[]>(`/users/${userId}/roles`);
}

/**
 * Set user's default company
 */
export async function setUserDefaultCompanyApi(userId: number, companyId: number) {
  return requestClient.post<{ success: boolean }>(
    `/users/${userId}/default-company`,
    { company_id: companyId },
  );
}

// =============================================================================
// USER SEARCH
// =============================================================================

/**
 * Search users (for autocomplete/select)
 */
export async function searchUsersApi(
  query: string,
  params?: { company_id?: number; limit?: number },
) {
  return requestClient.get<UserApi.User[]>('/users/search', {
    params: { q: query, ...params },
  });
}

/**
 * Get users in a company
 */
export async function getCompanyUsersApi(
  companyId: number,
  params?: { page?: number; page_size?: number },
) {
  return requestClient.get<UserApi.ListResponse>(`/companies/${companyId}/users`, {
    params,
  });
}

// =============================================================================
// GROUPS API
// =============================================================================

/**
 * Group types for user management
 */
export namespace GroupApi {
  export interface Group {
    id: number;
    name: string;
    description: string | null;
    company_id: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
  }

  export interface GroupCreate {
    name: string;
    description?: string;
    company_id?: number;
    is_active?: boolean;
  }

  export interface GroupUpdate {
    name?: string;
    description?: string;
    is_active?: boolean;
  }

  export interface ListParams {
    page?: number;
    page_size?: number;
    search?: string;
    company_id?: number;
    is_active?: boolean;
  }

  export interface ListResponse {
    total: number;
    items: Group[];
    page: number;
    page_size: number;
  }
}

/**
 * Get list of groups
 */
export async function getGroupsApi(params?: GroupApi.ListParams) {
  return requestClient.get<GroupApi.ListResponse>('/groups/', { params });
}

/**
 * Get group by ID
 */
export async function getGroupApi(id: number) {
  return requestClient.get<GroupApi.Group>(`/groups/${id}`);
}

/**
 * Create a new group
 */
export async function createGroupApi(data: GroupApi.GroupCreate) {
  return requestClient.post<GroupApi.Group>('/groups/', data);
}

/**
 * Update group
 */
export async function updateGroupApi(id: number, data: GroupApi.GroupUpdate) {
  return requestClient.put<GroupApi.Group>(`/groups/${id}`, data);
}

/**
 * Delete group
 */
export async function deleteGroupApi(id: number) {
  return requestClient.delete(`/groups/${id}`);
}

/**
 * Get users in a group
 */
export async function getGroupUsersApi(groupId: number) {
  return requestClient.get<UserApi.User[]>(`/groups/${groupId}/users`);
}

/**
 * Add user to group
 */
export async function addUserToGroupApi(groupId: number, userId: number) {
  return requestClient.post<{ success: boolean }>(`/groups/${groupId}/users`, {
    user_id: userId,
  });
}

/**
 * Remove user from group
 */
export async function removeUserFromGroupApi(groupId: number, userId: number) {
  return requestClient.delete<{ success: boolean }>(
    `/groups/${groupId}/users/${userId}`,
  );
}
