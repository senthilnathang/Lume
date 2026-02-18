import { getDb } from '../../../core/db/drizzle.js';
import { websitePages, websiteMenus, websiteMenuItems, websiteMedia, websiteSettings, websitePageRevisions, websiteForms, websiteFormSubmissions, websiteThemeTemplates, websitePopups, websiteCustomFonts, websiteCustomIcons, websiteRedirects, websiteCategories, websiteTags, websitePageCategories, websitePageTags } from '../models/schema.js';
import { eq, like, desc, asc, and, isNull, sql, inArray, notInArray, gte, lte } from 'drizzle-orm';
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
    const { page = 1, limit = 20, search, status, pageType, categoryId, tagId } = options;
    const offset = (page - 1) * limit;

    // Resolve category/tag filter to page IDs via pivots
    let allowedPageIds = null; // null = no filter
    if (categoryId) {
      const pivots = await db.select({ pageId: websitePageCategories.pageId })
        .from(websitePageCategories).where(eq(websitePageCategories.categoryId, Number(categoryId)));
      allowedPageIds = pivots.map(p => p.pageId);
    }
    if (tagId) {
      const pivots = await db.select({ pageId: websitePageTags.pageId })
        .from(websitePageTags).where(eq(websitePageTags.tagId, Number(tagId)));
      const tagPageIds = pivots.map(p => p.pageId);
      allowedPageIds = allowedPageIds
        ? allowedPageIds.filter(id => tagPageIds.includes(id))
        : tagPageIds;
    }

    const conditions = [isNull(websitePages.deletedAt)];
    if (search) conditions.push(like(websitePages.title, `%${search}%`));
    if (status === 'published') conditions.push(eq(websitePages.isPublished, true));
    else if (status === 'draft') conditions.push(eq(websitePages.isPublished, false));
    if (pageType) conditions.push(eq(websitePages.pageType, pageType));
    if (allowedPageIds !== null) {
      if (allowedPageIds.length === 0) return responseUtil.paginated([], { page, limit, total: 0 });
      conditions.push(inArray(websitePages.id, allowedPageIds));
    }

    const [rows, countResult] = await Promise.all([
      db.select().from(websitePages).where(and(...conditions)).orderBy(desc(websitePages.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(websitePages).where(and(...conditions)),
    ]);

    return responseUtil.paginated(rows, { page, limit, total: Number(countResult[0]?.count || 0) });
  }

  async checkAndApplyScheduling(id) {
    const db = getDb();
    const now = new Date();
    const [row] = await db.select({
      id: websitePages.id,
      isPublished: websitePages.isPublished,
      publishAt: websitePages.publishAt,
      expireAt: websitePages.expireAt,
    }).from(websitePages).where(eq(websitePages.id, Number(id)));
    if (!row) return;
    // Auto-publish if publishAt has passed
    if (!row.isPublished && row.publishAt && new Date(row.publishAt) <= now) {
      await db.update(websitePages)
        .set({ isPublished: true, publishedAt: new Date() })
        .where(eq(websitePages.id, Number(id)));
    }
    // Auto-expire if expireAt has passed
    if (row.isPublished && row.expireAt && new Date(row.expireAt) <= now) {
      await db.update(websitePages)
        .set({ isPublished: false })
        .where(eq(websitePages.id, Number(id)));
    }
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(websitePages).where(eq(websitePages.id, Number(id)));
    if (!row) return responseUtil.notFound('Page');
    return responseUtil.success(row);
  }

  async findBySlug(slug, options = {}) {
    const db = getDb();
    // First check if there's a scheduled page that should now be published
    const [draft] = await db.select({ id: websitePages.id, publishAt: websitePages.publishAt, expireAt: websitePages.expireAt, isPublished: websitePages.isPublished })
      .from(websitePages).where(and(eq(websitePages.slug, slug), isNull(websitePages.deletedAt)));
    if (draft) await this.checkAndApplyScheduling(draft.id);

    const [row] = await db.select().from(websitePages)
      .where(and(eq(websitePages.slug, slug), eq(websitePages.isPublished, true), isNull(websitePages.deletedAt)));
    if (!row) return responseUtil.notFound('Page');

    // Access control by visibility
    const vis = row.visibility || 'public';
    if (vis === 'private') {
      return responseUtil.error('This page is private', null, 'PAGE_PRIVATE');
    }
    if (vis === 'password') {
      // Return a gate response unless the correct password token was provided
      const { passwordToken } = options;
      if (!passwordToken || passwordToken !== row.passwordHash) {
        // Don't expose content — return metadata only with requiresPassword flag
        const { content, contentHtml, passwordHash, ...meta } = row;
        return responseUtil.success({ ...meta, requiresPassword: true, content: null, contentHtml: null });
      }
    }

    // Strip sensitive field before returning
    const { passwordHash, ...safeRow } = row;
    return responseUtil.success(safeRow);
  }

  async verifyPagePassword(slug, password) {
    const db = getDb();
    const [row] = await db.select({ id: websitePages.id, slug: websitePages.slug, passwordHash: websitePages.passwordHash, visibility: websitePages.visibility })
      .from(websitePages).where(and(eq(websitePages.slug, slug), isNull(websitePages.deletedAt)));
    if (!row) return responseUtil.notFound('Page');
    if (row.visibility !== 'password') return responseUtil.error('Page is not password protected', null, 'NOT_PROTECTED');
    if (!password || password !== row.passwordHash) {
      return responseUtil.error('Incorrect password', null, 'WRONG_PASSWORD');
    }
    // Return the password itself as the token (simple approach for CMS use)
    return responseUtil.success({ token: row.passwordHash }, 'Access granted');
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
      createdAt: websitePages.createdAt,
      parentId: websitePages.parentId,
    }).from(websitePages)
      .where(and(eq(websitePages.isPublished, true), isNull(websitePages.deletedAt), eq(websitePages.noIndex, false)));
    return rows;
  }

  /**
   * Return breadcrumb chain for a given page slug.
   * Walks up via parentId until there is no parent, building an ordered list
   * from root → current page.
   */
  async getBreadcrumbs(slug) {
    const db = getDb();
    const MAX_DEPTH = 10; // safety guard against cycles

    const [startPage] = await db.select({
      id: websitePages.id,
      title: websitePages.title,
      slug: websitePages.slug,
      parentId: websitePages.parentId,
    }).from(websitePages)
      .where(and(eq(websitePages.slug, slug), isNull(websitePages.deletedAt)));

    if (!startPage) return responseUtil.error('Page not found', null, 'NOT_FOUND');

    const chain = [startPage];
    let current = startPage;

    for (let i = 0; i < MAX_DEPTH && current.parentId; i++) {
      const [parent] = await db.select({
        id: websitePages.id,
        title: websitePages.title,
        slug: websitePages.slug,
        parentId: websitePages.parentId,
      }).from(websitePages)
        .where(and(eq(websitePages.id, current.parentId), isNull(websitePages.deletedAt)));
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }

    return responseUtil.success(chain);
  }

  async lockPage(pageId, userId) {
    const db = getDb();
    const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    const [existing] = await db.select({
      id: websitePages.id,
      lockedBy: websitePages.lockedBy,
      lockedAt: websitePages.lockedAt,
    }).from(websitePages).where(and(eq(websitePages.id, Number(pageId)), isNull(websitePages.deletedAt)));
    if (!existing) return responseUtil.notFound('Page');

    // Check if locked by someone else and lock is still fresh
    if (existing.lockedBy && existing.lockedBy !== Number(userId)) {
      const lockedAgo = existing.lockedAt ? Date.now() - new Date(existing.lockedAt).getTime() : Infinity;
      if (lockedAgo < LOCK_TIMEOUT_MS) {
        return responseUtil.error('Page is locked by another user', null, 'PAGE_LOCKED');
      }
    }
    await db.update(websitePages).set({ lockedBy: Number(userId), lockedAt: new Date() }).where(eq(websitePages.id, Number(pageId)));
    return responseUtil.success({ lockedBy: Number(userId), lockedAt: new Date() });
  }

  async unlockPage(pageId, userId) {
    const db = getDb();
    const [existing] = await db.select({ lockedBy: websitePages.lockedBy }).from(websitePages)
      .where(and(eq(websitePages.id, Number(pageId)), isNull(websitePages.deletedAt)));
    if (!existing) return responseUtil.notFound('Page');
    // Only the lock holder or admin can unlock (route-level auth handles admin)
    if (existing.lockedBy && existing.lockedBy !== Number(userId)) {
      return responseUtil.error('Cannot unlock a page locked by another user', null, 'FORBIDDEN');
    }
    await db.update(websitePages).set({ lockedBy: null, lockedAt: null }).where(eq(websitePages.id, Number(pageId)));
    return responseUtil.success(null, 'Page unlocked');
  }

  async getLockStatus(pageId) {
    const db = getDb();
    const LOCK_TIMEOUT_MS = 30 * 60 * 1000;
    const [row] = await db.select({ lockedBy: websitePages.lockedBy, lockedAt: websitePages.lockedAt })
      .from(websitePages).where(and(eq(websitePages.id, Number(pageId)), isNull(websitePages.deletedAt)));
    if (!row) return responseUtil.notFound('Page');
    const isLocked = row.lockedBy && row.lockedAt
      ? (Date.now() - new Date(row.lockedAt).getTime()) < LOCK_TIMEOUT_MS
      : false;
    return responseUtil.success({ isLocked, lockedBy: isLocked ? row.lockedBy : null, lockedAt: isLocked ? row.lockedAt : null });
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

  /**
   * Evaluate a single condition against the context object.
   * Returns true if the condition matches.
   */
  _evaluateCondition(condition, context = {}) {
    const { type, operator, value } = condition;
    const isNot = operator === 'is-not';

    let matches = false;
    switch (type) {
      case 'all':
        matches = true;
        break;
      case 'page-type':
        matches = context.pageType === value;
        break;
      case 'specific-page':
        matches = context.slug === value || context.pageId === value || String(context.pageId) === String(value);
        break;
      case 'taxonomy':
        matches = Array.isArray(context.taxonomies)
          ? context.taxonomies.includes(value)
          : context.taxonomy === value;
        break;
      case 'author':
        matches = String(context.authorId) === String(value) || context.author === value;
        break;
      case 'date-range': {
        const now = new Date();
        const parsed = typeof value === 'object' ? value : {};
        const from = parsed.from ? new Date(parsed.from) : null;
        const to = parsed.to ? new Date(parsed.to) : null;
        if (from && to) matches = now >= from && now <= to;
        else if (from) matches = now >= from;
        else if (to) matches = now <= to;
        else matches = true;
        break;
      }
      default:
        matches = true;
    }

    return isNot ? !matches : matches;
  }

  /**
   * Evaluate conditions array against context.
   * conditions: Array<{ section: 'include'|'exclude', type, operator, value }>
   * Returns true if the template should be shown.
   */
  _matchesConditions(conditions, context = {}) {
    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return true; // no conditions = show everywhere
    }

    const includes = conditions.filter(c => c.section === 'include');
    const excludes = conditions.filter(c => c.section === 'exclude');

    // If exclude conditions exist and any match, skip this template
    if (excludes.length > 0 && excludes.some(c => this._evaluateCondition(c, context))) {
      return false;
    }

    // If include conditions exist, at least one must match
    if (includes.length > 0) {
      return includes.some(c => this._evaluateCondition(c, context));
    }

    return true;
  }

  async getActiveTemplate(type, context = {}) {
    const db = getDb();
    // Fetch all active templates of the given type, ordered by priority (lower = higher priority)
    const rows = await db.select().from(websiteThemeTemplates)
      .where(and(eq(websiteThemeTemplates.type, type), eq(websiteThemeTemplates.isActive, true)))
      .orderBy(asc(websiteThemeTemplates.priority));

    // Parse conditions and evaluate each template against context
    for (const row of rows) {
      let parsedConditions = null;
      if (row.conditions) {
        try { parsedConditions = JSON.parse(row.conditions); } catch { parsedConditions = null; }
      }
      if (this._matchesConditions(parsedConditions, context)) {
        return responseUtil.success({ ...row, conditions: parsedConditions });
      }
    }
    return responseUtil.success(null);
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

/**
 * Font Service — custom font upload and management
 */
export class FontService {
  async findAll(options = {}) {
    const db = getDb();
    const { search } = options;
    const conditions = [];
    if (search) conditions.push(like(websiteCustomFonts.name, `%${search}%`));
    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await db.select().from(websiteCustomFonts).where(where).orderBy(desc(websiteCustomFonts.createdAt));
    return responseUtil.success(rows);
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(websiteCustomFonts).where(eq(websiteCustomFonts.id, Number(id)));
    if (!row) return responseUtil.notFound('Font');
    return responseUtil.success(row);
  }

  async uploadFont(file) {
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads', 'fonts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const formatMap = { '.ttf': 'truetype', '.otf': 'opentype', '.woff': 'woff', '.woff2': 'woff2' };
    const format = formatMap[ext] || 'woff2';

    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${baseName}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const fileUrl = `/uploads/fonts/${filename}`;
    const fontName = baseName.replace(/_/g, ' ');
    const family = fontName;

    const db = getDb();
    const [result] = await db.insert(websiteCustomFonts).values({
      name: fontName,
      family,
      weight: 400,
      style: 'normal',
      fileUrl,
      format,
    });

    const [created] = await db.select().from(websiteCustomFonts).where(eq(websiteCustomFonts.id, result.insertId));
    return responseUtil.success(created, 'Font uploaded');
  }

  async update(id, data) {
    const db = getDb();
    await db.update(websiteCustomFonts).set(data).where(eq(websiteCustomFonts.id, Number(id)));
    const [updated] = await db.select().from(websiteCustomFonts).where(eq(websiteCustomFonts.id, Number(id)));
    return responseUtil.success(updated, 'Font updated');
  }

  async delete(id) {
    const db = getDb();
    const [font] = await db.select().from(websiteCustomFonts).where(eq(websiteCustomFonts.id, Number(id)));
    if (font?.fileUrl) {
      const fullPath = path.resolve(process.env.UPLOAD_DIR || './uploads', font.fileUrl.replace(/^\/uploads\//, ''));
      try { fs.unlinkSync(fullPath); } catch { /* file may not exist */ }
    }
    await db.delete(websiteCustomFonts).where(eq(websiteCustomFonts.id, Number(id)));
    return responseUtil.success(null, 'Font deleted');
  }

  async searchGoogleFonts(query) {
    const apiKey = process.env.GOOGLE_FONTS_API_KEY;
    if (!apiKey) {
      // Return a curated list of popular Google Fonts when no API key
      const popularFonts = [
        'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
        'Raleway', 'Nunito', 'Playfair Display', 'Merriweather', 'Source Sans Pro',
        'Ubuntu', 'Oswald', 'PT Sans', 'Noto Sans', 'Fira Sans',
        'Work Sans', 'Quicksand', 'Josefin Sans', 'DM Sans', 'Mulish',
        'Barlow', 'Rubik', 'Karla', 'Libre Baskerville', 'Crimson Text',
        'Space Grotesk', 'IBM Plex Sans', 'Manrope', 'Outfit',
      ];
      const filtered = query
        ? popularFonts.filter(f => f.toLowerCase().includes(query.toLowerCase()))
        : popularFonts;
      return responseUtil.success(filtered.map(f => ({
        family: f,
        variants: ['400', '400italic', '700', '700italic'],
        category: 'sans-serif',
        url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}:wght@400;700&display=swap`,
      })));
    }

    try {
      const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`;
      const response = await fetch(url);
      const data = await response.json();
      let fonts = data.items || [];
      if (query) {
        fonts = fonts.filter(f => f.family.toLowerCase().includes(query.toLowerCase()));
      }
      return responseUtil.success(fonts.slice(0, 50).map(f => ({
        family: f.family,
        variants: f.variants,
        category: f.category,
        url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family)}:wght@400;700&display=swap`,
      })));
    } catch (err) {
      console.error('Google Fonts API error:', err);
      return responseUtil.error('Failed to search Google Fonts');
    }
  }
}

/**
 * Icon Service — custom SVG icon management
 */
export class IconService {
  async findAll(options = {}) {
    const db = getDb();
    const { search, setName } = options;
    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${websiteCustomIcons.name} LIKE ${'%' + search + '%'} OR ${websiteCustomIcons.tags} LIKE ${'%' + search + '%'})`
      );
    }
    if (setName) conditions.push(eq(websiteCustomIcons.setName, setName));
    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await db.select().from(websiteCustomIcons).where(where).orderBy(asc(websiteCustomIcons.name));
    return responseUtil.success(rows);
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(websiteCustomIcons).where(eq(websiteCustomIcons.id, Number(id)));
    if (!row) return responseUtil.notFound('Icon');
    return responseUtil.success(row);
  }

  async uploadIcon(file) {
    const svgContent = file.buffer.toString('utf-8');

    // Basic SVG validation
    if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
      return responseUtil.error('Invalid SVG file');
    }

    // Clean SVG — extract just the SVG element
    const svgMatch = svgContent.match(/<svg[\s\S]*<\/svg>/i);
    if (!svgMatch) {
      return responseUtil.error('Could not parse SVG content');
    }

    const baseName = path.basename(file.originalname, path.extname(file.originalname));
    const name = baseName.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();

    const db = getDb();
    const [result] = await db.insert(websiteCustomIcons).values({
      name,
      setName: 'custom',
      svgContent: svgMatch[0],
      tags: name.toLowerCase(),
    });

    const [created] = await db.select().from(websiteCustomIcons).where(eq(websiteCustomIcons.id, result.insertId));
    return responseUtil.success(created, 'Icon uploaded');
  }

  async uploadMultipleIcons(files) {
    const results = [];
    for (const file of files) {
      const result = await this.uploadIcon(file);
      if (result.success) results.push(result.data);
    }
    return responseUtil.success(results, `${results.length} icons uploaded`);
  }

  async create(data) {
    const db = getDb();
    const [result] = await db.insert(websiteCustomIcons).values({
      name: data.name,
      setName: data.setName || 'custom',
      svgContent: data.svgContent,
      tags: data.tags || data.name.toLowerCase(),
    });
    const [created] = await db.select().from(websiteCustomIcons).where(eq(websiteCustomIcons.id, result.insertId));
    return responseUtil.success(created, 'Icon created');
  }

  async update(id, data) {
    const db = getDb();
    await db.update(websiteCustomIcons).set(data).where(eq(websiteCustomIcons.id, Number(id)));
    const [updated] = await db.select().from(websiteCustomIcons).where(eq(websiteCustomIcons.id, Number(id)));
    return responseUtil.success(updated, 'Icon updated');
  }

  async delete(id) {
    const db = getDb();
    await db.delete(websiteCustomIcons).where(eq(websiteCustomIcons.id, Number(id)));
    return responseUtil.success(null, 'Icon deleted');
  }
}

export class RedirectService {
  async findAll(options = {}) {
    const db = getDb();
    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    const conditions = [isNull(websiteRedirects.deletedAt)];
    if (search) {
      conditions.push(like(websiteRedirects.sourcePath, `%${search}%`));
    }

    const [rows, countResult] = await Promise.all([
      db.select().from(websiteRedirects).where(and(...conditions)).orderBy(desc(websiteRedirects.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(websiteRedirects).where(and(...conditions)),
    ]);

    return responseUtil.paginated(rows, { page, limit, total: Number(countResult[0]?.count || 0) });
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(websiteRedirects).where(eq(websiteRedirects.id, Number(id)));
    if (!row) return responseUtil.notFound('Redirect');
    return responseUtil.success(row);
  }

  async create(data) {
    const db = getDb();
    const [result] = await db.insert(websiteRedirects).values({
      sourcePath: data.sourcePath,
      targetPath: data.targetPath,
      statusCode: data.statusCode || 301,
      isActive: data.isActive !== false,
    });
    const [created] = await db.select().from(websiteRedirects).where(eq(websiteRedirects.id, result.insertId));
    return responseUtil.success(created, 'Redirect created');
  }

  async update(id, data) {
    const db = getDb();
    const [existing] = await db.select().from(websiteRedirects).where(eq(websiteRedirects.id, Number(id)));
    if (!existing) return responseUtil.notFound('Redirect');
    await db.update(websiteRedirects).set(data).where(eq(websiteRedirects.id, Number(id)));
    const [updated] = await db.select().from(websiteRedirects).where(eq(websiteRedirects.id, Number(id)));
    return responseUtil.success(updated, 'Redirect updated');
  }

  async delete(id) {
    const db = getDb();
    const [existing] = await db.select().from(websiteRedirects).where(eq(websiteRedirects.id, Number(id)));
    if (!existing) return responseUtil.notFound('Redirect');
    await db.update(websiteRedirects).set({ deletedAt: new Date() }).where(eq(websiteRedirects.id, Number(id)));
    return responseUtil.success(null, 'Redirect deleted');
  }

  async incrementHits(sourcePath) {
    const db = getDb();
    const [row] = await db.select().from(websiteRedirects)
      .where(and(eq(websiteRedirects.sourcePath, sourcePath), eq(websiteRedirects.isActive, true), isNull(websiteRedirects.deletedAt)))
      .limit(1);
    if (row) {
      await db.update(websiteRedirects).set({ hits: (row.hits || 0) + 1 }).where(eq(websiteRedirects.id, row.id));
    }
    return row;
  }
}

export class QueryService {
  async execute(query) {
    const db = getDb();
    let q = db.select().from(websitePages);
    const conditions = [eq(websitePages.isPublished, 1)];
    if (query.source && query.source !== 'all') {
      conditions.push(eq(websitePages.pageType, query.source));
    }
    if (query.includeIds?.length) {
      const ids = (Array.isArray(query.includeIds) ? query.includeIds : String(query.includeIds).split(',')).map(Number).filter(Boolean);
      if (ids.length) conditions.push(inArray(websitePages.id, ids));
    }
    if (query.excludeIds?.length) {
      const ids = (Array.isArray(query.excludeIds) ? query.excludeIds : String(query.excludeIds).split(',')).map(Number).filter(Boolean);
      if (ids.length) conditions.push(notInArray(websitePages.id, ids));
    }
    if (query.dateFrom) {
      conditions.push(gte(websitePages.createdAt, new Date(query.dateFrom)));
    }
    if (query.dateTo) {
      conditions.push(lte(websitePages.createdAt, new Date(query.dateTo)));
    }
    if (conditions.length) q = q.where(and(...conditions));
    const orderCol = query.orderBy === 'title' ? websitePages.title : websitePages.createdAt;
    q = q.orderBy(query.orderDir === 'asc' ? asc(orderCol) : desc(orderCol));
    q = q.limit(Number(query.limit) || 10).offset(Number(query.offset) || 0);
    return q;
  }
}


export class CategoryService {
  async findAll(options = {}) {
    const db = getDb();
    const { search } = options;
    const conditions = [isNull(websiteCategories.deletedAt)];
    if (search) conditions.push(like(websiteCategories.name, `%${search}%`));
    const rows = await db.select().from(websiteCategories)
      .where(and(...conditions))
      .orderBy(asc(websiteCategories.sequence), asc(websiteCategories.name));
    return responseUtil.success(rows);
  }

  async findBySlug(slug) {
    const db = getDb();
    const [row] = await db.select().from(websiteCategories)
      .where(and(eq(websiteCategories.slug, slug), isNull(websiteCategories.deletedAt)));
    if (!row) return responseUtil.notFound('Category');
    return responseUtil.success(row);
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(websiteCategories)
      .where(and(eq(websiteCategories.id, Number(id)), isNull(websiteCategories.deletedAt)));
    if (!row) return responseUtil.notFound('Category');
    return responseUtil.success(row);
  }

  async create(data) {
    const db = getDb();
    if (!data.slug && data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    }
    const [result] = await db.insert(websiteCategories).values(data);
    const [created] = await db.select().from(websiteCategories).where(eq(websiteCategories.id, result.insertId));
    return responseUtil.success(created, 'Category created');
  }

  async update(id, data) {
    const db = getDb();
    const [existing] = await db.select().from(websiteCategories).where(eq(websiteCategories.id, Number(id)));
    if (!existing) return responseUtil.notFound('Category');
    await db.update(websiteCategories).set({ ...data, updatedAt: new Date() }).where(eq(websiteCategories.id, Number(id)));
    const [updated] = await db.select().from(websiteCategories).where(eq(websiteCategories.id, Number(id)));
    return responseUtil.success(updated, 'Category updated');
  }

  async delete(id) {
    const db = getDb();
    const [existing] = await db.select().from(websiteCategories).where(eq(websiteCategories.id, Number(id)));
    if (!existing) return responseUtil.notFound('Category');
    await db.update(websiteCategories).set({ deletedAt: new Date() }).where(eq(websiteCategories.id, Number(id)));
    return responseUtil.success(null, 'Category deleted');
  }

  async findPagesByCategory(categoryId) {
    const db = getDb();
    const pivots = await db.select().from(websitePageCategories)
      .where(eq(websitePageCategories.categoryId, Number(categoryId)));
    if (!pivots.length) return responseUtil.success([]);
    const pageIds = pivots.map(p => p.pageId);
    const pages = await db.select({ id: websitePages.id, title: websitePages.title, slug: websitePages.slug, excerpt: websitePages.excerpt, featuredImage: websitePages.featuredImage, publishedAt: websitePages.publishedAt })
      .from(websitePages)
      .where(and(inArray(websitePages.id, pageIds), eq(websitePages.isPublished, true), isNull(websitePages.deletedAt)));
    return responseUtil.success(pages);
  }

  async getPageCategories(pageId) {
    const db = getDb();
    const pivots = await db.select().from(websitePageCategories)
      .where(eq(websitePageCategories.pageId, Number(pageId)));
    if (!pivots.length) return responseUtil.success([]);
    const catIds = pivots.map(p => p.categoryId);
    const cats = await db.select().from(websiteCategories)
      .where(and(inArray(websiteCategories.id, catIds), isNull(websiteCategories.deletedAt)));
    return responseUtil.success(cats);
  }

  async setPageCategories(pageId, categoryIds) {
    const db = getDb();
    await db.delete(websitePageCategories).where(eq(websitePageCategories.pageId, Number(pageId)));
    if (categoryIds && categoryIds.length) {
      await db.insert(websitePageCategories).values(categoryIds.map(cid => ({ pageId: Number(pageId), categoryId: Number(cid) })));
    }
    return responseUtil.success(null, 'Categories updated');
  }

  // Bulk reorder: accepts [{ id, sequence }] array and updates sequence for each
  async reorder(items) {
    const db = getDb();
    await Promise.all(
      items.map(({ id, sequence }) =>
        db.update(websiteCategories).set({ sequence: Number(sequence) }).where(eq(websiteCategories.id, Number(id)))
      )
    );
    return responseUtil.success(null, 'Categories reordered');
  }
}

export class TagService {
  async findAll(options = {}) {
    const db = getDb();
    const { search } = options;
    const conditions = [isNull(websiteTags.deletedAt)];
    if (search) conditions.push(like(websiteTags.name, `%${search}%`));
    const rows = await db.select().from(websiteTags)
      .where(and(...conditions))
      .orderBy(asc(websiteTags.name));
    return responseUtil.success(rows);
  }

  async findBySlug(slug) {
    const db = getDb();
    const [row] = await db.select().from(websiteTags)
      .where(and(eq(websiteTags.slug, slug), isNull(websiteTags.deletedAt)));
    if (!row) return responseUtil.notFound('Tag');
    return responseUtil.success(row);
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(websiteTags)
      .where(and(eq(websiteTags.id, Number(id)), isNull(websiteTags.deletedAt)));
    if (!row) return responseUtil.notFound('Tag');
    return responseUtil.success(row);
  }

  async create(data) {
    const db = getDb();
    if (!data.slug && data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    }
    const [result] = await db.insert(websiteTags).values(data);
    const [created] = await db.select().from(websiteTags).where(eq(websiteTags.id, result.insertId));
    return responseUtil.success(created, 'Tag created');
  }

  async update(id, data) {
    const db = getDb();
    const [existing] = await db.select().from(websiteTags).where(eq(websiteTags.id, Number(id)));
    if (!existing) return responseUtil.notFound('Tag');
    await db.update(websiteTags).set({ ...data, updatedAt: new Date() }).where(eq(websiteTags.id, Number(id)));
    const [updated] = await db.select().from(websiteTags).where(eq(websiteTags.id, Number(id)));
    return responseUtil.success(updated, 'Tag updated');
  }

  async delete(id) {
    const db = getDb();
    const [existing] = await db.select().from(websiteTags).where(eq(websiteTags.id, Number(id)));
    if (!existing) return responseUtil.notFound('Tag');
    await db.update(websiteTags).set({ deletedAt: new Date() }).where(eq(websiteTags.id, Number(id)));
    return responseUtil.success(null, 'Tag deleted');
  }

  async findPagesByTag(tagId) {
    const db = getDb();
    const pivots = await db.select().from(websitePageTags)
      .where(eq(websitePageTags.tagId, Number(tagId)));
    if (!pivots.length) return responseUtil.success([]);
    const pageIds = pivots.map(p => p.pageId);
    const pages = await db.select({ id: websitePages.id, title: websitePages.title, slug: websitePages.slug, excerpt: websitePages.excerpt, featuredImage: websitePages.featuredImage, publishedAt: websitePages.publishedAt })
      .from(websitePages)
      .where(and(inArray(websitePages.id, pageIds), eq(websitePages.isPublished, true), isNull(websitePages.deletedAt)));
    return responseUtil.success(pages);
  }

  async getPageTags(pageId) {
    const db = getDb();
    const pivots = await db.select().from(websitePageTags)
      .where(eq(websitePageTags.pageId, Number(pageId)));
    if (!pivots.length) return responseUtil.success([]);
    const tagIds = pivots.map(p => p.tagId);
    const tags = await db.select().from(websiteTags)
      .where(and(inArray(websiteTags.id, tagIds), isNull(websiteTags.deletedAt)));
    return responseUtil.success(tags);
  }

  async setPageTags(pageId, tagIds) {
    const db = getDb();
    await db.delete(websitePageTags).where(eq(websitePageTags.pageId, Number(pageId)));
    if (tagIds && tagIds.length) {
      await db.insert(websitePageTags).values(tagIds.map(tid => ({ pageId: Number(pageId), tagId: Number(tid) })));
    }
    return responseUtil.success(null, 'Tags updated');
  }
}

export default { PageService, MenuService, MediaService, SettingsService, RevisionService, FormService, SubmissionService, ThemeTemplateService, PopupService, FontService, IconService, QueryService, RedirectService, CategoryService, TagService };
