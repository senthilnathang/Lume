/**
 * RBAC Access Rules API
 * API for record-level access control rules
 */
import { get, post, put, del } from './request';

export interface AccessRule {
  id: number;
  name: string;
  model: string;
  roleId: number;
  permission: 'read' | 'write';
  field?: string | null;
  filter?: Record<string, any> | null;
  isActive: boolean;
  priority: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RbacRole {
  id: number;
  name: string;
  description?: string;
  permissions?: any[];
  isSystem: boolean;
  isActive: boolean;
}

export function getAccessRules(): Promise<AccessRule[]> {
  return get<AccessRule[]>('/rbac/rules');
}

export function createAccessRule(data: Partial<AccessRule>): Promise<AccessRule> {
  return post<AccessRule>('/rbac/rules', data);
}

export function updateAccessRule(id: number, data: Partial<AccessRule>): Promise<AccessRule> {
  return put<AccessRule>(`/rbac/rules/${id}`, data);
}

export function deleteAccessRule(id: number): Promise<void> {
  return del(`/rbac/rules/${id}`);
}

export function getRbacRoles(): Promise<RbacRole[]> {
  return get<RbacRole[]>('/rbac/roles');
}
