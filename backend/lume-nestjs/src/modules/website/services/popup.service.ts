import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websitePopups } from '../models/schema';
import { eq, like, desc, and, sql } from 'drizzle-orm';
import { CreatePopupDto, UpdatePopupDto } from '../dtos';

@Injectable()
export class PopupService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(options: any = {}) {
    const db = this.drizzle.getDrizzle();
    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) conditions.push(like(websitePopups.name, `%${search}%`));

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(websitePopups)
            .where(and(...conditions))
            .orderBy(desc(websitePopups.id))
            .limit(limit)
            .offset(offset)
        : await db
            .select()
            .from(websitePopups)
            .orderBy(desc(websitePopups.id))
            .limit(limit)
            .offset(offset);

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
      .from(websitePopups)
      .where(eq(websitePopups.id, Number(id)));

    if (!row) {
      return { success: false, error: 'Popup not found' };
    }

    row.conditions = row.conditions ? this.parseJson(row.conditions) : null;
    return { success: true, data: row };
  }

  async create(dto: CreatePopupDto) {
    const db = this.drizzle.getDrizzle();
    const [result] = await db.insert(websitePopups).values({
      name: dto.name,
      content: dto.content || null,
      contentHtml: dto.contentHtml || null,
      triggerType: dto.triggerType || 'page-load',
      triggerValue: dto.triggerValue || null,
      position: dto.position || 'center',
      width: dto.width || 'md',
      overlayClose: dto.overlayClose !== undefined ? dto.overlayClose : true,
      showOnce: dto.showOnce !== undefined ? dto.showOnce : true,
      conditions: dto.conditions ? JSON.stringify(dto.conditions) : null,
      isActive: dto.isActive !== undefined ? dto.isActive : false,
    } as any);

    return {
      success: true,
      data: { id: result.insertId },
      message: 'Popup created',
    };
  }

  async update(id: number, dto: UpdatePopupDto) {
    const db = this.drizzle.getDrizzle();
    const updateData: any = { ...dto };
    if (updateData.conditions && typeof updateData.conditions !== 'string') {
      updateData.conditions = JSON.stringify(updateData.conditions);
    }

    await db.update(websitePopups).set(updateData).where(eq(websitePopups.id, Number(id)));

    return { success: true, message: 'Popup updated' };
  }

  async delete(id: number) {
    const db = this.drizzle.getDrizzle();
    await db.delete(websitePopups).where(eq(websitePopups.id, Number(id)));

    return { success: true, message: 'Popup deleted' };
  }

  async getActivePopups() {
    const db = this.drizzle.getDrizzle();
    const rows = await db
      .select()
      .from(websitePopups)
      .where(eq(websitePopups.isActive, true));

    return {
      success: true,
      data: rows.map((r) => ({
        ...r,
        conditions: r.conditions ? this.parseJson(r.conditions) : null,
      })),
    };
  }

  private parseJson(json: string): any {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
