/**
 * Documents API
 * API for document management
 */
import { get, post, put, del } from '@/api/request';

export interface Document {
  id: number;
  title: string;
  filename: string;
  original_name?: string;
  mime_type?: string;
  size?: number;
  type: 'image' | 'video' | 'document' | 'audio' | 'other';
  category?: string;
  path: string;
  url?: string;
  description?: string;
  tags?: string[];
  uploaded_by?: number;
  is_public: boolean;
  downloads: number;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentStats {
  total: number;
  images: number;
  videos: number;
  documents: number;
  totalDownloads: number;
}

export interface CreateDocumentData {
  title: string;
  filename: string;
  path: string;
  type?: string;
  original_name?: string;
  mime_type?: string;
  size?: number;
  category?: string;
  url?: string;
  description?: string;
  tags?: string[];
  is_public?: boolean;
  metadata?: Record<string, any>;
}

export function getDocuments(params?: Record<string, any>): Promise<any> {
  return get('/documents', params);
}

export function getDocument(id: number): Promise<Document> {
  return get<Document>(`/documents/${id}`);
}

export function getDocumentStats(): Promise<DocumentStats> {
  return get<DocumentStats>('/documents/stats');
}

export function createDocument(data: CreateDocumentData): Promise<Document> {
  return post<Document>('/documents', data);
}

export function updateDocument(id: number, data: Partial<CreateDocumentData>): Promise<Document> {
  return put<Document>(`/documents/${id}`, data);
}

export function deleteDocument(id: number): Promise<void> {
  return del(`/documents/${id}`);
}

export function downloadDocument(id: number): Promise<any> {
  return post(`/documents/${id}/download`);
}
