import { baseRequestClient, requestClient } from '#/api/request';

/**
 * Authentication API Namespace
 */
export namespace AuthApi {
  /** Login parameters */
  export interface LoginParams {
    username: string;
    password: string;
    two_factor_code?: string;
  }

  /** Company info from login response */
  export interface CompanyInfo {
    id: number;
    name: string;
    code: string;
    is_default: boolean;
  }

  /** User info from login response */
  export interface UserInfo {
    id: number;
    email: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    is_superuser: boolean;
    two_factor_enabled: boolean;
    current_company_id: number | null;
  }

  /** Login response from FastAPI backend */
  export interface LoginResult {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user: UserInfo;
    companies: CompanyInfo[];
    permissions: string[];
    requires_2fa: boolean;
  }

  /** Refresh token response */
  export interface RefreshResult {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  }

  /** Two-factor setup response */
  export interface TwoFactorSetup {
    secret: string;
    qr_code: string;
    backup_codes: string[];
  }

  /** Password change request */
  export interface PasswordChange {
    current_password: string;
    new_password: string;
  }

  /** Password reset request */
  export interface PasswordReset {
    email: string;
  }

  /** Password reset confirmation */
  export interface PasswordResetConfirm {
    token: string;
    new_password: string;
  }

  /** Switch company request */
  export interface SwitchCompanyRequest {
    company_id: number;
  }

  /** OAuth callback data */
  export interface OAuthCallback {
    code: string;
    state?: string;
  }

  /** Error response */
  export interface ErrorResponse {
    detail?: string;
    message?: string;
  }
}

/**
 * Login to FastVue
 * POST /api/v1/auth/login
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/auth/login', data);
}

/**
 * Logout - invalidate tokens
 * POST /api/v1/auth/logout
 */
export async function logoutApi() {
  try {
    await requestClient.post('/auth/logout');
  } catch {
    // Silent fail - logout should always succeed on client side
  }
}

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export async function refreshTokenApi(refreshToken: string) {
  return baseRequestClient.post<AuthApi.RefreshResult>('/auth/refresh', {
    refresh_token: refreshToken,
  });
}

/**
 * Get current user's permissions
 */
export async function getAccessCodesApi(): Promise<string[]> {
  try {
    const response = await requestClient.get<{ permissions: string[] }>(
      '/auth/me/permissions',
    );
    return response.permissions || [];
  } catch {
    return [];
  }
}

export namespace PermissionApi {
  export interface PermissionResponse {
    permissions: string[];
    roles: string[];
    is_admin: boolean;
    is_superuser: boolean;
  }
}

/**
 * Get full permission info including roles
 * Compatible with store requirements
 */
export async function getPermissionInfoApi(): Promise<PermissionApi.PermissionResponse> {
  try {
    const user = await requestClient.get<AuthApi.UserInfo>('/auth/me');
    const perms = await getAccessCodesApi();

    return {
      permissions: perms,
      roles: user.is_superuser ? ['admin', 'superuser'] : ['user'],
      is_admin: user.is_superuser,
      is_superuser: user.is_superuser,
    };
  } catch {
    return {
      permissions: [],
      roles: ['user'],
      is_admin: false,
      is_superuser: false,
    };
  }
}

/**
 * Check if user is authenticated (validate token)
 */
