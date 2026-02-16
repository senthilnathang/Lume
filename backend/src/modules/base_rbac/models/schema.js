import { table, int, integer, varchar, boolean, json, timestamp } from '../../../core/db/dialect.js';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const rbacRoles = table('rbac_roles', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  permissions: json('permissions').$type().default([]),
  isSystem: boolean('is_system').default(false),
  isActive: boolean('is_active').default(true),
});

export const rbacPermissions = table('rbac_permissions', {
  id: idCol('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  code: varchar('code', { length: 150 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  groupName: varchar('group_name', { length: 100 }),
  category: varchar('category', { length: 50 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rbacAccessRules = table('rbac_access_rules', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  roleId: idCol('role_id'),
  permission: varchar('permission', { length: 50 }).notNull(),
  field: varchar('field', { length: 100 }),
  filter: json('filter'),
  isActive: boolean('is_active').default(true),
  priority: idCol('priority').default(0),
});
