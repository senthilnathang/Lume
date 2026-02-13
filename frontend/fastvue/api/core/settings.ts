import { requestClient } from '#/api/request';

export namespace SettingsApi {
  export interface Permission {
    id: number;
    name: string;
    codename: string;
    category: string;
    action: string;
    is_system_permission: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
  }

  export interface Group {
    id: number;
    name: string;
    codename: string;
    description: string | null;
    company_id: number | null;
    is_system_group: boolean;
    is_active: boolean;
    member_count: number;
    permissions?: Permission[];
    created_at: string;
    updated_at: string | null;
  }

  export interface GroupCreate {
    name: string;
    codename: string;
    description?: string;
    company_id?: number;
    permission_ids?: number[];
    user_ids?: number[];
  }

  export interface GroupUpdate {
    name?: string;
    description?: string;
    is_active?: boolean;
    permission_ids?: number[];
    user_ids?: number[];
  }

  export interface GroupListParams {
    page?: number;
    page_size?: number;
    search?: string;
    company_id?: number;
    is_active?: boolean;
  }

  export interface GroupListResponse {
    total: number;
    items: Group[];
    page: number;
    page_size: number;
  }

  export interface PermissionListParams {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
  }

  export interface PermissionListResponse {
    total: number;
    items: Permission[];
    page: number;
    page_size: number;
    grouped?: Record<string, Permission[]>;
  }
}

/**
 * Get list of groups
 */
export async function getGroupsApi(params?: SettingsApi.GroupListParams) {
  return requestClient.get<SettingsApi.GroupListResponse>('/groups/', { params });
}

/**
 * Get group by ID
 */
export async function getGroupApi(id: number) {
  return requestClient.get<SettingsApi.Group>(`/groups/${id}`);
}

/**
 * Create a new group
 */
export async function createGroupApi(data: SettingsApi.GroupCreate) {
  return requestClient.post<SettingsApi.Group>('/groups/', data);
}

/**
 * Update group
 */
export async function updateGroupApi(id: number, data: SettingsApi.GroupUpdate) {
  return requestClient.put<SettingsApi.Group>(`/groups/${id}`, data);
}

/**
 * Delete group
 */
export async function deleteGroupApi(id: number) {
  return requestClient.delete(`/groups/${id}`);
}

/**
 * Get all available permissions with pagination
 */
export async function getPermissionsApi(params?: SettingsApi.PermissionListParams) {
  return requestClient.get<SettingsApi.PermissionListResponse>('/permissions/', { params });
}

/**
 * Get permission by ID
 */
export async function getPermissionApi(id: number) {
  return requestClient.get<SettingsApi.Permission>(`/permissions/${id}`);
}

/**
 * Get users in a group
 */
export async function getGroupUsersApi(groupId: number) {
  return requestClient.get<{ users: Array<{ id: number; username: string; email: string; full_name: string | null }> }>(
    `/groups/${groupId}/users`,
  );
}

/**
 * Add users to a group
 */
export async function addUsersToGroupApi(groupId: number, userIds: number[]) {
  return requestClient.post(`/groups/${groupId}/users`, { user_ids: userIds });
}

/**
 * Set all users in a group (replaces existing users)
 */
export async function setGroupUsersApi(groupId: number, userIds: number[]) {
  return requestClient.put(`/groups/${groupId}/users`, { user_ids: userIds });
}

/**
 * Remove users from a group
 */
export async function removeUsersFromGroupApi(groupId: number, userIds: number[]) {
  return requestClient.delete(`/groups/${groupId}/users`, { data: { user_ids: userIds } });
}
