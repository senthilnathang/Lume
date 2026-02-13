import { requestClient } from '#/api/request';

export namespace RolesApi {
  export interface Permission {
    id: number;
    name: string;
    codename: string;
    category: string;
    action: string;
  }

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

  export interface RoleWithPermissions extends Role {
    permissions: Permission[];
  }

  export interface RoleCreate {
    name: string;
    codename: string;
    description?: string;
    company_id?: number;
    permission_ids?: number[];
  }

  export interface RoleUpdate {
    name?: string;
    description?: string;
    is_active?: boolean;
    permission_ids?: number[];
  }

  export interface RoleListParams {
    page?: number;
    page_size?: number;
    company_id?: number;
    is_active?: boolean;
  }

  export interface RoleListResponse {
    total: number;
    items: Role[];
    page: number;
    page_size: number;
  }
}

/**
 * Get list of roles
 */
export async function getRolesApi(params?: RolesApi.RoleListParams) {
  return requestClient.get<RolesApi.RoleListResponse>('/roles/', { params });
}

/**
 * Get role by ID with permissions
 */
export async function getRoleApi(id: number) {
  return requestClient.get<RolesApi.RoleWithPermissions>(`/roles/${id}`);
}

/**
 * Create a new role
 */
export async function createRoleApi(data: RolesApi.RoleCreate) {
  return requestClient.post<RolesApi.Role>('/roles/', data);
}

/**
 * Update role
 */
export async function updateRoleApi(id: number, data: RolesApi.RoleUpdate) {
  return requestClient.put<RolesApi.Role>(`/roles/${id}`, data);
}

/**
 * Delete role
 */
export async function deleteRoleApi(id: number) {
  return requestClient.delete(`/roles/${id}`);
}

/**
 * Assign permissions to role
 */
export async function assignPermissionsToRoleApi(roleId: number, permissionIds: number[]) {
  return requestClient.post(`/roles/${roleId}/permissions`, { permission_ids: permissionIds });
}

/**
 * Remove permissions from role
 */
export async function removePermissionsFromRoleApi(roleId: number, permissionIds: number[]) {
  return requestClient.delete(`/roles/${roleId}/permissions`, { data: { permission_ids: permissionIds } });
}
