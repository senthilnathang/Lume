import { mysqlTable, int, varchar, text, boolean, json, timestamp } from 'drizzle-orm/mysql-core';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

export const teamMembers = mysqlTable('team_members', {
  ...baseColumns(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  position: varchar('position', { length: 100 }),
  department: varchar('department', { length: 100 }),
  bio: text('bio'),
  photo: varchar('photo', { length: 500 }),
  order: int('order').default(0),
  isActive: boolean('is_active').default(true),
  isLeader: boolean('is_leader').default(false),
  socialLinks: json('social_links').$type().default({}),
  metadata: json('metadata').$type().default({}),
});
