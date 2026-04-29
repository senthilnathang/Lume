import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websiteCategories, websitePageCategories, websitePages } from '../models/schema';
import { eq, like, and, asc, isNull, inArray } from 'drizzle-orm';
import { CreateCategoryDto, UpdateCategoryDto } from '../dtos';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class CategoryService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(options: any = {}) {
    const db = this.drizzle.getDrizzle();
    const { search } = options;

    const conditions = [isNull(websiteCategories.deletedAt)];
    if (search) conditions.push(like(websiteCategories.name, `%${search}%`));

    const rows = await db
      .select()
      .from(websiteCategories)
      .where(and(...conditions))
      .orderBy(asc(websiteCategories.sequence), asc(websiteCategories.name));

    return { success: true, data: rows };
  }

  async findBySlug(slug: string) {
    const db = this.drizzle.getDrizzle();
    const [row] = await db
      .select()
      .from(websiteCategories)
      .where(
        and(
          eq(websiteCategories.slug, slug),
          isNull(websiteCategories.deletedAt),
        ),
      );

    if (!row) {
      return { success: false, error: 'Category not found', code: 'NOT_FOUND' };
    }

    return { success: true, data: row };
  }

  async findById(id: number) {
    const db = this.drizzle.getDrizzle();
    const [row] = await db
      .select()
      .from(websiteCategories)
      .where(
        and(
          eq(websiteCategories.id, Number(id)),
          isNull(websiteCategories.deletedAt),
        ),
      );

    if (!row) {
      return { success: false, error: 'Category not found', code: 'NOT_FOUND' };
    }

    return { success: true, data: row };
  }

  async create(dto: CreateCategoryDto) {
    const db = this.drizzle.getDrizzle();
    const slug = dto.slug || generateSlug(dto.name);

    const [result] = await db.insert(websiteCategories).values({
      ...dto,
      slug,
    } as any);

    const [created] = await db
      .select()
      .from(websiteCategories)
      .where(eq(websiteCategories.id, result.insertId));

    return { success: true, data: created, message: 'Category created' };
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const db = this.drizzle.getDrizzle();
    const [existing] = await db
      .select()
      .from(websiteCategories)
      .where(eq(websiteCategories.id, Number(id)));

    if (!existing) {
      return { success: false, error: 'Category not found', code: 'NOT_FOUND' };
    }

    await db
      .update(websiteCategories)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(eq(websiteCategories.id, Number(id)));

    const [updated] = await db
      .select()
      .from(websiteCategories)
      .where(eq(websiteCategories.id, Number(id)));

    return { success: true, data: updated, message: 'Category updated' };
  }

  async delete(id: number) {
    const db = this.drizzle.getDrizzle();
    const [existing] = await db
      .select()
      .from(websiteCategories)
      .where(eq(websiteCategories.id, Number(id)));

    if (!existing) {
      return { success: false, error: 'Category not found', code: 'NOT_FOUND' };
    }

    await db
      .update(websiteCategories)
      .set({ deletedAt: new Date() } as any)
      .where(eq(websiteCategories.id, Number(id)));

    return { success: true, message: 'Category deleted' };
  }

  async findPagesByCategory(categoryId: number) {
    const db = this.drizzle.getDrizzle();
    const pivots = await db
      .select()
      .from(websitePageCategories)
      .where(eq(websitePageCategories.categoryId, Number(categoryId)));

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

  async getPageCategories(pageId: number) {
    const db = this.drizzle.getDrizzle();
    const pivots = await db
      .select()
      .from(websitePageCategories)
      .where(eq(websitePageCategories.pageId, Number(pageId)));

    if (!pivots.length) {
      return { success: true, data: [] };
    }

    const catIds = pivots.map((p) => p.categoryId);
    const cats = await db
      .select()
      .from(websiteCategories)
      .where(
        and(
          inArray(websiteCategories.id, catIds),
          isNull(websiteCategories.deletedAt),
        ),
      );

    return { success: true, data: cats };
  }

  async setPageCategories(pageId: number, categoryIds: number[]) {
    const db = this.drizzle.getDrizzle();
    await db
      .delete(websitePageCategories)
      .where(eq(websitePageCategories.pageId, Number(pageId)));

    if (categoryIds && categoryIds.length) {
      await db.insert(websitePageCategories).values(
        categoryIds.map((cid) => ({
          pageId: Number(pageId),
          categoryId: Number(cid),
        })) as any,
      );
    }

    return { success: true, message: 'Categories updated' };
  }

  async reorder(items: Array<{ id: number; sequence: number }>) {
    const db = this.drizzle.getDrizzle();
    await Promise.all(
      items.map(({ id, sequence }) =>
        db
          .update(websiteCategories)
          .set({ sequence: Number(sequence) } as any)
          .where(eq(websiteCategories.id, Number(id))),
      ),
    );

    return { success: true, message: 'Categories reordered' };
  }
}
