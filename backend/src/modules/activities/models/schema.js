import { table, int, integer, varchar, text, boolean, json, timestamp } from '../../../core/db/dialect.js';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const activities = table('activities', {
  ...baseColumns(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  shortDescription: varchar('short_description', { length: 500 }),
  category: varchar('category', { length: 100 }),
  status: varchar('status', { length: 20 }).default('draft'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  location: varchar('location', { length: 255 }),
  coverImage: varchar('cover_image', { length: 500 }),
  gallery: json('gallery').$type().default([]),
  capacity: idCol('capacity'),
  registeredCount: idCol('registered_count').default(0),
  isFeatured: boolean('is_featured').default(false),
  metadata: json('metadata').$type().default({}),
  createdBy: idCol('created_by'),
  publishedAt: timestamp('published_at'),
});
