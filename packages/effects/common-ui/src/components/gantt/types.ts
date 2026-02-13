/**
 * Gantt Chart Type Definitions
 * Generic types for building Gantt charts with any data model
 */

export interface GanttTask<T = any> {
  id: string | number;
  title: string;
  start: Date | string;
  end: Date | string;
  progress?: number; // 0-100
  color?: string;
  type?: 'task' | 'milestone' | 'project';
  dependencies?: Array<string | number>;
  parentId?: string | number;
  assignee?: string | { id: string | number; name: string; avatar?: string };
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: string;
  collapsed?: boolean;
  readonly?: boolean;
  data?: T; // Original data reference
  [key: string]: any;
}

export interface GanttMilestone {
  id: string | number;
  title: string;
  date: Date | string;
  color?: string;
}

export interface GanttDependency {
  from: string | number;
  to: string | number;
  type?: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
}

export interface GanttGroup {
  id: string | number;
  title: string;
  collapsed?: boolean;
  tasks: GanttTask[];
}

export type GanttViewMode = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface GanttColumn {
  field: string;
  title: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  formatter?: (task: GanttTask) => string;
  component?: string; // Custom component name
}

export interface GanttConfig {
  startField?: string;
  endField?: string;
  titleField?: string;
  progressField?: string;
  parentField?: string;
  dependencyField?: string;
  statusField?: string;
}

export interface GanttTaskMoveEvent {
  task: GanttTask;
  oldStart: Date;
  oldEnd: Date;
  newStart: Date;
  newEnd: Date;
}

export interface GanttTaskResizeEvent {
  task: GanttTask;
  oldEnd: Date;
  newEnd: Date;
}

export interface GanttTaskClickEvent {
  task: GanttTask;
  event: MouseEvent;
}

export interface GanttDateRange {
  start: Date;
  end: Date;
}

export const VIEW_MODE_CONFIG: Record<GanttViewMode, { unit: string; format: string; cellWidth: number }> = {
  day: { unit: 'day', format: 'DD', cellWidth: 40 },
  week: { unit: 'week', format: 'WW', cellWidth: 60 },
  month: { unit: 'month', format: 'MMM', cellWidth: 80 },
  quarter: { unit: 'quarter', format: 'Q', cellWidth: 100 },
  year: { unit: 'year', format: 'YYYY', cellWidth: 120 },
};

export const TASK_COLORS: Record<string, string> = {
  default: '#1890ff',
  project: '#722ed1',
  milestone: '#f5222d',
  completed: '#52c41a',
  inProgress: '#faad14',
  delayed: '#f5222d',
};
