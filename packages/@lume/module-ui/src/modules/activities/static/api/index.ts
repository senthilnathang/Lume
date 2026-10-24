/**
 * Activities API
 * API for activity management
 */
import { get, post, put, del } from '@/api/request';

export interface Activity {
  id: number;
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  category?: string;
  status: 'draft' | 'published' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  location?: string;
  cover_image?: string;
  gallery?: string[];
  capacity?: number;
  registered_count: number;
  is_featured: boolean;
  metadata?: Record<string, any>;
  created_by?: number;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityStats {
  total: number;
  published: number;
  upcoming: number;
  featured: number;
}

export interface CreateActivityData {
  title: string;
  short_description?: string;
  description?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  cover_image?: string;
  capacity?: number;
  is_featured?: boolean;
}

export function getActivities(params?: Record<string, any>): Promise<any> {
  return get('/activities', params);
}

export function getActivity(id: number): Promise<Activity> {
  return get<Activity>(`/activities/${id}`);
}

export function getActivityStats(): Promise<ActivityStats> {
  return get<ActivityStats>('/activities/stats');
}

export function getUpcomingActivities(limit?: number): Promise<Activity[]> {
  return get<Activity[]>('/activities/upcoming', limit ? { limit } : undefined);
}

export function createActivity(data: CreateActivityData): Promise<Activity> {
  return post<Activity>('/activities', data);
}

export function updateActivity(id: number, data: Partial<CreateActivityData>): Promise<Activity> {
  return put<Activity>(`/activities/${id}`, data);
}

export function deleteActivity(id: number): Promise<void> {
  return del(`/activities/${id}`);
}

export function publishActivity(id: number): Promise<Activity> {
  return post<Activity>(`/activities/${id}/publish`);
}

export function cancelActivity(id: number): Promise<Activity> {
  return post<Activity>(`/activities/${id}/cancel`);
}
