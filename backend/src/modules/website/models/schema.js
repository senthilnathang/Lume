import { table, int, integer, varchar, text, longtext, boolean, json, timestamp, dbEnum } from '../../../core/db/dialect.js';
import { baseColumns, withSoftDelete } from '../../../core/db/drizzle-helpers.js';

// Use int for MySQL, integer for PostgreSQL
const idCol = int || integer;

/**
 * Website Pages - CMS content pages
 */
export const websitePages = table('website_pages', {
  ...baseColumns(),
  ...withSoftDelete(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  content: longtext('content'),
  contentHtml: longtext('content_html'),
  excerpt: text('excerpt'),
  template: varchar('template', { length: 50 }).default('default'),
  pageType: varchar('page_type', { length: 20 }).default('page'),
  featuredImage: varchar('featured_image', { length: 500 }),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  metaKeywords: varchar('meta_keywords', { length: 500 }),
  ogTitle: varchar('og_title', { length: 255 }),
  ogDescription: text('og_description'),
  ogImage: varchar('og_image', { length: 500 }),
  canonicalUrl: varchar('canonical_url', { length: 500 }),
  noIndex: boolean('no_index').default(false),
  noFollow: boolean('no_follow').default(false),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at'),
  parentId: idCol('parent_id'),
  sequence: idCol('sequence').default(0),
  showInMenu: boolean('show_in_menu').default(false),
  customCss: text('custom_css'),
  headScripts: text('head_scripts'),
  bodyScripts: text('body_scripts'),
  createdBy: idCol('created_by'),
});

/**
 * Website Menus - Navigation menu containers
 */
export const websiteMenus = table('website_menus', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  location: varchar('location', { length: 20 }).default('header'),
  isActive: boolean('is_active').default(true),
});

/**
 * Website Menu Items - Individual links within menus
 */
export const websiteMenuItems = table('website_menu_items', {
  ...baseColumns(),
  menuId: idCol('menu_id').notNull(),
  label: varchar('label', { length: 150 }).notNull(),
  url: varchar('url', { length: 500 }),
  pageId: idCol('page_id'),
  target: varchar('target', { length: 10 }).default('_self'),
  icon: varchar('icon', { length: 100 }),
  parentId: idCol('parent_id'),
  sequence: idCol('sequence').default(0),
  isActive: boolean('is_active').default(true),
  cssClass: varchar('css_class', { length: 255 }),
  description: text('description'),
});

/**
 * Website Media - Uploaded files for the website
 */
export const websiteMedia = table('website_media', {
  ...baseColumns(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  path: varchar('path', { length: 500 }).notNull(),
  url: varchar('url', { length: 500 }),
  mimeType: varchar('mime_type', { length: 100 }),
  size: idCol('size'),
  width: idCol('width'),
  height: idCol('height'),
  altText: varchar('alt_text', { length: 255 }),
  caption: text('caption'),
  folder: varchar('folder', { length: 255 }).default('general'),
  uploadedBy: idCol('uploaded_by'),
});

/**
 * Website Page Revisions - Version history for pages
 */
export const websitePageRevisions = table('website_page_revisions', {
  ...baseColumns(),
  pageId: idCol('page_id').notNull(),
  content: longtext('content'),
  contentHtml: longtext('content_html'),
  revisionNumber: idCol('revision_number').default(1),
  changeDescription: varchar('change_description', { length: 255 }),
  createdBy: idCol('created_by'),
  isAutoSave: boolean('is_auto_save').default(false),
});

/**
 * Website Forms - Contact/custom form definitions
 */
export const websiteForms = table('website_forms', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  fields: longtext('fields'),
  settings: longtext('settings'),
  isActive: boolean('is_active').default(true),
  submissionCount: idCol('submission_count').default(0),
});

/**
 * Website Form Submissions - User submissions
 */
export const websiteFormSubmissions = table('website_form_submissions', {
  ...baseColumns(),
  formId: idCol('form_id').notNull(),
  data: longtext('data'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  isRead: boolean('is_read').default(false),
  pageSlug: varchar('page_slug', { length: 255 }),
});

/**
 * Website Theme Templates - Custom header/footer/sidebar templates
 */
export const websiteThemeTemplates = table('website_theme_templates', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).default('header'),
  content: longtext('content'),
  contentHtml: longtext('content_html'),
  conditions: longtext('conditions'),
  priority: idCol('priority').default(10),
  isActive: boolean('is_active').default(true),
});

/**
 * Website Popups - Popup builder definitions
 */
export const websitePopups = table('website_popups', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  content: longtext('content'),
  contentHtml: longtext('content_html'),
  triggerType: varchar('trigger_type', { length: 20 }).default('page-load'),
  triggerValue: varchar('trigger_value', { length: 100 }),
  position: varchar('position', { length: 20 }).default('center'),
  width: varchar('width', { length: 20 }).default('md'),
  overlayClose: boolean('overlay_close').default(true),
  showOnce: boolean('show_once').default(true),
  conditions: longtext('conditions'),
  isActive: boolean('is_active').default(false),
});

/**
 * Website Settings - Global site configuration
 */
export const websiteSettings = table('website_settings', {
  ...baseColumns(),
  key: varchar('key', { length: 100 }).notNull(),
  value: text('value'),
  type: varchar('type', { length: 20 }).default('string'),
});
