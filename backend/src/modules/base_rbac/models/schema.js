import { mysqlTable, int, varchar, boolean, json, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

export const rbacRoles = mysqlTable('rbac_roles', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  permissions: json('permissions').$type().default([]),
  isSystem: boolean('is_system').default(false),
  isActive: boolean('is_active').default(true),
});

export const rbacPermissions = mysqlTable('rbac_permissions', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  code: varchar('code', { length: 150 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  groupName: varchar('group_name', { length: 100 }),
  category: varchar('category', { length: 50 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rbacAccessRules = mysqlTable('rbac_access_rules', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  roleId: int('role_id'),
  permission: varchar('permission', { length: 50 }).notNull(),
  field: varchar('field', { length: 100 }),
  filter: json('filter'),
  isActive: boolean('is_active').default(true),
  priority: int('priority').default(0),
});
