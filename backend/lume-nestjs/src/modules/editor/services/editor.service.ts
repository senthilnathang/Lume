import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateSnippetDto,
  UpdateSnippetDto,
  CreatePresetDto,
  UpdatePresetDto,
  CreateGlobalWidgetDto,
  UpdateGlobalWidgetDto,
  CreateNoteDto,
} from '../dtos';
import { eq, like, desc, and, isNull, sql } from 'drizzle-orm';

@Injectable()
export class EditorService {
  constructor(private drizzleService: DrizzleService) {}

  private getDb() {
    return this.drizzleService.getDrizzle();
  }

  // ─── Templates ───

  async findAllTemplates(options: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  } = {}) {
    const { page = 1, limit = 50, search, category } = options;
    const offset = (page - 1) * limit;
    const db = this.getDrizzle();

    // Import tables dynamically
    const { editorTemplates } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const conditions: any[] = [isNull(editorTemplates.deletedAt)];
    if (search) conditions.push(like(editorTemplates.name, `%${search}%`));
    if (category) conditions.push(eq(editorTemplates.category, category));

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(editorTemplates)
        .where(and(...conditions))
        .orderBy(desc(editorTemplates.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(editorTemplates).where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);
    return {
      success: true,
      data: rows,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findTemplateById(id: number) {
    const db = this.getDrizzle();
    const { editorTemplates } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const [row] = await db.select().from(editorTemplates).where(eq(editorTemplates.id, id));

    if (!row) {
      throw new NotFoundException('Template not found');
    }

    return {
      success: true,
      data: row,
    };
  }

  async getDefaultTemplate() {
    const db = this.getDrizzle();
    const { editorTemplates } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const [row] = await db
      .select()
      .from(editorTemplates)
      .where(and(eq(editorTemplates.isDefault, true), isNull(editorTemplates.deletedAt)))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Default template not found');
    }

    return {
      success: true,
      data: row,
    };
  }

  async createTemplate(dto: CreateTemplateDto) {
    const db = this.getDrizzle();
    const { editorTemplates } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const now = new Date();
    const result = await db.insert(editorTemplates).values({
      name: dto.name,
      description: dto.description || null,
      content: dto.content || null,
      category: dto.category || 'general',
      isDefault: dto.isDefault || false,
      thumbnailUrl: dto.thumbnailUrl || null,
      createdBy: dto.createdBy || null,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db
      .select()
      .from(editorTemplates)
      .where(eq(editorTemplates.id, result.insertId));

    return {
      success: true,
      data: created,
      message: 'Template created',
    };
  }

  async updateTemplate(id: number, dto: UpdateTemplateDto) {
    const db = this.getDrizzle();
    const { editorTemplates } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const existing = await db.select().from(editorTemplates).where(eq(editorTemplates.id, id));
    if (!existing || existing.length === 0) {
      throw new NotFoundException('Template not found');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;
    if (dto.thumbnailUrl !== undefined) updateData.thumbnailUrl = dto.thumbnailUrl;

    await db.update(editorTemplates).set(updateData).where(eq(editorTemplates.id, id));

    const [updated] = await db.select().from(editorTemplates).where(eq(editorTemplates.id, id));

    return {
      success: true,
      data: updated,
      message: 'Template updated',
    };
  }

  async deleteTemplate(id: number) {
    const db = this.getDrizzle();
    const { editorTemplates } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const existing = await db.select().from(editorTemplates).where(eq(editorTemplates.id, id));
    if (!existing || existing.length === 0) {
      throw new NotFoundException('Template not found');
    }

    await db
      .update(editorTemplates)
      .set({ deletedAt: new Date() })
      .where(eq(editorTemplates.id, id));

    return {
      success: true,
      message: 'Template deleted',
    };
  }

  // ─── Snippets ───

  async findAllSnippets(options: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  } = {}) {
    const { page = 1, limit = 50, search, category } = options;
    const offset = (page - 1) * limit;
    const db = this.getDrizzle();

    const { editorSnippets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const conditions: any[] = [isNull(editorSnippets.deletedAt)];
    if (search) conditions.push(like(editorSnippets.name, `%${search}%`));
    if (category) conditions.push(eq(editorSnippets.category, category));

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(editorSnippets)
        .where(and(...conditions))
        .orderBy(desc(editorSnippets.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(editorSnippets).where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);
    return {
      success: true,
      data: rows,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findSnippetById(id: number) {
    const db = this.getDrizzle();
    const { editorSnippets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const [row] = await db.select().from(editorSnippets).where(eq(editorSnippets.id, id));

    if (!row) {
      throw new NotFoundException('Snippet not found');
    }

    return {
      success: true,
      data: row,
    };
  }

  async createSnippet(dto: CreateSnippetDto) {
    const db = this.getDrizzle();
    const { editorSnippets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const now = new Date();
    const result = await db.insert(editorSnippets).values({
      name: dto.name,
      content: dto.content || null,
      category: dto.category || 'general',
      icon: dto.icon || null,
      shortcut: dto.shortcut || null,
      thumbnailUrl: dto.thumbnailUrl || null,
      isGlobal: dto.isGlobal || false,
      usageCount: dto.usageCount || 0,
      createdBy: dto.createdBy || null,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db.select().from(editorSnippets).where(eq(editorSnippets.id, result.insertId));

    return {
      success: true,
      data: created,
      message: 'Snippet created',
    };
  }

  async updateSnippet(id: number, dto: UpdateSnippetDto) {
    const db = this.getDrizzle();
    const { editorSnippets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const existing = await db.select().from(editorSnippets).where(eq(editorSnippets.id, id));
    if (!existing || existing.length === 0) {
      throw new NotFoundException('Snippet not found');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.shortcut !== undefined) updateData.shortcut = dto.shortcut;
    if (dto.thumbnailUrl !== undefined) updateData.thumbnailUrl = dto.thumbnailUrl;
    if (dto.isGlobal !== undefined) updateData.isGlobal = dto.isGlobal;
    if (dto.usageCount !== undefined) updateData.usageCount = dto.usageCount;

    await db.update(editorSnippets).set(updateData).where(eq(editorSnippets.id, id));

    const [updated] = await db.select().from(editorSnippets).where(eq(editorSnippets.id, id));

    return {
      success: true,
      data: updated,
      message: 'Snippet updated',
    };
  }

  async deleteSnippet(id: number) {
    const db = this.getDrizzle();
    const { editorSnippets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const existing = await db.select().from(editorSnippets).where(eq(editorSnippets.id, id));
    if (!existing || existing.length === 0) {
      throw new NotFoundException('Snippet not found');
    }

    await db
      .update(editorSnippets)
      .set({ deletedAt: new Date() })
      .where(eq(editorSnippets.id, id));

    return {
      success: true,
      message: 'Snippet deleted',
    };
  }

  // ─── Presets ───

  async findAllPresets(options: {
    page?: number;
    limit?: number;
    search?: string;
    blockType?: string;
  } = {}) {
    const { page = 1, limit = 50, search, blockType } = options;
    const offset = (page - 1) * limit;
    const db = this.getDrizzle();

    const { editorPresets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const conditions: any[] = [isNull(editorPresets.deletedAt)];
    if (search) conditions.push(like(editorPresets.name, `%${search}%`));
    if (blockType) conditions.push(eq(editorPresets.blockType, blockType));

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(editorPresets)
        .where(and(...conditions))
        .orderBy(desc(editorPresets.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(editorPresets).where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);
    return {
      success: true,
      data: rows,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findPresetsByBlockType(blockType: string) {
    const db = this.getDrizzle();
    const { editorPresets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const rows = await db
      .select()
      .from(editorPresets)
      .where(and(eq(editorPresets.blockType, blockType), isNull(editorPresets.deletedAt)))
      .orderBy(desc(editorPresets.createdAt));

    return {
      success: true,
      data: rows,
    };
  }

  async findPresetById(id: number) {
    const db = this.getDrizzle();
    const { editorPresets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const [row] = await db.select().from(editorPresets).where(eq(editorPresets.id, id));

    if (!row) {
      throw new NotFoundException('Preset not found');
    }

    return {
      success: true,
      data: row,
    };
  }

  async createPreset(dto: CreatePresetDto) {
    const db = this.getDrizzle();
    const { editorPresets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const now = new Date();
    const result = await db.insert(editorPresets).values({
      blockType: dto.blockType,
      name: dto.name,
      attributes: dto.attributes || null,
      thumbnailUrl: dto.thumbnailUrl || null,
      createdBy: dto.createdBy || null,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db.select().from(editorPresets).where(eq(editorPresets.id, result.insertId));

    return {
      success: true,
      data: created,
      message: 'Preset created',
    };
  }

  async updatePreset(id: number, dto: UpdatePresetDto) {
    const db = this.getDrizzle();
    const { editorPresets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const existing = await db.select().from(editorPresets).where(eq(editorPresets.id, id));
    if (!existing || existing.length === 0) {
      throw new NotFoundException('Preset not found');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.blockType !== undefined) updateData.blockType = dto.blockType;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.attributes !== undefined) updateData.attributes = dto.attributes;
    if (dto.thumbnailUrl !== undefined) updateData.thumbnailUrl = dto.thumbnailUrl;

    await db.update(editorPresets).set(updateData).where(eq(editorPresets.id, id));

    const [updated] = await db.select().from(editorPresets).where(eq(editorPresets.id, id));

    return {
      success: true,
      data: updated,
      message: 'Preset updated',
    };
  }

  async deletePreset(id: number) {
    const db = this.getDrizzle();
    const { editorPresets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const existing = await db.select().from(editorPresets).where(eq(editorPresets.id, id));
    if (!existing || existing.length === 0) {
      throw new NotFoundException('Preset not found');
    }

    await db
      .update(editorPresets)
      .set({ deletedAt: new Date() })
      .where(eq(editorPresets.id, id));

    return {
      success: true,
      message: 'Preset deleted',
    };
  }

  // ─── Global Widgets ───

  async findAllGlobalWidgets(options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const { page = 1, limit = 50, search } = options;
    const offset = (page - 1) * limit;
    const db = this.getDrizzle();

    const { editorGlobalWidgets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const conditions: any[] = [isNull(editorGlobalWidgets.deletedAt)];
    if (search) conditions.push(like(editorGlobalWidgets.name, `%${search}%`));

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(editorGlobalWidgets)
        .where(and(...conditions))
        .orderBy(desc(editorGlobalWidgets.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(editorGlobalWidgets).where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);
    return {
      success: true,
      data: rows,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findGlobalWidgetById(id: number) {
    const db = this.getDrizzle();
    const { editorGlobalWidgets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const [row] = await db
      .select()
      .from(editorGlobalWidgets)
      .where(and(eq(editorGlobalWidgets.id, id), isNull(editorGlobalWidgets.deletedAt)));

    if (!row) {
      throw new NotFoundException('Global widget not found');
    }

    return {
      success: true,
      data: row,
    };
  }

  async createGlobalWidget(dto: CreateGlobalWidgetDto) {
    const db = this.getDrizzle();
    const { editorGlobalWidgets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const now = new Date();
    const result = await db.insert(editorGlobalWidgets).values({
      name: dto.name,
      blockType: dto.blockType,
      content: typeof dto.content === 'string' ? dto.content : JSON.stringify(dto.content),
      createdBy: dto.createdBy || null,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db
      .select()
      .from(editorGlobalWidgets)
      .where(eq(editorGlobalWidgets.id, result.insertId));

    return {
      success: true,
      data: created,
      message: 'Global widget created',
    };
  }

  async updateGlobalWidget(id: number, dto: UpdateGlobalWidgetDto) {
    const db = this.getDrizzle();
    const { editorGlobalWidgets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const existing = await db
      .select()
      .from(editorGlobalWidgets)
      .where(and(eq(editorGlobalWidgets.id, id), isNull(editorGlobalWidgets.deletedAt)));

    if (!existing || existing.length === 0) {
      throw new NotFoundException('Global widget not found');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.blockType !== undefined) updateData.blockType = dto.blockType;
    if (dto.content !== undefined) {
      updateData.content = typeof dto.content === 'string' ? dto.content : JSON.stringify(dto.content);
    }

    await db.update(editorGlobalWidgets).set(updateData).where(eq(editorGlobalWidgets.id, id));

    const [updated] = await db.select().from(editorGlobalWidgets).where(eq(editorGlobalWidgets.id, id));

    return {
      success: true,
      data: updated,
      message: 'Global widget updated',
    };
  }

  async deleteGlobalWidget(id: number) {
    const db = this.getDrizzle();
    const { editorGlobalWidgets } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const existing = await db
      .select()
      .from(editorGlobalWidgets)
      .where(and(eq(editorGlobalWidgets.id, id), isNull(editorGlobalWidgets.deletedAt)));

    if (!existing || existing.length === 0) {
      throw new NotFoundException('Global widget not found');
    }

    await db
      .update(editorGlobalWidgets)
      .set({ deletedAt: new Date() })
      .where(eq(editorGlobalWidgets.id, id));

    return {
      success: true,
      message: 'Global widget deleted',
    };
  }

  // ─── Notes / Collaboration ───

  async findNotesByPage(pageId: number) {
    const db = this.getDrizzle();
    const { editorNotes } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const rows = await db
      .select()
      .from(editorNotes)
      .where(eq(editorNotes.pageId, pageId))
      .orderBy(desc(editorNotes.createdAt));

    return {
      success: true,
      data: rows,
    };
  }

  async createNote(dto: CreateNoteDto) {
    const db = this.getDrizzle();
    const { editorNotes } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const now = new Date();
    const result = await db.insert(editorNotes).values({
      pageId: dto.pageId,
      blockId: dto.blockId || null,
      content: dto.content,
      authorId: dto.authorId,
      parentId: dto.parentId || null,
      isResolved: 0,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db.select().from(editorNotes).where(eq(editorNotes.id, result.insertId));

    return {
      success: true,
      data: created,
      message: 'Note created',
    };
  }

  async replyToNote(parentId: number, dto: CreateNoteDto) {
    const db = this.getDrizzle();
    const { editorNotes } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const [parent] = await db.select().from(editorNotes).where(eq(editorNotes.id, parentId));

    if (!parent) {
      throw new NotFoundException('Parent note not found');
    }

    const now = new Date();
    const result = await db.insert(editorNotes).values({
      pageId: parent.pageId,
      blockId: parent.blockId || null,
      content: dto.content,
      authorId: dto.authorId,
      parentId: parentId,
      isResolved: 0,
      createdAt: now,
      updatedAt: now,
    });

    const [created] = await db.select().from(editorNotes).where(eq(editorNotes.id, result.insertId));

    return {
      success: true,
      data: created,
      message: 'Reply added',
    };
  }

  async resolveNote(noteId: number) {
    const db = this.getDrizzle();
    const { editorNotes } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const [existing] = await db.select().from(editorNotes).where(eq(editorNotes.id, noteId));

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    await db.update(editorNotes).set({ isResolved: 1 }).where(eq(editorNotes.id, noteId));

    const [updated] = await db.select().from(editorNotes).where(eq(editorNotes.id, noteId));

    return {
      success: true,
      data: updated,
      message: 'Note resolved',
    };
  }

  async deleteNote(noteId: number) {
    const db = this.getDrizzle();
    const { editorNotes } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const [existing] = await db.select().from(editorNotes).where(eq(editorNotes.id, noteId));

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    await db.delete(editorNotes).where(eq(editorNotes.id, noteId));

    return {
      success: true,
      message: 'Note deleted',
    };
  }

  // ─── Seed ───

  async seedDefaultTemplates() {
    const db = this.getDrizzle();
    const { editorTemplates } = await import('/opt/Lume/backend/src/modules/editor/models/schema.js');

    const defaultTemplates = [
      {
        name: 'Blank Page',
        description: 'Start with a completely blank canvas',
        category: 'basic',
        isDefault: true,
        content: JSON.stringify({ type: 'doc', content: [] }),
      },
      {
        name: 'Landing Page',
        description: 'Pre-built landing page with hero section',
        category: 'layouts',
        isDefault: false,
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'section',
              attrs: { cssClass: 'hero-section' },
              content: [
                { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Welcome' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Your landing page content here' }] },
              ],
            },
          ],
        }),
      },
      {
        name: 'Blog Post',
        description: 'Template for blog articles',
        category: 'content',
        isDefault: false,
        content: JSON.stringify({
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Blog Title' }] },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Your blog content goes here. Add paragraphs, images, and more.' }],
            },
          ],
        }),
      },
      {
        name: 'Services Page',
        description: 'Showcase your services',
        category: 'layouts',
        isDefault: false,
        content: JSON.stringify({
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Our Services' }] },
            {
              type: 'columns',
              attrs: { count: 3 },
              content: [
                { type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Service 1' }] }] },
                { type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Service 2' }] }] },
                { type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Service 3' }] }] },
              ],
            },
          ],
        }),
      },
      {
        name: 'Contact Page',
        description: 'Contact page template',
        category: 'forms',
        isDefault: false,
        content: JSON.stringify({
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Contact Us' }] },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Get in touch with us. We would love to hear from you.' }],
            },
          ],
        }),
      },
      {
        name: 'Product Showcase',
        description: 'Display your products',
        category: 'ecommerce',
        isDefault: false,
        content: JSON.stringify({
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Our Products' }] },
            {
              type: 'columns',
              attrs: { count: 4 },
              content: [
                { type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Product 1' }] }] },
                { type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Product 2' }] }] },
                { type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Product 3' }] }] },
                { type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Product 4' }] }] },
              ],
            },
          ],
        }),
      },
    ];

    const now = new Date();
    let count = 0;

    for (const template of defaultTemplates) {
      const existing = await db
        .select()
        .from(editorTemplates)
        .where(eq(editorTemplates.name, template.name));

      if (!existing || existing.length === 0) {
        await db.insert(editorTemplates).values({
          ...template,
          createdAt: now,
          updatedAt: now,
        });
        count++;
      }
    }

    return {
      success: true,
      data: { count },
      message: `${count} default templates seeded`,
    };
  }
}
