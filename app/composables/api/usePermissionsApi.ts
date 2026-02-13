import { useApi, type ApiResponse, type PaginatedApiResponse, type ListParams } from './useApi';

export function usePermissionsApi() {
  const { get, post, put, del } = useApi();
  const base = '/api/v1/permissions';

  return {
    list: (params?: ListParams) =>
      get<PaginatedApiResponse<any>>(base, params),

    getById: (id: number) =>
      get<ApiResponse<any>>(`${base}/${id}`),

    create: (payload: any) =>
      post<ApiResponse<any>>(base, payload),

    update: (id: number, payload: any) =>
      put<ApiResponse<any>>(`${base}/${id}`, payload),

    delete: (id: number) =>
      del<ApiResponse<any>>(`${base}/${id}`),
  };
}
