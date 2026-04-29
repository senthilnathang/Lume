import { Controller, Get, Post, Delete, Body, Param, HttpCode, UseGuards } from '@nestjs/common';
import { ModuleLoaderService } from '../../../core/module/module-loader.service.js';
import { MetadataRegistryService } from '../../../core/runtime/metadata-registry.service.js';
import { PolicyGuard, Policy } from '../../../core/permission/policy.guard.js';

@Controller('admin/modules')
@UseGuards(PolicyGuard)
export class AdminModulesController {
  constructor(
    private readonly moduleLoader: ModuleLoaderService,
    private readonly metadataRegistry: MetadataRegistryService,
  ) {}

  @Get()
  @Policy(['admin', 'super_admin'])
  async listModules() {
    const installed = this.metadataRegistry.listModules();
    return {
      success: true,
      data: installed.map((mod) => ({
        name: mod.name,
        version: mod.version,
        description: mod.description,
        depends: mod.depends || [],
        entities: mod.entities?.length || 0,
        workflows: mod.workflows?.length || 0,
        permissions: mod.permissions?.length || 0,
      })),
    };
  }

  @Get(':moduleName')
  @Policy(['admin', 'super_admin'])
  async getModule(@Param('moduleName') moduleName: string) {
    const module = this.metadataRegistry.getModule(moduleName);
    if (!module) {
      return { success: false, message: `Module ${moduleName} not found` };
    }
    return {
      success: true,
      data: {
        name: module.name,
        version: module.version,
        description: module.description,
        depends: module.depends || [],
        entities: module.entities || [],
        workflows: module.workflows || [],
        permissions: module.permissions || [],
        hooks: module.hooks ? Object.keys(module.hooks) : [],
      },
    };
  }

  @Post(':moduleName/install')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async installModule(@Param('moduleName') moduleName: string) {
    try {
      await this.moduleLoader.installModule(moduleName);
      return { success: true, message: `Module ${moduleName} installed successfully` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Delete(':moduleName')
  @Policy(['admin', 'super_admin'])
  async uninstallModule(@Param('moduleName') moduleName: string) {
    try {
      await this.moduleLoader.uninstallModule(moduleName);
      return { success: true, message: `Module ${moduleName} uninstalled successfully` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post(':moduleName/reload')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async reloadModule(@Param('moduleName') moduleName: string) {
    try {
      const module = this.metadataRegistry.getModule(moduleName);
      if (!module) {
        return { success: false, message: `Module ${moduleName} not found` };
      }
      await this.moduleLoader.loadModule(module);
      return { success: true, message: `Module ${moduleName} reloaded successfully` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
