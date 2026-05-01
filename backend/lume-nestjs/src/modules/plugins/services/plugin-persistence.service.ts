import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { eq } from 'drizzle-orm';

@Injectable()
export class PluginPersistenceService {
  private plugins: any;
  private pluginLogs: any;

  constructor(private drizzle: DrizzleService) {
    this.initializeSchema();
  }

  private async initializeSchema() {
    try {
      const schema = await import('../models/schema');
      this.plugins = schema.plugins;
      this.pluginLogs = schema.pluginLogs;
    } catch (error) {
      console.error('Failed to load plugin schema:', error);
    }
  }

  async savePlugin(manifest: any, installedBy?: number) {
    try {
      const db = this.drizzle.getDrizzle();

      const existing = await db
        .select()
        .from(this.plugins)
        .where(eq(this.plugins.name, manifest.name))
        .limit(1);

      if (existing && existing.length > 0) {
        await db
          .update(this.plugins)
          .set({
            displayName: manifest.displayName,
            version: manifest.version,
            author: manifest.author,
            description: manifest.description,
            compatibility: manifest.compatibility,
            manifestJson: manifest,
            entrypoint: manifest.entrypoint,
            dbPrefix: manifest.dbPrefix,
            dependencies: manifest.dependencies,
            permissions: manifest.permissions,
            updatedAt: new Date(),
          })
          .where(eq(this.plugins.name, manifest.name));
      } else {
        await db.insert(this.plugins).values({
          name: manifest.name,
          displayName: manifest.displayName,
          version: manifest.version,
          author: manifest.author,
          description: manifest.description,
          compatibility: manifest.compatibility,
          manifestJson: manifest,
          entrypoint: manifest.entrypoint,
          dbPrefix: manifest.dbPrefix,
          isEnabled: true,
          isInstalled: true,
          dependencies: manifest.dependencies,
          permissions: manifest.permissions,
          installedBy,
          installedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return { success: true, message: `Plugin ${manifest.name} saved` };
    } catch (error) {
      console.error('Save plugin error:', error);
      return { success: false, error: error.message };
    }
  }

  async removePlugin(name: string) {
    try {
      const db = this.drizzle.getDrizzle();

      await db
        .update(this.plugins)
        .set({ isInstalled: false, updatedAt: new Date() })
        .where(eq(this.plugins.name, name));

      return { success: true, message: `Plugin ${name} removed` };
    } catch (error) {
      console.error('Remove plugin error:', error);
      return { success: false, error: error.message };
    }
  }

  async setEnabled(name: string, enabled: boolean) {
    try {
      const db = this.drizzle.getDrizzle();

      await db
        .update(this.plugins)
        .set({ isEnabled: enabled, updatedAt: new Date() })
        .where(eq(this.plugins.name, name));

      return { success: true, message: `Plugin ${name} ${enabled ? 'enabled' : 'disabled'}` };
    } catch (error) {
      console.error('Set enabled error:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllInstalled() {
    try {
      const db = this.drizzle.getDrizzle();

      const results = await db
        .select()
        .from(this.plugins)
        .where(eq(this.plugins.isInstalled, true));

      return results || [];
    } catch (error) {
      console.error('Get installed plugins error:', error);
      return [];
    }
  }

  async logOperation(
    pluginName: string,
    operation: string,
    status: 'success' | 'failed' | 'warning',
    message: string,
    executedBy?: number,
    durationMs?: number,
  ) {
    try {
      const db = this.drizzle.getDrizzle();

      await db.insert(this.pluginLogs).values({
        pluginName,
        operation,
        status,
        message,
        executedBy,
        durationMs,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error('Log operation error:', error);
      return { success: false, error: error.message };
    }
  }

  async getPluginByName(name: string) {
    try {
      const db = this.drizzle.getDrizzle();

      const result = await db
        .select()
        .from(this.plugins)
        .where(eq(this.plugins.name, name))
        .limit(1);

      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Get plugin by name error:', error);
      return null;
    }
  }
}
