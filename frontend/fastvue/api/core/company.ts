import { requestClient } from '#/api/request';

/**
 * Company API Namespace
 */
export namespace CompanyApi {
  /** Company */
  export interface Company {
    id: number;
    name: string;
    code: string;
    description: string | null;
    parent_company_id: number | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    zip_code: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    tax_id: string | null;
    registration_number: string | null;
    date_format: string;
    time_format: string;
    timezone: string;
    currency: string;
    logo_url: string | null;
    is_headquarters: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
  }

  /** Company create params */
  export interface CompanyCreate {
    name: string;
    code: string;
    description?: string;
    parent_company_id?: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zip_code?: string;
    phone?: string;
    email?: string;
    website?: string;
    tax_id?: string;
    registration_number?: string;
    date_format?: string;
    time_format?: string;
    timezone?: string;
    currency?: string;
    is_headquarters?: boolean;
    is_active?: boolean;
  }

  /** Company update params */
  export interface CompanyUpdate {
    name?: string;
    description?: string;
    parent_company_id?: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zip_code?: string;
    phone?: string;
    email?: string;
    website?: string;
    tax_id?: string;
    registration_number?: string;
    date_format?: string;
    time_format?: string;
    timezone?: string;
    currency?: string;
    logo_url?: string;
    is_headquarters?: boolean;
    is_active?: boolean;
  }

  /** Paginated response */
  export interface CompanyList {
    total: number;
    items: Company[];
    page: number;
    page_size: number;
  }
}

/**
 * Get companies list
 */
export async function getCompaniesApi(params?: {
  page?: number;
  page_size?: number;
  is_active?: boolean;
}) {
  return requestClient.get<CompanyApi.CompanyList>('/companies/', { params });
}

/**
 * Get my companies
 */
export async function getMyCompaniesApi() {
  return requestClient.get<CompanyApi.Company[]>('/companies/my-companies');
}

/**
 * Get company by ID
 */
export async function getCompanyApi(id: number) {
  return requestClient.get<CompanyApi.Company>(`/companies/${id}`);
}

/**
 * Create company
 */
export async function createCompanyApi(data: CompanyApi.CompanyCreate) {
  return requestClient.post<CompanyApi.Company>('/companies/', data);
}

/**
 * Update company
 */
export async function updateCompanyApi(id: number, data: CompanyApi.CompanyUpdate) {
  return requestClient.put<CompanyApi.Company>(`/companies/${id}`, data);
}

/**
 * Delete company
 */
export async function deleteCompanyApi(id: number) {
  return requestClient.delete(`/companies/${id}`);
}

/**
 * Get company users
 */
export async function getCompanyUsersApi(companyId: number, params?: {
  page?: number;
  page_size?: number;
}) {
  return requestClient.get(`/companies/${companyId}/users`, { params });
}
