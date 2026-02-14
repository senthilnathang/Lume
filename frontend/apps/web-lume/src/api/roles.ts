/**
 * Roles API
 * API for role management
 */
import { get, post, put, del } from './request';

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
  return get<Role[]>('/auth/roles');
}

export function getRole(id: number): Promise<Role> {
  return get<Role>(`/auth/roles/${id}`);
}

export function createRole(data: CreateRoleData): Promise<Role> {
  return post<Role>('/auth/roles', data);
}

export function updateRole(id: number, data: UpdateRoleData): Promise<Role> {
  return put<Role>(`/auth/roles/${id}`, data);
}

export function deleteRole(id: number): Promise<void> {
  return del(`/auth/roles/${id}`);
}
