import prisma from '../../core/db/prisma.js';
import { jwtUtil, responseUtil } from '../../shared/utils/index.js';
import { MESSAGES } from '../../shared/constants/index.js';

export class AuthService {
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
      await prisma.role.upsert({
        where: { name: role.name },
        create: role,
        update: {}
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
      await prisma.permission.upsert({
        where: { name: perm.name },
        create: perm,
        update: {}
      });
    }
  }

  async assignPermissionsToRole(roleName, permissions) {
    const role = await prisma.role.findFirst({ where: { name: roleName } });
    if (!role) return null;

    for (const perm of permissions) {
      const permission = await prisma.permission.findFirst({ where: { name: perm.name } });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: role.id, permissionId: permission.id }
          },
          create: { roleId: role.id, permissionId: permission.id, action: perm.action || 'read' },
          update: {}
        });
      }
    }
    return role;
  }

  async getRolePermissions(roleId) {
    return prisma.rolePermission.findMany({
      where: { roleId },
      include: { permissions: true }
    });
  }

  async hasPermission(userId, permission) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            rolePermissions: {
              include: { permissions: true }
            }
          }
        }
      }
    });

    if (!user || !user.roles) return false;

    const hasAccess = user.roles.rolePermissions?.some(rp => rp.permissions?.name === permission) || false;
    return { hasAccess, role: user.roles };
  }

  async createRole(roleData) {
    const role = await prisma.role.create({ data: roleData });
    return responseUtil.success(role, MESSAGES.CREATED);
  }

  async getAllRoles(options = {}) {
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' }
    });
    return responseUtil.success(roles);
  }

  async getRoleById(id) {
    const role = await prisma.role.findUnique({ where: { id: Number(id) } });
    if (!role) {
      return responseUtil.notFound('Role');
    }
    const permissions = await this.getRolePermissions(id);
    return responseUtil.success({ ...role, permissions });
  }

  async updateRole(id, roleData) {
    const role = await prisma.role.findUnique({ where: { id: Number(id) } });
    if (!role) {
      return responseUtil.notFound('Role');
    }
    const updated = await prisma.role.update({
      where: { id: Number(id) },
      data: roleData
    });
    return responseUtil.success(updated, MESSAGES.UPDATED);
  }

  async deleteRole(id) {
    const role = await prisma.role.findUnique({ where: { id: Number(id) } });
    if (!role) {
      return responseUtil.notFound('Role');
    }
    if (role.is_system) {
      return responseUtil.error('Cannot delete system role', null, 'FORBIDDEN');
    }
    await prisma.role.update({
      where: { id: Number(id) },
      data: { isActive: false }
    });
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwtUtil.verifyToken(refreshToken);
      if (!decoded || decoded.type !== 'refresh') {
        return responseUtil.error(MESSAGES.INVALID_TOKEN, null, 'UNAUTHORIZED');
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || user.refresh_token !== refreshToken) {
        return responseUtil.error(MESSAGES.INVALID_TOKEN, null, 'UNAUTHORIZED');
      }

      const token = jwtUtil.generateToken({
        id: user.id,
        email: user.email,
        role: user.role_id
      });

      const newRefreshToken = jwtUtil.generateRefreshToken(user.id);
      await prisma.user.update({
        where: { id: user.id },
        data: { refresh_token: newRefreshToken }
      });

      return responseUtil.success({ token, refreshToken: newRefreshToken });
    } catch (error) {
      return responseUtil.error(MESSAGES.INVALID_TOKEN, null, 'UNAUTHORIZED');
    }
  }
}

export default AuthService;
