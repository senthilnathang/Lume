import prisma from '../../core/db/prisma.js';
import { responseUtil } from '../../shared/utils/index.js';
import { MESSAGES, MESSAGE_STATUS, PAGINATION } from '../../shared/constants/index.js';

export class MessageService {
  constructor() {}

  async create(messageData) {
    const message = await prisma.messages.create({ data: messageData });
    return responseUtil.success(message, MESSAGES.CREATED);
  }

  async findById(id) {
    const message = await prisma.messages.findUnique({ where: { id: Number(id) } });
    if (!message) {
      return responseUtil.notFound('Message');
    }
    return responseUtil.success(message);
  }

  async findAll(options = {}) {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status, type, priority, search, assigned_to } = options;
    const offset = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assigned_to !== undefined) {
      where.assigned_to = assigned_to;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { content: { contains: search } },
        { sender_email: { contains: search } }
      ];
    }

    const [rows, count] = await Promise.all([
      prisma.messages.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.messages.count({ where })
    ]);

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async update(id, messageData) {
    const message = await prisma.messages.findUnique({ where: { id: Number(id) } });

    if (!message) {
      return responseUtil.notFound('Message');
    }

    const updated = await prisma.messages.update({ where: { id: Number(id) }, data: messageData });
    return responseUtil.success(updated, MESSAGES.UPDATED);
  }

  async markAsRead(id) {
    const message = await prisma.messages.findUnique({ where: { id: Number(id) } });

    if (!message) {
      return responseUtil.notFound('Message');
    }

    const updated = await prisma.messages.update({
      where: { id: Number(id) },
      data: {
        status: 'read',
        read_at: new Date()
      }
    });
    return responseUtil.success(updated);
  }

  async reply(id, replyData) {
    const message = await prisma.messages.findUnique({ where: { id: Number(id) } });

    if (!message) {
      return responseUtil.notFound('Message');
    }

    const updated = await prisma.messages.update({
      where: { id: Number(id) },
      data: {
        status: 'replied',
        replied_at: new Date()
      }
    });
    return responseUtil.success(updated, MESSAGES.UPDATED);
  }

  async delete(id) {
    const message = await prisma.messages.findUnique({ where: { id: Number(id) } });

    if (!message) {
      return responseUtil.notFound('Message');
    }

    await prisma.messages.delete({ where: { id: Number(id) } });
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async getStats() {
    const [total, unread, replied, archived] = await Promise.all([
      prisma.messages.count(),
      prisma.messages.count({ where: { status: 'new' } }),
      prisma.messages.count({ where: { status: 'replied' } }),
      prisma.messages.count({ where: { status: 'archived' } })
    ]);

    return responseUtil.success({
      total,
      unread,
      read: total - unread,
      replied,
      archived
    });
  }

  async getByEmail(email) {
    const messages = await prisma.messages.findMany({
      where: { sender_email: email },
      orderBy: { created_at: 'desc' }
    });
    return responseUtil.success(messages);
  }
}

export default MessageService;