export async function checkAuthApi() {
  try {
    await requestClient.get('/auth/me');
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// TWO-FACTOR AUTHENTICATION
// =============================================================================

/**
 * Setup two-factor authentication
 * POST /api/v1/auth/2fa/setup
 */
export async function setup2FAApi() {
  return requestClient.post<AuthApi.TwoFactorSetup>('/auth/2fa/setup');
}

/**
 * Enable two-factor authentication (verify setup)
 * POST /api/v1/auth/2fa/enable
 */
export async function enable2FAApi(code: string) {
  return requestClient.post<{ success: boolean }>('/auth/2fa/enable', { code });
}

/**
 * Disable two-factor authentication
 * POST /api/v1/auth/2fa/disable
 */
export async function disable2FAApi(code: string) {
  return requestClient.post<{ success: boolean }>('/auth/2fa/disable', { code });
}

/**
 * Verify two-factor code during login
 * POST /api/v1/auth/2fa/verify
 */
export async function verify2FAApi(code: string) {
  return requestClient.post<AuthApi.LoginResult>('/auth/2fa/verify', { code });
}

/**
 * Use backup code for 2FA
 * POST /api/v1/auth/2fa/backup
 */
export async function use2FABackupCodeApi(backupCode: string) {
  return requestClient.post<AuthApi.LoginResult>('/auth/2fa/backup', {
    backup_code: backupCode,
  });
}

/**
 * Regenerate 2FA backup codes
 * POST /api/v1/auth/2fa/regenerate-backup-codes
 */
export async function regenerate2FABackupCodesApi(code: string) {
  return requestClient.post<{ backup_codes: string[] }>(
    '/auth/2fa/regenerate-backup-codes',
    { code },
  );
}

// =============================================================================
// PASSWORD MANAGEMENT
// =============================================================================

/**
 * Change password
 * POST /api/v1/auth/password/change
 */
export async function changePasswordApi(data: AuthApi.PasswordChange) {
  return requestClient.post<{ success: boolean }>('/auth/password/change', data);
}

/**
 * Request password reset
 * POST /api/v1/auth/password/reset
 */
export async function requestPasswordResetApi(email: string) {
  return baseRequestClient.post<{ success: boolean }>('/auth/password/reset', {
    email,
  });
}

/**
 * Confirm password reset
 * POST /api/v1/auth/password/reset/confirm
 */
export async function confirmPasswordResetApi(data: AuthApi.PasswordResetConfirm) {
  return baseRequestClient.post<{ success: boolean }>(
    '/auth/password/reset/confirm',
    data,
  );
}

// =============================================================================
// COMPANY SWITCHING
// =============================================================================

/**
 * Switch current company
 * POST /api/v1/auth/switch-company
 */
export async function switchCompanyApi(companyId: number) {
  return requestClient.post<AuthApi.LoginResult>('/auth/switch-company', {
    company_id: companyId,
  });
}

// =============================================================================
// OAUTH
// =============================================================================

/**
 * Get OAuth authorization URL
 * GET /api/v1/auth/oauth/{provider}/authorize
 */
export async function getOAuthUrlApi(provider: 'google' | 'github' | 'microsoft') {
  return requestClient.get<{ authorization_url: string }>(
    `/auth/oauth/${provider}/authorize`,
  );
}

/**
 * Handle OAuth callback
 * POST /api/v1/auth/oauth/{provider}/callback
 */
export async function handleOAuthCallbackApi(
  provider: 'google' | 'github' | 'microsoft',
  data: AuthApi.OAuthCallback,
) {
  return requestClient.post<AuthApi.LoginResult>(
    `/auth/oauth/${provider}/callback`,
    data,
  );
}

/**
 * Link OAuth account to existing user
 * POST /api/v1/auth/oauth/{provider}/link
 */
export async function linkOAuthAccountApi(
  provider: 'google' | 'github' | 'microsoft',
  data: AuthApi.OAuthCallback,
) {
  return requestClient.post<{ success: boolean }>(
    `/auth/oauth/${provider}/link`,
    data,
  );
}

/**
 * Unlink OAuth account
 * DELETE /api/v1/auth/oauth/{provider}/unlink
 */
export async function unlinkOAuthAccountApi(
  provider: 'google' | 'github' | 'microsoft',
) {
  return requestClient.delete<{ success: boolean }>(
    `/auth/oauth/${provider}/unlink`,
  );
}

/**
 * Get linked OAuth accounts
 * GET /api/v1/auth/oauth/accounts
 */
export async function getLinkedOAuthAccountsApi() {
  return requestClient.get<
    {
      provider: string;
      provider_email: string;
      linked_at: string;
    }[]
  >('/auth/oauth/accounts');
}
