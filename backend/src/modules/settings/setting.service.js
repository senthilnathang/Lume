import { getDatabase } from '../../config.js';
import { Op } from 'sequelize';
import { responseUtil } from '../../shared/utils/index.js';
import { MESSAGES } from '../../shared/constants/index.js';

export class SettingService {
  constructor() {
    this.db = getDatabase();
    this.Setting = this.db.models.Setting;
  }

  async get(key) {
    const setting = await this.Setting.findOne({ where: { key } });
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

    const [setting, created] = await this.Setting.findOrCreate({
      where: { key },
      defaults: {
        value: stringValue,
        type,
        category: options.category || 'general',
        description: options.description,
        is_public: options.is_public || false,
        is_encrypted: options.is_encrypted || false
      }
    });

    if (!created) {
      await setting.update({
        value: stringValue,
        type,
        ...options
      });
    }

    return responseUtil.success({ key, value }, created ? MESSAGES.CREATED : MESSAGES.UPDATED);
  }

  async getByCategory(category) {
    const settings = await this.Setting.findAll({
      where: { category },
      order: [['key', 'ASC']]
    });

    const result = {};
    for (const setting of settings) {
      result[setting.key] = this.formatValue(setting);
    }

    return responseUtil.success(result);
  }

  async getPublic() {
    const settings = await this.Setting.findAll({
      where: { is_public: true },
      order: [['category', 'ASC'], ['key', 'ASC']]
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
    const settings = await this.Setting.findAll({
      order: [['category', 'ASC'], ['key', 'ASC']]
    });
    return responseUtil.success(settings);
  }

  async delete(key) {
    const setting = await this.Setting.findOne({ where: { key } });

    if (!setting) {
      return responseUtil.notFound('Setting');
    }

    await setting.destroy();
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
      await this.Setting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
    }

    return responseUtil.success({ count: defaults.length }, 'Default settings initialized');
  }
}

export default SettingService;
