import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websiteSettings } from '../models/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class SettingsService {
  constructor(private drizzle: DrizzleService) {}

  async getAll() {
    const db = this.drizzle.getDrizzle();
    const rows = await db.select().from(websiteSettings);
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.type === 'json' ? JSON.parse(row.value || '{}') : row.value;
    }
    return { success: true, data: settings };
  }

  async get(key: string) {
    const db = this.drizzle.getDrizzle();
    const [row] = await db.select().from(websiteSettings).where(eq(websiteSettings.key, key));
    return row ? row.value : null;
  }

  async set(key: string, value: any, type = 'string') {
    const db = this.drizzle.getDrizzle();
    const strValue = type === 'json' ? JSON.stringify(value) : String(value);

    const [existing] = await db
      .select()
      .from(websiteSettings)
      .where(eq(websiteSettings.key, key));

    if (existing) {
      await db
        .update(websiteSettings)
        .set({ value: strValue, type } as any)
        .where(eq(websiteSettings.key, key));
    } else {
      await db
        .insert(websiteSettings)
        .values({ key, value: strValue, type } as any);
    }

    return { success: true, data: { key, value }, message: 'Setting saved' };
  }

  async bulkSet(settings: Record<string, any>) {
    const db = this.drizzle.getDrizzle();
    for (const [key, value] of Object.entries(settings)) {
      const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const type =
        typeof value === 'object'
          ? 'json'
          : typeof value === 'number'
            ? 'number'
            : 'string';

      const [existing] = await db
        .select()
        .from(websiteSettings)
        .where(eq(websiteSettings.key, key));

      if (existing) {
        await db
          .update(websiteSettings)
          .set({ value: strValue, type } as any)
          .where(eq(websiteSettings.key, key));
      } else {
        await db
          .insert(websiteSettings)
          .values({ key, value: strValue, type } as any);
      }
    }

    return { success: true, data: settings, message: 'Settings saved' };
  }
}
