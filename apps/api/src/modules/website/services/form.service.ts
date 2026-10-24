import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websiteForms, websiteFormSubmissions } from '../models/schema';
import { eq, like, desc, and, sql } from 'drizzle-orm';
import { CreateFormDto, UpdateFormDto } from '../dtos';

@Injectable()
export class FormService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(options: any = {}) {
    const db = this.drizzle.getDrizzle();
    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) conditions.push(like(websiteForms.name, `%${search}%`));
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(websiteForms)
        .where(where)
        .orderBy(desc(websiteForms.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(websiteForms).where(where),
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
    const [row] = await db.select().from(websiteForms).where(eq(websiteForms.id, Number(id)));

    if (!row) {
      return { success: false, error: 'Form not found', code: 'NOT_FOUND' };
    }

    return { success: true, data: row };
  }

  async create(dto: CreateFormDto) {
    const db = this.drizzle.getDrizzle();
    const insertData = {
      name: dto.name,
      fields: typeof dto.fields === 'string' ? dto.fields : JSON.stringify(dto.fields || []),
      settings: typeof dto.settings === 'string' ? dto.settings : JSON.stringify(dto.settings || {}),
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    };

    const [result] = await db.insert(websiteForms).values(insertData as any);
    const [created] = await db
      .select()
      .from(websiteForms)
      .where(eq(websiteForms.id, result.insertId));

    return { success: true, data: created, message: 'Form created' };
  }

  async update(id: number, dto: UpdateFormDto) {
    const db = this.drizzle.getDrizzle();
    const updateData: any = { ...dto };

    if (updateData.fields && typeof updateData.fields !== 'string') {
      updateData.fields = JSON.stringify(updateData.fields);
    }
    if (updateData.settings && typeof updateData.settings !== 'string') {
      updateData.settings = JSON.stringify(updateData.settings);
    }

    await db
      .update(websiteForms)
      .set(updateData)
      .where(eq(websiteForms.id, Number(id)));
    const [updated] = await db
      .select()
      .from(websiteForms)
      .where(eq(websiteForms.id, Number(id)));

    return { success: true, data: updated, message: 'Form updated' };
  }

  async delete(id: number) {
    const db = this.drizzle.getDrizzle();
    await db.delete(websiteForms).where(eq(websiteForms.id, Number(id)));
    return { success: true, message: 'Form deleted' };
  }
}

@Injectable()
export class SubmissionService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(formId: number, options: any = {}) {
    const db = this.drizzle.getDrizzle();
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const conditions = [eq(websiteFormSubmissions.formId, Number(formId))];
    const where = and(...conditions);

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(websiteFormSubmissions)
        .where(where)
        .orderBy(desc(websiteFormSubmissions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(websiteFormSubmissions).where(where),
    ]);

    const total = Number(countResult[0]?.count || 0);
    return {
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async submit(formId: number, data: any, meta: any = {}) {
    const db = this.drizzle.getDrizzle();
    const [form] = await db
      .select()
      .from(websiteForms)
      .where(and(eq(websiteForms.id, Number(formId)), eq(websiteForms.isActive, true)));

    if (!form) {
      return { success: false, error: 'Form not found', code: 'NOT_FOUND' };
    }

    const [result] = await db.insert(websiteFormSubmissions).values({
      formId: Number(formId),
      data: JSON.stringify(data),
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
      pageSlug: meta.pageSlug || null,
    } as any);

    await db
      .update(websiteForms)
      .set({ submissionCount: sql`submission_count + 1` } as any)
      .where(eq(websiteForms.id, Number(formId)));

    return {
      success: true,
      data: { id: result.insertId },
      message: 'Form submitted successfully',
    };
  }

  async markRead(id: number) {
    const db = this.drizzle.getDrizzle();
    await db
      .update(websiteFormSubmissions)
      .set({ isRead: true } as any)
      .where(eq(websiteFormSubmissions.id, Number(id)));

    return { success: true, message: 'Marked as read' };
  }

  async delete(id: number) {
    const db = this.drizzle.getDrizzle();
    await db.delete(websiteFormSubmissions).where(eq(websiteFormSubmissions.id, Number(id)));

    return { success: true, message: 'Submission deleted' };
  }
}
