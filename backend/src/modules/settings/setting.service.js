import prisma from '../../core/db/prisma.js';
import { responseUtil } from '../../shared/utils/index.js';
import { MESSAGES } from '../../shared/constants/index.js';

export class SettingService {
  async get(key) {
    const setting = await prisma.setting.findFirst({ where: { key } });
    if (!setting) return null;

    let value = setting.value;
    if (setting.type === 'json' || setting.type === 'array') {
      try {
        value = JSON.parse(setting.value);
      } catch (e) {
        value = setting.value;
      }
    } else if (setting.type === 'number') {
      value = parseFloat(setting.value);
    } else if (setting.type === 'boolean') {
      value = setting.value === 'true';
    }

    return value;
  }

  async set(key, value, options = {}) {
    let stringValue = value;
    const type = options.type || (typeof value === 'object' ? 'json' : typeof value);

    if (type === 'object' || type === 'array') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      create: {
        key,
        value: stringValue,
        type,
        category: options.category || 'general',
        description: options.description,
        isPublic: options.is_public || false,
        isEncrypted: options.is_encrypted || false
      },
      update: {
        value: stringValue,
        type,
        ...(options.category !== undefined && { category: options.category }),
        ...(options.description !== undefined && { description: options.description }),
        ...(options.is_public !== undefined && { isPublic: options.is_public }),
        ...(options.is_encrypted !== undefined && { isEncrypted: options.is_encrypted })
      }
    });

    const created = setting.created_at?.getTime() === setting.updated_at?.getTime();
    return responseUtil.success({ key, value }, created ? MESSAGES.CREATED : MESSAGES.UPDATED);
  }

  async getByCategory(category) {
    const settings = await prisma.setting.findMany({
      where: { category },
      orderBy: { key: 'asc' }
    });

    const result = {};
    for (const setting of settings) {
      result[setting.key] = this.formatValue(setting);
    }

    return responseUtil.success(result);
  }

  async getPublic() {
    const settings = await prisma.setting.findMany({
      where: { isPublic: true },
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });

    const result = {};
    for (const setting of settings) {
      result[setting.key] = this.formatValue(setting);
    }

    return responseUtil.success(result);
  }

  formatValue(setting) {
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

  async getAll() {
    const settings = await prisma.setting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });
    return responseUtil.success(settings);
  }

  async delete(key) {
    const setting = await prisma.setting.findFirst({ where: { key } });

    if (!setting) {
      return responseUtil.notFound('Setting');
    }

    await prisma.setting.delete({ where: { key } });
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async bulkSet(settings) {
    const results = [];
    for (const { key, value, ...options } of settings) {
      const result = await this.set(key, value, options);
      results.push(result);
    }
    return responseUtil.success(results, MESSAGES.UPDATED);
  }

  async initializeDefaults() {
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
      { key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'system', description: 'Enable maintenance mode' }
    ];

    for (const setting of defaults) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        create: setting,
        update: {}
      });
    }

    return responseUtil.success({ count: defaults.length }, 'Default settings initialized');
  }
}

export default SettingService;
