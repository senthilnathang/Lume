import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websiteTags, websitePageTags, websitePages } from '../models/schema';
import { eq, like, and, asc, isNull, inArray } from 'drizzle-orm';
import { CreateTagDto, UpdateTagDto } from '../dtos';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class TagService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(options: any = {}) {
    const db = this.drizzle.getDrizzle();
    const { search } = options;

    const conditions = [isNull(websiteTags.deletedAt)];
    if (search) conditions.push(like(websiteTags.name, `%${search}%`));

    const rows = await db
      .select()
      .from(websiteTags)
      .where(and(...conditions))
      .orderBy(asc(websiteTags.name));

    return { success: true, data: rows };
  }

  async findBySlug(slug: string) {
    const db = this.drizzle.getDrizzle();
    const [row] = await db
      .select()
      .from(websiteTags)
      .where(and(eq(websiteTags.slug, slug), isNull(websiteTags.deletedAt)));

    if (!row) {
      return { success: false, error: 'Tag not found', code: 'NOT_FOUND' };
    }

    return { success: true, data: row };
  }

  async findById(id: number) {
    const db = this.drizzle.getDrizzle();
    const [row] = await db
      .select()
      .from(websiteTags)
      .where(and(eq(websiteTags.id, Number(id)), isNull(websiteTags.deletedAt)));

    if (!row) {
      return { success: false, error: 'Tag not found', code: 'NOT_FOUND' };
    }

    return { success: true, data: row };
  }

  async create(dto: CreateTagDto) {
    const db = this.drizzle.getDrizzle();
    const slug = dto.slug || generateSlug(dto.name);

    const [result] = await db.insert(websiteTags).values({ ...dto, slug } as any);

    const [created] = await db
      .select()
      .from(websiteTags)
      .where(eq(websiteTags.id, result.insertId));

    return { success: true, data: created, message: 'Tag created' };
  }

  async update(id: number, dto: UpdateTagDto) {
    const db = this.drizzle.getDrizzle();
    const [existing] = await db
      .select()
      .from(websiteTags)
      .where(eq(websiteTags.id, Number(id)));

    if (!existing) {
      return { success: false, error: 'Tag not found', code: 'NOT_FOUND' };
    }

    await db
      .update(websiteTags)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(eq(websiteTags.id, Number(id)));

    const [updated] = await db
      .select()
      .from(websiteTags)
      .where(eq(websiteTags.id, Number(id)));

    return { success: true, data: updated, message: 'Tag updated' };
  }

  async delete(id: number) {
    const db = this.drizzle.getDrizzle();
    const [existing] = await db
      .select()
      .from(websiteTags)
      .where(eq(websiteTags.id, Number(id)));

    if (!existing) {
      return { success: false, error: 'Tag not found', code: 'NOT_FOUND' };
    }

    await db
      .update(websiteTags)
      .set({ deletedAt: new Date() } as any)
      .where(eq(websiteTags.id, Number(id)));

    return { success: true, message: 'Tag deleted' };
  }

  async findPagesByTag(tagId: number) {
    const db = this.drizzle.getDrizzle();
    const pivots = await db
      .select()
      .from(websitePageTags)
      .where(eq(websitePageTags.tagId, Number(tagId)));

    if (!pivots.length) {
      return { success: true, data: [] };
    }

    const pageIds = pivots.map((p) => p.pageId);
    const pages = await db
      .select({
        id: websitePages.id,
        title: websitePages.title,
        slug: websitePages.slug,
        excerpt: websitePages.excerpt,
        featuredImage: websitePages.featuredImage,
        publishedAt: websitePages.publishedAt,
      })
      .from(websitePages)
      .where(
        and(
          inArray(websitePages.id, pageIds),
          eq(websitePages.isPublished, true),
          isNull(websitePages.deletedAt),
        ),
      );

    return { success: true, data: pages };
  }

  async getPageTags(pageId: number) {
    const db = this.drizzle.getDrizzle();
    const pivots = await db
      .select()
      .from(websitePageTags)
      .where(eq(websitePageTags.pageId, Number(pageId)));

    if (!pivots.length) {
      return { success: true, data: [] };
    }

    const tagIds = pivots.map((p) => p.tagId);
    const tags = await db
      .select()
      .from(websiteTags)
      .where(and(inArray(websiteTags.id, tagIds), isNull(websiteTags.deletedAt)));

    return { success: true, data: tags };
  }

  async setPageTags(pageId: number, tagIds: number[]) {
    const db = this.drizzle.getDrizzle();
    await db.delete(websitePageTags).where(eq(websitePageTags.pageId, Number(pageId)));

    if (tagIds && tagIds.length) {
      await db.insert(websitePageTags).values(
        tagIds.map((tid) => ({
          pageId: Number(pageId),
          tagId: Number(tid),
        })) as any,
      );
    }

    return { success: true, message: 'Tags updated' };
  }
}
