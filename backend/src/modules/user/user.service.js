import prisma from '../../core/db/prisma.js';
import bcrypt from 'bcryptjs';
import { passwordUtil, jwtUtil, responseUtil } from '../../shared/utils/index.js';
import { MESSAGES, USER_ROLES, PAGINATION } from '../../shared/constants/index.js';

export class UserService {
  constructor() {}

  // Create a new user
  async create(userData) {
    try {
      // Map snake_case input to camelCase Prisma fields
      // Look up role_id from role name (or use provided role_id directly)
      let roleId = userData.role_id;
      if (!roleId && userData.role) {
        const roleRecord = await prisma.role.findFirst({ where: { name: userData.role } });
        roleId = roleRecord?.id;
      }
      if (!roleId) {
        // Default to 'viewer' role
        const defaultRole = await prisma.role.findFirst({ where: { name: 'user' } })
          || await prisma.role.findFirst({ where: { name: 'viewer' } });
        roleId = defaultRole?.id || 2;
      }
      const data = {
        email: userData.email,
        password: userData.password, // Prisma middleware handles hashing
        firstName: userData.first_name || userData.firstName,
        lastName: userData.last_name || userData.lastName,
        phone: userData.phone,
        avatar: userData.avatar,
        role_id: roleId,
        isActive: userData.is_active !== undefined ? userData.is_active : true,
      };
      const user = await prisma.user.create({ data });
      const createdRole = await prisma.role.findUnique({ where: { id: user.role_id } });
      return responseUtil.success(this._toSnakeCase(user, createdRole?.name), MESSAGES.CREATED);
    } catch (error) {
      if (error.code === 'P2002') {
        return responseUtil.error('Email already exists', null, 'CONFLICT');
      }
      throw error;
    }
  }

  // Find user by ID
  async findById(id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return responseUtil.notFound('User');
    }
    const role = await prisma.role.findUnique({ where: { id: user.role_id } });
    return responseUtil.success(this._toSnakeCase(user, role?.name));
  }

  // Find user by email
  async findByEmail(email) {
    return prisma.user.findFirst({ where: { email } });
  }

  // Get all users with pagination
  async findAll(options = {}) {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, search, role_id, is_active } = options;
    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (role_id) {
      where.role_id = parseInt(role_id, 10);
    }

    if (is_active !== undefined) {
      where.isActive = is_active === 'true' || is_active === true;
    }

    const [users, count] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    // Resolve role names for all users
    const roleIds = [...new Set(users.map(u => u.role_id).filter(Boolean))];
    const roles = roleIds.length > 0
      ? await prisma.role.findMany({ where: { id: { in: roleIds } } })
      : [];
    const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));

    return responseUtil.paginated(users.map(u => this._toSnakeCase(u, roleMap[u.role_id])), {
      page,
      limit,
      total: count
    });
  }

  // Update user
  async update(id, userData) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return responseUtil.notFound('User');
    }

    // Don't allow changing email
    delete userData.email;

    const data = {};
    if (userData.first_name !== undefined) data.firstName = userData.first_name;
    if (userData.firstName !== undefined) data.firstName = userData.firstName;
    if (userData.last_name !== undefined) data.lastName = userData.last_name;
    if (userData.lastName !== undefined) data.lastName = userData.lastName;
    if (userData.phone !== undefined) data.phone = userData.phone;
    if (userData.avatar !== undefined) data.avatar = userData.avatar;
    if (userData.role_id !== undefined) data.role_id = parseInt(userData.role_id, 10);
    if (userData.role !== undefined && !userData.role_id) {
      // Look up role_id from role name
      const roleRecord = await prisma.role.findFirst({ where: { name: userData.role } });
      if (roleRecord) data.role_id = roleRecord.id;
    }
    if (userData.is_active !== undefined) data.isActive = userData.is_active;
    if (userData.isActive !== undefined) data.isActive = userData.isActive;
    if (userData.password) data.password = userData.password; // Prisma middleware hashes

    const updated = await prisma.user.update({ where: { id }, data });
    const updatedRole = await prisma.role.findUnique({ where: { id: updated.role_id } });
    return responseUtil.success(this._toSnakeCase(updated, updatedRole?.name), MESSAGES.UPDATED);
  }

  // Delete user (deactivate)
  async delete(id, deletedBy) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return responseUtil.notFound('User');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return responseUtil.success(null, MESSAGES.DELETED);
  }

  // Login user
  async login(email, password) {
    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
      return responseUtil.error(MESSAGES.INVALID_CREDENTIALS, null, 'UNAUTHORIZED');
    }

    if (!user.isActive) {
      return responseUtil.error(MESSAGES.ACCOUNT_DEACTIVATED, null, 'FORBIDDEN');
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return responseUtil.error(MESSAGES.INVALID_CREDENTIALS, null, 'UNAUTHORIZED');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Look up role name for JWT
    const userRole = await prisma.role.findUnique({ where: { id: user.role_id } });
    const roleName = userRole?.name || 'viewer';

    // Generate tokens
    const token = jwtUtil.generateToken({
      id: user.id,
      email: user.email,
      role: roleName
    });

    const refreshToken = jwtUtil.generateRefreshToken(user.id);

    const safeUser = { ...this._toSnakeCase(user, roleName) };
    delete safeUser.password;

    return responseUtil.success({
      user: safeUser,
      token,
      refreshToken
    }, MESSAGES.LOGIN_SUCCESS);
  }

  // Logout user
  async logout(id) {
    return responseUtil.success(null, MESSAGES.LOGOUT_SUCCESS);
  }

  // Change password
  async changePassword(id, oldPassword, newPassword) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return responseUtil.notFound('User');
    }

    const isValid = await bcrypt.compare(oldPassword, user.password);

    if (!isValid) {
      return responseUtil.error('Current password is incorrect', null, 'BAD_REQUEST');
    }

    // Validate new password strength
    const { isValid: isStrong, errors } = passwordUtil.validatePassword(newPassword);

    if (!isStrong) {
      return responseUtil.error('Password does not meet requirements', errors, 'VALIDATION_ERROR');
    }

    // Prisma middleware will hash the password
    await prisma.user.update({
      where: { id },
      data: { password: newPassword },
    });

    return responseUtil.success(null, 'Password changed successfully');
  }

  // Get user statistics
  async getStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, newThisMonth] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    return responseUtil.success({
      total,
      active,
      inactive: total - active,
      newThisMonth
    });
  }

  /**
   * Convert Prisma camelCase user to snake_case for API backward compatibility
   */
  _toSnakeCase(user, roleName) {
    if (!user) return user;
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      role_id: user.role_id,
      role: roleName || null,
      is_active: user.isActive,
      last_login: user.lastLogin,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }
}

export default UserService;
