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
  return get<Menu[]>('/base/menus');
}
export function createMenu(data: Partial<Menu>): Promise<Menu> {
  return post<Menu>('/base/menus', data);
}
export function updateMenu(id: number, data: Partial<Menu>): Promise<Menu> {
  return put<Menu>(`/base/menus/${id}`, data);
}
export function deleteMenu(id: number): Promise<void> {
  return del(`/base/menus/${id}`);
}

// Record Rules
export function getRecordRules(): Promise<RecordRule[]> {
  return get<RecordRule[]>('/base/record-rules');
}
export function createRecordRule(data: Partial<RecordRule>): Promise<RecordRule> {
  return post<RecordRule>('/base/record-rules', data);
}

// Sequences
export function getSequences(): Promise<Sequence[]> {
  return get<Sequence[]>('/base/sequences');
}
export function createSequence(data: Partial<Sequence>): Promise<Sequence> {
  return post<Sequence>('/base/sequences', data);
}
export function getNextSequenceNumber(code: string): Promise<{ number: number }> {
  return get<{ number: number }>(`/base/sequences/${code}/next`);
}
