import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { CreateMediaDto, UpdateMediaDto, QueryMediaDto } from '../dtos';
import { eq, like, and, ilike } from 'drizzle-orm';

@Injectable()
export class MediaService {
  private mediaLibrary: any;

  constructor(private drizzle: DrizzleService) {
    // Import schema dynamically to avoid circular dependencies
    this.initializeSchema();
  }

  private async initializeSchema() {
    try {
      const schema = await import('./models/schema');
      this.mediaLibrary = schema.mediaLibrary;
    } catch (error) {
      console.error('Failed to load media schema:', error);
    }
  }

  async create(data: CreateMediaDto & { uploadedBy: number }) {
    try {
      const db = this.drizzle.getDrizzle();
      const result = await db.insert(this.mediaLibrary).values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        data: { id: result[0].insertId, ...data },
        message: 'Media created successfully',
      };
    } catch (error) {
      console.error('Create media error:', error);
      return {
        success: false,
        error: 'Failed to create media',
      };
    }
  }

  async findById(id: number) {
    try {
      const db = this.drizzle.getDrizzle();
      const result = await db
        .select()
        .from(this.mediaLibrary)
        .where(eq(this.mediaLibrary.id, id))
        .limit(1);

      if (!result || result.length === 0) {
        return {
          success: false,
          error: 'Media not found',
        };
      }

      // Increment views
      await db
        .update(this.mediaLibrary)
        .set({ views: result[0].views + 1 })
        .where(eq(this.mediaLibrary.id, id));

      return {
        success: true,
        data: result[0],
      };
    } catch (error) {
      console.error('Find media error:', error);
      return {
        success: false,
        error: 'Failed to fetch media',
      };
    }
  }

  async findAll(options: QueryMediaDto) {
    try {
      const db = this.drizzle.getDrizzle();
      const {
        page = 1,
        limit = 20,
        type,
        category,
        search,
        isPublic,
        isFeatured,
      } = options;
      const offset = (page - 1) * limit;

      const conditions: any[] = [];

      if (type) {
        conditions.push(eq(this.mediaLibrary.type, type));
      }
      if (category) {
        conditions.push(eq(this.mediaLibrary.category, category));
      }
      if (isPublic !== undefined) {
        conditions.push(eq(this.mediaLibrary.isPublic, isPublic));
      }
      if (isFeatured !== undefined) {
        conditions.push(eq(this.mediaLibrary.isFeatured, isFeatured));
      }
      if (search) {
        conditions.push(
          ilike(this.mediaLibrary.title, `%${search}%`)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(this.mediaLibrary)
          .where(whereClause)
          .orderBy(this.mediaLibrary.createdAt)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: this.mediaLibrary.id })
          .from(this.mediaLibrary)
          .where(whereClause),
      ]);

      const total = countResult[0]?.count || 0;

      return {
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Find all media error:', error);
      return {
        success: false,
        error: 'Failed to fetch media',
      };
    }
  }

  async update(id: number, data: UpdateMediaDto) {
    try {
      const db = this.drizzle.getDrizzle();
      const existing = await db
        .select()
        .from(this.mediaLibrary)
        .where(eq(this.mediaLibrary.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return {
          success: false,
          error: 'Media not found',
        };
      }

      await db
        .update(this.mediaLibrary)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(this.mediaLibrary.id, id));

      return {
        success: true,
        data: { id, ...data },
        message: 'Media updated successfully',
      };
    } catch (error) {
      console.error('Update media error:', error);
      return {
        success: false,
        error: 'Failed to update media',
      };
    }
  }

  async delete(id: number) {
    try {
      const db = this.drizzle.getDrizzle();
      const existing = await db
        .select()
        .from(this.mediaLibrary)
        .where(eq(this.mediaLibrary.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return {
          success: false,
          error: 'Media not found',
        };
      }

      await db
        .delete(this.mediaLibrary)
        .where(eq(this.mediaLibrary.id, id));

      return {
        success: true,
        message: 'Media deleted successfully',
      };
    } catch (error) {
      console.error('Delete media error:', error);
      return {
        success: false,
        error: 'Failed to delete media',
      };
    }
  }

  async incrementDownloads(id: number) {
    try {
      const db = this.drizzle.getDrizzle();
      const existing = await db
        .select()
        .from(this.mediaLibrary)
        .where(eq(this.mediaLibrary.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return {
          success: false,
          error: 'Media not found',
        };
      }

      await db
        .update(this.mediaLibrary)
        .set({ downloads: existing[0].downloads + 1 })
        .where(eq(this.mediaLibrary.id, id));

      return {
        success: true,
        data: { id, downloads: existing[0].downloads + 1 },
      };
    } catch (error) {
      console.error('Increment downloads error:', error);
      return {
        success: false,
        error: 'Failed to update downloads',
      };
    }
  }

  async getStats() {
    try {
      const db = this.drizzle.getDrizzle();

      const counts = await Promise.all([
        db
          .select({ count: this.mediaLibrary.id })
          .from(this.mediaLibrary),
        db
          .select({ count: this.mediaLibrary.id })
          .from(this.mediaLibrary)
          .where(eq(this.mediaLibrary.type, 'image')),
        db
          .select({ count: this.mediaLibrary.id })
          .from(this.mediaLibrary)
          .where(eq(this.mediaLibrary.type, 'document')),
        db
          .select({ count: this.mediaLibrary.id })
          .from(this.mediaLibrary)
          .where(eq(this.mediaLibrary.type, 'video')),
        db
          .select({ count: this.mediaLibrary.id })
          .from(this.mediaLibrary)
          .where(eq(this.mediaLibrary.type, 'audio')),
      ]);

      const total = counts[0][0]?.count || 0;
      const images = counts[1][0]?.count || 0;
      const documents = counts[2][0]?.count || 0;
      const videos = counts[3][0]?.count || 0;
      const audio = counts[4][0]?.count || 0;

      return {
        success: true,
        data: {
          total,
          images,
          documents,
          videos,
          audio,
          other: total - images - documents - videos - audio,
        },
      };
    } catch (error) {
      console.error('Get media stats error:', error);
      return {
        success: false,
        error: 'Failed to fetch statistics',
      };
    }
  }

  async getFeatured() {
    try {
      const db = this.drizzle.getDrizzle();
      const result = await db
        .select()
        .from(this.mediaLibrary)
        .where(
          and(
            eq(this.mediaLibrary.isFeatured, true),
            eq(this.mediaLibrary.isPublic, true)
          )
        )
        .orderBy(this.mediaLibrary.createdAt)
        .limit(10);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Get featured media error:', error);
      return {
        success: false,
        error: 'Failed to fetch featured media',
      };
    }
  }

  async getByCategory(category: string) {
    try {
      const db = this.drizzle.getDrizzle();
      const result = await db
        .select()
        .from(this.mediaLibrary)
        .where(
          and(
            eq(this.mediaLibrary.category, category),
            eq(this.mediaLibrary.isPublic, true)
          )
        )
        .orderBy(this.mediaLibrary.createdAt);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Get media by category error:', error);
      return {
        success: false,
        error: 'Failed to fetch media',
      };
    }
  }
}
