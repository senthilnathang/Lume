import { useApi, type ApiResponse, type PaginatedApiResponse, type ListParams } from './useApi';

export function useUsersApi() {
  const { get, post, put, del } = useApi();
  const base = '/api/v1/users';

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

    assignRole: (userId: number, roleId: number, companyId?: number) =>
      post<ApiResponse<any>>(`${base}/${userId}/roles/${roleId}`, { company_id: companyId }),

    removeRole: (userId: number, roleId: number) =>
      del<ApiResponse<any>>(`${base}/${userId}/roles/${roleId}`),

    addToGroup: (userId: number, groupId: number) =>
      post<ApiResponse<any>>(`${base}/${userId}/groups/${groupId}`),

    removeFromGroup: (userId: number, groupId: number) =>
      del<ApiResponse<any>>(`${base}/${userId}/groups/${groupId}`),
  };
}
