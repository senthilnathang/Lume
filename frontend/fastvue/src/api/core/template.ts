import { requestClient } from '#/api/request';

/**
 * Text Template API Namespace
 */
export namespace TemplateApi {
  /** Template data */
  export interface Template {
    id: number;
    name: string;
    shortcut: string;
    content: string;
    category: string | null;
    is_system: boolean;
    is_active: boolean;
    use_count: number;
    user_id: number | null;
    company_id: number | null;
    created_at: string;
    updated_at: string | null;
  }

  /** Template list response */
  export interface ListResponse {
    items: Template[];
    total: number;
  }

  /** Create template request */
  export interface CreateRequest {
    name: string;
    shortcut: string;
    content: string;
    category?: string;
    is_system?: boolean;
  }

  /** Update template request */
  export interface UpdateRequest {
    name?: string;
    shortcut?: string;
    content?: string;
    category?: string;
    is_active?: boolean;
  }

  /** Expand template response */
  export interface ExpandResponse {
    found: boolean;
    shortcut: string;
    content: string | null;
    template: Template | null;
  }
}

/**
 * List all templates
 */
export async function listTemplatesApi(params?: {
  category?: string;
  include_system?: boolean;
}) {
  return requestClient.get<TemplateApi.ListResponse>('/templates/', { params });
}

/**
 * Search templates
 */
export async function searchTemplatesApi(query: string, limit: number = 10) {
  return requestClient.get<TemplateApi.Template[]>('/templates/search', {
    params: { q: query, limit },
  });
}

/**
 * Expand a template shortcut
 */
export async function expandTemplateApi(shortcut: string) {
  return requestClient.post<TemplateApi.ExpandResponse>('/templates/expand', {
    shortcut,
  });
}

/**
 * Get template by ID
 */
export async function getTemplateApi(templateId: number) {
  return requestClient.get<TemplateApi.Template>(`/templates/${templateId}`);
}

/**
 * Create a template
 */
export async function createTemplateApi(data: TemplateApi.CreateRequest) {
  return requestClient.post<TemplateApi.Template>('/templates/', data);
}

/**
 * Update a template
 */
export async function updateTemplateApi(
  templateId: number,
  data: TemplateApi.UpdateRequest,
) {
  return requestClient.put<TemplateApi.Template>(
    `/templates/${templateId}`,
    data,
  );
}

/**
 * Delete a template
 */
export async function deleteTemplateApi(templateId: number) {
  return requestClient.delete(`/templates/${templateId}`);
}

/**
 * Get template categories
 */
export async function getTemplateCategoriesApi() {
  return requestClient.get<string[]>('/templates/categories/list');
}
