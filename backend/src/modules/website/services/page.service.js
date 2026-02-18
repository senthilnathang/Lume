import { getDb } from '../../../core/db/drizzle.js';
import { websitePages, websiteMenus, websiteMenuItems, websiteMedia, websiteSettings, websitePageRevisions, websiteForms, websiteFormSubmissions, websiteThemeTemplates, websitePopups } from '../models/schema.js';
import { eq, like, desc, asc, and, isNull, sql, inArray } from 'drizzle-orm';
import { responseUtil } from '../../../shared/utils/index.js';
import fs from 'fs';
import path from 'path';

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export class PageService {
  async findAll(options = {}) {
    const db = getDb();
    const { page = 1, limit = 20, search, status, pageType } = options;
    const offset = (page - 1) * limit;

    const conditions = [isNull(websitePages.deletedAt)];

    if (search) {
      conditions.push(like(websitePages.title, `%${search}%`));
    }
    if (status === 'published') {
      conditions.push(eq(websitePages.isPublished, true));
    } else if (status === 'draft') {
      conditions.push(eq(websitePages.isPublished, false));
    }
    if (pageType) {
      conditions.push(eq(websitePages.pageType, pageType));
    }

    const [rows, countResult] = await Promise.all([
      db.select().from(websitePages).where(and(...conditions)).orderBy(desc(websitePages.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(websitePages).where(and(...conditions)),
    ]);

    return responseUtil.paginated(rows, { page, limit, total: Number(countResult[0]?.count || 0) });
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(websitePages).where(eq(websitePages.id, Number(id)));
    if (!row) return responseUtil.notFound('Page');
    return responseUtil.success(row);
  }

  async findBySlug(slug) {
    const db = getDb();
    const [row] = await db.select().from(websitePages)
      .where(and(eq(websitePages.slug, slug), eq(websitePages.isPublished, true), isNull(websitePages.deletedAt)));
    if (!row) return responseUtil.notFound('Page');
    return responseUtil.success(row);
  }

  async create(data) {
    const db = getDb();
    if (!data.slug) {
      data.slug = generateSlug(data.title);
    }
    // Ensure unique slug
    const [existing] = await db.select().from(websitePages).where(eq(websitePages.slug, data.slug));
    if (existing) {
      data.slug = `${data.slug}-${Date.now()}`;
    }
    const [result] = await db.insert(websitePages).values(data);
    const [created] = await db.select().from(websitePages).where(eq(websitePages.id, result.insertId));
    return responseUtil.success(created, 'Page created');
  }

  async update(id, data, userId = null) {
    const db = getDb();
    const [existing] = await db.select().from(websitePages).where(eq(websitePages.id, Number(id)));
    if (!existing) return responseUtil.notFound('Page');

    // Auto-create revision before saving (if content changed)
    if (existing.content && (data.content !== undefined && data.content !== existing.content)) {
      try {
        const revisionService = new RevisionService();
        await revisionService.create(Number(id), {
          content: existing.content,
          contentHtml: existing.contentHtml,
          createdBy: userId,
          isAutoSave: false,
        });
      } catch (err) {
        console.error('Failed to create revision:', err);
      }
    }

    await db.update(websitePages).set(data).where(eq(websitePages.id, Number(id)));
    const [updated] = await db.select().from(websitePages).where(eq(websitePages.id, Number(id)));
    return responseUtil.success(updated, 'Page updated');
  }

  async delete(id) {
    const db = getDb();
    const [existing] = await db.select().from(websitePages).where(eq(websitePages.id, Number(id)));
    if (!existing) return responseUtil.notFound('Page');
    await db.update(websitePages).set({ deletedAt: new Date() }).where(eq(websitePages.id, Number(id)));
    return responseUtil.success(null, 'Page deleted');
  }

  async publish(id) {
    const db = getDb();
    await db.update(websitePages).set({ isPublished: true, publishedAt: new Date() }).where(eq(websitePages.id, Number(id)));
    const [updated] = await db.select().from(websitePages).where(eq(websitePages.id, Number(id)));
    return responseUtil.success(updated, 'Page published');
  }

  async unpublish(id) {
    const db = getDb();
    await db.update(websitePages).set({ isPublished: false }).where(eq(websitePages.id, Number(id)));
    const [updated] = await db.select().from(websitePages).where(eq(websitePages.id, Number(id)));
    return responseUtil.success(updated, 'Page unpublished');
  }

  // --- Public API for Nuxt.js SSR ---
  async getPublishedPages() {
    const db = getDb();
    const rows = await db.select({
      id: websitePages.id,
      title: websitePages.title,
      slug: websitePages.slug,
      excerpt: websitePages.excerpt,
      featuredImage: websitePages.featuredImage,
      pageType: websitePages.pageType,
      metaTitle: websitePages.metaTitle,
      metaDescription: websitePages.metaDescription,
      publishedAt: websitePages.publishedAt,
    }).from(websitePages)
      .where(and(eq(websitePages.isPublished, true), isNull(websitePages.deletedAt)))
      .orderBy(asc(websitePages.sequence));
    return responseUtil.success(rows);
  }

  async getSitemap() {
    const db = getDb();
    const rows = await db.select({
      slug: websitePages.slug,
      updatedAt: websitePages.updatedAt,
    }).from(websitePages)
      .where(and(eq(websitePages.isPublished, true), isNull(websitePages.deletedAt), eq(websitePages.noIndex, false)));
    return rows;
  }
}

/**
 * Convert flat menu items array to nested tree structure
 */
function buildMenuTree(flatItems) {
  const map = new Map();
  const roots = [];
  for (const item of flatItems) {
    map.set(item.id, { ...item, children: [] });
  }
  for (const item of flatItems) {
    const node = map.get(item.id);
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export class MenuService {
  async findAll() {
    const db = getDb();
    const menus = await db.select().from(websiteMenus).orderBy(asc(websiteMenus.id));
    return responseUtil.success(menus);
  }

  async findWithItems(id) {
    const db = getDb();
    const [menu] = await db.select().from(websiteMenus).where(eq(websiteMenus.id, Number(id)));
    if (!menu) return responseUtil.notFound('Menu');
    const items = await db.select().from(websiteMenuItems)
      .where(eq(websiteMenuItems.menuId, Number(id)))
      .orderBy(asc(websiteMenuItems.sequence));
    const tree = buildMenuTree(items);
    return responseUtil.success({ ...menu, items, tree });
  }

  async getByLocation(location) {
    const db = getDb();
    const [menu] = await db.select().from(websiteMenus)
      .where(and(eq(websiteMenus.location, location), eq(websiteMenus.isActive, true)));
    if (!menu) return responseUtil.success({ items: [] });
    const items = await db.select().from(websiteMenuItems)
      .where(and(eq(websiteMenuItems.menuId, menu.id), eq(websiteMenuItems.isActive, true)))
      .orderBy(asc(websiteMenuItems.sequence));
    const tree = buildMenuTree(items);
    return responseUtil.success({ ...menu, items: tree });
  }

  async getByLocationNested(location) {
    const db = getDb();
    const [menu] = await db.select().from(websiteMenus)
      .where(and(eq(websiteMenus.location, location), eq(websiteMenus.isActive, true)));
    if (!menu) return responseUtil.success({ items: [] });
    const items = await db.select().from(websiteMenuItems)
      .where(and(eq(websiteMenuItems.menuId, menu.id), eq(websiteMenuItems.isActive, true)))
      .orderBy(asc(websiteMenuItems.sequence));
    const tree = buildMenuTree(items);
    return responseUtil.success({ ...menu, items: tree });
  }

  async reorderItems(menuId, items) {
    const db = getDb();
    const [menu] = await db.select().from(websiteMenus).where(eq(websiteMenus.id, Number(menuId)));
    if (!menu) return responseUtil.notFound('Menu');

    // Validate all items belong to this menu
    const itemIds = items.map(i => i.id);
    if (itemIds.length > 0) {
      const existing = await db.select({ id: websiteMenuItems.id }).from(websiteMenuItems)
        .where(and(eq(websiteMenuItems.menuId, Number(menuId)), inArray(websiteMenuItems.id, itemIds)));
      const existingIds = new Set(existing.map(e => e.id));
      const invalid = itemIds.filter(id => !existingIds.has(id));
      if (invalid.length > 0) {
        return responseUtil.error(`Items not found in this menu: ${invalid.join(', ')}`);
      }
    }

    // Update each item's parentId and sequence
    for (const item of items) {
      await db.update(websiteMenuItems).set({
        parentId: item.parentId || null,
        sequence: item.sequence,
      }).where(eq(websiteMenuItems.id, item.id));
    }

    return responseUtil.success(null, 'Menu items reordered');
  }

  async create(data) {
    const db = getDb();
    const [result] = await db.insert(websiteMenus).values(data);
    const [created] = await db.select().from(websiteMenus).where(eq(websiteMenus.id, result.insertId));
    return responseUtil.success(created, 'Menu created');
  }

  async update(id, data) {
    const db = getDb();
    await db.update(websiteMenus).set(data).where(eq(websiteMenus.id, Number(id)));
    const [updated] = await db.select().from(websiteMenus).where(eq(websiteMenus.id, Number(id)));
    return responseUtil.success(updated, 'Menu updated');
  }

  async delete(id) {
    const db = getDb();
    await db.delete(websiteMenuItems).where(eq(websiteMenuItems.menuId, Number(id)));
    await db.delete(websiteMenus).where(eq(websiteMenus.id, Number(id)));
    return responseUtil.success(null, 'Menu deleted');
  }

  async addItem(menuId, data) {
    const db = getDb();
    const [result] = await db.insert(websiteMenuItems).values({ ...data, menuId: Number(menuId) });
    const [created] = await db.select().from(websiteMenuItems).where(eq(websiteMenuItems.id, result.insertId));
    return responseUtil.success(created, 'Menu item added');
  }

  async updateItem(itemId, data) {
    const db = getDb();
    await db.update(websiteMenuItems).set(data).where(eq(websiteMenuItems.id, Number(itemId)));
    const [updated] = await db.select().from(websiteMenuItems).where(eq(websiteMenuItems.id, Number(itemId)));
    return responseUtil.success(updated, 'Menu item updated');
  }

  async deleteItem(itemId) {
    const db = getDb();
    await db.delete(websiteMenuItems).where(eq(websiteMenuItems.id, Number(itemId)));
    return responseUtil.success(null, 'Menu item deleted');
  }
}

export class MediaService {
  async findAll(options = {}) {
    const db = getDb();
    const { page = 1, limit = 20, search, folder, mimeType } = options;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) conditions.push(like(websiteMedia.originalName, `%${search}%`));
    if (folder) conditions.push(eq(websiteMedia.folder, folder));
    if (mimeType) conditions.push(like(websiteMedia.mimeType, `${mimeType}%`));

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db.select().from(websiteMedia).where(where).orderBy(desc(websiteMedia.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(websiteMedia).where(where),
    ]);

    return responseUtil.paginated(rows, { page, limit, total: Number(countResult[0]?.count || 0) });
  }

  async uploadFile(file, userId = null) {
    const db = getDb();
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads', 'media', yearMonth);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${baseName}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Move file from multer temp to final location
    fs.writeFileSync(filePath, file.buffer);

    // Try to get image dimensions
    let width = null;
    let height = null;
    let thumbnailUrl = null;

    if (file.mimetype.startsWith('image/')) {
      try {
        const sharp = (await import('sharp')).default;
        const metadata = await sharp(file.buffer).metadata();
        width = metadata.width || null;
        height = metadata.height || null;

        // Generate thumbnail (300px wide)
        const thumbFilename = `thumb_${filename}`;
        const thumbPath = path.join(uploadDir, thumbFilename);
        await sharp(file.buffer).resize(300, null, { withoutEnlargement: true }).toFile(thumbPath);
        thumbnailUrl = `/uploads/media/${yearMonth}/${thumbFilename}`;
      } catch (err) {
        console.error('Sharp processing failed:', err.message);
      }
    }

    const url = `/uploads/media/${yearMonth}/${filename}`;
    const relativePath = `media/${yearMonth}/${filename}`;

    const [result] = await db.insert(websiteMedia).values({
      filename,
      originalName: file.originalname,
      path: relativePath,
      url,
      mimeType: file.mimetype,
      size: file.size,
      width,
      height,
      folder: 'general',
      uploadedBy: userId,
    });

    const [created] = await db.select().from(websiteMedia).where(eq(websiteMedia.id, result.insertId));
    return responseUtil.success({ ...created, thumbnailUrl }, 'Media uploaded');
  }

  async create(data) {
    const db = getDb();
    const [result] = await db.insert(websiteMedia).values(data);
    const [created] = await db.select().from(websiteMedia).where(eq(websiteMedia.id, result.insertId));
    return responseUtil.success(created, 'Media uploaded');
  }

  async update(id, data) {
    const db = getDb();
    await db.update(websiteMedia).set(data).where(eq(websiteMedia.id, Number(id)));
    const [updated] = await db.select().from(websiteMedia).where(eq(websiteMedia.id, Number(id)));
    return responseUtil.success(updated, 'Media updated');
  }

  async delete(id) {
    const db = getDb();
    const [media] = await db.select().from(websiteMedia).where(eq(websiteMedia.id, Number(id)));
    if (media?.path) {
      // Delete physical file
      const fullPath = path.resolve(process.env.UPLOAD_DIR || './uploads', media.path);
      try { fs.unlinkSync(fullPath); } catch { /* file may not exist */ }
      // Delete thumbnail if exists
      const dir = path.dirname(fullPath);
      const thumbPath = path.join(dir, `thumb_${media.filename}`);
      try { fs.unlinkSync(thumbPath); } catch { /* ok */ }
    }
    await db.delete(websiteMedia).where(eq(websiteMedia.id, Number(id)));
    return responseUtil.success(null, 'Media deleted');
  }
}

export class SettingsService {
  async getAll() {
    const db = getDb();
    const rows = await db.select().from(websiteSettings);
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.type === 'json' ? JSON.parse(row.value || '{}') : row.value;
    }
    return responseUtil.success(settings);
  }

  async get(key) {
    const db = getDb();
    const [row] = await db.select().from(websiteSettings).where(eq(websiteSettings.key, key));
    return row ? row.value : null;
  }

  async set(key, value, type = 'string') {
    const db = getDb();
    const strValue = type === 'json' ? JSON.stringify(value) : String(value);
    const [existing] = await db.select().from(websiteSettings).where(eq(websiteSettings.key, key));
    if (existing) {
      await db.update(websiteSettings).set({ value: strValue, type }).where(eq(websiteSettings.key, key));
    } else {
      await db.insert(websiteSettings).values({ key, value: strValue, type });
    }
    return responseUtil.success({ key, value }, 'Setting saved');
  }

  async bulkSet(settings) {
    const db = getDb();
    for (const [key, value] of Object.entries(settings)) {
      const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const type = typeof value === 'object' ? 'json' : typeof value === 'number' ? 'number' : 'string';
      const [existing] = await db.select().from(websiteSettings).where(eq(websiteSettings.key, key));
      if (existing) {
        await db.update(websiteSettings).set({ value: strValue, type }).where(eq(websiteSettings.key, key));
      } else {
        await db.insert(websiteSettings).values({ key, value: strValue, type });
      }
    }
    return responseUtil.success(settings, 'Settings saved');
  }
}

export class RevisionService {
  async create(pageId, data = {}) {
    const db = getDb();
    // Get next revision number
    const [lastRev] = await db.select({ revisionNumber: websitePageRevisions.revisionNumber })
      .from(websitePageRevisions)
      .where(eq(websitePageRevisions.pageId, pageId))
      .orderBy(desc(websitePageRevisions.revisionNumber))
      .limit(1);

    const revisionNumber = (lastRev?.revisionNumber || 0) + 1;

    const [result] = await db.insert(websitePageRevisions).values({
      pageId,
      content: data.content || null,
      contentHtml: data.contentHtml || null,
      revisionNumber,
      changeDescription: data.changeDescription || null,
      createdBy: data.createdBy || null,
      isAutoSave: data.isAutoSave || false,
    });

    return responseUtil.success({ id: result.insertId, revisionNumber }, 'Revision created');
  }

  async findAll(pageId, options = {}) {
    const db = getDb();
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const rows = await db.select({
      id: websitePageRevisions.id,
      revisionNumber: websitePageRevisions.revisionNumber,
      changeDescription: websitePageRevisions.changeDescription,
      createdBy: websitePageRevisions.createdBy,
      isAutoSave: websitePageRevisions.isAutoSave,
      createdAt: websitePageRevisions.createdAt,
    }).from(websitePageRevisions)
      .where(eq(websitePageRevisions.pageId, Number(pageId)))
      .orderBy(desc(websitePageRevisions.revisionNumber))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db.select({ count: sql`COUNT(*)` })
      .from(websitePageRevisions)
      .where(eq(websitePageRevisions.pageId, Number(pageId)));

    return responseUtil.paginated(rows, { page, limit, total: Number(countResult?.count || 0) });
  }

  async findById(revisionId) {
    const db = getDb();
    const [row] = await db.select().from(websitePageRevisions)
      .where(eq(websitePageRevisions.id, Number(revisionId)));
    if (!row) return responseUtil.notFound('Revision');
    return responseUtil.success(row);
  }

  async revert(pageId, revisionId) {
    const db = getDb();
    const [revision] = await db.select().from(websitePageRevisions)
      .where(and(eq(websitePageRevisions.id, Number(revisionId)), eq(websitePageRevisions.pageId, Number(pageId))));
    if (!revision) return responseUtil.notFound('Revision');

    // Save current content as a new revision before reverting
    const [currentPage] = await db.select().from(websitePages).where(eq(websitePages.id, Number(pageId)));
    if (currentPage?.content) {
      await this.create(Number(pageId), {
        content: currentPage.content,
        contentHtml: currentPage.contentHtml,
        changeDescription: `Before revert to revision #${revision.revisionNumber}`,
        isAutoSave: false,
      });
    }

    // Revert page content
    await db.update(websitePages).set({
      content: revision.content,
      contentHtml: revision.contentHtml,
    }).where(eq(websitePages.id, Number(pageId)));

    const [updated] = await db.select().from(websitePages).where(eq(websitePages.id, Number(pageId)));
    return responseUtil.success(updated, `Reverted to revision #${revision.revisionNumber}`);
  }
}

export class FormService {
  async findAll(options = {}) {
    const db = getDb();
    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) conditions.push(like(websiteForms.name, `%${search}%`));
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db.select().from(websiteForms).where(where).orderBy(desc(websiteForms.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(websiteForms).where(where),
    ]);

    return responseUtil.paginated(rows, { page, limit, total: Number(countResult[0]?.count || 0) });
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(websiteForms).where(eq(websiteForms.id, Number(id)));
    if (!row) return responseUtil.notFound('Form');
    return responseUtil.success(row);
  }

  async create(data) {
    const db = getDb();
    const insertData = {
      name: data.name,
      fields: typeof data.fields === 'string' ? data.fields : JSON.stringify(data.fields || []),
      settings: typeof data.settings === 'string' ? data.settings : JSON.stringify(data.settings || {}),
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    const [result] = await db.insert(websiteForms).values(insertData);
    const [created] = await db.select().from(websiteForms).where(eq(websiteForms.id, result.insertId));
    return responseUtil.success(created, 'Form created');
  }

  async update(id, data) {
    const db = getDb();
    const updateData = { ...data };
    if (updateData.fields && typeof updateData.fields !== 'string') {
      updateData.fields = JSON.stringify(updateData.fields);
    }
    if (updateData.settings && typeof updateData.settings !== 'string') {
      updateData.settings = JSON.stringify(updateData.settings);
    }
    await db.update(websiteForms).set(updateData).where(eq(websiteForms.id, Number(id)));
    const [updated] = await db.select().from(websiteForms).where(eq(websiteForms.id, Number(id)));
    return responseUtil.success(updated, 'Form updated');
  }

  async delete(id) {
    const db = getDb();
    await db.delete(websiteForms).where(eq(websiteForms.id, Number(id)));
    return responseUtil.success(null, 'Form deleted');
  }
}

export class SubmissionService {
  async findAll(formId, options = {}) {
    const db = getDb();
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const conditions = [eq(websiteFormSubmissions.formId, Number(formId))];
    const where = and(...conditions);

    const [rows, countResult] = await Promise.all([
      db.select().from(websiteFormSubmissions).where(where).orderBy(desc(websiteFormSubmissions.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(websiteFormSubmissions).where(where),
    ]);

    return responseUtil.paginated(rows, { page, limit, total: Number(countResult[0]?.count || 0) });
  }

  async submit(formId, data, meta = {}) {
    const db = getDb();
    const [form] = await db.select().from(websiteForms).where(and(eq(websiteForms.id, Number(formId)), eq(websiteForms.isActive, true)));
    if (!form) return responseUtil.notFound('Form');

    const [result] = await db.insert(websiteFormSubmissions).values({
      formId: Number(formId),
      data: JSON.stringify(data),
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
      pageSlug: meta.pageSlug || null,
    });

    // Increment submission count
    await db.update(websiteForms).set({
      submissionCount: sql`submission_count + 1`,
    }).where(eq(websiteForms.id, Number(formId)));

    return responseUtil.success({ id: result.insertId }, 'Form submitted successfully');
  }

  async markRead(id) {
    const db = getDb();
    await db.update(websiteFormSubmissions).set({ isRead: true }).where(eq(websiteFormSubmissions.id, Number(id)));
    return responseUtil.success(null, 'Marked as read');
  }

  async delete(id) {
    const db = getDb();
    await db.delete(websiteFormSubmissions).where(eq(websiteFormSubmissions.id, Number(id)));
    return responseUtil.success(null, 'Submission deleted');
  }
}

/**
 * Theme Template Service — header/footer/sidebar templates
 */
export class ThemeTemplateService {
  async findAll({ type } = {}) {
    const db = getDb();
    const conditions = [];
    if (type) conditions.push(eq(websiteThemeTemplates.type, type));

    const rows = conditions.length
      ? await db.select().from(websiteThemeTemplates).where(and(...conditions)).orderBy(asc(websiteThemeTemplates.priority))
      : await db.select().from(websiteThemeTemplates).orderBy(asc(websiteThemeTemplates.priority));

    return responseUtil.success(rows.map(r => ({
      ...r,
      conditions: r.conditions ? (() => { try { return JSON.parse(r.conditions); } catch { return null; } })() : null,
    })));
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(websiteThemeTemplates).where(eq(websiteThemeTemplates.id, Number(id)));
    if (!row) return responseUtil.error('Template not found');
    row.conditions = row.conditions ? (() => { try { return JSON.parse(row.conditions); } catch { return null; } })() : null;
    return responseUtil.success(row);
  }

  async create(data) {
    const db = getDb();
    const [result] = await db.insert(websiteThemeTemplates).values({
      name: data.name,
      type: data.type || 'header',
      content: data.content || null,
      contentHtml: data.contentHtml || null,
      conditions: data.conditions ? JSON.stringify(data.conditions) : null,
      priority: data.priority || 10,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
    return responseUtil.success({ id: result.insertId }, 'Template created');
  }

  async update(id, data) {
    const db = getDb();
    const updateData = { ...data };
    if (data.conditions && typeof data.conditions !== 'string') {
      updateData.conditions = JSON.stringify(data.conditions);
    }
    await db.update(websiteThemeTemplates).set(updateData).where(eq(websiteThemeTemplates.id, Number(id)));
    return responseUtil.success(null, 'Template updated');
  }

  async delete(id) {
    const db = getDb();
    await db.delete(websiteThemeTemplates).where(eq(websiteThemeTemplates.id, Number(id)));
    return responseUtil.success(null, 'Template deleted');
  }

  async getActiveTemplate(type) {
    const db = getDb();
    const [row] = await db.select().from(websiteThemeTemplates)
      .where(and(eq(websiteThemeTemplates.type, type), eq(websiteThemeTemplates.isActive, true)))
      .orderBy(asc(websiteThemeTemplates.priority))
      .limit(1);
    return row ? responseUtil.success(row) : responseUtil.success(null);
  }
}

/**
 * Popup Service — popup builder
 */
export class PopupService {
  async findAll({ page = 1, limit = 20, search } = {}) {
    const db = getDb();
    const offset = (page - 1) * limit;
    const conditions = [];
    if (search) conditions.push(like(websitePopups.name, `%${search}%`));

    const rows = conditions.length
      ? await db.select().from(websitePopups).where(and(...conditions)).orderBy(desc(websitePopups.id)).limit(limit).offset(offset)
      : await db.select().from(websitePopups).orderBy(desc(websitePopups.id)).limit(limit).offset(offset);

    return responseUtil.success(rows.map(r => ({
      ...r,
      conditions: r.conditions ? (() => { try { return JSON.parse(r.conditions); } catch { return null; } })() : null,
    })));
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(websitePopups).where(eq(websitePopups.id, Number(id)));
    if (!row) return responseUtil.error('Popup not found');
    row.conditions = row.conditions ? (() => { try { return JSON.parse(row.conditions); } catch { return null; } })() : null;
    return responseUtil.success(row);
  }

  async create(data) {
    const db = getDb();
    const [result] = await db.insert(websitePopups).values({
      name: data.name,
      content: data.content || null,
      contentHtml: data.contentHtml || null,
      triggerType: data.triggerType || 'page-load',
      triggerValue: data.triggerValue || null,
      position: data.position || 'center',
      width: data.width || 'md',
      overlayClose: data.overlayClose !== undefined ? data.overlayClose : true,
      showOnce: data.showOnce !== undefined ? data.showOnce : true,
      conditions: data.conditions ? JSON.stringify(data.conditions) : null,
      isActive: data.isActive !== undefined ? data.isActive : false,
    });
    return responseUtil.success({ id: result.insertId }, 'Popup created');
  }

  async update(id, data) {
    const db = getDb();
    const updateData = { ...data };
    if (data.conditions && typeof data.conditions !== 'string') {
      updateData.conditions = JSON.stringify(data.conditions);
    }
    await db.update(websitePopups).set(updateData).where(eq(websitePopups.id, Number(id)));
    return responseUtil.success(null, 'Popup updated');
  }

  async delete(id) {
    const db = getDb();
    await db.delete(websitePopups).where(eq(websitePopups.id, Number(id)));
    return responseUtil.success(null, 'Popup deleted');
  }

  async getActivePopups() {
    const db = getDb();
    const rows = await db.select().from(websitePopups)
      .where(eq(websitePopups.isActive, true));
    return responseUtil.success(rows.map(r => ({
      ...r,
      conditions: r.conditions ? (() => { try { return JSON.parse(r.conditions); } catch { return null; } })() : null,
    })));
  }
}

export default { PageService, MenuService, MediaService, SettingsService, RevisionService, FormService, SubmissionService, ThemeTemplateService, PopupService };
