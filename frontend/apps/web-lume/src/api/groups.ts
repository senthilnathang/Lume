/**
 * Groups API
 * API for group management
 */
import { get, post, put, del } from './request';

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

export function getGroups(params?: Record<string, any>): Promise<Group[]> {
  return get<Group[]>('/base/groups', params);
}

export function getGroup(id: number): Promise<Group> {
  return get<Group>(`/base/groups/${id}`);
}

export function createGroup(data: CreateGroupData): Promise<Group> {
  return post<Group>('/base/groups', data);
}

export function updateGroup(id: number, data: UpdateGroupData): Promise<Group> {
  return put<Group>(`/base/groups/${id}`, data);
}

export function deleteGroup(id: number): Promise<void> {
  return del(`/base/groups/${id}`);
}
