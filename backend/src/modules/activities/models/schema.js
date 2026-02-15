import { mysqlTable, int, varchar, text, boolean, json, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

export const activities = mysqlTable('activities', {
  ...baseColumns(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  shortDescription: varchar('short_description', { length: 500 }),
  category: varchar('category', { length: 100 }),
  status: mysqlEnum('status', ['draft', 'published', 'completed', 'cancelled']).default('draft'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  location: varchar('location', { length: 255 }),
  coverImage: varchar('cover_image', { length: 500 }),
  gallery: json('gallery').$type().default([]),
  capacity: int('capacity'),
  registeredCount: int('registered_count').default(0),
  isFeatured: boolean('is_featured').default(false),
  metadata: json('metadata').$type().default({}),
  createdBy: int('created_by'),
  publishedAt: timestamp('published_at'),
});
