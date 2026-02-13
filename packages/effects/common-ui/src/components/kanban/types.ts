/**
 * Kanban Board Type Definitions
 * Generic types for building Kanban boards with any data model
 */

export interface KanbanColumn<T = any> {
  id: string | number;
  title: string;
  color?: string;
  items: T[];
  limit?: number;
  collapsed?: boolean;
  locked?: boolean;
}

export interface KanbanItem {
  id: string | number;
  title?: string;
  name?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string | { id: string | number; name: string; avatar?: string };
  dueDate?: string | Date;
  tags?: string[];
  color?: string;
  [key: string]: any;
}

export interface KanbanSwimlane<T = any> {
  id: string | number;
  title: string;
  collapsed?: boolean;
  columns: KanbanColumn<T>[];
}

export interface KanbanMoveEvent<T = any> {
  item: T;
  fromColumn: string | number;
  toColumn: string | number;
  fromIndex: number;
  toIndex: number;
  fromSwimlane?: string | number;
  toSwimlane?: string | number;
}

export interface KanbanItemClickEvent<T = any> {
  item: T;
  column: KanbanColumn<T>;
  swimlane?: KanbanSwimlane<T>;
}

export interface KanbanColumnClickEvent<T = any> {
  column: KanbanColumn<T>;
  swimlane?: KanbanSwimlane<T>;
}

export interface KanbanFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';
  value: any;
}

export interface KanbanSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface KanbanConfig {
  columns: Array<{ id: string | number; title: string; color?: string; limit?: number }>;
  statusField?: string;
  titleField?: string;
  descriptionField?: string;
  priorityField?: string;
  assigneeField?: string;
  dueDateField?: string;
  tagsField?: string;
}

export type KanbanViewMode = 'board' | 'swimlane' | 'compact';

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#52c41a',
  medium: '#faad14',
  high: '#fa8c16',
  urgent: '#f5222d',
};

export const DEFAULT_COLUMN_COLORS: string[] = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa541c',
];
