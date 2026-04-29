import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websiteCustomFonts } from '../models/schema';
import { eq, like, desc, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FontService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(options: any = {}) {
    const db = this.drizzle.getDrizzle();
    const { search } = options;

    const conditions = [];
    if (search) conditions.push(like(websiteCustomFonts.name, `%${search}%`));

    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await db
      .select()
      .from(websiteCustomFonts)
      .where(where)
      .orderBy(desc(websiteCustomFonts.createdAt));

    return { success: true, data: rows };
  }

  async findById(id: number) {
    const db = this.drizzle.getDrizzle();
    const [row] = await db
      .select()
      .from(websiteCustomFonts)
      .where(eq(websiteCustomFonts.id, Number(id)));

    if (!row) {
      return { success: false, error: 'Font not found', code: 'NOT_FOUND' };
    }

    return { success: true, data: row };
  }

  async uploadFont(file: Express.Multer.File) {
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads', 'fonts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const formatMap: any = {
      '.ttf': 'truetype',
      '.otf': 'opentype',
      '.woff': 'woff',
      '.woff2': 'woff2',
    };
    const format = formatMap[ext] || 'woff2';

    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${baseName}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const fileUrl = `/uploads/fonts/${filename}`;
    const fontName = baseName.replace(/_/g, ' ');
    const family = fontName;

    const db = this.drizzle.getDrizzle();
    const [result] = await db.insert(websiteCustomFonts).values({
      name: fontName,
      family,
      weight: 400,
      style: 'normal',
      fileUrl,
      format,
    } as any);

    const [created] = await db
      .select()
      .from(websiteCustomFonts)
      .where(eq(websiteCustomFonts.id, result.insertId));

    return { success: true, data: created, message: 'Font uploaded' };
  }

  async update(id: number, data: any) {
    const db = this.drizzle.getDrizzle();
    await db.update(websiteCustomFonts).set(data).where(eq(websiteCustomFonts.id, Number(id)));
    const [updated] = await db
      .select()
      .from(websiteCustomFonts)
      .where(eq(websiteCustomFonts.id, Number(id)));

    return { success: true, data: updated, message: 'Font updated' };
  }

  async delete(id: number) {
    const db = this.drizzle.getDrizzle();
    const [font] = await db
      .select()
      .from(websiteCustomFonts)
      .where(eq(websiteCustomFonts.id, Number(id)));

    if (font?.fileUrl) {
      const fullPath = path.resolve(
        process.env.UPLOAD_DIR || './uploads',
        font.fileUrl.replace(/^\/uploads\//, ''),
      );
      try {
        fs.unlinkSync(fullPath);
      } catch {}
    }

    await db.delete(websiteCustomFonts).where(eq(websiteCustomFonts.id, Number(id)));

    return { success: true, message: 'Font deleted' };
  }

  async searchGoogleFonts(query: string) {
    const apiKey = process.env.GOOGLE_FONTS_API_KEY;

    if (!apiKey) {
      const popularFonts = [
        'Inter',
        'Roboto',
        'Open Sans',
        'Lato',
        'Montserrat',
        'Poppins',
        'Raleway',
        'Nunito',
        'Playfair Display',
        'Merriweather',
        'Source Sans Pro',
        'Ubuntu',
        'Oswald',
        'PT Sans',
        'Noto Sans',
        'Fira Sans',
        'Work Sans',
        'Quicksand',
        'Josefin Sans',
        'DM Sans',
      ];

      const filtered = query
        ? popularFonts.filter((f) =>
            f.toLowerCase().includes(query.toLowerCase()),
          )
        : popularFonts;

      return {
        success: true,
        data: filtered.map((f) => ({
          family: f,
          variants: ['400', '400italic', '700', '700italic'],
          category: 'sans-serif',
          url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}:wght@400;700&display=swap`,
        })),
      };
    }

    try {
      const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`;
      const response = await fetch(url);
      const data = await response.json();
      let fonts = data.items || [];

      if (query) {
        fonts = fonts.filter((f) =>
          f.family.toLowerCase().includes(query.toLowerCase()),
        );
      }

      return {
        success: true,
        data: fonts.slice(0, 50).map((f) => ({
          family: f.family,
          variants: f.variants,
          category: f.category,
          url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family)}:wght@400;700&display=swap`,
        })),
      };
    } catch (err) {
      console.error('Google Fonts API error:', err);
      return { success: false, error: 'Failed to search Google Fonts' };
    }
  }
}
