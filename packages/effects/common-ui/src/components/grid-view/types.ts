/**
 * Grid View Type Definitions
 * Generic types for building data grids with any data model
 */

export interface GridColumn<T = any> {
  field: string;
  title: string;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  fixed?: 'left' | 'right';
  visible?: boolean;
  formatter?: (value: any, row: T, column: GridColumn<T>) => string;
  component?: string; // Custom component name
  componentProps?: Record<string, any>;
  className?: string;
  headerClassName?: string;
  cellClassName?: string | ((row: T) => string);
}

export interface GridSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface GridFilter {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' |
            'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte' |
            'between' | 'in' | 'notIn' | 'isEmpty' | 'isNotEmpty';
  value: any;
}

export interface GridPagination {
  page: number;
  pageSize: number;
  total: number;
  pageSizes?: number[];
}

export interface GridSelection<T = any> {
  type: 'checkbox' | 'radio' | 'none';
  selectedRows: T[];
  selectedKeys: Array<string | number>;
  checkboxProps?: (row: T) => { disabled?: boolean; indeterminate?: boolean };
}

export interface GridRowClickEvent<T = any> {
  row: T;
  rowIndex: number;
  event: MouseEvent;
}

export interface GridCellClickEvent<T = any> {
  row: T;
  rowIndex: number;
  column: GridColumn<T>;
  columnIndex: number;
  value: any;
  event: MouseEvent;
}

export interface GridSortChangeEvent {
  sorts: GridSort[];
}

export interface GridFilterChangeEvent {
  filters: GridFilter[];
}

export interface GridPageChangeEvent {
  page: number;
  pageSize: number;
}

export interface GridSelectionChangeEvent<T = any> {
  selectedRows: T[];
  selectedKeys: Array<string | number>;
}

export interface GridExpandChangeEvent<T = any> {
  row: T;
  expanded: boolean;
  expandedRows: T[];
}

export interface GridConfig<T = any> {
  columns: GridColumn<T>[];
  rowKey?: string | ((row: T) => string | number);
  height?: number | string;
  maxHeight?: number | string;
  stripe?: boolean;
  border?: boolean;
  size?: 'small' | 'medium' | 'large';
  showHeader?: boolean;
  highlightCurrentRow?: boolean;
  emptyText?: string;
}

export type GridViewMode = 'table' | 'card' | 'list';

export interface GridExportOptions {
  filename?: string;
  type: 'csv' | 'excel' | 'json';
  columns?: string[]; // fields to export
  includeHeader?: boolean;
}

export const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

export const COLUMN_ALIGN_MAP: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};
