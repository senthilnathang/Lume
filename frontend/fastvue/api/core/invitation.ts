import { requestClient } from '#/api/request';

/**
 * User Invitation API
 */
export namespace InvitationApi {
  /** Invitation status enum */
  export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled' | 'resent';

  /** Company info in invitation */
  export interface InvitationCompany {
    id: number;
    name: string;
    logo_url: string | null;
  }

  /** Role info in invitation */
  export interface InvitationRole {
    id: number;
    name: string;
    code: string | null;
  }

  /** User info in invitation */
  export interface InvitationUser {
    id: number;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  }

  /** Full invitation response */
  export interface Invitation {
    id: number;
    email: string;
    status: InvitationStatus;
    company_id: number;
    role_id: number | null;
    message: string | null;
    expires_at: string;
    accepted_at: string | null;
    email_sent: boolean;
    email_sent_at: string | null;
    resend_count: number;
    created_at: string;
    company: InvitationCompany | null;
    role: InvitationRole | null;
    invited_by: InvitationUser | null;
  }

  /** Paginated invitation list response */
  export interface InvitationListResponse {
    items: Invitation[];
    total: number;
    page: number;
    page_size: number;
  }

  /** Invitation statistics */
  export interface InvitationStats {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    cancelled: number;
  }

  /** Create invitation params */
  export interface CreateInvitationParams {
    email: string;
    company_id: number;
    role_id?: number;
    group_ids?: number[];
    message?: string;
    expiry_hours?: number;
  }

  /** List invitation params */
  export interface ListInvitationParams {
    page?: number;
    page_size?: number;
    search?: string;
    status?: InvitationStatus;
  }

  /** Resend invitation params */
  export interface ResendInvitationParams {
    extend_expiry?: boolean;
  }
}

const BASE_URL = '/invitations';

/**
 * Get paginated list of invitations
 */
export function getInvitationsApi(
  params: InvitationApi.ListInvitationParams = {},
): Promise<InvitationApi.InvitationListResponse> {
  return requestClient.get(BASE_URL, { params });
}

/**
 * Get invitation statistics
 */
export function getInvitationStatsApi(): Promise<InvitationApi.InvitationStats> {
  return requestClient.get(`${BASE_URL}/stats/`);
}

/**
 * Create a new invitation
 */
export function createInvitationApi(
  data: InvitationApi.CreateInvitationParams,
): Promise<InvitationApi.Invitation> {
  return requestClient.post(BASE_URL, data);
}

/**
 * Get single invitation by ID
 */
export function getInvitationApi(id: number): Promise<InvitationApi.Invitation> {
  return requestClient.get(`${BASE_URL}/${id}`);
}

/**
 * Resend an invitation
 */
export function resendInvitationApi(
  id: number,
  data: InvitationApi.ResendInvitationParams = {},
): Promise<InvitationApi.Invitation> {
  return requestClient.post(`${BASE_URL}/${id}/resend`, data);
}

/**
 * Cancel an invitation
 */
export function cancelInvitationApi(id: number): Promise<void> {
  return requestClient.delete(`${BASE_URL}/${id}`);
}
