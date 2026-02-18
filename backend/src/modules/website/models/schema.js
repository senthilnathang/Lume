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
  focusKeyword: varchar('focus_keyword', { length: 255 }),
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
  publishAt: timestamp('publish_at'),
  expireAt: timestamp('expire_at'),
  visibility: varchar('visibility', { length: 20 }).default('public'),
  passwordHash: varchar('password_hash', { length: 255 }),
  lockedBy: idCol('locked_by'),
  lockedAt: timestamp('locked_at'),
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
  megaMenuContent: longtext('mega_menu_content').default(null),
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
 * Supported type values: 'header', 'footer', 'sidebar',
 * 'single-post', 'archive', 'error-404', 'search-results'
 */
export const websiteThemeTemplates = table('website_theme_templates', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).default('header'),
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

/**
 * Website Custom Fonts - Uploaded font files
 */
export const websiteCustomFonts = table('website_custom_fonts', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  family: varchar('family', { length: 255 }).notNull(),
  weight: idCol('weight').default(400),
  style: varchar('style', { length: 20 }).default('normal'),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  format: varchar('format', { length: 20 }).default('woff2'),
});

/**
 * Website Custom Icons - Uploaded SVG icons
 */
export const websiteCustomIcons = table('website_custom_icons', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  setName: varchar('set_name', { length: 100 }).default('custom'),
  svgContent: longtext('svg_content').notNull(),
  tags: varchar('tags', { length: 500 }),
});

/**
 * Website Redirects - URL redirect rules
 */
export const websiteRedirects = table('website_redirects', {
  ...baseColumns(),
  ...withSoftDelete(),
  sourcePath: varchar('source_path', { length: 500 }).notNull(),
  targetPath: varchar('target_path', { length: 500 }).notNull(),
  statusCode: int('status_code').default(301),
  hits: int('hits').default(0),
  isActive: boolean('is_active').default(true),
});

/**
 * Website Categories - Hierarchical categories for pages
 */
export const websiteCategories = table('website_categories', {
  ...baseColumns(),
  ...withSoftDelete(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  parentId: idCol('parent_id'),
  sequence: idCol('sequence').default(0),
});

/**
 * Website Tags - Flat tags for pages
 */
export const websiteTags = table('website_tags', {
  ...baseColumns(),
  ...withSoftDelete(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
});

/**
 * Website Page Categories - M2M pivot
 */
export const websitePageCategories = table('website_page_categories', {
  pageId: idCol('page_id').notNull(),
  categoryId: idCol('category_id').notNull(),
});

/**
 * Website Page Tags - M2M pivot
 */
export const websitePageTags = table('website_page_tags', {
  pageId: idCol('page_id').notNull(),
  tagId: idCol('tag_id').notNull(),
});
