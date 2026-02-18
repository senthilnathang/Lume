import { getDb } from '../../../core/db/drizzle.js';
import { editorTemplates, editorSnippets, editorPresets, editorGlobalWidgets, editorNotes } from '../models/schema.js';
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

export class EditorPresetService {
  async findAll(options = {}) {
    const db = getDb();
    const { page = 1, limit = 50, search, blockType } = options;
    const offset = (page - 1) * limit;

    const conditions = [isNull(editorPresets.deletedAt)];
    if (search) conditions.push(like(editorPresets.name, `%${search}%`));
    if (blockType) conditions.push(eq(editorPresets.blockType, blockType));

    const [rows, countResult] = await Promise.all([
      db.select().from(editorPresets).where(and(...conditions)).orderBy(desc(editorPresets.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(editorPresets).where(and(...conditions)),
    ]);

    return responseUtil.paginated(rows, { page, limit, total: Number(countResult[0]?.count || 0) });
  }

  async findByBlockType(blockType) {
    const db = getDb();
    const rows = await db.select().from(editorPresets)
      .where(and(eq(editorPresets.blockType, blockType), isNull(editorPresets.deletedAt)))
      .orderBy(desc(editorPresets.createdAt));
    return responseUtil.success(rows);
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(editorPresets).where(eq(editorPresets.id, Number(id)));
    if (!row) return responseUtil.notFound('Preset');
    return responseUtil.success(row);
  }

  async create(data) {
    const db = getDb();
    const [result] = await db.insert(editorPresets).values(data);
    const [created] = await db.select().from(editorPresets).where(eq(editorPresets.id, result.insertId));
    return responseUtil.success(created, 'Preset created');
  }

  async update(id, data) {
    const db = getDb();
    const [existing] = await db.select().from(editorPresets).where(eq(editorPresets.id, Number(id)));
    if (!existing) return responseUtil.notFound('Preset');
    await db.update(editorPresets).set(data).where(eq(editorPresets.id, Number(id)));
    const [updated] = await db.select().from(editorPresets).where(eq(editorPresets.id, Number(id)));
    return responseUtil.success(updated, 'Preset updated');
  }

  async delete(id) {
    const db = getDb();
    const [existing] = await db.select().from(editorPresets).where(eq(editorPresets.id, Number(id)));
    if (!existing) return responseUtil.notFound('Preset');
    await db.update(editorPresets).set({ deletedAt: new Date() }).where(eq(editorPresets.id, Number(id)));
    return responseUtil.success(null, 'Preset deleted');
  }
}

export class GlobalWidgetService {
  async findAll(options = {}) {
    const db = getDb();
    const { page = 1, limit = 50, search } = options;
    const offset = (page - 1) * limit;

    const conditions = [isNull(editorGlobalWidgets.deletedAt)];
    if (search) conditions.push(like(editorGlobalWidgets.name, `%${search}%`));

    const [rows, countResult] = await Promise.all([
      db.select().from(editorGlobalWidgets).where(and(...conditions)).orderBy(desc(editorGlobalWidgets.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(editorGlobalWidgets).where(and(...conditions)),
    ]);

    return responseUtil.paginated(rows, { page, limit, total: Number(countResult[0]?.count || 0) });
  }

  async findById(id) {
    const db = getDb();
    const [row] = await db.select().from(editorGlobalWidgets)
      .where(and(eq(editorGlobalWidgets.id, Number(id)), isNull(editorGlobalWidgets.deletedAt)));
    if (!row) return responseUtil.notFound('Global Widget');
    return responseUtil.success(row);
  }

  async create(data) {
    const db = getDb();
    const [result] = await db.insert(editorGlobalWidgets).values({
      name: data.name,
      blockType: data.blockType || 'custom',
      content: typeof data.content === 'string' ? data.content : JSON.stringify(data.content || {}),
      createdBy: data.createdBy || null,
    });
    const [created] = await db.select().from(editorGlobalWidgets).where(eq(editorGlobalWidgets.id, result.insertId));
    return responseUtil.success(created, 'Global widget created');
  }

  async update(id, data) {
    const db = getDb();
    const [existing] = await db.select().from(editorGlobalWidgets)
      .where(and(eq(editorGlobalWidgets.id, Number(id)), isNull(editorGlobalWidgets.deletedAt)));
    if (!existing) return responseUtil.notFound('Global Widget');
    const updateData = { ...data };
    if (updateData.content && typeof updateData.content !== 'string') {
      updateData.content = JSON.stringify(updateData.content);
    }
    await db.update(editorGlobalWidgets).set(updateData).where(eq(editorGlobalWidgets.id, Number(id)));
    const [updated] = await db.select().from(editorGlobalWidgets).where(eq(editorGlobalWidgets.id, Number(id)));
    return responseUtil.success(updated, 'Global widget updated');
  }

  async delete(id) {
    const db = getDb();
    const [existing] = await db.select().from(editorGlobalWidgets)
      .where(and(eq(editorGlobalWidgets.id, Number(id)), isNull(editorGlobalWidgets.deletedAt)));
    if (!existing) return responseUtil.notFound('Global Widget');
    await db.update(editorGlobalWidgets).set({ deletedAt: new Date() }).where(eq(editorGlobalWidgets.id, Number(id)));
    return responseUtil.success(null, 'Global widget deleted');
  }
}

export class NoteService {
  async findByPage(pageId) {
    const db = getDb();
    const rows = await db.select().from(editorNotes)
      .where(eq(editorNotes.pageId, Number(pageId)))
      .orderBy(desc(editorNotes.createdAt));
    return responseUtil.success(rows);
  }

  async create(data) {
    const db = getDb();
    const [result] = await db.insert(editorNotes).values({
      pageId: Number(data.pageId),
      blockId: data.blockId || null,
      content: data.content,
      authorId: Number(data.authorId),
      parentId: data.parentId ? Number(data.parentId) : null,
      isResolved: 0,
    });
    const [created] = await db.select().from(editorNotes).where(eq(editorNotes.id, result.insertId));
    return responseUtil.success(created, 'Note created');
  }

  async reply(parentId, data) {
    const db = getDb();
    const [parent] = await db.select().from(editorNotes).where(eq(editorNotes.id, Number(parentId)));
    if (!parent) return responseUtil.notFound('Note');
    const [result] = await db.insert(editorNotes).values({
      pageId: parent.pageId,
      blockId: parent.blockId || null,
      content: data.content,
      authorId: Number(data.authorId),
      parentId: Number(parentId),
      isResolved: 0,
    });
    const [created] = await db.select().from(editorNotes).where(eq(editorNotes.id, result.insertId));
    return responseUtil.success(created, 'Reply added');
  }

  async resolve(noteId) {
    const db = getDb();
    const [existing] = await db.select().from(editorNotes).where(eq(editorNotes.id, Number(noteId)));
    if (!existing) return responseUtil.notFound('Note');
    await db.update(editorNotes).set({ isResolved: 1 }).where(eq(editorNotes.id, Number(noteId)));
    const [updated] = await db.select().from(editorNotes).where(eq(editorNotes.id, Number(noteId)));
    return responseUtil.success(updated, 'Note resolved');
  }

  async delete(noteId) {
    const db = getDb();
    const [existing] = await db.select().from(editorNotes).where(eq(editorNotes.id, Number(noteId)));
    if (!existing) return responseUtil.notFound('Note');
    await db.delete(editorNotes).where(eq(editorNotes.id, Number(noteId)));
    return responseUtil.success(null, 'Note deleted');
  }
}
