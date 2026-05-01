import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { PluginRegistryService } from '@core/plugin/plugin-registry.service';
import { eq, like, ilike, and, desc, asc, sql } from 'drizzle-orm';

@Injectable()
export class MarketplaceService {
  private marketplacePlugins: any;
  private marketplaceCategories: any;
  private marketplaceReviews: any;
  private marketplaceDownloads: any;

  constructor(
    private drizzle: DrizzleService,
    private pluginRegistry: PluginRegistryService,
  ) {
    this.initializeSchema();
  }

  private async initializeSchema() {
    try {
      const schema = await import('../models/schema');
      this.marketplacePlugins = schema.marketplacePlugins;
      this.marketplaceCategories = schema.marketplaceCategories;
      this.marketplaceReviews = schema.marketplaceReviews;
      this.marketplaceDownloads = schema.marketplaceDownloads;
    } catch (error) {
      console.error('Failed to load marketplace schema:', error);
    }
  }

  async listAvailable(options: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sortBy?: 'downloads' | 'rating' | 'newest';
    pricing?: string;
  }) {
    try {
      const db = this.drizzle.getDrizzle();
      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 100);
      const offset = (page - 1) * limit;

      const conditions: any[] = [eq(this.marketplacePlugins.status, 'active')];

      if (options.category) {
        conditions.push(eq(this.marketplacePlugins.category, options.category));
      }

      if (options.search) {
        conditions.push(
          ilike(this.marketplacePlugins.name, `%${options.search}%`),
        );
      }

      if (options.pricing) {
        conditions.push(eq(this.marketplacePlugins.pricing, options.pricing));
      }

      let query = db
        .select()
        .from(this.marketplacePlugins)
        .where(and(...conditions));

      // Apply sorting
      if (options.sortBy === 'downloads') {
        query = query.orderBy(
          desc(this.marketplacePlugins.downloadCount),
        );
      } else if (options.sortBy === 'rating') {
        query = query.orderBy(desc(this.marketplacePlugins.rating));
      } else {
        query = query.orderBy(
          desc(this.marketplacePlugins.publishedAt),
        );
      }

      query = query.limit(limit).offset(offset);

      const results = await query;
      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(this.marketplacePlugins)
        .where(and(...conditions));

      return {
        success: true,
        data: results,
        pagination: {
          page,
          limit,
          total: total[0]?.count || 0,
          pages: Math.ceil((total[0]?.count || 0) / limit),
        },
      };
    } catch (error) {
      console.error('List available plugins error:', error);
      return { success: false, error: error.message };
    }
  }

  async getPlugin(name: string) {
    try {
      const db = this.drizzle.getDrizzle();

      const plugin = await db
        .select()
        .from(this.marketplacePlugins)
        .where(eq(this.marketplacePlugins.name, name))
        .limit(1);

      if (!plugin || plugin.length === 0) {
        return { success: false, error: 'Plugin not found' };
      }

      const reviews = await db
        .select()
        .from(this.marketplaceReviews)
        .where(eq(this.marketplaceReviews.pluginName, name));

      return {
        success: true,
        data: {
          ...plugin[0],
          reviews,
        },
      };
    } catch (error) {
      console.error('Get plugin error:', error);
      return { success: false, error: error.message };
    }
  }

  async installFromMarketplace(
    name: string,
    version?: string,
    userId?: number,
  ) {
    try {
      const db = this.drizzle.getDrizzle();

      const plugin = await db
        .select()
        .from(this.marketplacePlugins)
        .where(eq(this.marketplacePlugins.name, name))
        .limit(1);

      if (!plugin || plugin.length === 0) {
        return { success: false, error: 'Plugin not found in marketplace' };
      }

      const pluginData = plugin[0];
      // In production, download manifest from URL or construct from metadata
      const manifest = {
        name: pluginData.name,
        displayName: pluginData.displayName,
        version: version || pluginData.version,
        author: pluginData.author,
        description: pluginData.description,
        compatibility: '>=2.0.0',
        entrypoint: 'dist/index.js',
        dbPrefix: name.toLowerCase().replace(/-/g, '_') + '_',
      };

      // Track download
      await db.insert(this.marketplaceDownloads).values({
        pluginName: name,
        userId,
        installedVersion: manifest.version,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Increment download count
      const currentPlugin = await db
        .select()
        .from(this.marketplacePlugins)
        .where(eq(this.marketplacePlugins.name, name))
        .limit(1);

      if (currentPlugin && currentPlugin.length > 0) {
        const currentCount = parseInt(currentPlugin[0].downloadCount || '0', 10);
        await db
          .update(this.marketplacePlugins)
          .set({
            downloadCount: currentCount + 1,
            updatedAt: new Date(),
          })
          .where(eq(this.marketplacePlugins.name, name));
      }

      return {
        success: true,
        message: `Plugin ${name} installed from marketplace`,
        data: { manifest },
      };
    } catch (error) {
      console.error('Install from marketplace error:', error);
      return { success: false, error: error.message };
    }
  }

  async searchPlugins(query: string, filters?: any) {
    try {
      const db = this.drizzle.getDrizzle();

      const conditions: any[] = [eq(this.marketplacePlugins.status, 'active')];

      const searchConditions = [
        ilike(this.marketplacePlugins.name, `%${query}%`),
        ilike(this.marketplacePlugins.description, `%${query}%`),
      ];

      conditions.push(sql`(${searchConditions.join(' OR ')})`);

      if (filters?.category) {
        conditions.push(eq(this.marketplacePlugins.category, filters.category));
      }

      const results = await db
        .select()
        .from(this.marketplacePlugins)
        .where(and(...conditions))
        .limit(50);

      return { success: true, data: results };
    } catch (error) {
      console.error('Search plugins error:', error);
      return { success: false, error: error.message };
    }
  }

  async submitReview(
    pluginName: string,
    userId: number,
    rating: number,
    title?: string,
    body?: string,
  ) {
    try {
      const db = this.drizzle.getDrizzle();

      const existing = await db
        .select()
        .from(this.marketplaceReviews)
        .where(
          and(
            eq(this.marketplaceReviews.pluginName, pluginName),
            eq(this.marketplaceReviews.userId, userId),
          ),
        )
        .limit(1);

      if (existing && existing.length > 0) {
        await db
          .update(this.marketplaceReviews)
          .set({
            rating,
            title,
            body,
            updatedAt: new Date(),
          })
          .where(eq(this.marketplaceReviews.id, existing[0].id));
      } else {
        await db.insert(this.marketplaceReviews).values({
          pluginName,
          userId,
          rating,
          title,
          body,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Recalculate average rating
      const reviews = await db
        .select()
        .from(this.marketplaceReviews)
        .where(eq(this.marketplaceReviews.pluginName, pluginName));

      const avgRating =
        reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;

      await db
        .update(this.marketplacePlugins)
        .set({
          rating: avgRating.toFixed(2),
          reviewCount: reviews.length,
          updatedAt: new Date(),
        })
        .where(eq(this.marketplacePlugins.name, pluginName));

      return { success: true, message: 'Review submitted' };
    } catch (error) {
      console.error('Submit review error:', error);
      return { success: false, error: error.message };
    }
  }

  async trackDownload(pluginName: string, userId: number, version: string) {
    try {
      const db = this.drizzle.getDrizzle();

      await db.insert(this.marketplaceDownloads).values({
        pluginName,
        userId,
        installedVersion: version,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error('Track download error:', error);
      return { success: false, error: error.message };
    }
  }

  async getFeaturedPlugins(limit: number = 10) {
    try {
      const db = this.drizzle.getDrizzle();

      const results = await db
        .select()
        .from(this.marketplacePlugins)
        .where(eq(this.marketplacePlugins.status, 'active'))
        .orderBy(desc(this.marketplacePlugins.rating))
        .limit(Math.min(limit, 100));

      return { success: true, data: results };
    } catch (error) {
      console.error('Get featured plugins error:', error);
      return { success: false, error: error.message };
    }
  }

  async getTrendingPlugins(limit: number = 10) {
    try {
      const db = this.drizzle.getDrizzle();

      const results = await db
        .select()
        .from(this.marketplacePlugins)
        .where(eq(this.marketplacePlugins.status, 'active'))
        .orderBy(desc(this.marketplacePlugins.downloadCount))
        .limit(Math.min(limit, 100));

      return { success: true, data: results };
    } catch (error) {
      console.error('Get trending plugins error:', error);
      return { success: false, error: error.message };
    }
  }
}
