/**
 * Groups API
 * API for group management
 */
import { get, post, put, del } from '@/api/request';

export interface Group {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

const fromNest = (row: any): Group => ({ ...row, is_active: row.isActive,
  created_at: row.createdAt, updated_at: row.updatedAt });
const toNest = (data: UpdateGroupData) => ({ name: data.name, description: data.description, isActive: data.is_active });

export async function getGroups(params?: Record<string, any>): Promise<Group[]> {
  return (await get<any[]>('/admin/groups', params)).map(fromNest);
}

export async function getGroup(id: number): Promise<Group> {
  return fromNest(await get(`/admin/groups/${id}`));
}

export async function createGroup(data: CreateGroupData): Promise<Group> {
  return fromNest(await post('/admin/groups', toNest(data)));
}

export async function updateGroup(id: number, data: UpdateGroupData): Promise<Group> {
  return fromNest(await put(`/admin/groups/${id}`, toNest(data)));
}

export function deleteGroup(id: number): Promise<void> {
  return del(`/admin/groups/${id}`);
}
