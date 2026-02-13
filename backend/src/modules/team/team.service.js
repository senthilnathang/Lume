import { getDatabase } from '../../config.js';
import { Op } from 'sequelize';
import { responseUtil } from '../../shared/utils/index.js';
import { MESSAGES, PAGINATION } from '../../shared/constants/index.js';

export class TeamService {
  constructor() {
    this.db = getDatabase();
    this.TeamMember = this.db.models.TeamMember;
  }

  async create(memberData) {
    const member = await this.TeamMember.create(memberData);
    return responseUtil.success(member, MESSAGES.CREATED);
  }

  async findById(id) {
    const member = await this.TeamMember.findByPk(id);
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
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { position: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await this.TeamMember.findAndCountAll({
      where,
      limit,
      offset,
      order: [['order', 'ASC'], ['created_at', 'DESC']]
    });

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async getActive() {
    const members = await this.TeamMember.findAll({
      where: { is_active: true },
      order: [['order', 'ASC'], ['created_at', 'DESC']]
    });
    return responseUtil.success(members);
  }

  async getLeaders() {
    const members = await this.TeamMember.findAll({
      where: { is_active: true, is_leader: true },
      order: [['order', 'ASC']]
    });
    return responseUtil.success(members);
  }

  async getByDepartment(department) {
    const members = await this.TeamMember.findAll({
      where: { department, is_active: true },
      order: [['order', 'ASC']]
    });
    return responseUtil.success(members);
  }

  async update(id, memberData) {
    const member = await this.TeamMember.findByPk(id);

    if (!member) {
      return responseUtil.notFound('Team Member');
    }

    await member.update(memberData);
    return responseUtil.success(member, MESSAGES.UPDATED);
  }

  async delete(id) {
    const member = await this.TeamMember.findByPk(id);

    if (!member) {
      return responseUtil.notFound('Team Member');
    }

    await member.softDelete();
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async reorder(members) {
    for (const { id, order } of members) {
      await this.TeamMember.update({ order }, { where: { id } });
    }
    return responseUtil.success(null, MESSAGES.UPDATED);
  }

  async getDepartments() {
    const departments = await this.TeamMember.findAll({
      attributes: ['department'],
      where: { department: { [Op.ne]: null }, is_active: true },
      group: ['department']
    });
    return responseUtil.success(departments.map(d => d.department));
  }
}

export default TeamService;
