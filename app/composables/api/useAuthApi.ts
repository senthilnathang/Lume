import { useApi, type ApiResponse } from './useApi';

export function useAuthApi() {
  const { post, get } = useApi();

  return {
    login: (credentials: { username: string; password: string; totp_code?: string }) =>
      post<ApiResponse<any>>('/api/v1/auth/login', credentials),

    register: (payload: { email: string; username: string; password: string; full_name: string }) =>
      post<ApiResponse<any>>('/api/v1/auth/register', payload),

    refresh: (refreshToken: string) =>
      post<ApiResponse<any>>('/api/v1/auth/refresh', { refresh_token: refreshToken }),

    me: () =>
      get<ApiResponse<any>>('/api/v1/auth/me'),

    logout: () =>
      post<ApiResponse<any>>('/api/v1/auth/logout'),

    changePassword: (payload: { current_password: string; new_password: string }) =>
      post<ApiResponse<any>>('/api/v1/auth/password/change', payload),

    switchCompany: (companyId: number) =>
      post<ApiResponse<any>>('/api/v1/auth/company/switch', { company_id: companyId }),

    getCsrfToken: () =>
      get<ApiResponse<any>>('/api/v1/auth/csrf-token'),
  };
}
