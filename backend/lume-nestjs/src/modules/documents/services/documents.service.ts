import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { CreateDocumentDto, UpdateDocumentDto, QueryDocumentsDto } from '../dtos';
import { and, eq, like, or, desc, sql } from 'drizzle-orm';

@Injectable()
export class DocumentsService {
  constructor(private drizzleService: DrizzleService) {}

  private getDb() {
    return this.drizzleService.getDrizzle();
  }

  private normalizeDocumentData(data: any) {
    const normalized: any = { ...data };

    // Handle field mapping from DTO to database
    if (data.originalName !== undefined) normalized.originalName = data.originalName;
    if (data.mimeType !== undefined) normalized.mimeType = data.mimeType;
    if (data.size !== undefined) normalized.size = data.size;
    if (data.url !== undefined) normalized.url = data.url;
    if (data.isPublic !== undefined) normalized.isPublic = data.isPublic;

    return normalized;
  }

  async create(createDto: CreateDocumentDto, userId: number) {
    const db = this.getDrizzle();
    const { documents } = db;

    const normalized = this.normalizeDocumentData(createDto);

    const result = await db.insert(documents).values({
      ...normalized,
      type: createDto.type || 'document',
      isPublic: createDto.isPublic || false,
      downloads: 0,
      uploadedBy: userId,
    });

    const newDocument = await db
      .select()
      .from(documents)
      .where(eq(documents.id, result.insertId))
      .limit(1);

    return {
      success: true,
      data: newDocument[0],
      message: 'Document created successfully',
    };
  }

  async findById(id: number) {
    const db = this.getDrizzle();
    const { documents } = db;

    const document = await db.select().from(documents).where(eq(documents.id, id)).limit(1);

    if (!document.length) {
      throw new NotFoundException('Document not found');
    }

    return {
      success: true,
      data: document[0],
    };
  }

  async findAll(query: QueryDocumentsDto) {
    const { page = 1, limit = 20, type, category, search, isPublic } = query;
    const offset = (page - 1) * limit;

    const db = this.getDrizzle();
    const { documents } = db;

    // Build where clause
    const whereConditions: any[] = [];

    if (type) {
      whereConditions.push(eq(documents.type, type));
    }

    if (category) {
      whereConditions.push(eq(documents.category, category));
    }

    if (isPublic !== undefined) {
      whereConditions.push(eq(documents.isPublic, isPublic));
    }

    if (search) {
      whereConditions.push(
        or(
          like(documents.title, `%${search}%`),
          like(documents.description, `%${search}%`)
        )
      );
    }

    const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(documents)
        .where(where)
        .orderBy(desc(documents.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
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

  async update(id: number, updateDto: UpdateDocumentDto) {
    const db = this.getDrizzle();
    const { documents } = db;

    // Check if document exists
    const document = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!document.length) {
      throw new NotFoundException('Document not found');
    }

    const normalized = this.normalizeDocumentData(updateDto);

    await db.update(documents).set(normalized).where(eq(documents.id, id));

    const updated = await db.select().from(documents).where(eq(documents.id, id)).limit(1);

    return {
      success: true,
      data: updated[0],
      message: 'Document updated successfully',
    };
  }

  async delete(id: number) {
    const db = this.getDrizzle();
    const { documents } = db;

    // Check if document exists
    const document = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!document.length) {
      throw new NotFoundException('Document not found');
    }

    await db.delete(documents).where(eq(documents.id, id));

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  async incrementDownloads(id: number) {
    const db = this.getDrizzle();
    const { documents } = db;

    // Check if document exists
    const document = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!document.length) {
      throw new NotFoundException('Document not found');
    }

    const currentDownloads = document[0].downloads || 0;

    await db
      .update(documents)
      .set({ downloads: currentDownloads + 1 })
      .where(eq(documents.id, id));

    const updated = await db.select().from(documents).where(eq(documents.id, id)).limit(1);

    return {
      success: true,
      data: updated[0],
    };
  }

  async getStats() {
    const db = this.getDrizzle();
    const { documents } = db;

    const [totalResult, imagesResult, docsResult, videosResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(documents),
      db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(eq(documents.type, 'image')),
      db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(eq(documents.type, 'document')),
      db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(eq(documents.type, 'video')),
    ]);

    const total = totalResult[0]?.count || 0;
    const images = imagesResult[0]?.count || 0;
    const docsCount = docsResult[0]?.count || 0;
    const videos = videosResult[0]?.count || 0;

    return {
      success: true,
      data: {
        total,
        images,
        documents: docsCount,
        videos,
        other: total - images - docsCount - videos,
      },
    };
  }
}
