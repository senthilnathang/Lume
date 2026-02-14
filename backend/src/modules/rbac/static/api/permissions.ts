/**
 * Permissions API
 * API for viewing permissions (read-only, module-defined)
 */
import { get } from '@/api/request';

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  category: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function getPermissions(): Promise<Permission[]> {
  return get<Permission[]>('/rbac/permissions');
}
