import { getDb } from '../../../core/db/drizzle.js';
import { editorTemplates, editorSnippets } from '../models/schema.js';
import { eq, like, desc, and, isNull, sql } from 'drizzle-orm';
import { responseUtil } from '../../../shared/utils/index.js';

export class EditorTemplateService {
  async findAll(options = {}) {
    const db = getDb();
    const { page = 1, limit = 50, search, category } = options;
    const offset = (page - 1) * limit;

    const conditions = [isNull(editorTemplates.deletedAt)];
    if (search) conditions.push(like(editorTemplates.name, `%${search}%`));
    if (category) conditions.push(eq(editorTemplates.category, category));

    const [rows, countResult] = await Promise.all([
      db.select().from(editorTemplates).where(and(...conditions)).orderBy(desc(editorTemplates.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(editorTemplates).where(and(...conditions)),
    ]);

    return responseUtil.paginated(rows, { page, limit, total: Number(countResult[0]?.count || 0) });
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(editorTemplates).where(eq(editorTemplates.id, Number(id)));
    if (!row) return responseUtil.notFound('Template');
    return responseUtil.success(row);
  }

  async getDefault() {
    const db = getDb();
    const [row] = await db.select().from(editorTemplates)
      .where(and(eq(editorTemplates.isDefault, true), isNull(editorTemplates.deletedAt)))
      .limit(1);
    if (!row) return responseUtil.notFound('Default template');
    return responseUtil.success(row);
  }

  async create(data) {
    const db = getDb();
    const [result] = await db.insert(editorTemplates).values(data);
    const [created] = await db.select().from(editorTemplates).where(eq(editorTemplates.id, result.insertId));
    return responseUtil.success(created, 'Template created');
  }

  async update(id, data) {
    const db = getDb();
    const [existing] = await db.select().from(editorTemplates).where(eq(editorTemplates.id, Number(id)));
    if (!existing) return responseUtil.notFound('Template');
    await db.update(editorTemplates).set(data).where(eq(editorTemplates.id, Number(id)));
    const [updated] = await db.select().from(editorTemplates).where(eq(editorTemplates.id, Number(id)));
    return responseUtil.success(updated, 'Template updated');
  }

  async delete(id) {
    const db = getDb();
    const [existing] = await db.select().from(editorTemplates).where(eq(editorTemplates.id, Number(id)));
    if (!existing) return responseUtil.notFound('Template');
    await db.update(editorTemplates).set({ deletedAt: new Date() }).where(eq(editorTemplates.id, Number(id)));
    return responseUtil.success(null, 'Template deleted');
  }
}

export class EditorSnippetService {
  async findAll(options = {}) {
    const db = getDb();
    const { page = 1, limit = 50, search, category } = options;
    const offset = (page - 1) * limit;

    const conditions = [isNull(editorSnippets.deletedAt)];
    if (search) conditions.push(like(editorSnippets.name, `%${search}%`));
    if (category) conditions.push(eq(editorSnippets.category, category));

    const [rows, countResult] = await Promise.all([
      db.select().from(editorSnippets).where(and(...conditions)).orderBy(desc(editorSnippets.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(editorSnippets).where(and(...conditions)),
    ]);

    return responseUtil.paginated(rows, { page, limit, total: Number(countResult[0]?.count || 0) });
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(editorSnippets).where(eq(editorSnippets.id, Number(id)));
    if (!row) return responseUtil.notFound('Snippet');
    return responseUtil.success(row);
  }

  async create(data) {
    const db = getDb();
    const [result] = await db.insert(editorSnippets).values(data);
    const [created] = await db.select().from(editorSnippets).where(eq(editorSnippets.id, result.insertId));
    return responseUtil.success(created, 'Snippet created');
  }

  async update(id, data) {
    const db = getDb();
    const [existing] = await db.select().from(editorSnippets).where(eq(editorSnippets.id, Number(id)));
    if (!existing) return responseUtil.notFound('Snippet');
    await db.update(editorSnippets).set(data).where(eq(editorSnippets.id, Number(id)));
    const [updated] = await db.select().from(editorSnippets).where(eq(editorSnippets.id, Number(id)));
    return responseUtil.success(updated, 'Snippet updated');
  }

  async delete(id) {
    const db = getDb();
    const [existing] = await db.select().from(editorSnippets).where(eq(editorSnippets.id, Number(id)));
    if (!existing) return responseUtil.notFound('Snippet');
    await db.update(editorSnippets).set({ deletedAt: new Date() }).where(eq(editorSnippets.id, Number(id)));
    return responseUtil.success(null, 'Snippet deleted');
  }
}
