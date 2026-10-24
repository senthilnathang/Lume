import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { Controller, Get, Post, Delete, Param, HttpCode, UseGuards, Optional, ConflictException } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { BUILTIN_MODULE_NAMES } from '../builtin-modules';
import { ModuleLoaderService } from '../../../core/module/module-loader.service.js';
import { MetadataRegistryService } from '../../../core/runtime/metadata-registry.service.js';
import { PolicyGuard, RequireRoles } from '../../../core/permission/policy.guard.js';

@Controller('admin/modules')
@UseGuards(JwtAuthGuard, PolicyGuard)
export class AdminModulesController {
  constructor(
    private readonly moduleLoader: ModuleLoaderService,
    private readonly metadataRegistry: MetadataRegistryService,
    @Optional() private readonly modules?: ModulesContainer,
  ) {}

  private builtins() {
    const names = new Set(Array.from(this.modules?.values() || [])
      .map(module => BUILTIN_MODULE_NAMES[module.metatype?.name]).filter(Boolean));
    return Array.from(names).sort().map(name => ({
      name, display_name: name.replace(/[_-]/g, ' '), version: 'bundled',
      description: 'Included in the deployed application.', depends: [],
      state: 'installed', status: 'loaded', loaded: true, initialized: true,
      managedBy: 'deployment', actions: [],
    }));
  }

  private assertRuntimeManaged(name: string) {
    if (this.builtins().some(module => module.name === name)) {
      throw new ConflictException('This module is managed by application deployment.');
    }
  }

  @Get()
  @RequireRoles('admin', 'super_admin')
  async listModules() {
    const installed = this.metadataRegistry.listModules();
    const builtins = this.builtins();
    return {
      success: true,
      data: [...builtins, ...installed.filter(mod => !builtins.some(builtin => builtin.name === mod.name)).map((mod) => ({
        name: mod.name,
        display_name: mod.name,
        state: this.moduleLoader.isLoaded(mod.name) ? 'installed' : 'uninstalled',
        status: this.moduleLoader.isLoaded(mod.name) ? 'loaded' : 'pending',
        managedBy: 'runtime',
        actions: this.moduleLoader.isLoaded(mod.name) ? ['uninstall'] : ['install'],
        version: mod.version,
        description: mod.description,
        depends: mod.depends || [],
        entities: mod.entities?.length || 0,
        workflows: mod.workflows?.length || 0,
        permissions: mod.permissions?.length || 0,
      }))],
    };
  }

  @Get(':moduleName')
  @RequireRoles('admin', 'super_admin')
  async getModule(@Param('moduleName') moduleName: string) {
    const builtin = this.builtins().find(module => module.name === moduleName);
    if (builtin) return { success: true, data: builtin };
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
  @RequireRoles('admin', 'super_admin')
  async installModule(@Param('moduleName') moduleName: string) {
    this.assertRuntimeManaged(moduleName);
    try {
      const definition = this.metadataRegistry.getModule(moduleName);
      if (!definition) return { success: false, message: `Module ${moduleName} not found` };
      await this.moduleLoader.installModule(definition);
      return { success: true, message: `Module ${moduleName} installed successfully` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Delete(':moduleName')
  @RequireRoles('admin', 'super_admin')
  async uninstallModule(@Param('moduleName') moduleName: string) {
    this.assertRuntimeManaged(moduleName);
    try {
      await this.moduleLoader.uninstallModule(moduleName);
      return { success: true, message: `Module ${moduleName} uninstalled successfully` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post(':moduleName/reload')
  @HttpCode(200)
  @RequireRoles('admin', 'super_admin')
  async reloadModule(@Param('moduleName') moduleName: string) {
    this.assertRuntimeManaged(moduleName);
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
