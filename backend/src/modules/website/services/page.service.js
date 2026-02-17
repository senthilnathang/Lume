import { getDb } from '../../../core/db/drizzle.js';
import { websitePages, websiteMenus, websiteMenuItems, websiteMedia, websiteSettings } from '../models/schema.js';
import { eq, like, desc, asc, and, isNull, sql, inArray } from 'drizzle-orm';
import { responseUtil } from '../../../shared/utils/index.js';

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

  async update(id, data) {
    const db = getDb();
    const [existing] = await db.select().from(websitePages).where(eq(websitePages.id, Number(id)));
    if (!existing) return responseUtil.notFound('Page');
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

export default { PageService, MenuService, MediaService, SettingsService };
