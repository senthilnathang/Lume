import { getDatabase } from '../../config.js';
import { Op } from 'sequelize';
import { responseUtil } from '../../shared/utils/index.js';
import { MESSAGES, MESSAGE_STATUS, PAGINATION } from '../../shared/constants/index.js';

export class MessageService {
  constructor() {
    this.db = getDatabase();
    this.Message = this.db.models.Message;
  }

  async create(messageData) {
    const message = await this.Message.create(messageData);
    return responseUtil.success(message, MESSAGES.CREATED);
  }

  async findById(id) {
    const message = await this.Message.findByPk(id);
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
      where[Op.or] = [
        { subject: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
        { sender_email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await this.Message.findAndCountAll({
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

  async update(id, messageData) {
    const message = await this.Message.findByPk(id);

    if (!message) {
      return responseUtil.notFound('Message');
    }

    await message.update(messageData);
    return responseUtil.success(message, MESSAGES.UPDATED);
  }

  async markAsRead(id) {
    const message = await this.Message.findByPk(id);

    if (!message) {
      return responseUtil.notFound('Message');
    }

    await message.update({
      status: 'read',
      read_at: new Date()
    });
    return responseUtil.success(message);
  }

  async reply(id, replyData) {
    const message = await this.Message.findByPk(id);

    if (!message) {
      return responseUtil.notFound('Message');
    }

    await message.update({
      status: 'replied',
      replied_at: new Date()
    });
    return responseUtil.success(message, MESSAGES.UPDATED);
  }

  async delete(id) {
    const message = await this.Message.findByPk(id);

    if (!message) {
      return responseUtil.notFound('Message');
    }

    await message.softDelete();
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async getStats() {
    const total = await this.Message.count();
    const unread = await this.Message.count({ where: { status: 'new' } });
    const replied = await this.Message.count({ where: { status: 'replied' } });
    const archived = await this.Message.count({ where: { status: 'archived' } });

    return responseUtil.success({
      total,
      unread,
      read: total - unread,
      replied,
      archived
    });
  }

  async getByEmail(email) {
    const messages = await this.Message.findAll({
      where: { sender_email: email },
      order: [['created_at', 'DESC']]
    });
    return responseUtil.success(messages);
  }
}

export default MessageService;
