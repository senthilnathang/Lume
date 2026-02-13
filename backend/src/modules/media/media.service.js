import { getDatabase } from '../../config.js';
import { Op } from 'sequelize';
import { responseUtil, fileUtil } from '../../shared/utils/index.js';
import { MESSAGES, PAGINATION } from '../../shared/constants/index.js';
import { mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

export class MediaService {
  constructor() {
    this.db = getDatabase();
    this.MediaLibrary = this.db.models.MediaLibrary;
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    // Ensure upload directory exists
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async create(mediaData) {
    const media = await this.MediaLibrary.create(mediaData);
    return responseUtil.success(media, MESSAGES.CREATED);
  }

  async findById(id) {
    const media = await this.MediaLibrary.findByPk(id);
    if (!media) {
      return responseUtil.notFound('Media');
    }
    
    // Increment views
    await media.increment('views');
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
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await this.MediaLibrary.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async update(id, mediaData) {
    const media = await this.MediaLibrary.findByPk(id);

    if (!media) {
      return responseUtil.notFound('Media');
    }

    await media.update(mediaData);
    return responseUtil.success(media, MESSAGES.UPDATED);
  }

  async delete(id) {
    const media = await this.MediaLibrary.findByPk(id);

    if (!media) {
      return responseUtil.notFound('Media');
    }

    await media.softDelete();
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async incrementDownloads(id) {
    const media = await this.MediaLibrary.findByPk(id);

    if (!media) {
      return responseUtil.notFound('Media');
    }

    await media.increment('downloads');
    return responseUtil.success(media);
  }

  async getStats() {
    const total = await this.MediaLibrary.count();
    const images = await this.MediaLibrary.count({ where: { type: 'image' } });
    const documents = await this.MediaLibrary.count({ where: { type: 'document' } });
    const videos = await this.MediaLibrary.count({ where: { type: 'video' } });
    const audio = await this.MediaLibrary.count({ where: { type: 'audio' } });
    const totalSize = await this.MediaLibrary.sum('size') || 0;

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
    const media = await this.MediaLibrary.findAll({
      where: { is_featured: true, is_public: true },
      order: [['created_at', 'DESC']],
      limit: 10
    });
    return responseUtil.success(media);
  }

  async getByCategory(category) {
    const media = await this.MediaLibrary.findAll({
      where: { category, is_public: true },
      order: [['created_at', 'DESC']]
    });
    return responseUtil.success(media);
  }
}

export default MediaService;
