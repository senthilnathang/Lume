import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websiteMedia } from '../models/schema';
import { eq, like, desc, and, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(options: any = {}) {
    const db = this.drizzle.getDrizzle();
    const { page = 1, limit = 20, search, folder, mimeType } = options;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) conditions.push(like(websiteMedia.originalName, `%${search}%`));
    if (folder) conditions.push(eq(websiteMedia.folder, folder));
    if (mimeType) conditions.push(like(websiteMedia.mimeType, `${mimeType}%`));

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(websiteMedia)
        .where(where)
        .orderBy(desc(websiteMedia.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql`COUNT(*)` }).from(websiteMedia).where(where),
    ]);

    const total = Number(countResult[0]?.count || 0);
    return {
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async uploadFile(file: Express.Multer.File, userId?: number) {
    const db = this.drizzle.getDrizzle();
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const uploadDir = path.resolve(
      process.env.UPLOAD_DIR || './uploads',
      'media',
      yearMonth,
    );

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${baseName}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    let width = null;
    let height = null;
    let thumbnailUrl = null;

    if (file.mimetype.startsWith('image/')) {
      try {
        const sharp = (await import('sharp')).default;
        const metadata = await sharp(file.buffer).metadata();
        width = metadata.width || null;
        height = metadata.height || null;

        const thumbFilename = `thumb_${filename}`;
        const thumbPath = path.join(uploadDir, thumbFilename);
        await sharp(file.buffer)
          .resize(300, null, { withoutEnlargement: true })
          .toFile(thumbPath);
        thumbnailUrl = `/uploads/media/${yearMonth}/${thumbFilename}`;
      } catch (err) {
        console.error('Sharp processing failed:', err.message);
      }
    }

    const url = `/uploads/media/${yearMonth}/${filename}`;
    const relativePath = `media/${yearMonth}/${filename}`;

    const [result] = await db.insert(websiteMedia).values({
      filename,
      originalName: file.originalname,
      path: relativePath,
      url,
      mimeType: file.mimetype,
      size: file.size,
      width,
      height,
      folder: 'general',
      uploadedBy: userId,
    } as any);

    const [created] = await db
      .select()
      .from(websiteMedia)
      .where(eq(websiteMedia.id, result.insertId));

    return {
      success: true,
      data: { ...created, thumbnailUrl },
      message: 'Media uploaded',
    };
  }

  async update(id: number, data: any) {
    const db = this.drizzle.getDrizzle();
    await db.update(websiteMedia).set(data).where(eq(websiteMedia.id, Number(id)));
    const [updated] = await db
      .select()
      .from(websiteMedia)
      .where(eq(websiteMedia.id, Number(id)));

    return { success: true, data: updated, message: 'Media updated' };
  }

  async delete(id: number) {
    const db = this.drizzle.getDrizzle();
    const [media] = await db.select().from(websiteMedia).where(eq(websiteMedia.id, Number(id)));

    if (media?.path) {
      const fullPath = path.resolve(process.env.UPLOAD_DIR || './uploads', media.path);
      try {
        fs.unlinkSync(fullPath);
      } catch {}
      const dir = path.dirname(fullPath);
      const thumbPath = path.join(dir, `thumb_${media.filename}`);
      try {
        fs.unlinkSync(thumbPath);
      } catch {}
    }

    await db.delete(websiteMedia).where(eq(websiteMedia.id, Number(id)));

    return { success: true, message: 'Media deleted' };
  }
}
