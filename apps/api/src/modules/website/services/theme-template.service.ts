import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websiteThemeTemplates } from '../models/schema';
import { eq, and, asc } from 'drizzle-orm';
import { CreateThemeTemplateDto, UpdateThemeTemplateDto } from '../dtos';

@Injectable()
export class ThemeTemplateService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(filter: any = {}) {
    const db = this.drizzle.getDrizzle();
    const conditions = [];
    if (filter.type) conditions.push(eq(websiteThemeTemplates.type, filter.type));

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(websiteThemeTemplates)
            .where(and(...conditions))
            .orderBy(asc(websiteThemeTemplates.priority))
        : await db
            .select()
            .from(websiteThemeTemplates)
            .orderBy(asc(websiteThemeTemplates.priority));

    return {
      success: true,
      data: rows.map((r) => ({
        ...r,
        conditions: r.conditions ? this.parseJson(r.conditions) : null,
      })),
    };
  }

  async findById(id: number) {
    const db = this.drizzle.getDrizzle();
    const [row] = await db
      .select()
      .from(websiteThemeTemplates)
      .where(eq(websiteThemeTemplates.id, Number(id)));

    if (!row) {
      return { success: false, error: 'Template not found' };
    }

    row.conditions = row.conditions ? this.parseJson(row.conditions) : null;
    return { success: true, data: row };
  }

  async create(dto: CreateThemeTemplateDto) {
    const db = this.drizzle.getDrizzle();
    const [result] = await db.insert(websiteThemeTemplates).values({
      name: dto.name,
      type: dto.type || 'header',
      content: dto.content || null,
      contentHtml: dto.contentHtml || null,
      conditions: dto.conditions ? JSON.stringify(dto.conditions) : null,
      priority: dto.priority || 10,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    } as any);

    return {
      success: true,
      data: { id: result.insertId },
      message: 'Template created',
    };
  }

  async update(id: number, dto: UpdateThemeTemplateDto) {
    const db = this.drizzle.getDrizzle();
    const updateData: any = { ...dto };
    if (updateData.conditions && typeof updateData.conditions !== 'string') {
      updateData.conditions = JSON.stringify(updateData.conditions);
    }

    await db
      .update(websiteThemeTemplates)
      .set(updateData)
      .where(eq(websiteThemeTemplates.id, Number(id)));

    return { success: true, message: 'Template updated' };
  }

  async delete(id: number) {
    const db = this.drizzle.getDrizzle();
    await db.delete(websiteThemeTemplates).where(eq(websiteThemeTemplates.id, Number(id)));

    return { success: true, message: 'Template deleted' };
  }

  private evaluateCondition(condition: any, context: any = {}): boolean {
    const { type, operator, value } = condition;
    const isNot = operator === 'is-not';

    let matches = false;
    switch (type) {
      case 'all':
        matches = true;
        break;
      case 'page-type':
        matches = context.pageType === value;
        break;
      case 'specific-page':
        matches =
          context.slug === value ||
          context.pageId === value ||
          String(context.pageId) === String(value);
        break;
      case 'taxonomy':
        matches = Array.isArray(context.taxonomies)
          ? context.taxonomies.includes(value)
          : context.taxonomy === value;
        break;
      case 'author':
        matches =
          String(context.authorId) === String(value) || context.author === value;
        break;
      case 'date-range': {
        const now = new Date();
        const parsed = typeof value === 'object' ? value : {};
        const from = parsed.from ? new Date(parsed.from) : null;
        const to = parsed.to ? new Date(parsed.to) : null;
        if (from && to) matches = now >= from && now <= to;
        else if (from) matches = now >= from;
        else if (to) matches = now <= to;
        else matches = true;
        break;
      }
      default:
        matches = true;
    }

    return isNot ? !matches : matches;
  }

  private matchesConditions(conditions: any[], context: any = {}): boolean {
    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return true;
    }

    const includes = conditions.filter((c) => c.section === 'include');
    const excludes = conditions.filter((c) => c.section === 'exclude');

    if (excludes.length > 0 && excludes.some((c) => this.evaluateCondition(c, context))) {
      return false;
    }

    if (includes.length > 0) {
      return includes.some((c) => this.evaluateCondition(c, context));
    }

    return true;
  }

  async getActiveTemplate(type: string, context: any = {}) {
    const db = this.drizzle.getDrizzle();
    const rows = await db
      .select()
      .from(websiteThemeTemplates)
      .where(
        and(
          eq(websiteThemeTemplates.type, type),
          eq(websiteThemeTemplates.isActive, true),
        ),
      )
      .orderBy(asc(websiteThemeTemplates.priority));

    for (const row of rows) {
      let parsedConditions = null;
      if (row.conditions) {
        parsedConditions = this.parseJson(row.conditions);
      }
      if (this.matchesConditions(parsedConditions, context)) {
        return { success: true, data: { ...row, conditions: parsedConditions } };
      }
    }

    return { success: true, data: null };
  }

  private parseJson(json: string): any {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
