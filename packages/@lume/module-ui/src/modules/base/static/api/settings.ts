/**
 * Base Settings API
 * API for menus, record rules, and sequences
 */
import { get, post, put, del } from '@/api/request';

// Menu types
export interface Menu {
  id: number;
  name: string;
  title?: string;
  path: string;
  icon?: string;
  parentId?: number | null;
  sequence: number;
  module?: string;
  permission?: string;
  viewName?: string;
  hideInMenu: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Record Rule types
export interface RecordRule {
  id: number;
  name: string;
  modelName: string;
  action: 'create' | 'read' | 'write' | 'unlink';
  domain?: any;
  groups?: any;
  users?: any;
  isActive: boolean;
  sequence: number;
  createdAt?: string;
  updatedAt?: string;
}

// Sequence types
export interface Sequence {
  id: number;
  name: string;
  code: string;
  prefix?: string;
  suffix?: string;
  padding: number;
  nextNumber: number;
  increment: number;
  modelName?: string;
  fieldName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Menus
export function getMenus(): Promise<Menu[]> {
  return get<Menu[]>('/admin/settings/menus');
}
export function createMenu(data: Partial<Menu>): Promise<Menu> {
  return post<Menu>('/admin/settings/menus', data);
}
export function updateMenu(id: number, data: Partial<Menu>): Promise<Menu> {
  return put<Menu>(`/admin/settings/menus/${id}`, data);
}
export function deleteMenu(id: number): Promise<void> {
  return del(`/admin/settings/menus/${id}`);
}

// Record Rules
export function getRecordRules(params?: { page?: number; limit?: number }): Promise<RecordRule[]> {
  return get<RecordRule[]>('/admin/record-rules', params);
}
const jsonField = (value: unknown) => typeof value === 'string' || value === undefined ? value : JSON.stringify(value);
const rulePayload = (data: Partial<RecordRule>) => ({ ...data, domain: jsonField(data.domain), groups: jsonField(data.groups), users: jsonField(data.users) });
export function createRecordRule(data: Partial<RecordRule>): Promise<RecordRule> {
  return post<RecordRule>('/admin/record-rules', rulePayload(data));
}
export function updateRecordRule(id: number, data: Partial<RecordRule>): Promise<RecordRule> {
  return put<RecordRule>(`/admin/record-rules/${id}`, rulePayload(data));
}
export function deactivateRecordRule(id: number): Promise<boolean> {
  return del<boolean>(`/admin/record-rules/${id}`);
}

// Sequences
export function getSequences(): Promise<Sequence[]> {
  return get<Sequence[]>('/admin/settings/sequences');
}
export function createSequence(data: Partial<Sequence>): Promise<Sequence> {
  return post<Sequence>('/admin/settings/sequences', data);
}
export function getNextSequenceNumber(code: string): Promise<{ number: number }> {
  return post<{ number: number }>(`/admin/settings/sequences/${encodeURIComponent(code)}/next`);
}
