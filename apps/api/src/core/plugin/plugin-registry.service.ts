import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleDefinition } from '@core/runtime/metadata-registry.service';
import { ModuleLoaderService } from '@core/module/module-loader.service';
import { PluginPersistenceService } from '@modules/plugins/services/plugin-persistence.service';
import { SemverService } from '@modules/plugins/services/semver.service';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface PluginManifest {
  name: string;
  displayName: string;
  version: string;
  compatibility: string; // e.g., ">=2.0.0"
  author: string;
  description?: string;
  dependencies?: Record<string, string>;
  entrypoint: string; // e.g., "dist/index.js"
  permissions?: string[];
  dbPrefix: string; // e.g., "crm_"
  hooks?: {
    onInstall?: string; // path to migration file
    onUninstall?: string; // path to migration file
  };
}

export interface CompatibilityResult {
  compatible: boolean;
  message?: string;
}

export interface InstalledPlugin {
  name: string;
  version: string;
  manifest: PluginManifest;
  installedAt: Date;
  enabled: boolean;
}

@Injectable()
export class PluginRegistryService implements OnModuleInit {
  private installedPlugins = new Map<string, InstalledPlugin>();
  private appVersion = '2.0.0';

  constructor(
    private moduleLoader: ModuleLoaderService,
    private pluginPersistence: PluginPersistenceService,
    private semverService: SemverService,
  ) {}

  async onModuleInit() {
    try {
      const installedPlugins = await this.pluginPersistence.getAllInstalled();
      for (const plugin of installedPlugins) {
        if (plugin.manifestJson) {
          this.installedPlugins.set(plugin.name, {
            name: plugin.name,
            version: plugin.version,
            manifest: plugin.manifestJson,
            installedAt: plugin.installedAt,
            enabled: plugin.isEnabled,
          });
        }
      }
      console.log(`Loaded ${installedPlugins.length} plugins from database`);
    } catch (error) {
      console.error('Failed to hydrate plugins from database:', error);
    }
  }

  async install(
    manifest: PluginManifest,
    moduleDefinition: ModuleDefinition,
    db?: any,
    userId?: number,
  ): Promise<void> {
    // Validate manifest format
    this.validateManifest(manifest);

    // Check version compatibility
    const compatibility = this.checkCompatibility(manifest);
    if (!compatibility.compatible) {
      throw new Error(compatibility.message);
    }

    // Check dependency resolution
    await this.resolveDependencies(manifest);

    // Run onInstall SQL migration if provided
    if (manifest.hooks?.onInstall && db) {
      await this.runMigration(manifest.hooks.onInstall, db);
    }

    // Load module definition (which registers entities, workflows, etc.)
    await this.moduleLoader.installModule(moduleDefinition, db);

    // Register plugin as installed
    const installedPlugin: InstalledPlugin = {
      name: manifest.name,
      version: manifest.version,
      manifest,
      installedAt: new Date(),
      enabled: true,
    };
    this.installedPlugins.set(manifest.name, installedPlugin);

    // Persist to database
    await this.pluginPersistence.savePlugin(manifest, userId);
    await this.pluginPersistence.logOperation(
      manifest.name,
      'install',
      'success',
      `Plugin ${manifest.name}@${manifest.version} installed`,
      userId,
    );

    console.log(`Plugin '${manifest.name}' installed successfully`);
  }

