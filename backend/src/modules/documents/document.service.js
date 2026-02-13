import { getDatabase } from '../../config.js';
import { Op } from 'sequelize';
import { responseUtil, fileUtil } from '../../shared/utils/index.js';
import { MESSAGES, DOCUMENT_TYPES, PAGINATION } from '../../shared/constants/index.js';

export class DocumentService {
  constructor() {
    this.db = getDatabase();
    this.Document = this.db.models.Document;
  }

  async create(documentData) {
    const document = await this.Document.create(documentData);
    return responseUtil.success(document, MESSAGES.CREATED);
  }

  async findById(id) {
    const document = await this.Document.findByPk(id);
    if (!document) {
      return responseUtil.notFound('Document');
    }
    return responseUtil.success(document);
  }

  async findAll(options = {}) {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, type, category, search, is_public } = options;
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

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await this.Document.findAndCountAll({
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

  async update(id, documentData) {
    const document = await this.Document.findByPk(id);

    if (!document) {
      return responseUtil.notFound('Document');
    }

    await document.update(documentData);
    return responseUtil.success(document, MESSAGES.UPDATED);
  }

  async delete(id) {
    const document = await this.Document.findByPk(id);

    if (!document) {
      return responseUtil.notFound('Document');
    }

    await document.softDelete();
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async incrementDownloads(id) {
    const document = await this.Document.findByPk(id);

    if (!document) {
      return responseUtil.notFound('Document');
    }

    await document.increment('downloads');
    return responseUtil.success(document);
  }

  async getStats() {
    const total = await this.Document.count();
    const images = await this.Document.count({ where: { type: 'image' } });
    const documents = await this.Document.count({ where: { type: 'document' } });
    const videos = await this.Document.count({ where: { type: 'video' } });

    return responseUtil.success({
      total,
      images,
      documents,
      videos,
      other: total - images - documents - videos
    });
  }
}

export default DocumentService;
