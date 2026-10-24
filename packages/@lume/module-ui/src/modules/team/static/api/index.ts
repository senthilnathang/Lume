/**
 * Team API
 * API for team member management
 */
import { get, post, put, del } from '@/api/request';

export interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  bio?: string;
  photo?: string;
  order: number;
  is_active: boolean;
  is_leader: boolean;
  social_links?: Record<string, string>;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTeamMemberData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  bio?: string;
  photo?: string;
  is_active?: boolean;
  is_leader?: boolean;
  social_links?: Record<string, string>;
}

export function getTeamMembers(params?: Record<string, any>): Promise<any> {
  return get('/team', params);
}

export function getTeamMember(id: number): Promise<TeamMember> {
  return get<TeamMember>(`/team/${id}`);
}

export function getActiveMembers(): Promise<TeamMember[]> {
  return get<TeamMember[]>('/team/active');
}

export function getLeaders(): Promise<TeamMember[]> {
  return get<TeamMember[]>('/team/leaders');
}

export function getDepartments(): Promise<string[]> {
  return get<string[]>('/team/departments');
}

export function createTeamMember(data: CreateTeamMemberData): Promise<TeamMember> {
  return post<TeamMember>('/team', data);
}

export function updateTeamMember(id: number, data: Partial<CreateTeamMemberData>): Promise<TeamMember> {
  return put<TeamMember>(`/team/${id}`, data);
}

export function deleteTeamMember(id: number): Promise<void> {
  return del(`/team/${id}`);
}

export function reorderMembers(data: { ids: number[] }): Promise<void> {
  return post('/team/reorder', data);
}
