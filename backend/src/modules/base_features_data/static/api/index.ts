/**
 * Features & Data API
 * API for feature flags, data import/export, and backups
 */
import { get, post, put, del } from '@/api/request';

export interface FeatureFlag {
  id: number;
  name: string;
  key: string;
  description?: string;
  enabled: boolean;
  enabledFor?: number[];
  disabledFor?: number[];
  config?: Record<string, any>;
  expiresAt?: string;
  sequence: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataImport {
  id: number;
  name: string;
  model: string;
  fileName?: string;
  filePath?: string;
  mapping?: Record<string, any>;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  errors?: any[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  importedBy?: number;
  createdAt?: string;
}

export interface DataExport {
  id: number;
  name: string;
  model: string;
  filters?: Record<string, any>;
  fields?: string[];
  format: 'csv' | 'json' | 'xlsx';
  filePath?: string;
  fileSize?: number;
  recordCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  exportedBy?: number;
  createdAt?: string;
}

export interface Backup {
  id: number;
  name: string;
  type: 'full' | 'partial' | 'incremental';
  filePath?: string;
  fileSize?: number;
  tables?: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdBy?: number;
  createdAt?: string;
}

// Feature Flags
export function getFeatureFlags(): Promise<FeatureFlag[]> {
  return get<FeatureFlag[]>('/base_features_data/flags');
}

export function createFeatureFlag(data: Partial<FeatureFlag>): Promise<FeatureFlag> {
  return post<FeatureFlag>('/base_features_data/flags', data);
}

export function updateFeatureFlag(id: number, data: Partial<FeatureFlag>): Promise<FeatureFlag> {
  return put<FeatureFlag>(`/base_features_data/flags/${id}`, data);
}

export function deleteFeatureFlag(id: number): Promise<void> {
  return del(`/base_features_data/flags/${id}`);
}

export function toggleFeatureFlag(key: string, enabled: boolean): Promise<FeatureFlag> {
  return post<FeatureFlag>(`/base_features_data/flags/${key}/toggle`, { enabled });
}

// Imports
export function getImports(): Promise<DataImport[]> {
  return get<DataImport[]>('/base_features_data/imports');
}

export function createImport(data: { name: string; model: string; fileName?: string; mapping?: Record<string, any> }): Promise<DataImport> {
  return post<DataImport>('/base_features_data/imports', data);
}

// Exports
export function getExports(): Promise<DataExport[]> {
  return get<DataExport[]>('/base_features_data/exports');
}

export function createExport(data: { name: string; model: string; format?: string; filters?: Record<string, any>; fields?: string[] }): Promise<DataExport> {
  return post<DataExport>('/base_features_data/exports', data);
}

// Backups
export function getBackups(): Promise<Backup[]> {
  return get<Backup[]>('/base_features_data/backups');
}

export function createBackup(data: { name: string; type?: string; tables?: string[] }): Promise<Backup> {
  return post<Backup>('/base_features_data/backups', data);
}
