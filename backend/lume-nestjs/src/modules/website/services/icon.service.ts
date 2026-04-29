import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websiteCustomIcons } from '../models/schema';
import { eq, like, and, asc, sql } from 'drizzle-orm';
import * as path from 'path';

@Injectable()
export class IconService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(options: any = {}) {
    const db = this.drizzle.getDrizzle();
    const { search, setName } = options;

    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${websiteCustomIcons.name} LIKE ${'%' + search + '%'} OR ${websiteCustomIcons.tags} LIKE ${'%' + search + '%'})`,
      );
    }
    if (setName) conditions.push(eq(websiteCustomIcons.setName, setName));

    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await db
      .select()
      .from(websiteCustomIcons)
      .where(where)
      .orderBy(asc(websiteCustomIcons.name));

    return { success: true, data: rows };
  }

  async findById(id: number) {
    const db = this.drizzle.getDrizzle();
    const [row] = await db
      .select()
      .from(websiteCustomIcons)
      .where(eq(websiteCustomIcons.id, Number(id)));

    if (!row) {
      return { success: false, error: 'Icon not found', code: 'NOT_FOUND' };
    }

    return { success: true, data: row };
  }

  async uploadIcon(file: Express.Multer.File) {
    const svgContent = file.buffer.toString('utf-8');

    if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
      return { success: false, error: 'Invalid SVG file' };
    }

    const svgMatch = svgContent.match(/<svg[\s\S]*<\/svg>/i);
    if (!svgMatch) {
      return { success: false, error: 'Could not parse SVG content' };
    }

    const baseName = path.basename(
      file.originalname,
      path.extname(file.originalname),
    );
    const name = baseName
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const db = this.drizzle.getDrizzle();
    const [result] = await db.insert(websiteCustomIcons).values({
      name,
      setName: 'custom',
      svgContent: svgMatch[0],
      tags: name.toLowerCase(),
    } as any);

    const [created] = await db
      .select()
      .from(websiteCustomIcons)
      .where(eq(websiteCustomIcons.id, result.insertId));

    return { success: true, data: created, message: 'Icon uploaded' };
  }

  async uploadMultipleIcons(files: Express.Multer.File[]) {
    const results = [];
    for (const file of files) {
      const result = await this.uploadIcon(file);
      if (result.success) results.push(result.data);
    }

    return { success: true, data: results, message: `${results.length} icons uploaded` };
  }

  async create(data: any) {
    const db = this.drizzle.getDrizzle();
    const [result] = await db.insert(websiteCustomIcons).values({
      name: data.name,
      setName: data.setName || 'custom',
      svgContent: data.svgContent,
      tags: data.tags || data.name.toLowerCase(),
    } as any);

    const [created] = await db
      .select()
      .from(websiteCustomIcons)
      .where(eq(websiteCustomIcons.id, result.insertId));

    return { success: true, data: created, message: 'Icon created' };
  }

  async update(id: number, data: any) {
    const db = this.drizzle.getDrizzle();
    await db.update(websiteCustomIcons).set(data).where(eq(websiteCustomIcons.id, Number(id)));
    const [updated] = await db
      .select()
      .from(websiteCustomIcons)
      .where(eq(websiteCustomIcons.id, Number(id)));

    return { success: true, data: updated, message: 'Icon updated' };
  }

  async delete(id: number) {
    const db = this.drizzle.getDrizzle();
    await db.delete(websiteCustomIcons).where(eq(websiteCustomIcons.id, Number(id)));

    return { success: true, message: 'Icon deleted' };
  }
}
