import { get, post, put, del } from '@/api/request';

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
export const createMedia = (data: Record<string, any>) => post(`${BASE}/media`, data);
export const updateMedia = (id: number, data: Record<string, any>) => put(`${BASE}/media/${id}`, data);
export const deleteMedia = (id: number) => del(`${BASE}/media/${id}`);

// --- Settings ---
export const getWebsiteSettings = () => get(`${BASE}/settings`);
export const updateWebsiteSettings = (data: Record<string, any>) => put(`${BASE}/settings`, data);
