/**
 * Record API Client
 * TypeScript client for entity record CRUD operations
 * Communicates with: GET/POST /api/entities/:id/records
 */

import { get, post, put, del } from '@/api/request';

export interface RecordData {
  [key: string]: any;
}

export interface CreateRecordParams {
  entityId: number;
  data: RecordData;
}

export interface ListRecordsParams {
  entityId: number;
  page?: number;
  limit?: number;
  filters?: FilterCondition[];
  sort?: SortConfig;
  viewId?: number;
}

export interface FilterCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: any;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ListRecordsResponse {
  records: RecordData[];
  pagination: PaginationResult;
}

export interface RecordResponse {
  id: number;
  data: RecordData;
  createdAt: string;
  createdBy: number;
  updatedAt: string;
  deletedAt?: string;
  companyId: number;
  visibility: string;
}

/**
 * Create a new record
 */
export async function createRecord({
  entityId,
  data
}: CreateRecordParams): Promise<RecordResponse> {
  return post(`/api/entities/${entityId}/records`, data);
}

/**
 * Get a single record by ID
 */
export async function getRecord(entityId: number, recordId: number): Promise<RecordResponse> {
  return get(`/api/entities/${entityId}/records/${recordId}`);
}

/**
 * List records with pagination and filtering
 */
export async function listRecords({
  entityId,
  page = 1,
  limit = 20,
  filters = [],
  sort = { field: 'createdAt', direction: 'desc' },
  viewId
}: ListRecordsParams): Promise<ListRecordsResponse> {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));

  if (filters.length > 0) {
    params.append('filters', JSON.stringify(filters));
  }

  if (sort) {
    params.append('sort', JSON.stringify(sort));
  }

  if (viewId) {
    params.append('view', String(viewId));
  }

  return get(`/api/entities/${entityId}/records?${params.toString()}`);
}

/**
 * Update a record
 */
export async function updateRecord(
  entityId: number,
  recordId: number,
  data: Partial<RecordData>
): Promise<RecordResponse> {
  return put(`/api/entities/${entityId}/records/${recordId}`, data);
}

/**
 * Delete a record (soft or hard delete)
 */
export async function deleteRecord(
  entityId: number,
  recordId: number,
  hardDelete: boolean = false
): Promise<{ success: boolean; message: string }> {
  return del(`/api/entities/${entityId}/records/${recordId}?hard=${hardDelete}`);
}

/**
 * Link two records via relationship
 */
export async function linkRecords(
  entityId: number,
  recordId: number,
  relationshipId: number,
  targetRecordId: number
): Promise<{ success: boolean; data: any }> {
  return post(
    `/api/entities/${entityId}/records/${recordId}/relationships`,
    {
      relationshipId,
      targetRecordId
    }
  );
}

/**
 * Unlink two records
 */
export async function unlinkRecords(
  entityId: number,
  recordId: number,
  relationshipId: number,
  targetRecordId: number
): Promise<{ success: boolean }> {
  return del(
    `/api/entities/${entityId}/records/${recordId}/relationships`,
    {
      relationshipId,
      targetRecordId
    }
  );
}

/**
 * Get view definition and metadata
 */
export async function getViewDefinition(entityId: number, viewId: number): Promise<any> {
  return get(`/api/entities/${entityId}/views/${viewId}/render`);
}

/**
 * Get all views for an entity
 */
export async function getEntityViews(entityId: number): Promise<any[]> {
  return get(`/api/entities/${entityId}/views`);
}

/**
 * Bulk import records
 */
export async function bulkImportRecords(
  entityId: number,
  records: RecordData[]
): Promise<{ jobId: string; status: string }> {
  return post(`/api/queue/entity-records/job`, {
    data: {
      type: 'bulk-import',
      entityId,
      records
    }
  });
}

/**
 * Bulk export records
 */
export async function bulkExportRecords(
  entityId: number,
  format: 'csv' | 'xlsx' | 'pdf' = 'csv'
): Promise<{ jobId: string; status: string }> {
  return post(`/api/queue/exports/job`, {
    data: {
      format,
      entityId
    }
  });
}

/**
 * Bulk delete records
 */
export async function bulkDeleteRecords(
  entityId: number,
  recordIds: number[],
  softDelete: boolean = true
): Promise<{ jobId: string; status: string }> {
  return post(`/api/queue/entity-records/job`, {
    data: {
      type: 'bulk-delete',
      entityId,
      recordIds,
      softDelete
    }
  });
}

export default {
  createRecord,
  getRecord,
  listRecords,
  updateRecord,
  deleteRecord,
  linkRecords,
  unlinkRecords,
  getViewDefinition,
  getEntityViews,
  bulkImportRecords,
  bulkExportRecords,
  bulkDeleteRecords
};
