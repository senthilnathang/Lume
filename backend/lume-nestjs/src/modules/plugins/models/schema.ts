import { table, int, integer, varchar, text, boolean, json, timestamp, bigint, enum as dbEnum } from '@core/db/dialect';
import { baseColumns } from '@core/db/drizzle-helpers';

const idCol = int || integer;

export const plugins = table('plugins', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 150 }),
  version: varchar('version', { length: 20 }).notNull(),
  author: varchar('author', { length: 100 }),
  description: text('description'),
  compatibility: varchar('compatibility', { length: 20 }),
  manifestJson: json('manifest_json').$type<any>().notNull(),
  entrypoint: varchar('entrypoint', { length: 255 }),
  dbPrefix: varchar('db_prefix', { length: 50 }),
  isEnabled: boolean('is_enabled').default(true),
  isInstalled: boolean('is_installed').default(true),
  dependencies: json('dependencies').$type<Record<string, string>>(),
  permissions: json('permissions').$type<string[]>(),
  installedBy: idCol('installed_by'),
  installedAt: timestamp('installed_at'),
});

export const pluginLogs = table('plugin_logs', {
  ...baseColumns(),
  pluginName: varchar('plugin_name', { length: 100 }).notNull(),
  operation: varchar('operation', { length: 50 }),
  status: dbEnum('status', ['success', 'failed', 'warning']).default('success'),
  message: text('message'),
  stackTrace: text('stack_trace'),
  executedBy: idCol('executed_by'),
  durationMs: idCol('duration_ms'),
});

export const marketplacePlugins = table('marketplace_plugins', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 150 }).notNull(),
  version: varchar('version', { length: 20 }).notNull(),
  author: varchar('author', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 255 }),
  category: varchar('category', { length: 50 }).notNull(),
  tags: json('tags').$type<string[]>().default([]),
  screenshots: json('screenshots').$type<string[]>().default([]),
  pricing: varchar('pricing', { length: 20 }).default('free'),
  downloadCount: idCol('download_count').default(0),
  rating: varchar('rating', { length: 4 }).default('0.00'),
  reviewCount: idCol('review_count').default(0),
  status: varchar('status', { length: 20 }).default('pending'),
  publishedAt: timestamp('published_at'),
});

export const marketplaceCategories = table('marketplace_categories', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  icon: varchar('icon', { length: 255 }),
  description: text('description'),
  pluginCount: idCol('plugin_count').default(0),
});

export const marketplaceReviews = table('marketplace_reviews', {
  ...baseColumns(),
  pluginName: varchar('plugin_name', { length: 100 }).notNull(),
  userId: idCol('user_id').notNull(),
  rating: idCol('rating').notNull(),
  title: varchar('title', { length: 255 }),
  body: text('body'),
});

export const marketplaceDownloads = table('marketplace_downloads', {
  ...baseColumns(),
  pluginName: varchar('plugin_name', { length: 100 }).notNull(),
  userId: idCol('user_id').notNull(),
  installedVersion: varchar('installed_version', { length: 20 }).notNull(),
});
