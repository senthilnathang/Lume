import { getDatabase } from '../../config.js';
import { Op } from 'sequelize';
import { jwtUtil, responseUtil } from '../../shared/utils/index.js';
import { MESSAGES } from '../../shared/constants/index.js';

export class AuthService {
  constructor() {
    this.db = getDatabase();
    this.Role = this.db.models.Role;
    this.Permission = this.db.models.Permission;
    this.RolePermission = this.db.models.RolePermission;
    this.User = this.db.models.User;
  }

  async seedRoles() {
    const roles = [
      { name: 'super_admin', display_name: 'Super Admin', description: 'Full system access', is_system: true },
      { name: 'admin', display_name: 'Administrator', description: 'Administrative access', is_system: true },
      { name: 'manager', display_name: 'Manager', description: 'Management access', is_system: true },
      { name: 'staff', display_name: 'Staff', description: 'Staff access', is_system: true },
      { name: 'user', display_name: 'User', description: 'Regular user', is_system: true },
      { name: 'guest', display_name: 'Guest', description: 'Guest access', is_system: true }
    ];

    for (const role of roles) {
      await this.Role.findOrCreate({
        where: { name: role.name },
        defaults: role
      });
    }
  }

  async seedPermissions() {
    const permissions = [
      { name: 'user_management.read', display_name: 'View Users', category: 'user_management' },
      { name: 'user_management.write', display_name: 'Manage Users', category: 'user_management' },
      { name: 'user_management.delete', display_name: 'Delete Users', category: 'user_management' },
      { name: 'role_management.read', display_name: 'View Roles', category: 'role_management' },
      { name: 'role_management.write', display_name: 'Manage Roles', category: 'role_management' },
      { name: 'role_management.delete', display_name: 'Delete Roles', category: 'role_management' },
      { name: 'activities.read', display_name: 'View Activities', category: 'activities' },
      { name: 'activities.write', display_name: 'Manage Activities', category: 'activities' },
      { name: 'activities.delete', display_name: 'Delete Activities', category: 'activities' },
      { name: 'donations.read', display_name: 'View Donations', category: 'donations' },
      { name: 'donations.write', display_name: 'Manage Donations', category: 'donations' },
      { name: 'donations.delete', display_name: 'Delete Donations', category: 'donations' },
      { name: 'documents.read', display_name: 'View Documents', category: 'documents' },
      { name: 'documents.write', display_name: 'Manage Documents', category: 'documents' },
      { name: 'documents.delete', display_name: 'Delete Documents', category: 'documents' },
      { name: 'team.read', display_name: 'View Team', category: 'team' },
      { name: 'team.write', display_name: 'Manage Team', category: 'team' },
      { name: 'team.delete', display_name: 'Delete Team Members', category: 'team' },
      { name: 'messages.read', display_name: 'View Messages', category: 'messages' },
      { name: 'messages.write', display_name: 'Manage Messages', category: 'messages' },
      { name: 'messages.delete', display_name: 'Delete Messages', category: 'messages' },
      { name: 'settings.read', display_name: 'View Settings', category: 'settings' },
      { name: 'settings.write', display_name: 'Manage Settings', category: 'settings' },
      { name: 'reports.read', display_name: 'View Reports', category: 'reports' },
      { name: 'audit.read', display_name: 'View Audit Logs', category: 'audit' }
    ];

    for (const perm of permissions) {
      await this.Permission.findOrCreate({
        where: { name: perm.name },
        defaults: perm
      });
    }
  }

  async assignPermissionsToRole(roleName, permissions) {
    const role = await this.Role.findOne({ where: { name: roleName } });
    if (!role) return null;

    for (const perm of permissions) {
      const permission = await this.Permission.findOne({ where: { name: perm.name } });
      if (permission) {
        await this.RolePermission.findOrCreate({
          where: { role_id: role.id, permission_id: permission.id },
          defaults: { action: perm.action || 'read' }
        });
      }
    }
    return role;
  }

  async getRolePermissions(roleId) {
    return this.RolePermission.findAll({
      where: { role_id: roleId },
      include: [{ model: this.Permission }]
    });
  }

  async hasPermission(userId, permission) {
    const user = await this.User.findByPk(userId, {
      include: [{
        model: this.Role,
        include: [{
          model: this.Permission,
          through: { attributes: ['action'] }
        }]
      }]
    });

    if (!user || !user.Role) return false;

    const hasAccess = user.Role.Permissions.some(p => p.name === permission);
    return { hasAccess, role: user.Role };
  }

  async createRole(roleData) {
    const role = await this.Role.create(roleData);
    return responseUtil.success(role, MESSAGES.CREATED);
  }

  async getAllRoles(options = {}) {
    const roles = await this.Role.findAll({
      where: { is_active: true },
      order: [['id', 'ASC']]
    });
    return responseUtil.success(roles);
  }

  async getRoleById(id) {
    const role = await this.Role.findByPk(id);
    if (!role) {
      return responseUtil.notFound('Role');
    }
    const permissions = await this.getRolePermissions(id);
    return responseUtil.success({ ...role.toJSON(), permissions });
  }

  async updateRole(id, roleData) {
    const role = await this.Role.findByPk(id);
    if (!role) {
      return responseUtil.notFound('Role');
    }
    await role.update(roleData);
    return responseUtil.success(role, MESSAGES.UPDATED);
  }

  async deleteRole(id) {
    const role = await this.Role.findByPk(id);
    if (!role) {
      return responseUtil.notFound('Role');
    }
    if (role.is_system) {
      return responseUtil.error('Cannot delete system role', null, 'FORBIDDEN');
    }
    await role.update({ is_active: false });
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwtUtil.verifyToken(refreshToken);
      if (!decoded || decoded.type !== 'refresh') {
        return responseUtil.error(MESSAGES.INVALID_TOKEN, null, 'UNAUTHORIZED');
      }

      const user = await this.User.findByPk(decoded.userId);
      if (!user || user.refresh_token !== refreshToken) {
        return responseUtil.error(MESSAGES.INVALID_TOKEN, null, 'UNAUTHORIZED');
      }

      const token = jwtUtil.generateToken({
        id: user.id,
        email: user.email,
        role: user.role_id
      });

      const newRefreshToken = jwtUtil.generateRefreshToken(user.id);
      user.refresh_token = newRefreshToken;
      await user.save();

      return responseUtil.success({ token, refreshToken: newRefreshToken });
    } catch (error) {
      return responseUtil.error(MESSAGES.INVALID_TOKEN, null, 'UNAUTHORIZED');
    }
  }
}

export default AuthService;
