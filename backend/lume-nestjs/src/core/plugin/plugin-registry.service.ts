import { Injectable } from '@nestjs/common';
import { ModuleDefinition } from '@core/runtime/metadata-registry.service';
import { ModuleLoaderService } from '@core/module/module-loader.service';

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
export class PluginRegistryService {
  private installedPlugins = new Map<string, InstalledPlugin>();

  constructor(private moduleLoader: ModuleLoaderService) {}

  async install(
    manifest: PluginManifest,
    moduleDefinition: ModuleDefinition,
    db?: any,
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
    this.installedPlugins.set(manifest.name, {
      name: manifest.name,
      version: manifest.version,
      manifest,
      installedAt: new Date(),
      enabled: true,
    });

    console.log(`Plugin '${manifest.name}' installed successfully`);
  }

  async uninstall(pluginName: string, db?: any): Promise<void> {
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

    console.log(`Plugin '${pluginName}' uninstalled successfully`);
  }

  async enable(pluginName: string): Promise<void> {
    const plugin = this.installedPlugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not installed`);
    }

    plugin.enabled = true;
  }

  async disable(pluginName: string): Promise<void> {
    const plugin = this.installedPlugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not installed`);
    }

    plugin.enabled = false;
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
    // Parse version compatibility string (e.g., ">=2.0.0")
    const currentVersion = '2.0.0'; // Get from app config in production

    // Simple version check (in production, use semver library)
    if (
      manifest.compatibility &&
      manifest.compatibility.includes('>=') &&
      currentVersion.localeCompare(manifest.compatibility.replace('>=', '')) < 0
    ) {
      return {
        compatible: false,
        message: `Plugin requires version ${manifest.compatibility}, current is ${currentVersion}`,
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

      // Simple version check (in production, use semver library)
      if (dep.version !== depVersion && !depVersion.includes('*')) {
        console.warn(
          `Plugin version mismatch: ${depName} requires ${depVersion}, installed is ${dep.version}`,
        );
      }
    }
  }

  private async runMigration(migrationPath: string, db: any): Promise<void> {
    // Stub: In production, read and execute SQL file
    console.log(`Running migration: ${migrationPath}`);
    // Example: const sql = await fs.readFile(migrationPath, 'utf-8');
    // await db.query(sql);
  }
}
