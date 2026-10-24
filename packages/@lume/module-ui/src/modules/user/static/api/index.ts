/**
 * Users API
 * API for user management
 */
import { get, post, put, del } from '@/api/request';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar?: string;
  role_id: number;
  is_active: boolean;
  is_email_verified?: boolean;
  last_login?: string;
  login_attempts?: number;
  lock_until?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
}

export interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role_id?: number;
  is_active?: boolean;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar?: string;
  role_id?: number;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface ChangePasswordData {
  old_password?: string;
  new_password: string;
}

export interface UsersResponse {
  data: User[];
  meta?: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export function getUsers(params?: Record<string, any>): Promise<any> {
  return get('/users', params);
}

export function getUser(id: number): Promise<User> {
  return get<User>(`/users/${id}`);
}

export function getUserStats(): Promise<UserStats> {
  return get<UserStats>('/users/stats');
}

export function createUser(data: CreateUserData): Promise<User> {
  const { first_name, last_name, is_active, ...rest } = data;
  return post<User>('/users', { ...rest, firstName: first_name, lastName: last_name, isActive: is_active });
}

export function updateUser(id: number, data: UpdateUserData): Promise<User> {
  const { first_name, last_name, is_active, metadata, ...rest } = data;
  return put<User>(`/users/${id}`, { ...rest, firstName: first_name, lastName: last_name, isActive: is_active });
}

export function deleteUser(id: number): Promise<void> {
  return del(`/users/${id}`);
}

export function changePassword(id: number, data: ChangePasswordData): Promise<void> {
  return put(`/users/${id}`, { password: data.new_password });
}
