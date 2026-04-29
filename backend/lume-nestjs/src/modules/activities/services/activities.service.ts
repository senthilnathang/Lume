import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { CreateActivityDto, UpdateActivityDto, QueryActivitiesDto } from '../dtos';
import { stringUtil } from '@core/utils/string.util';
import { and, eq, like, or, gte, desc, sql } from 'drizzle-orm';

@Injectable()
export class ActivitiesService {
  constructor(private drizzleService: DrizzleService) {}

  private getDb() {
    return this.drizzleService.getDrizzle();
  }

  private normalizeActivityData(data: any) {
    const normalized: any = { ...data };

    // Handle field mapping from DTO to database
    if (data.startDate) normalized.startDate = new Date(data.startDate);
    if (data.endDate) normalized.endDate = new Date(data.endDate);
    if (data.shortDescription !== undefined) normalized.shortDescription = data.shortDescription;
    if (data.coverImage !== undefined) normalized.coverImage = data.coverImage;
    if (data.isFeatured !== undefined) normalized.isFeatured = data.isFeatured;

    return normalized;
  }

  private generateSlug(title: string): string {
    return stringUtil.slugify(title) + '-' + stringUtil.randomString(6);
  }

  async create(createDto: CreateActivityDto, userId: number) {
    const slug = this.generateSlug(createDto.title);
    const normalized = this.normalizeActivityData(createDto);

    const db = this.getDrizzle();
    const { activities } = db;

    const result = await db.insert(activities).values({
      ...normalized,
      slug,
      status: 'draft',
      createdBy: userId,
    });

    const newActivity = await db.select().from(activities).where(eq(activities.id, result.insertId)).limit(1);

    return {
      success: true,
      data: newActivity[0],
      message: 'Activity created successfully',
    };
  }

  async findById(id: number) {
    const db = this.getDrizzle();
    const { activities } = db;

    const activity = await db.select().from(activities).where(eq(activities.id, id)).limit(1);

    if (!activity.length) {
      throw new NotFoundException('Activity not found');
    }

    return {
      success: true,
      data: activity[0],
    };
  }

  async findBySlug(slug: string) {
    const db = this.getDrizzle();
    const { activities } = db;

    const activity = await db.select().from(activities).where(eq(activities.slug, slug)).limit(1);

    if (!activity.length) {
      throw new NotFoundException('Activity not found');
    }

    return {
      success: true,
      data: activity[0],
    };
  }

  async findAll(query: QueryActivitiesDto) {
    const { page = 1, limit = 20, status, category, search, isFeatured } = query;
    const offset = (page - 1) * limit;

    const db = this.getDrizzle();
    const { activities } = db;

    // Build where clause
    const whereConditions: any[] = [];

    if (status) {
      whereConditions.push(eq(activities.status, status));
    }

    if (category) {
      whereConditions.push(eq(activities.category, category));
    }

    if (isFeatured !== undefined) {
      whereConditions.push(eq(activities.isFeatured, isFeatured));
    }

    if (search) {
      whereConditions.push(
        or(
          like(activities.title, `%${search}%`),
          like(activities.description, `%${search}%`)
        )
      );
    }

    const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(activities)
        .where(where)
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(where),
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
  }

  async update(id: number, updateDto: UpdateActivityDto) {
    const db = this.getDrizzle();
    const { activities } = db;

    // Check if activity exists
    const activity = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
    if (!activity.length) {
      throw new NotFoundException('Activity not found');
    }

    const normalized = this.normalizeActivityData(updateDto);

    // Generate new slug if title is being updated
    if (updateDto.title && !updateDto.slug) {
      normalized.slug = this.generateSlug(updateDto.title);
    }

    await db.update(activities).set(normalized).where(eq(activities.id, id));

    const updated = await db.select().from(activities).where(eq(activities.id, id)).limit(1);

    return {
      success: true,
      data: updated[0],
      message: 'Activity updated successfully',
    };
  }

  async delete(id: number) {
    const db = this.getDrizzle();
    const { activities } = db;

    // Check if activity exists
    const activity = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
    if (!activity.length) {
      throw new NotFoundException('Activity not found');
    }

    await db.delete(activities).where(eq(activities.id, id));

    return {
      success: true,
      message: 'Activity deleted successfully',
    };
  }

  async publish(id: number) {
    const db = this.getDrizzle();
    const { activities } = db;

    // Check if activity exists
    const activity = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
    if (!activity.length) {
      throw new NotFoundException('Activity not found');
    }

    const publishedAt = new Date();
    await db
      .update(activities)
      .set({ status: 'published', publishedAt })
      .where(eq(activities.id, id));

    const updated = await db.select().from(activities).where(eq(activities.id, id)).limit(1);

    return {
      success: true,
      data: updated[0],
      message: 'Activity published successfully',
    };
  }

  async cancel(id: number) {
    const db = this.getDrizzle();
    const { activities } = db;

    // Check if activity exists
    const activity = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
    if (!activity.length) {
      throw new NotFoundException('Activity not found');
    }

    await db.update(activities).set({ status: 'cancelled' }).where(eq(activities.id, id));

    const updated = await db.select().from(activities).where(eq(activities.id, id)).limit(1);

    return {
      success: true,
      data: updated[0],
      message: 'Activity cancelled successfully',
    };
  }

  async getUpcoming(limit: number = 10) {
    const db = this.getDrizzle();
    const { activities } = db;

    const now = new Date();
    const upcoming = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.status, 'published'),
          gte(activities.startDate, now)
        )
      )
      .orderBy(activities.startDate)
      .limit(limit);

    return {
      success: true,
      data: upcoming,
    };
  }

  async getStats() {
    const db = this.getDrizzle();
    const { activities } = db;

    const [
      totalResult,
      publishedResult,
      completedResult,
      upcomingResult,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(activities),
      db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(eq(activities.status, 'published')),
      db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(eq(activities.status, 'completed')),
      db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(
          and(
            eq(activities.status, 'published'),
            gte(activities.startDate, new Date())
          )
        ),
    ]);

    const total = totalResult[0]?.count || 0;
    const published = publishedResult[0]?.count || 0;
    const completed = completedResult[0]?.count || 0;
    const upcoming = upcomingResult[0]?.count || 0;

    return {
      success: true,
      data: {
        total,
        published,
        completed,
        upcoming,
        draft: total - published - completed,
      },
    };
  }
}
