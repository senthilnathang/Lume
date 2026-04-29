import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { CreateSettingDto, UpdateSettingDto } from '../dtos';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(key: string): Promise<any> {
    const setting = await this.prisma.setting.findFirst({ where: { key } });
    if (!setting) return null;
    return this.formatValue(setting);
  }

  async set(key: string, value: any, options: Partial<CreateSettingDto> = {}) {
    let stringValue = value;
    let type: 'string' | 'number' | 'boolean' | 'json' | 'array' = 'string';

    if (options.type) {
      type = options.type;
    } else if (Array.isArray(value)) {
      type = 'array';
    } else if (typeof value === 'object' && value !== null) {
      type = 'json';
    } else if (typeof value === 'number') {
      type = 'number';
    } else if (typeof value === 'boolean') {
      type = 'boolean';
    }

    if (type === 'array' || type === 'json') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    const setting = await this.prisma.setting.upsert({
      where: { key },
      create: {
        key,
        value: stringValue,
        type,
        category: options.category || 'general',
        description: options.description,
        isPublic: options.is_public || false,
        isEncrypted: options.is_encrypted || false,
      },
      update: {
        value: stringValue,
        type,
        ...(options.category !== undefined && { category: options.category }),
        ...(options.description !== undefined && { description: options.description }),
        ...(options.is_public !== undefined && { isPublic: options.is_public }),
        ...(options.is_encrypted !== undefined && { isEncrypted: options.is_encrypted }),
      },
    });

    const created = setting.created_at?.getTime() === setting.updated_at?.getTime();
    return {
      success: true,
      data: { key, value: this.formatValue(setting) },
      message: created ? 'Setting created' : 'Setting updated',
    };
  }

  async getByCategory(category: string): Promise<any> {
    const settings = await this.prisma.setting.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });

    const result: Record<string, any> = {};
    for (const setting of settings) {
      result[setting.key] = this.formatValue(setting);
    }

    return { success: true, data: result };
  }

  async getPublic(): Promise<any> {
    const settings = await this.prisma.setting.findMany({
      where: { isPublic: true },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    const result: Record<string, any> = {};
    for (const setting of settings) {
      result[setting.key] = this.formatValue(setting);
    }

    return { success: true, data: result };
  }

  async getAll(): Promise<any> {
    const settings = await this.prisma.setting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    return { success: true, data: settings };
  }

  async delete(key: string): Promise<any> {
    const setting = await this.prisma.setting.findFirst({ where: { key } });
    if (!setting) {
      return { success: false, error: 'Setting not found' };
    }

    await this.prisma.setting.delete({ where: { key } });
    return { success: true, message: 'Setting deleted' };
  }

  async bulkSet(settings: Array<Partial<CreateSettingDto>>): Promise<any> {
    const results = [];
    for (const { key, value, ...options } of settings) {
      if (!key || value === undefined) continue;
      const result = await this.set(key, value, options);
      results.push(result);
    }
    return { success: true, data: results, message: 'Settings updated' };
  }

  async initializeDefaults(): Promise<any> {
    const defaults = [
      { key: 'site_name', value: 'My Organization', type: 'string', category: 'general', description: 'Site name' },
      { key: 'site_description', value: '', type: 'string', category: 'general', description: 'Site description' },
      { key: 'site_logo', value: '', type: 'string', category: 'general', description: 'Site logo URL' },
      { key: 'contact_email', value: 'contact@example.com', type: 'string', category: 'contact', description: 'Contact email' },
      { key: 'contact_phone', value: '', type: 'string', category: 'contact', description: 'Contact phone' },
      { key: 'address', value: '', type: 'string', category: 'contact', description: 'Organization address' },
      { key: 'currency', value: 'USD', type: 'string', category: 'localization', description: 'Default currency' },
      { key: 'timezone', value: 'UTC', type: 'string', category: 'localization', description: 'Default timezone' },
      { key: 'date_format', value: 'YYYY-MM-DD', type: 'string', category: 'localization', description: 'Date format' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'system', description: 'Enable maintenance mode' },
    ];

    for (const setting of defaults) {
      await this.prisma.setting.upsert({
        where: { key: setting.key },
        create: setting as any,
        update: {},
      });
    }

    return { success: true, data: { count: defaults.length }, message: 'Default settings initialized' };
  }

  private formatValue(setting: any): any {
    let value = setting.value;
    if (setting.type === 'json' || setting.type === 'array') {
      try {
        value = JSON.parse(setting.value);
      } catch (e) {
        value = setting.value;
      }
    } else if (setting.type === 'number') {
      value = parseFloat(value);
    } else if (setting.type === 'boolean') {
      value = value === 'true';
    }
    return value;
  }
}
