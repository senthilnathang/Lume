import prisma from '../../core/db/prisma.js';
import { stringUtil, responseUtil } from '../../shared/utils/index.js';
import { MESSAGES, ACTIVITY_STATUS, PAGINATION } from '../../shared/constants/index.js';

export class ActivityService {
  constructor() {}

  _normalizeDates(data) {
    for (const field of ['start_date', 'end_date', 'published_at']) {
      if (data[field] && typeof data[field] === 'string' && !data[field].includes('T')) {
        data[field] = new Date(data[field]).toISOString();
      }
    }
    return data;
  }

  async create(activityData) {
    if (activityData.title) {
      activityData.slug = stringUtil.slugify(activityData.title) + '-' + stringUtil.randomString(6);
    }
    this._normalizeDates(activityData);

    const activity = await prisma.activities.create({ data: activityData });
    return responseUtil.success(activity, MESSAGES.CREATED);
  }

  async findById(id) {
    const activity = await prisma.activities.findUnique({ where: { id: Number(id) } });
    if (!activity) {
      return responseUtil.notFound('Activity');
    }
    return responseUtil.success(activity);
  }

  async findBySlug(slug) {
    const activity = await prisma.activities.findFirst({ where: { slug } });
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
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const [rows, count] = await Promise.all([
      prisma.activities.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.activities.count({ where })
    ]);

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async update(id, activityData) {
    const activity = await prisma.activities.findUnique({ where: { id: Number(id) } });

    if (!activity) {
      return responseUtil.notFound('Activity');
    }

    if (activityData.title && !activityData.slug) {
      activityData.slug = stringUtil.slugify(activityData.title) + '-' + stringUtil.randomString(6);
    }
    this._normalizeDates(activityData);

    const updated = await prisma.activities.update({ where: { id: Number(id) }, data: activityData });
    return responseUtil.success(updated, MESSAGES.UPDATED);
  }

  async delete(id) {
    const activity = await prisma.activities.findUnique({ where: { id: Number(id) } });

    if (!activity) {
      return responseUtil.notFound('Activity');
    }

    await prisma.activities.delete({ where: { id: Number(id) } });
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async publish(id) {
    const activity = await prisma.activities.findUnique({ where: { id: Number(id) } });

    if (!activity) {
      return responseUtil.notFound('Activity');
    }

    const updated = await prisma.activities.update({
      where: { id: Number(id) },
      data: {
        status: 'published',
        published_at: new Date()
      }
    });
    return responseUtil.success(updated, MESSAGES.UPDATED);
  }

  async cancel(id) {
    const activity = await prisma.activities.findUnique({ where: { id: Number(id) } });

    if (!activity) {
      return responseUtil.notFound('Activity');
    }

    const updated = await prisma.activities.update({
      where: { id: Number(id) },
      data: { status: 'cancelled' }
    });
    return responseUtil.success(updated, MESSAGES.UPDATED);
  }

  async getUpcoming(options = {}) {
    const { limit = PAGINATION.DEFAULT_LIMIT } = options;

    const activities = await prisma.activities.findMany({
      where: {
        status: 'published',
        start_date: { gte: new Date() }
      },
      take: limit,
      orderBy: { start_date: 'asc' }
    });

    return responseUtil.success(activities);
  }

  async getStats() {
    const [total, published, completed, upcoming] = await Promise.all([
      prisma.activities.count(),
      prisma.activities.count({ where: { status: 'published' } }),
      prisma.activities.count({ where: { status: 'completed' } }),
      prisma.activities.count({
        where: {
          status: 'published',
          start_date: { gte: new Date() }
        }
      })
    ]);

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
