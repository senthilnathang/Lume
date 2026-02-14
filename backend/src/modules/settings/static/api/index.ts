/**
 * Settings API
 * API for application settings management
 */
import { get, post, put, del } from '@/api/request';

export interface Setting {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  category: string;
  description?: string;
  is_encrypted: boolean;
  is_public: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface BulkSettingData {
  key: string;
  value: any;
  type?: string;
  category?: string;
  description?: string;
  is_public?: boolean;
  is_encrypted?: boolean;
}

export function getSettings(): Promise<Setting[]> {
  return get<Setting[]>('/settings');
}

export function getSettingsByCategory(category: string): Promise<Setting[]> {
  return get<Setting[]>(`/settings/category/${category}`);
}

export function getSetting(key: string): Promise<Setting> {
  return get<Setting>(`/settings/${key}`);
}

export function createSetting(data: BulkSettingData): Promise<Setting> {
  return post<Setting>('/settings', data);
}

export function updateSetting(key: string, data: Partial<BulkSettingData>): Promise<Setting> {
  return put<Setting>(`/settings/${key}`, data);
}

export function deleteSetting(key: string): Promise<void> {
  return del(`/settings/${key}`);
}

export function bulkSetSettings(settings: BulkSettingData[]): Promise<any> {
  return post('/settings/bulk', { settings });
}

export function initializeDefaults(): Promise<any> {
  return post('/settings/initialize');
}
