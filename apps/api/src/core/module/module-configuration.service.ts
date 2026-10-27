import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { ModuleDefinition } from '@core/runtime/metadata-registry.service';

@Injectable()
export class ModuleConfigurationService {
  constructor(private prisma: PrismaService) {}

  private supported(definition: ModuleDefinition) {
    if (!/^[a-z][a-z0-9_.-]{0,99}$/.test(definition.name)) throw new BadRequestException('Configurable module names must be canonical lowercase identifiers');
    if (!definition.configuration || typeof definition.configuration.validate !== 'function' || !definition.hooks?.onLoad) {
      throw new ConflictException('Module does not declare configuration validation and consumption');
    }
  }

  private canonical(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Module config must be an object');
    let json: string;
    try { json = JSON.stringify(value, (_, item) => {
      if (typeof item === 'function' || typeof item === 'symbol' || typeof item === 'undefined' || (typeof item === 'number' && !Number.isFinite(item))) throw new Error('Invalid JSON value');
      return item;
    }); } catch { throw new BadRequestException('Module config must contain valid JSON'); }
    if (Buffer.byteLength(json, 'utf8') > 60000) throw new BadRequestException('Module config exceeds 60000 bytes');
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new BadRequestException('Module config must be an object');
    return parsed;
  }

  async read(definition: ModuleDefinition, validate = false) {
    this.supported(definition);
    const row = await this.prisma.runtimeModuleConfig.findUnique({ where: { moduleName: definition.name } });
    const config = this.canonical(row ? JSON.parse(row.config) : definition.configuration.defaults);
    if (validate) await this.validate(definition, config);
    return { config, revision: row?.revision ?? 0 };
  }

  private async validate(definition: ModuleDefinition, config: Record<string, unknown>) {
    // Validation cannot mutate the configuration persisted or supplied to hooks.
    try { await definition.configuration.validate(this.canonical(config)); }
    catch { throw new BadRequestException('Module configuration failed validation'); }
  }

  async save(definition: ModuleDefinition, value: unknown, expectedRevision: number) {
    this.supported(definition);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision >= 2147483647) throw new BadRequestException('Invalid expected configuration revision');
    const config = this.canonical(value);
    await this.validate(definition, config);
    try {
      if (expectedRevision === 0) {
        await this.prisma.runtimeModuleConfig.create({ data: { moduleName: definition.name, config: JSON.stringify(config), revision: 1 } });
      } else {
        const result = await this.prisma.runtimeModuleConfig.updateMany({ where: { moduleName: definition.name, revision: expectedRevision }, data: { config: JSON.stringify(config), revision: { increment: 1 } } });
        if (!result.count) throw new ConflictException('Configuration changed; reload before saving');
      }
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('Configuration changed; reload before saving');
      throw error;
    }
    return { config, revision: expectedRevision + 1 };
  }
}
