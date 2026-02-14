import { get, post, put, del } from '@/api/request';

const BASE = '/base_customization';

// Custom Fields
export const getCustomFields = (params) => get(`${BASE}/fields`, { params });
export const getCustomField = (id) => get(`${BASE}/fields/${id}`);
export const createCustomField = (data) => post(`${BASE}/fields`, data);
export const updateCustomField = (id, data) => put(`${BASE}/fields/${id}`, data);
export const deleteCustomField = (id) => del(`${BASE}/fields/${id}`);
export const getFieldsByModel = (model) => get(`${BASE}/fields/model/${model}`);

// Custom Views
export const getCustomViews = (params) => get(`${BASE}/views`, { params });
export const getCustomView = (id) => get(`${BASE}/views/${id}`);
export const createCustomView = (data) => post(`${BASE}/views`, data);
export const updateCustomView = (id, data) => put(`${BASE}/views/${id}`, data);
export const deleteCustomView = (id) => del(`${BASE}/views/${id}`);

// Form Layouts
export const getFormLayouts = (params) => get(`${BASE}/forms`, { params });
export const getFormLayout = (id) => get(`${BASE}/forms/${id}`);
export const createFormLayout = (data) => post(`${BASE}/forms`, data);
export const updateFormLayout = (id, data) => put(`${BASE}/forms/${id}`, data);
export const deleteFormLayout = (id) => del(`${BASE}/forms/${id}`);

// List Configurations
export const getListConfigs = (params) => get(`${BASE}/lists`, { params });
export const getListConfig = (id) => get(`${BASE}/lists/${id}`);
export const createListConfig = (data) => post(`${BASE}/lists`, data);
export const updateListConfig = (id, data) => put(`${BASE}/lists/${id}`, data);
export const deleteListConfig = (id) => del(`${BASE}/lists/${id}`);

// Dashboard Widgets
export const getDashboardWidgets = (params) => get(`${BASE}/widgets`, { params });
export const getDashboardWidget = (id) => get(`${BASE}/widgets/${id}`);
export const createDashboardWidget = (data) => post(`${BASE}/widgets`, data);
export const updateDashboardWidget = (id, data) => put(`${BASE}/widgets/${id}`, data);
export const deleteDashboardWidget = (id) => del(`${BASE}/widgets/${id}`);

// Available Models
export const getAvailableModels = () => get(`${BASE}/models`);
