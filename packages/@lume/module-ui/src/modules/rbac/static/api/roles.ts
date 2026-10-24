/**
 * Roles API
 * API for role management
 */
import { get, post, put, del } from '@/api/request';

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  is_system: boolean;
  metadata?: Record<string, any>;
  permissions?: RolePermission[];
  created_at?: string;
  updated_at?: string;
}

export interface RolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  action: string;
}

export interface CreateRoleData {
  name: string;
  display_name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateRoleData {
  display_name?: string;
  description?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export function getRoles(): Promise<Role[]> {
  return get<Role[]>('/rbac/roles');
}

export function getRole(id: number): Promise<Role> {
  return get<Role>(`/rbac/roles/${id}`);
}

export function createRole(data: CreateRoleData): Promise<Role> {
  return post<Role>('/rbac/roles', data);
}

export function updateRole(id: number, data: UpdateRoleData): Promise<Role> {
  return put<Role>(`/rbac/roles/${id}`, data);
}

export function deleteRole(id: number): Promise<void> {
  return del(`/rbac/roles/${id}`);
}