  async uninstall(pluginName: string, db?: any, userId?: number): Promise<void> {
    const plugin = this.installedPlugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not installed`);
    }

    // Check if any other plugins depend on this one
    const dependents = Array.from(this.installedPlugins.values()).filter(
      p =>
        p.manifest.dependencies &&
        Object.keys(p.manifest.dependencies).includes(pluginName),
    );

    if (dependents.length > 0) {
      throw new Error(
        `Cannot uninstall: other plugins depend on '${pluginName}'`,
      );
    }

    // Run onUninstall SQL migration if provided
    if (plugin.manifest.hooks?.onUninstall && db) {
      await this.runMigration(plugin.manifest.hooks.onUninstall, db);
    }

    // Unload module
    await this.moduleLoader.uninstallModule(pluginName, db);

    // Remove from installed list
    this.installedPlugins.delete(pluginName);

    // Persist to database
    await this.pluginPersistence.removePlugin(pluginName);
    await this.pluginPersistence.logOperation(
      pluginName,
      'uninstall',
      'success',
      `Plugin ${pluginName} uninstalled`,
      userId,
    );

    console.log(`Plugin '${pluginName}' uninstalled successfully`);
  }

  async enable(pluginName: string, userId?: number): Promise<void> {
    const plugin = this.installedPlugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not installed`);
    }

    plugin.enabled = true;
    await this.pluginPersistence.setEnabled(pluginName, true);
    await this.pluginPersistence.logOperation(
      pluginName,
      'enable',
      'success',
      `Plugin ${pluginName} enabled`,
      userId,
    );
  }

  async disable(pluginName: string, userId?: number): Promise<void> {
    const plugin = this.installedPlugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not installed`);
    }

    plugin.enabled = false;
    await this.pluginPersistence.setEnabled(pluginName, false);
    await this.pluginPersistence.logOperation(
      pluginName,
      'disable',
      'success',
      `Plugin ${pluginName} disabled`,
      userId,
    );
  }

  list(): InstalledPlugin[] {
    return Array.from(this.installedPlugins.values());
  }

  get(pluginName: string): InstalledPlugin | undefined {
    return this.installedPlugins.get(pluginName);
  }

  isInstalled(pluginName: string): boolean {
    return this.installedPlugins.has(pluginName);
  }

  checkCompatibility(manifest: PluginManifest): CompatibilityResult {
    if (!manifest.compatibility) {
      return { compatible: true };
    }

    if (!this.semverService.isCompatible(this.appVersion, manifest.compatibility)) {
      return {
        compatible: false,
        message: `Plugin requires version ${manifest.compatibility}, current is ${this.appVersion}`,
      };
    }

    return { compatible: true };
  }

  private validateManifest(manifest: PluginManifest): void {
    const required = ['name', 'version', 'author', 'entrypoint', 'dbPrefix'];

    for (const field of required) {
      if (!manifest[field as keyof PluginManifest]) {
        throw new Error(`Plugin manifest missing required field: ${field}`);
      }
    }

    // Validate dbPrefix format (should be alphanumeric + underscore)
    if (!/^[a-z0-9_]+$/.test(manifest.dbPrefix)) {
      throw new Error(
        `Invalid dbPrefix '${manifest.dbPrefix}': must be lowercase alphanumeric + underscore`,
      );
    }
  }

  private async resolveDependencies(manifest: PluginManifest): Promise<void> {
    if (!manifest.dependencies) {
      return;
    }

    for (const [depName, depVersion] of Object.entries(manifest.dependencies)) {
      const dep = this.installedPlugins.get(depName);
      if (!dep) {
        throw new Error(`Dependency not found: ${depName}@${depVersion}`);
      }

      if (!this.semverService.satisfies(dep.version, depVersion)) {
        throw new Error(
          `Plugin version mismatch: ${depName} requires ${depVersion}, installed is ${dep.version}`,
        );
      }
    }
  }

  private async runMigration(migrationPath: string, db: any): Promise<void> {
    try {
      const sql = await readFile(migrationPath, 'utf-8');
      if (db && db.getDrizzle) {
        const drizzle = db.getDrizzle();
        const statements = sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);
        for (const statement of statements) {
          await drizzle.run(statement);
        }
      }
      console.log(`Migration executed: ${migrationPath}`);
    } catch (error) {
      console.error(`Failed to run migration ${migrationPath}:`, error);
      throw error;
    }
  }
}
