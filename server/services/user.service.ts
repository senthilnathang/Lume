import { Op } from 'sequelize';
import {
  User,
  UserCompanyRole,
  UserGroup,
  Role,
  Group,
  Company,
} from '../models/index';
import { createCrudService } from './crud.mixin';
import { hashPassword } from '../utils/password';

const baseCrud = createCrudService(User, {
  searchFields: ['email', 'username', 'full_name'],
  defaultSort: 'created_at',
  defaultOrder: 'DESC',
});

export const userService = {
  ...baseCrud,

  /**
   * Create a user with a hashed password.
   */
  async createUser(data: {
    email: string;
    username: string;
    password: string;
    full_name?: string;
    is_superuser?: boolean;
    company_id?: number;
    role_id?: number;
  }) {
    const hashedPassword = await hashPassword(data.password);

    const user = await User.create({
      email: data.email,
      username: data.username,
      hashed_password: hashedPassword,
      full_name: data.full_name,
      is_superuser: data.is_superuser,
      current_company_id: data.company_id,
    });

    // Assign role to company if both provided
    if (data.company_id && data.role_id) {
      await UserCompanyRole.create({
        user_id: user.id,
        company_id: data.company_id,
        role_id: data.role_id,
        is_default: true,
        assigned_at: new Date(),
      } as any);
    }

    return user;
  },

  /**
   * Assign a role to a user in a company.
   */
  async assignRole(userId: number, companyId: number, roleId: number, assignedBy?: number) {
    const existing = await UserCompanyRole.findOne({
      where: { user_id: userId, company_id: companyId, role_id: roleId },
    });

    if (existing) {
      if (!existing.is_active) {
        await existing.update({ is_active: true });
      }
      return existing;
    }

    return UserCompanyRole.create({
      user_id: userId,
      company_id: companyId,
      role_id: roleId,
      is_default: false,
      assigned_at: new Date(),
      assigned_by: assignedBy,
    } as any);
  },

  /**
   * Remove a role from a user in a company.
   */
  async removeRole(userId: number, companyId: number, roleId: number) {
    const record = await UserCompanyRole.findOne({
      where: { user_id: userId, company_id: companyId, role_id: roleId },
    });

    if (!record) return false;
    await record.update({ is_active: false });
    return true;
  },

  /**
   * Add a user to a group.
   */
  async addToGroup(userId: number, groupId: number, addedBy?: number) {
    const existing = await UserGroup.findOne({
      where: { user_id: userId, group_id: groupId },
    });

    if (existing) return existing;

    return UserGroup.create({
      user_id: userId,
      group_id: groupId,
      added_by: addedBy,
      added_at: new Date(),
    } as any);
  },

  /**
   * Remove a user from a group.
   */
  async removeFromGroup(userId: number, groupId: number) {
    const deleted = await UserGroup.destroy({
      where: { user_id: userId, group_id: groupId },
    });
    return deleted > 0;
  },

  /**
   * Get all roles for a user across companies.
   */
  async getUserRoles(userId: number) {
    return UserCompanyRole.findAll({
      where: { user_id: userId, is_active: true },
      include: [
        { model: Company, as: 'company' },
        { model: Role, as: 'role' },
      ],
    });
  },

  /**
   * Get all groups for a user.
   */
  async getUserGroups(userId: number) {
    return UserGroup.findAll({
      where: { user_id: userId },
      include: [{ model: Group, as: 'group' }],
    });
  },

  /**
   * Get user companies.
   */
  async getUserCompanies(userId: number) {
    const roles = await UserCompanyRole.findAll({
      where: { user_id: userId, is_active: true },
      include: [{ model: Company, as: 'company' }],
      attributes: ['company_id', 'is_default'],
      group: ['company_id'],
    });

    return roles.map((r: any) => ({
      company: r.company,
      is_default: r.is_default,
    }));
  },

  /**
   * Deactivate a user account.
   */
  async deactivate(userId: number, reason?: string) {
    const user = await User.findByPk(userId);
    if (!user) return null;

    await user.update({
      is_active: false,
    });

    return user;
  },

  /**
   * Reactivate a user account.
   */
  async reactivate(userId: number) {
    const user = await User.findByPk(userId);
    if (!user) return null;

    await user.update({ is_active: true });
    return user;
  },
};
