import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websiteRedirects } from '../models/schema';
import { eq, like, desc, and, isNull, sql } from 'drizzle-orm';
import { CreateRedirectDto, UpdateRedirectDto } from '../dtos';

@Injectable()
export class RedirectService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(options: any = {}) {
    const db = this.drizzle.getDrizzle();
    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    const conditions = [isNull(websiteRedirects.deletedAt)];
    if (search) {
      conditions.push(like(websiteRedirects.sourcePath, `%${search}%`));
    }

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(websiteRedirects)
        .where(and(...conditions))
        .orderBy(desc(websiteRedirects.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql`COUNT(*)` })
        .from(websiteRedirects)
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
      .from(websiteRedirects)
      .where(eq(websiteRedirects.id, Number(id)));

    if (!row) {
      return { success: false, error: 'Redirect not found', code: 'NOT_FOUND' };
    }

    return { success: true, data: row };
  }

  async create(dto: CreateRedirectDto) {
    const db = this.drizzle.getDrizzle();
    const [result] = await db.insert(websiteRedirects).values({
      sourcePath: dto.sourcePath,
      targetPath: dto.targetPath,
      statusCode: dto.statusCode || 301,
      isActive: dto.isActive !== false,
    } as any);

    const [created] = await db
      .select()
      .from(websiteRedirects)
      .where(eq(websiteRedirects.id, result.insertId));

    return { success: true, data: created, message: 'Redirect created' };
  }

  async update(id: number, dto: UpdateRedirectDto) {
    const db = this.drizzle.getDrizzle();
    const [existing] = await db
      .select()
      .from(websiteRedirects)
      .where(eq(websiteRedirects.id, Number(id)));

    if (!existing) {
      return { success: false, error: 'Redirect not found', code: 'NOT_FOUND' };
    }

    await db
      .update(websiteRedirects)
      .set(dto as any)
      .where(eq(websiteRedirects.id, Number(id)));
    const [updated] = await db
      .select()
      .from(websiteRedirects)
      .where(eq(websiteRedirects.id, Number(id)));

    return { success: true, data: updated, message: 'Redirect updated' };
  }

  async delete(id: number) {
    const db = this.drizzle.getDrizzle();
    const [existing] = await db
      .select()
      .from(websiteRedirects)
      .where(eq(websiteRedirects.id, Number(id)));

    if (!existing) {
      return { success: false, error: 'Redirect not found', code: 'NOT_FOUND' };
    }

    await db
      .update(websiteRedirects)
      .set({ deletedAt: new Date() } as any)
      .where(eq(websiteRedirects.id, Number(id)));

    return { success: true, message: 'Redirect deleted' };
  }

  async incrementHits(sourcePath: string) {
    const db = this.drizzle.getDrizzle();
    const [row] = await db
      .select()
      .from(websiteRedirects)
      .where(
        and(
          eq(websiteRedirects.sourcePath, sourcePath),
          eq(websiteRedirects.isActive, true),
          isNull(websiteRedirects.deletedAt),
        ),
      )
      .limit(1);

    if (row) {
      await db
        .update(websiteRedirects)
        .set({ hits: (row.hits || 0) + 1 } as any)
        .where(eq(websiteRedirects.id, row.id));
    }

    return row;
  }
}
