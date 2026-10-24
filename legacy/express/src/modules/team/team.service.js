import prisma from '../../core/db/prisma.js';
import { responseUtil } from '../../shared/utils/index.js';
import { MESSAGES, PAGINATION } from '../../shared/constants/index.js';

export class TeamService {
  constructor() {}

  async create(memberData) {
    const member = await prisma.team_members.create({ data: memberData });
    return responseUtil.success(member, MESSAGES.CREATED);
  }

  async findById(id) {
    const member = await prisma.team_members.findUnique({ where: { id: Number(id) } });
    if (!member) {
      return responseUtil.notFound('Team Member');
    }
    return responseUtil.success(member);
  }

  async findAll(options = {}) {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, department, search, is_active, is_leader } = options;
    const offset = (page - 1) * limit;

    const where = {};

    if (department) {
      where.department = department;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (is_leader !== undefined) {
      where.is_leader = is_leader;
    }

    if (search) {
      where.OR = [
        { first_name: { contains: search } },
        { last_name: { contains: search } },
        { position: { contains: search } }
      ];
    }

    const [rows, count] = await Promise.all([
      prisma.team_members.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ order: 'asc' }, { created_at: 'desc' }]
      }),
      prisma.team_members.count({ where })
    ]);

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async getActive() {
    const members = await prisma.team_members.findMany({
      where: { is_active: true },
      orderBy: [{ order: 'asc' }, { created_at: 'desc' }]
    });
    return responseUtil.success(members);
  }

  async getLeaders() {
    const members = await prisma.team_members.findMany({
      where: { is_active: true, is_leader: true },
      orderBy: { order: 'asc' }
    });
    return responseUtil.success(members);
  }

  async getByDepartment(department) {
    const members = await prisma.team_members.findMany({
      where: { department, is_active: true },
      orderBy: { order: 'asc' }
    });
    return responseUtil.success(members);
  }

  async update(id, memberData) {
    const member = await prisma.team_members.findUnique({ where: { id: Number(id) } });

    if (!member) {
      return responseUtil.notFound('Team Member');
    }

    const updated = await prisma.team_members.update({ where: { id: Number(id) }, data: memberData });
    return responseUtil.success(updated, MESSAGES.UPDATED);
  }

  async delete(id) {
    const member = await prisma.team_members.findUnique({ where: { id: Number(id) } });

    if (!member) {
      return responseUtil.notFound('Team Member');
    }

    await prisma.team_members.delete({ where: { id: Number(id) } });
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async reorder(members) {
    for (const { id, order } of members) {
      await prisma.team_members.update({ where: { id: Number(id) }, data: { order } });
    }
    return responseUtil.success(null, MESSAGES.UPDATED);
  }

  async getDepartments() {
    const results = await prisma.team_members.findMany({
      where: { department: { not: null }, is_active: true },
      select: { department: true },
      distinct: ['department']
    });
    return responseUtil.success(results.map(d => d.department));
  }
}

export default TeamService;
