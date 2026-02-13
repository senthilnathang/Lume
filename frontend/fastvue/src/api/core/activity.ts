import { requestClient } from '#/api/request';

export namespace ActivityApi {
  export interface ActivityLog {
    id: number;
    event_id: string;
    user_id: number | null;
    company_id: number | null;
    action: string;
    category: string;
    level: string;
    entity_type: string;
    entity_id: number | null;
    entity_name: string | null;
    description: string | null;
    ip_address: string | null;
    user_agent: string | null;
    success: boolean;
    created_at: string;
    user?: {
      id: number;
      username: string;
      email: string;
      full_name: string | null;
    };
  }

  export interface ActivityListParams {
    page?: number;
    page_size?: number;
    user_id?: number;
    entity_type?: string;
    entity_id?: number;
    action?: string;
    category?: string;
    level?: string;
    model_name?: string;
    record_id?: number;
    start_date?: string;
    end_date?: string;
  }

  export interface ActivityListResponse {
    total: number;
    items: ActivityLog[];
    page: number;
    page_size: number;
  }

  export interface ActivityStats {
    total_activities: number;
    by_category: Record<string, number>;
    by_action: Record<string, number>;
    by_level: Record<string, number>;
  }
}

/**
 * Get list of activity logs
 */
export async function getActivityLogsApi(params?: ActivityApi.ActivityListParams) {
  return requestClient.get<ActivityApi.ActivityListResponse>('/activity-logs/', { params });
}

/**
 * Get activity log by ID
 */
export async function getActivityLogApi(id: number) {
  return requestClient.get<ActivityApi.ActivityLog>(`/activity-logs/${id}`);
}

/**
 * Get activity logs for a specific entity
 */
export async function getEntityActivityLogsApi(entityType: string, entityId: number, params?: { limit?: number }) {
  return requestClient.get<ActivityApi.ActivityListResponse>(`/activity-logs/entity/${entityType}/${entityId}`, { params });
}

/**
 * Get activity logs for current user
 */
export async function getMyActivityLogsApi(params?: ActivityApi.ActivityListParams) {
  return requestClient.get<ActivityApi.ActivityListResponse>('/activity-logs/me', { params });
}

/**
 * Get activity statistics
 */
export async function getActivityStatsApi(params?: { start_date?: string; end_date?: string }) {
  return requestClient.get<ActivityApi.ActivityStats>('/activity-logs/stats', { params });
}
