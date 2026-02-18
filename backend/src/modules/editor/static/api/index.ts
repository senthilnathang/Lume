import { get, post, put, del } from '@/api/request';

export interface EditorTemplate {
  id: number;
  name: string;
  description: string | null;
  content: string | null;
  category: string;
  isDefault: boolean;
  thumbnailUrl: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EditorSnippet {
  id: number;
  name: string;
  content: string | null;
  category: string;
  icon: string | null;
  shortcut: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

// Templates
export const getTemplates = (params?: Record<string, any>) =>
  get<EditorTemplate[]>('/editor/templates', params);

export const getTemplate = (id: number) =>
  get<EditorTemplate>(`/editor/templates/${id}`);

export const getDefaultTemplate = () =>
  get<EditorTemplate>('/editor/templates/default');

export const createTemplate = (data: Partial<EditorTemplate>) =>
  post<EditorTemplate>('/editor/templates', data);

export const updateTemplate = (id: number, data: Partial<EditorTemplate>) =>
  put<EditorTemplate>(`/editor/templates/${id}`, data);

export const deleteTemplate = (id: number) =>
  del(`/editor/templates/${id}`);

// Snippets
export const getSnippets = (params?: Record<string, any>) =>
  get<EditorSnippet[]>('/editor/snippets', params);

export const getSnippet = (id: number) =>
  get<EditorSnippet>(`/editor/snippets/${id}`);

export const createSnippet = (data: Partial<EditorSnippet>) =>
  post<EditorSnippet>('/editor/snippets', data);

export const updateSnippet = (id: number, data: Partial<EditorSnippet>) =>
  put<EditorSnippet>(`/editor/snippets/${id}`, data);

export const deleteSnippet = (id: number) =>
  del(`/editor/snippets/${id}`);

// Presets
export interface EditorPreset {
  id: number;
  blockType: string;
  name: string;
  attributes: string | null;
  thumbnailUrl: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export const getPresets = (blockType?: string) =>
  get<EditorPreset[]>('/editor/presets', blockType ? { blockType } : undefined);

export const getPreset = (id: number) =>
  get<EditorPreset>(`/editor/presets/${id}`);

export const createPreset = (data: Partial<EditorPreset>) =>
  post<EditorPreset>('/editor/presets', data);

export const updatePreset = (id: number, data: Partial<EditorPreset>) =>
  put<EditorPreset>(`/editor/presets/${id}`, data);

export const deletePreset = (id: number) =>
  del(`/editor/presets/${id}`);
