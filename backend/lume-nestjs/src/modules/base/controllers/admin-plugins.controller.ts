import { Controller, Get, Post, Delete, Body, Param, HttpCode, UseGuards, Req } from '@nestjs/common';
import { PluginRegistryService } from '../../../core/plugin/plugin-registry.service.js';
import { MetadataRegistryService } from '../../../core/runtime/metadata-registry.service.js';
import { DrizzleService } from '../../../core/services/drizzle.service.js';
import { PolicyGuard, Policy } from '../../../core/permission/policy.guard.js';
import { readFile } from 'fs/promises';

@Controller('admin/plugins')
@UseGuards(PolicyGuard)
export class AdminPluginsController {
  constructor(
    private readonly pluginRegistry: PluginRegistryService,
    private readonly metadataRegistry: MetadataRegistryService,
    private readonly drizzle: DrizzleService,
  ) {}

  @Get()
  @Policy(['admin', 'super_admin'])
  async listPlugins() {
    try {
      const plugins = await this.pluginRegistry.list();
      return {
        success: true,
        data: plugins.map((p) => ({
          name: p.name,
          displayName: p.displayName,
          version: p.version,
          author: p.author,
          description: p.description,
          compatibility: p.compatibility,
          dependencies: p.dependencies || {},
          enabled: p.enabled ?? true,
        })),
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get(':pluginName')
  @Policy(['admin', 'super_admin'])
  async getPlugin(@Param('pluginName') pluginName: string) {
    try {
      const plugins = await this.pluginRegistry.list();
      const plugin = plugins.find((p) => p.name === pluginName);
      if (!plugin) {
        return { success: false, message: `Plugin ${pluginName} not found` };
      }
      return { success: true, data: plugin };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('install')
  @HttpCode(201)
  @Policy(['admin', 'super_admin'])
  async installPlugin(@Body() body: { manifestPath: string }, @Req() req: any) {
    try {
      const manifestContent = await readFile(body.manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      const moduleDefinition = this.metadataRegistry.getModule(manifest.name);
      if (!moduleDefinition) {
        return { success: false, message: `Module definition not found for ${manifest.name}` };
      }

      const userId = req.user?.sub;
      await this.pluginRegistry.install(manifest, moduleDefinition, this.drizzle, userId);

      return { success: true, message: 'Plugin installed successfully', data: { name: manifest.name, version: manifest.version } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post(':pluginName/enable')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async enablePlugin(@Param('pluginName') pluginName: string, @Req() req: any) {
    try {
      const userId = req.user?.sub;
      await this.pluginRegistry.enable(pluginName, userId);
      return { success: true, message: `Plugin ${pluginName} enabled` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post(':pluginName/disable')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async disablePlugin(@Param('pluginName') pluginName: string, @Req() req: any) {
    try {
      const userId = req.user?.sub;
      await this.pluginRegistry.disable(pluginName, userId);
      return { success: true, message: `Plugin ${pluginName} disabled` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Delete(':pluginName')
  @Policy(['admin', 'super_admin'])
  async uninstallPlugin(@Param('pluginName') pluginName: string, @Req() req: any) {
    try {
      const userId = req.user?.sub;
      await this.pluginRegistry.uninstall(pluginName, this.drizzle, userId);
      return { success: true, message: `Plugin ${pluginName} uninstalled` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('check-compatibility')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async checkCompatibility(@Body() body: { pluginName: string }) {
    try {
      const plugins = await this.pluginRegistry.list();
      const plugin = plugins.find((p) => p.name === body.pluginName);
      if (!plugin) {
        return { success: false, message: `Plugin ${body.pluginName} not found` };
      }

      const result = await this.pluginRegistry.checkCompatibility(plugin);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('marketplace/available')
  @Policy(['admin', 'super_admin'])
  async getAvailablePlugins() {
    // TODO: Integrate with plugin marketplace (if implemented)
    return {
      success: true,
      data: {
        available: [],
        message: 'Plugin marketplace not yet configured',
      },
    };
  }
}
