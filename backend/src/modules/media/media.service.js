import prisma from '../../core/db/prisma.js';
import { responseUtil, fileUtil } from '../../shared/utils/index.js';
import { MESSAGES, PAGINATION } from '../../shared/constants/index.js';
import { mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

export class MediaService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';

    // Ensure upload directory exists
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async create(mediaData) {
    const media = await prisma.media_library.create({ data: mediaData });
    return responseUtil.success(media, MESSAGES.CREATED);
  }

  async findById(id) {
    const media = await prisma.media_library.findUnique({ where: { id: Number(id) } });
    if (!media) {
      return responseUtil.notFound('Media');
    }

    // Increment views
    await prisma.media_library.update({
      where: { id: Number(id) },
      data: { views: { increment: 1 } }
    });
    return responseUtil.success(media);
  }

  async findAll(options = {}) {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, type, category, search, is_public, is_featured } = options;
    const offset = (page - 1) * limit;

    const where = {};

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (is_public !== undefined) {
      where.is_public = is_public;
    }

    if (is_featured !== undefined) {
      where.is_featured = is_featured;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const [rows, count] = await Promise.all([
      prisma.media_library.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.media_library.count({ where })
    ]);

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async update(id, mediaData) {
    const media = await prisma.media_library.findUnique({ where: { id: Number(id) } });

    if (!media) {
      return responseUtil.notFound('Media');
    }

    const updated = await prisma.media_library.update({ where: { id: Number(id) }, data: mediaData });
    return responseUtil.success(updated, MESSAGES.UPDATED);
  }

  async delete(id) {
    const media = await prisma.media_library.findUnique({ where: { id: Number(id) } });

    if (!media) {
      return responseUtil.notFound('Media');
    }

    await prisma.media_library.delete({ where: { id: Number(id) } });
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async incrementDownloads(id) {
    const media = await prisma.media_library.findUnique({ where: { id: Number(id) } });

    if (!media) {
      return responseUtil.notFound('Media');
    }

    const updated = await prisma.media_library.update({
      where: { id: Number(id) },
      data: { downloads: { increment: 1 } }
    });
    return responseUtil.success(updated);
  }

  async getStats() {
    const [total, images, documents, videos, audio, sizeResult] = await Promise.all([
      prisma.media_library.count(),
      prisma.media_library.count({ where: { type: 'image' } }),
      prisma.media_library.count({ where: { type: 'document' } }),
      prisma.media_library.count({ where: { type: 'video' } }),
      prisma.media_library.count({ where: { type: 'audio' } }),
      prisma.media_library.aggregate({ _sum: { size: true } })
    ]);

    const totalSize = sizeResult._sum.size || 0;

    return responseUtil.success({
      total,
      images,
      documents,
      videos,
      audio,
      other: total - images - documents - videos - audio,
      totalSize,
      totalSizeFormatted: fileUtil.formatSize(totalSize)
    });
  }

  async getFeatured() {
    const media = await prisma.media_library.findMany({
      where: { is_featured: true, is_public: true },
      orderBy: { created_at: 'desc' },
      take: 10
    });
    return responseUtil.success(media);
  }

  async getByCategory(category) {
    const media = await prisma.media_library.findMany({
      where: { category, is_public: true },
      orderBy: { created_at: 'desc' }
    });
    return responseUtil.success(media);
  }
}

export default MediaService;
