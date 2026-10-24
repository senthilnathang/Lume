import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import {
  websitePages,
  websitePageCategories,
  websitePageTags,
} from '../models/schema';
import { eq, like, desc, asc, and, isNull, sql, inArray } from 'drizzle-orm';
import { CreatePageDto, UpdatePageDto } from '../dtos';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class PageService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(options: any = {}) {
    const db = this.drizzle.getDrizzle();
    const { page = 1, limit = 20, search, status, pageType, categoryId, tagId } = options;
    const offset = (page - 1) * limit;

    let allowedPageIds = null;
    if (categoryId) {
      const pivots = await db
        .select({ pageId: websitePageCategories.pageId })
        .from(websitePageCategories)
        .where(eq(websitePageCategories.categoryId, Number(categoryId)));
      allowedPageIds = pivots.map((p) => p.pageId);
    }
    if (tagId) {
      const pivots = await db
        .select({ pageId: websitePageTags.pageId })
        .from(websitePageTags)
        .where(eq(websitePageTags.tagId, Number(tagId)));
      const tagPageIds = pivots.map((p) => p.pageId);
      allowedPageIds = allowedPageIds
        ? allowedPageIds.filter((id) => tagPageIds.includes(id))
        : tagPageIds;
    }

    const conditions = [isNull(websitePages.deletedAt)];
    if (search) conditions.push(like(websitePages.title, `%${search}%`));
    if (status === 'published') conditions.push(eq(websitePages.isPublished, true));
    else if (status === 'draft') conditions.push(eq(websitePages.isPublished, false));
    if (pageType) conditions.push(eq(websitePages.pageType, pageType));
    if (allowedPageIds !== null) {
      if (allowedPageIds.length === 0) {
        return {
          success: true,
          data: [],
          pagination: { page, limit, total: 0, pages: 0 },
        };
      }
      conditions.push(inArray(websitePages.id, allowedPageIds));
    }

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(websitePages)
        .where(and(...conditions))
        .orderBy(desc(websitePages.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql`COUNT(*)` })
        .from(websitePages)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);
    return {
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findById(id: number) {
    const db = this.drizzle.getDrizzle();
    const [row] = await db
      .select()
      .from(websitePages)
      .where(eq(websitePages.id, Number(id)));
    if (!row) {
      return { success: false, error: 'Page not found', code: 'NOT_FOUND' };
    }
    return { success: true, data: row };
  }

  async findBySlug(slug: string, options: any = {}) {
    const db = this.drizzle.getDrizzle();
    await this.checkAndApplyScheduling(slug);

    const [row] = await db
      .select()
      .from(websitePages)
      .where(
        and(
          eq(websitePages.slug, slug),
          eq(websitePages.isPublished, true),
          isNull(websitePages.deletedAt),
        ),
      );

    if (!row) {
      return { success: false, error: 'Page not found', code: 'NOT_FOUND' };
    }

    const vis = row.visibility || 'public';
    if (vis === 'private') {
      return { success: false, error: 'This page is private', code: 'PAGE_PRIVATE' };
    }
    if (vis === 'password') {
      const { passwordToken } = options;
      if (!passwordToken || passwordToken !== row.passwordHash) {
        const { content, contentHtml, passwordHash, ...meta } = row;
        return {
          success: true,
          data: { ...meta, requiresPassword: true, content: null, contentHtml: null },
        };
      }
    }

    const { passwordHash, ...safeRow } = row;
    return { success: true, data: safeRow };
  }

  async create(dto: CreatePageDto, userId?: number) {
    const db = this.drizzle.getDrizzle();
    const slug = dto.slug || generateSlug(dto.title);

    const [existing] = await db
      .select()
      .from(websitePages)
      .where(eq(websitePages.slug, slug));
    if (existing) {
      slug + `-${Date.now()}`;
    }

    const [result] = await db.insert(websitePages).values({
      ...dto,
      slug,
      createdBy: userId,
    } as any);

    const [created] = await db
      .select()
      .from(websitePages)
      .where(eq(websitePages.id, result.insertId));

    return {
      success: true,
      data: created,
      message: 'Page created',
    };
  }

  async update(id: number, dto: UpdatePageDto, userId?: number) {
    const db = this.drizzle.getDrizzle();
    const [existing] = await db
      .select()
      .from(websitePages)
      .where(eq(websitePages.id, Number(id)));
    if (!existing) {
      return { success: false, error: 'Page not found', code: 'NOT_FOUND' };
    }

    await db.update(websitePages).set(dto as any).where(eq(websitePages.id, Number(id)));
    const [updated] = await db
      .select()
      .from(websitePages)
      .where(eq(websitePages.id, Number(id)));

    return { success: true, data: updated, message: 'Page updated' };
  }

  async delete(id: number) {
    const db = this.drizzle.getDrizzle();
    const [existing] = await db
      .select()
      .from(websitePages)
      .where(eq(websitePages.id, Number(id)));
    if (!existing) {
      return { success: false, error: 'Page not found', code: 'NOT_FOUND' };
    }

    await db
      .update(websitePages)
      .set({ deletedAt: new Date() })
      .where(eq(websitePages.id, Number(id)));

    return { success: true, message: 'Page deleted' };
  }

  async publish(id: number) {
    const db = this.drizzle.getDrizzle();
    await db
      .update(websitePages)
      .set({ isPublished: true, publishedAt: new Date() })
      .where(eq(websitePages.id, Number(id)));

    const [updated] = await db
      .select()
      .from(websitePages)
      .where(eq(websitePages.id, Number(id)));

    return { success: true, data: updated, message: 'Page published' };
  }

  async unpublish(id: number) {
    const db = this.drizzle.getDrizzle();
    await db
      .update(websitePages)
      .set({ isPublished: false })
      .where(eq(websitePages.id, Number(id)));

    const [updated] = await db
      .select()
      .from(websitePages)
      .where(eq(websitePages.id, Number(id)));

    return { success: true, data: updated, message: 'Page unpublished' };
  }

  async getPublishedPages() {
    const db = this.drizzle.getDrizzle();
    const rows = await db
      .select({
        id: websitePages.id,
        title: websitePages.title,
        slug: websitePages.slug,
        excerpt: websitePages.excerpt,
        featuredImage: websitePages.featuredImage,
        pageType: websitePages.pageType,
        metaTitle: websitePages.metaTitle,
        metaDescription: websitePages.metaDescription,
        publishedAt: websitePages.publishedAt,
      })
      .from(websitePages)
      .where(
        and(
          eq(websitePages.isPublished, true),
          isNull(websitePages.deletedAt),
        ),
      )
      .orderBy(asc(websitePages.sequence));

    return { success: true, data: rows };
  }

  async getSitemap() {
    const db = this.drizzle.getDrizzle();
    const rows = await db
      .select({
        slug: websitePages.slug,
        updatedAt: websitePages.updatedAt,
        createdAt: websitePages.createdAt,
        parentId: websitePages.parentId,
      })
      .from(websitePages)
      .where(
        and(
          eq(websitePages.isPublished, true),
          isNull(websitePages.deletedAt),
          eq(websitePages.noIndex, false),
        ),
      );

    return rows;
  }

  async getBreadcrumbs(slug: string) {
    const db = this.drizzle.getDrizzle();
    const MAX_DEPTH = 10;

    const [startPage] = await db
      .select({
        id: websitePages.id,
        title: websitePages.title,
        slug: websitePages.slug,
        parentId: websitePages.parentId,
      })
      .from(websitePages)
      .where(and(eq(websitePages.slug, slug), isNull(websitePages.deletedAt)));

    if (!startPage) {
      return { success: false, error: 'Page not found', code: 'NOT_FOUND' };
    }

    const chain = [startPage];
    let current = startPage;

    for (let i = 0; i < MAX_DEPTH && current.parentId; i++) {
      const [parent] = await db
        .select({
          id: websitePages.id,
          title: websitePages.title,
          slug: websitePages.slug,
          parentId: websitePages.parentId,
        })
        .from(websitePages)
        .where(
          and(
            eq(websitePages.id, current.parentId),
            isNull(websitePages.deletedAt),
          ),
        );

      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }

    return { success: true, data: chain };
  }

  async lockPage(pageId: number, userId: number) {
    const db = this.drizzle.getDrizzle();
    const LOCK_TIMEOUT_MS = 30 * 60 * 1000;

    const [existing] = await db
      .select({
        id: websitePages.id,
        lockedBy: websitePages.lockedBy,
        lockedAt: websitePages.lockedAt,
      })
      .from(websitePages)
      .where(
        and(
          eq(websitePages.id, Number(pageId)),
          isNull(websitePages.deletedAt),
        ),
      );

    if (!existing) {
      return { success: false, error: 'Page not found', code: 'NOT_FOUND' };
    }

    if (existing.lockedBy && existing.lockedBy !== Number(userId)) {
      const lockedAgo = existing.lockedAt
        ? Date.now() - new Date(existing.lockedAt).getTime()
        : Infinity;
      if (lockedAgo < LOCK_TIMEOUT_MS) {
        return {
          success: false,
          error: 'Page is locked by another user',
          code: 'PAGE_LOCKED',
        };
      }
    }

    await db
      .update(websitePages)
      .set({ lockedBy: Number(userId), lockedAt: new Date() })
      .where(eq(websitePages.id, Number(pageId)));

    return {
      success: true,
      data: { lockedBy: Number(userId), lockedAt: new Date() },
    };
  }

  async unlockPage(pageId: number, userId: number) {
    const db = this.drizzle.getDrizzle();
    const [existing] = await db
      .select({ lockedBy: websitePages.lockedBy })
      .from(websitePages)
      .where(
        and(
          eq(websitePages.id, Number(pageId)),
          isNull(websitePages.deletedAt),
        ),
      );

    if (!existing) {
      return { success: false, error: 'Page not found', code: 'NOT_FOUND' };
    }

    if (existing.lockedBy && existing.lockedBy !== Number(userId)) {
      return {
        success: false,
        error: 'Cannot unlock a page locked by another user',
        code: 'FORBIDDEN',
      };
    }

    await db
      .update(websitePages)
      .set({ lockedBy: null, lockedAt: null })
      .where(eq(websitePages.id, Number(pageId)));

    return { success: true, message: 'Page unlocked' };
  }

  async getLockStatus(pageId: number) {
    const db = this.drizzle.getDrizzle();
    const LOCK_TIMEOUT_MS = 30 * 60 * 1000;

    const [row] = await db
      .select({
        lockedBy: websitePages.lockedBy,
        lockedAt: websitePages.lockedAt,
      })
      .from(websitePages)
      .where(
        and(
          eq(websitePages.id, Number(pageId)),
          isNull(websitePages.deletedAt),
        ),
      );

    if (!row) {
      return { success: false, error: 'Page not found', code: 'NOT_FOUND' };
    }

    const isLocked =
      row.lockedBy && row.lockedAt
        ? Date.now() - new Date(row.lockedAt).getTime() < LOCK_TIMEOUT_MS
        : false;

    return {
      success: true,
      data: {
        isLocked,
        lockedBy: isLocked ? row.lockedBy : null,
        lockedAt: isLocked ? row.lockedAt : null,
      },
    };
  }

  async verifyPagePassword(slug: string, password: string) {
    const db = this.drizzle.getDrizzle();
    const [row] = await db
      .select({
        id: websitePages.id,
        slug: websitePages.slug,
        passwordHash: websitePages.passwordHash,
        visibility: websitePages.visibility,
      })
      .from(websitePages)
      .where(
        and(
          eq(websitePages.slug, slug),
          isNull(websitePages.deletedAt),
        ),
      );

    if (!row) {
      return { success: false, error: 'Page not found', code: 'NOT_FOUND' };
    }

    if (row.visibility !== 'password') {
      return {
        success: false,
        error: 'Page is not password protected',
        code: 'NOT_PROTECTED',
      };
    }

    if (!password || password !== row.passwordHash) {
      return {
        success: false,
        error: 'Incorrect password',
        code: 'WRONG_PASSWORD',
      };
    }

    return { success: true, data: { token: row.passwordHash }, message: 'Access granted' };
  }

  private async checkAndApplyScheduling(slug: string) {
    const db = this.drizzle.getDrizzle();
    const now = new Date();

    const [draft] = await db
      .select({
        id: websitePages.id,
        publishAt: websitePages.publishAt,
        expireAt: websitePages.expireAt,
        isPublished: websitePages.isPublished,
      })
      .from(websitePages)
      .where(and(eq(websitePages.slug, slug), isNull(websitePages.deletedAt)));

    if (!draft) return;

    if (
      !draft.isPublished &&
      draft.publishAt &&
      new Date(draft.publishAt) <= now
    ) {
      await db
        .update(websitePages)
        .set({ isPublished: true, publishedAt: new Date() })
        .where(eq(websitePages.id, Number(draft.id)));
    }

    if (draft.isPublished && draft.expireAt && new Date(draft.expireAt) <= now) {
      await db
        .update(websitePages)
        .set({ isPublished: false })
        .where(eq(websitePages.id, Number(draft.id)));
    }
  }
}
