import { table, int, integer, varchar, boolean, json, text } from '@core/db/dialect';
import { baseColumns } from '@core/db/drizzle-helpers';

const idCol = int || integer;

export const customFields = table('custom_fields', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  fieldType: varchar('field_type', { length: 20 }).default('text'),
  options: json('options'),
  defaultValue: varchar('default_value', { length: 255 }),
  required: boolean('required').default(false),
  uniqueField: boolean('unique').default(false),
  helpText: varchar('help_text', { length: 255 }),
  placeholder: varchar('placeholder', { length: 255 }),
  sequence: idCol('sequence').default(10),
  groupName: varchar('group', { length: 100 }),
  status: varchar('status', { length: 20 }).default('active'),
});

export const customViews = table('custom_views', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  viewType: varchar('view_type', { length: 20 }).default('list'),
  config: json('config').$type<any>().default({}),
  filters: json('filters').$type<any[]>().default([]),
  sortBy: json('sort_by').$type<any[]>().default([]),
  columns: json('columns').$type<any[]>().default([]),
  isDefault: boolean('is_default').default(false),
  isShared: boolean('is_shared').default(false),
  createdBy: idCol('created_by'),
  status: varchar('status', { length: 20 }).default('active'),
});

export const formLayouts = table('form_layouts', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  layout: json('layout').$type<any>().default({}),
  isDefault: boolean('is_default').default(false),
  status: varchar('status', { length: 20 }).default('active'),
});

export const listConfigs = table('list_configs', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  columns: json('columns').$type<any[]>().default([]),
  defaultSort: json('default_sort').$type<any>().default({}),
  defaultFilters: json('default_filters').$type<any[]>().default([]),
  pageSize: idCol('page_size').default(20),
  isDefault: boolean('is_default').default(false),
  createdBy: idCol('created_by'),
  status: varchar('status', { length: 20 }).default('active'),
});

export const dashboardWidgets = table('dashboard_widgets', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  widgetType: varchar('widget_type', { length: 20 }).default('counter'),
  model: varchar('model', { length: 100 }),
  config: json('config').$type<any>().default({}),
  position: json('position').$type<any>().default({}),
  refreshInterval: idCol('refresh_interval').default(0),
  roles: json('roles').$type<any[]>().default([]),
  status: varchar('status', { length: 20 }).default('active'),
});
