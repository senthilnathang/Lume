/**
 * Media API
 * API for media library management
 */
import { get, post, put, del } from '@/api/request';

export interface MediaItem {
  id: number;
  title: string;
  description?: string;
  filename: string;
  original_name?: string;
  mime_type?: string;
  size?: number;
  type: 'image' | 'video' | 'document' | 'audio' | 'other';
  category?: string;
  path: string;
  url?: string;
  thumbnail_url?: string;
  alt_text?: string;
  caption?: string;
  width?: number;
  height?: number;
  uploaded_by?: number;
  downloads: number;
  views: number;
  is_public: boolean;
  is_featured: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface MediaStats {
  total: number;
  images: number;
  videos: number;
  featured: number;
  totalViews: number;
}

export interface CreateMediaData {
  title: string;
  filename: string;
  path: string;
  type?: string;
  description?: string;
  original_name?: string;
  mime_type?: string;
  size?: number;
  category?: string;
  url?: string;
  thumbnail_url?: string;
  alt_text?: string;
  caption?: string;
  width?: number;
  height?: number;
  is_public?: boolean;
  is_featured?: boolean;
  metadata?: Record<string, any>;
}

export function getMedia(params?: Record<string, any>): Promise<any> {
  return get('/media', params);
}

export function getMediaItem(id: number): Promise<MediaItem> {
  return get<MediaItem>(`/media/${id}`);
}

export function getMediaStats(): Promise<MediaStats> {
  return get<MediaStats>('/media/stats');
}

export function getFeaturedMedia(): Promise<MediaItem[]> {
  return get<MediaItem[]>('/media/featured');
}

export function getMediaByCategory(category: string): Promise<MediaItem[]> {
  return get<MediaItem[]>(`/media/category/${category}`);
}

export function createMedia(data: CreateMediaData): Promise<MediaItem> {
  return post<MediaItem>('/media', data);
}

export function updateMedia(id: number, data: Partial<CreateMediaData>): Promise<MediaItem> {
  return put<MediaItem>(`/media/${id}`, data);
}

export function deleteMedia(id: number): Promise<void> {
  return del(`/media/${id}`);
}

export function downloadMedia(id: number): Promise<any> {
  return post(`/media/${id}/download`);
}
