import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { CreatePlatformConfigDto, UpdatePlatformConfigDto } from '../dtos';

@Injectable()
export class PlatformConfigService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.setting.findMany({
      where: { category: 'platform' },
      orderBy: { key: 'asc' }
    });

    const result: Record<string, any> = {};
    for (const setting of settings) {
      result[setting.key] = this.formatValue(setting);
    }

    return { success: true, data: result };
  }

  async getSetting(key: string) {
    const setting = await this.prisma.setting.findFirst({
      where: { key, category: 'platform' }
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    return { success: true, data: { key, value: this.formatValue(setting) } };
  }

  async setSetting(key: string, dto: CreatePlatformConfigDto) {
    let stringValue = dto.value;
    let type: 'string' | 'number' | 'boolean' | 'json' | 'array' = 'string';

    if (typeof dto.config === 'object' && dto.config !== null) {
      stringValue = JSON.stringify(dto.config);
      type = 'json';
    } else if (typeof dto.value === 'object' && dto.value !== null) {
      stringValue = JSON.stringify(dto.value);
      type = 'json';
    }

    const setting = await this.prisma.setting.upsert({
      where: { key },
      create: {
        key,
        value: stringValue,
        type,
        category: 'platform',
        description: dto.description
      },
      update: {
        value: stringValue,
        type,
        ...(dto.description !== undefined && { description: dto.description })
      }
    });

    const created = setting.created_at?.getTime() === setting.updated_at?.getTime();
    return {
      success: true,
      data: { key, value: this.formatValue(setting) },
      message: created ? 'Setting created' : 'Setting updated'
    };
  }

  async updateSetting(key: string, dto: UpdatePlatformConfigDto) {
    return this.setSetting(key, dto as CreatePlatformConfigDto);
  }

  async deleteSetting(key: string) {
    const setting = await this.prisma.setting.findFirst({
      where: { key, category: 'platform' }
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    await this.prisma.setting.delete({ where: { key } });
    return { success: true, message: 'Setting deleted' };
  }

  async initializeDefaults() {
    const defaults = [
      {
        key: 'platform_name',
        value: 'Lume Platform',
        type: 'string',
        category: 'platform',
        description: 'Platform name'
      },
      {
        key: 'platform_description',
        value: '',
        type: 'string',
        category: 'platform',
        description: 'Platform description'
      }
    ];

    for (const setting of defaults) {
      await this.prisma.setting.upsert({
        where: { key: setting.key },
        create: setting as any,
        update: {}
      });
    }

    return {
      success: true,
      data: { count: defaults.length },
      message: 'Platform defaults initialized'
    };
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
