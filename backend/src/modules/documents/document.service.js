import prisma from '../../core/db/prisma.js';
import { responseUtil, fileUtil } from '../../shared/utils/index.js';
import { MESSAGES, DOCUMENT_TYPES, PAGINATION } from '../../shared/constants/index.js';

export class DocumentService {
  constructor() {}

  async create(documentData) {
    const document = await prisma.documents.create({ data: documentData });
    return responseUtil.success(document, MESSAGES.CREATED);
  }

  async findById(id) {
    const document = await prisma.documents.findUnique({ where: { id: Number(id) } });
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
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const [rows, count] = await Promise.all([
      prisma.documents.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.documents.count({ where })
    ]);

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async update(id, documentData) {
    const document = await prisma.documents.findUnique({ where: { id: Number(id) } });

    if (!document) {
      return responseUtil.notFound('Document');
    }

    const updated = await prisma.documents.update({ where: { id: Number(id) }, data: documentData });
    return responseUtil.success(updated, MESSAGES.UPDATED);
  }

  async delete(id) {
    const document = await prisma.documents.findUnique({ where: { id: Number(id) } });

    if (!document) {
      return responseUtil.notFound('Document');
    }

    await prisma.documents.delete({ where: { id: Number(id) } });
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async incrementDownloads(id) {
    const document = await prisma.documents.findUnique({ where: { id: Number(id) } });

    if (!document) {
      return responseUtil.notFound('Document');
    }

    const updated = await prisma.documents.update({
      where: { id: Number(id) },
      data: { downloads: { increment: 1 } }
    });
    return responseUtil.success(updated);
  }

  async getStats() {
    const [total, images, documents, videos] = await Promise.all([
      prisma.documents.count(),
      prisma.documents.count({ where: { type: 'image' } }),
      prisma.documents.count({ where: { type: 'document' } }),
      prisma.documents.count({ where: { type: 'video' } })
    ]);

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
