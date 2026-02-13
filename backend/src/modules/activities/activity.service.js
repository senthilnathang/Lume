import { getDatabase } from '../../config.js';
import { Op } from 'sequelize';
import { stringUtil, responseUtil } from '../../shared/utils/index.js';
import { MESSAGES, ACTIVITY_STATUS, PAGINATION } from '../../shared/constants/index.js';

export class ActivityService {
  constructor() {
    this.db = getDatabase();
    this.Activity = this.db.models.Activity;
  }

  async create(activityData) {
    if (activityData.title) {
      activityData.slug = stringUtil.slugify(activityData.title) + '-' + stringUtil.randomString(6);
    }

    const activity = await this.Activity.create(activityData);
    return responseUtil.success(activity, MESSAGES.CREATED);
  }

  async findById(id) {
    const activity = await this.Activity.findByPk(id);
    if (!activity) {
      return responseUtil.notFound('Activity');
    }
    return responseUtil.success(activity);
  }

  async findBySlug(slug) {
    const activity = await this.Activity.findOne({ where: { slug } });
    if (!activity) {
      return responseUtil.notFound('Activity');
    }
    return responseUtil.success(activity);
  }

  async findAll(options = {}) {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, status, category, search, is_featured } = options;
    const offset = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
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

    const { count, rows } = await this.Activity.findAndCountAll({
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

  async update(id, activityData) {
    const activity = await this.Activity.findByPk(id);

    if (!activity) {
      return responseUtil.notFound('Activity');
    }

    if (activityData.title && !activityData.slug) {
      activityData.slug = stringUtil.slugify(activityData.title) + '-' + stringUtil.randomString(6);
    }

    await activity.update(activityData);
    return responseUtil.success(activity, MESSAGES.UPDATED);
  }

  async delete(id) {
    const activity = await this.Activity.findByPk(id);

    if (!activity) {
      return responseUtil.notFound('Activity');
    }

    await activity.softDelete();
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async publish(id) {
    const activity = await this.Activity.findByPk(id);

    if (!activity) {
      return responseUtil.notFound('Activity');
    }

    await activity.update({
      status: 'published',
      published_at: new Date()
    });
    return responseUtil.success(activity, MESSAGES.UPDATED);
  }

  async cancel(id) {
    const activity = await this.Activity.findByPk(id);

    if (!activity) {
      return responseUtil.notFound('Activity');
    }

    await activity.update({ status: 'cancelled' });
    return responseUtil.success(activity, MESSAGES.UPDATED);
  }

  async getUpcoming(options = {}) {
    const { limit = PAGINATION.DEFAULT_LIMIT } = options;

    const activities = await this.Activity.findAll({
      where: {
        status: 'published',
        start_date: { [Op.gte]: new Date() }
      },
      limit,
      order: [['start_date', 'ASC']]
    });

    return responseUtil.success(activities);
  }

  async getStats() {
    const total = await this.Activity.count();
    const published = await this.Activity.count({ where: { status: 'published' } });
    const completed = await this.Activity.count({ where: { status: 'completed' } });
    const upcoming = await this.Activity.count({
      where: {
        status: 'published',
        start_date: { [Op.gte]: new Date() }
      }
    });

    return responseUtil.success({
      total,
      published,
      completed,
      upcoming,
      draft: total - published - completed
    });
  }
}

export default ActivityService;
