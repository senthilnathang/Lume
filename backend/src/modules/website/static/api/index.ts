import { get, post, put, del } from '@/api/request';
import axios from 'axios';

const BASE = '/website';

// --- Pages ---
export const getPages = (params?: Record<string, any>) => get(`${BASE}/pages`, { params });
export const getPage = (id: number) => get(`${BASE}/pages/${id}`);
export const createPage = (data: Record<string, any>) => post(`${BASE}/pages`, data);
export const updatePage = (id: number, data: Record<string, any>) => put(`${BASE}/pages/${id}`, data);
export const deletePage = (id: number) => del(`${BASE}/pages/${id}`);
export const publishPage = (id: number) => post(`${BASE}/pages/${id}/publish`);
export const unpublishPage = (id: number) => post(`${BASE}/pages/${id}/unpublish`);
export const getPageBySlug = (slug: string) => get(`${BASE}/public/pages/${slug}`);

// --- Page Revisions ---
export const getRevisions = (pageId: number, params?: Record<string, any>) => get(`${BASE}/pages/${pageId}/revisions`, { params });
export const getRevision = (pageId: number, revId: number) => get(`${BASE}/pages/${pageId}/revisions/${revId}`);
export const revertToRevision = (pageId: number, revId: number) => post(`${BASE}/pages/${pageId}/revisions/${revId}/revert`);
export const autoSavePage = (pageId: number, data: Record<string, any>) => post(`${BASE}/pages/${pageId}/autosave`, data);

// --- Menus ---
export const getMenus = () => get(`${BASE}/menus`);
export const getMenu = (id: number) => get(`${BASE}/menus/${id}`);
export const createMenu = (data: Record<string, any>) => post(`${BASE}/menus`, data);
export const updateMenu = (id: number, data: Record<string, any>) => put(`${BASE}/menus/${id}`, data);
export const deleteMenu = (id: number) => del(`${BASE}/menus/${id}`);
export const addMenuItem = (menuId: number, data: Record<string, any>) => post(`${BASE}/menus/${menuId}/items`, data);
export const updateMenuItem = (id: number, data: Record<string, any>) => put(`${BASE}/menu-items/${id}`, data);
export const deleteMenuItem = (id: number) => del(`${BASE}/menu-items/${id}`);
export const reorderMenuItems = (menuId: number, items: Array<{ id: number; parentId: number | null; sequence: number }>) =>
  put(`${BASE}/menus/${menuId}/reorder`, { items });

// --- Media ---
export const getMediaList = (params?: Record<string, any>) => get(`${BASE}/media`, { params });
export const uploadMedia = (formData: FormData) => {
  return axios.post(`/api${BASE}/media/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data?.data || res.data);
};
export const uploadMultipleMedia = (formData: FormData) => {
  return axios.post(`/api${BASE}/media/upload-multiple`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data?.data || res.data);
};
export const createMedia = (data: Record<string, any>) => post(`${BASE}/media`, data);
export const updateMedia = (id: number, data: Record<string, any>) => put(`${BASE}/media/${id}`, data);
export const deleteMedia = (id: number) => del(`${BASE}/media/${id}`);

// --- Forms ---
export const getForms = (params?: Record<string, any>) => get(`${BASE}/forms`, { params });
export const getForm = (id: number) => get(`${BASE}/forms/${id}`);
export const createForm = (data: Record<string, any>) => post(`${BASE}/forms`, data);
export const updateForm = (id: number, data: Record<string, any>) => put(`${BASE}/forms/${id}`, data);
export const deleteForm = (id: number) => del(`${BASE}/forms/${id}`);

// --- Form Submissions ---
export const getSubmissions = (formId: number, params?: Record<string, any>) => get(`${BASE}/forms/${formId}/submissions`, { params });
export const markSubmissionRead = (formId: number, subId: number) => post(`${BASE}/forms/${formId}/submissions/${subId}/read`);
export const deleteSubmission = (formId: number, subId: number) => del(`${BASE}/forms/${formId}/submissions/${subId}`);

// --- Theme Templates ---
export const getThemeTemplates = (params?: Record<string, any>) => get(`${BASE}/theme-templates`, { params });
export const getThemeTemplate = (id: number) => get(`${BASE}/theme-templates/${id}`);
export const createThemeTemplate = (data: Record<string, any>) => post(`${BASE}/theme-templates`, data);
export const updateThemeTemplate = (id: number, data: Record<string, any>) => put(`${BASE}/theme-templates/${id}`, data);
export const deleteThemeTemplate = (id: number) => del(`${BASE}/theme-templates/${id}`);

// --- Popups ---
export const getPopups = (params?: Record<string, any>) => get(`${BASE}/popups`, { params });
export const getPopup = (id: number) => get(`${BASE}/popups/${id}`);
export const createPopup = (data: Record<string, any>) => post(`${BASE}/popups`, data);
export const updatePopup = (id: number, data: Record<string, any>) => put(`${BASE}/popups/${id}`, data);
export const deletePopup = (id: number) => del(`${BASE}/popups/${id}`);

// --- Page Import/Export ---
export const exportPage = (id: number) => get(`${BASE}/pages/${id}/export`);
export const importPage = (data: Record<string, any>) => post(`${BASE}/pages/import`, data);

// --- Settings ---
export const getWebsiteSettings = () => get(`${BASE}/settings`);
export const updateWebsiteSettings = (data: Record<string, any>) => put(`${BASE}/settings`, data);

// --- Redirects ---
export const getRedirects = (params?: Record<string, any>) => get(`${BASE}/redirects`, { params });
export const getRedirect = (id: number) => get(`${BASE}/redirects/${id}`);
export const createRedirect = (data: Record<string, any>) => post(`${BASE}/redirects`, data);
export const updateRedirect = (id: number, data: Record<string, any>) => put(`${BASE}/redirects/${id}`, data);
export const deleteRedirect = (id: number) => del(`${BASE}/redirects/${id}`);
