import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { eq } from 'drizzle-orm';

@Injectable()
export class SubmissionService {
  private marketplaceSubmissions: any;
  private marketplacePlugins: any;

  constructor(private drizzle: DrizzleService) {
    this.initializeSchema();
  }

  private async initializeSchema() {
    try {
      const schema = await import('../models/schema');
      this.marketplaceSubmissions = schema.marketplaceSubmissions;
      this.marketplacePlugins = schema.marketplacePlugins;
    } catch (error) {
      console.error('Failed to load schema:', error);
    }
  }

  async submit(userId: number, pluginName: string, manifestUrl: string, displayName: string) {
    try {
      const db = this.drizzle.getDrizzle();

      // Check if submission already exists
      const existing = await db
        .select()
        .from(this.marketplaceSubmissions)
        .where(eq(this.marketplaceSubmissions.name, pluginName))
        .limit(1);

      if (existing && existing.length > 0) {
        return {
          success: false,
          error: `Plugin ${pluginName} already submitted`,
        };
      }

      // Create submission
      await db.insert(this.marketplaceSubmissions).values({
        name: pluginName,
        displayName,
        manifestUrl,
        status: 'pending',
        submittedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: `Plugin submission ${pluginName} created, pending review`,
      };
    } catch (error) {
      console.error('Submit plugin error:', error);
      return { success: false, error: error.message };
    }
  }

  async approve(pluginName: string, adminId: number) {
    try {
      const db = this.drizzle.getDrizzle();

      // Get submission
      const submission = await db
        .select()
        .from(this.marketplaceSubmissions)
        .where(eq(this.marketplaceSubmissions.name, pluginName))
        .limit(1);

      if (!submission || submission.length === 0) {
        return { success: false, error: 'Submission not found' };
      }

      // Move to marketplace plugins
      await db.insert(this.marketplacePlugins).values({
        name: submission[0].name,
        displayName: submission[0].displayName,
        version: '1.0.0',
        author: 'Developer', // Could pull from manifest
        category: 'Developer Submission',
        pricing: 'free',
        downloadCount: 0,
        rating: '0.00',
        reviewCount: 0,
        status: 'active',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update submission status
      await db
        .update(this.marketplaceSubmissions)
        .set({
          status: 'active',
          approvedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(this.marketplaceSubmissions.name, pluginName));

      return { success: true, message: `Plugin ${pluginName} approved` };
    } catch (error) {
      console.error('Approve plugin error:', error);
      return { success: false, error: error.message };
    }
  }

  async reject(pluginName: string, adminId: number, reason: string) {
    try {
      const db = this.drizzle.getDrizzle();

      await db
        .update(this.marketplaceSubmissions)
        .set({
          status: 'rejected',
          approvedBy: adminId,
          rejectionReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(this.marketplaceSubmissions.name, pluginName));

      return { success: true, message: `Plugin ${pluginName} rejected` };
    } catch (error) {
      console.error('Reject plugin error:', error);
      return { success: false, error: error.message };
    }
  }

  async getSubmissionsByStatus(status: string) {
    try {
      const db = this.drizzle.getDrizzle();

      const results = await db
        .select()
        .from(this.marketplaceSubmissions)
        .where(eq(this.marketplaceSubmissions.status, status));

      return { success: true, data: results };
    } catch (error) {
      console.error('Get submissions by status error:', error);
      return { success: false, error: error.message };
    }
  }

  async getSubmissionsByUser(userId: number) {
    try {
      const db = this.drizzle.getDrizzle();

      const results = await db
        .select()
        .from(this.marketplaceSubmissions)
        .where(eq(this.marketplaceSubmissions.submittedBy, userId));

      return { success: true, data: results };
    } catch (error) {
      console.error('Get submissions by user error:', error);
      return { success: false, error: error.message };
    }
  }

  async getSubmissionByName(pluginName: string) {
    try {
      const db = this.drizzle.getDrizzle();

      const result = await db
        .select()
        .from(this.marketplaceSubmissions)
        .where(eq(this.marketplaceSubmissions.name, pluginName))
        .limit(1);

      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Get submission by name error:', error);
      return null;
    }
  }
}
