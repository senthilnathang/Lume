import { useApi, type ApiResponse } from './useApi';

export function useRbacApi() {
  const { get, post } = useApi();

  return {
    getMenus: () =>
      get<ApiResponse<any[]>>('/api/v1/rbac/menus'),

    getPermissions: () =>
      get<ApiResponse<string[]>>('/api/v1/rbac/permissions'),

    checkPermission: (permission: string) =>
      post<ApiResponse<{ has_permission: boolean }>>('/api/v1/rbac/check', { permission }),
  };
}
