import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websitePageRevisions, websitePages } from '../models/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

@Injectable()
export class RevisionService {
  constructor(private drizzle: DrizzleService) {}

  async create(pageId: number, data: any = {}) {
    const db = this.drizzle.getDrizzle();

    const [lastRev] = await db
      .select({ revisionNumber: websitePageRevisions.revisionNumber })
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
    } as any);

    return {
      success: true,
      data: { id: result.insertId, revisionNumber },
      message: 'Revision created',
    };
  }

  async findAll(pageId: number, options: any = {}) {
    const db = this.drizzle.getDrizzle();
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: websitePageRevisions.id,
        revisionNumber: websitePageRevisions.revisionNumber,
        changeDescription: websitePageRevisions.changeDescription,
        createdBy: websitePageRevisions.createdBy,
        isAutoSave: websitePageRevisions.isAutoSave,
        createdAt: websitePageRevisions.createdAt,
      })
      .from(websitePageRevisions)
      .where(eq(websitePageRevisions.pageId, Number(pageId)))
      .orderBy(desc(websitePageRevisions.revisionNumber))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql`COUNT(*)` })
      .from(websitePageRevisions)
      .where(eq(websitePageRevisions.pageId, Number(pageId)));

    const total = Number(countResult?.count || 0);
    return {
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findById(revisionId: number) {
    const db = this.drizzle.getDrizzle();
    const [row] = await db
      .select()
      .from(websitePageRevisions)
      .where(eq(websitePageRevisions.id, Number(revisionId)));

    if (!row) {
      return { success: false, error: 'Revision not found', code: 'NOT_FOUND' };
    }

    return { success: true, data: row };
  }

  async revert(pageId: number, revisionId: number) {
    const db = this.drizzle.getDrizzle();
    const [revision] = await db
      .select()
      .from(websitePageRevisions)
      .where(
        and(
          eq(websitePageRevisions.id, Number(revisionId)),
          eq(websitePageRevisions.pageId, Number(pageId)),
        ),
      );

    if (!revision) {
      return { success: false, error: 'Revision not found', code: 'NOT_FOUND' };
    }

    const [currentPage] = await db
      .select()
      .from(websitePages)
      .where(eq(websitePages.id, Number(pageId)));

    if (currentPage?.content) {
      await this.create(Number(pageId), {
        content: currentPage.content,
        contentHtml: currentPage.contentHtml,
        changeDescription: `Before revert to revision #${revision.revisionNumber}`,
        isAutoSave: false,
      });
    }

    await db
      .update(websitePages)
      .set({
        content: revision.content,
        contentHtml: revision.contentHtml,
      } as any)
      .where(eq(websitePages.id, Number(pageId)));

    const [updated] = await db
      .select()
      .from(websitePages)
      .where(eq(websitePages.id, Number(pageId)));

    return {
      success: true,
      data: updated,
      message: `Reverted to revision #${revision.revisionNumber}`,
    };
  }
}
