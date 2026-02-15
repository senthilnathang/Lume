import { mysqlTable, int, varchar, text, boolean, json, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

export const customFields = mysqlTable('custom_fields', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  fieldType: mysqlEnum('field_type', ['text', 'number', 'date', 'datetime', 'boolean', 'select', 'multiselect', 'textarea', 'email', 'url', 'phone', 'currency', 'json']).default('text'),
  options: json('options'),
  defaultValue: varchar('default_value', { length: 255 }),
  required: boolean('required').default(false),
  uniqueField: boolean('unique').default(false),
  helpText: varchar('help_text', { length: 255 }),
  placeholder: varchar('placeholder', { length: 255 }),
  sequence: int('sequence').default(10),
  groupName: varchar('group', { length: 100 }),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
});

export const customViews = mysqlTable('custom_views', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  viewType: mysqlEnum('view_type', ['list', 'kanban', 'calendar', 'gallery', 'chart']).default('list'),
  config: json('config').$type().default({}),
  filters: json('filters').$type().default([]),
  sortBy: json('sort_by').$type().default([]),
  columns: json('columns').$type().default([]),
  isDefault: boolean('is_default').default(false),
  isShared: boolean('is_shared').default(false),
  createdBy: int('created_by'),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
});

export const formLayouts = mysqlTable('form_layouts', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  layout: json('layout').$type().default({}),
  isDefault: boolean('is_default').default(false),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
});

export const listConfigs = mysqlTable('list_configs', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  columns: json('columns').$type().default([]),
  defaultSort: json('default_sort').$type().default({}),
  defaultFilters: json('default_filters').$type().default([]),
  pageSize: int('page_size').default(20),
  isDefault: boolean('is_default').default(false),
  createdBy: int('created_by'),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
});

export const dashboardWidgets = mysqlTable('dashboard_widgets', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  widgetType: mysqlEnum('widget_type', ['counter', 'chart', 'table', 'list', 'progress', 'custom']).default('counter'),
  model: varchar('model', { length: 100 }),
  config: json('config').$type().default({}),
  position: json('position').$type().default({}),
  refreshInterval: int('refresh_interval').default(0),
  roles: json('roles').$type().default([]),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
});
