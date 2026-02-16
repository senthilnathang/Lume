import prisma from '../../core/db/prisma.js';
import bcrypt from 'bcryptjs';
import { passwordUtil, jwtUtil, responseUtil } from '../../shared/utils/index.js';
import { MESSAGES, USER_ROLES, PAGINATION } from '../../shared/constants/index.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { sessions, twoFactor } from '../base_security/models/schema.js';

// Lazy-init adapters (created once)
let sessionAdapter = null;
let twoFactorAdapter = null;

function getSessionAdapter() {
  if (!sessionAdapter) sessionAdapter = new DrizzleAdapter(sessions);
  return sessionAdapter;
}

function getTwoFactorAdapter() {
  if (!twoFactorAdapter) twoFactorAdapter = new DrizzleAdapter(twoFactor);
  return twoFactorAdapter;
}

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
  async login(email, password, options = {}) {
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

    // Check if 2FA is enabled for this user
    const tfAdapter = getTwoFactorAdapter();
    const tfRecord = await tfAdapter.findOne([['userId', '=', user.id]]);

    if (tfRecord && tfRecord.enabled) {
      // If no 2FA token provided, return partial response requiring 2FA
      if (!options.twoFactorToken) {
        return responseUtil.success({
          requires2FA: true,
          tempToken: jwtUtil.generateToken({ id: user.id, pending2FA: true }, '5m'),
        }, 'Two-factor authentication required');
      }

      // Verify 2FA token (TOTP or backup code)
      const { TotpService } = await import('../../core/services/totp.service.js');
      const totpService = new TotpService();
      let tfValid = totpService.verifyToken(tfRecord.secret, options.twoFactorToken);

      if (!tfValid) {
        // Try backup code
        const storedCodes = typeof tfRecord.backupCodes === 'string'
          ? JSON.parse(tfRecord.backupCodes)
          : (tfRecord.backupCodes || []);
        const backupResult = totpService.verifyBackupCode(storedCodes, options.twoFactorToken);
        if (backupResult.valid) {
          tfValid = true;
          await tfAdapter.update(tfRecord.id, {
            backupCodes: JSON.stringify(backupResult.remainingCodes),
          });
        }
      }

      if (!tfValid) {
        return responseUtil.error('Invalid two-factor authentication code', null, 'UNAUTHORIZED');
      }
    }

    // Check password expiry
    let passwordExpired = false;
    try {
      const policy = await this._getPasswordPolicy();
      const expiryDays = policy.password_expiry_days || 0;
      if (expiryDays > 0 && user.updatedAt) {
        const daysSinceChange = (Date.now() - new Date(user.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceChange > expiryDays) {
          passwordExpired = true;
        }
      }
    } catch { /* ignore */ }

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

    // Create session record
    try {
      const sessAdapter = getSessionAdapter();
      await sessAdapter.create({
        userId: user.id,
        token,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastActivityAt: new Date(),
        status: 'active',
      });
    } catch (err) {
      console.warn('[Session] Failed to create session record:', err.message);
    }

    const safeUser = { ...this._toSnakeCase(user, roleName) };
    delete safeUser.password;

    return responseUtil.success({
      user: safeUser,
      token,
      refreshToken,
      passwordExpired,
    }, MESSAGES.LOGIN_SUCCESS);
  }

  // Logout user — terminate session
  async logout(id, token) {
    try {
      const sessAdapter = getSessionAdapter();
      const session = await sessAdapter.findOne([['token', '=', token], ['status', '=', 'active']]);
      if (session) {
        await sessAdapter.update(session.id, { status: 'revoked' });
      }
    } catch (err) {
      console.warn('[Session] Failed to terminate session on logout:', err.message);
    }
    return responseUtil.success(null, MESSAGES.LOGOUT_SUCCESS);
  }

  // Complete 2FA login (called after initial login returned requires2FA)
  async completeTwoFactorLogin(user, twoFactorToken, options = {}) {
    const tfAdapter = getTwoFactorAdapter();
    const tfRecord = await tfAdapter.findOne([['userId', '=', user.id]]);

    if (!tfRecord || !tfRecord.enabled) {
      return responseUtil.error('2FA is not enabled for this account', null, 'BAD_REQUEST');
    }

    const { TotpService } = await import('../../core/services/totp.service.js');
    const totpService = new TotpService();
    let valid = totpService.verifyToken(tfRecord.secret, twoFactorToken);

    if (!valid) {
      const storedCodes = typeof tfRecord.backupCodes === 'string'
        ? JSON.parse(tfRecord.backupCodes)
        : (tfRecord.backupCodes || []);
      const backupResult = totpService.verifyBackupCode(storedCodes, twoFactorToken);
      if (backupResult.valid) {
        valid = true;
        await tfAdapter.update(tfRecord.id, {
          backupCodes: JSON.stringify(backupResult.remainingCodes),
        });
      }
    }

    if (!valid) {
      return responseUtil.error('Invalid two-factor authentication code', null, 'UNAUTHORIZED');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const userRole = await prisma.role.findUnique({ where: { id: user.role_id } });
    const roleName = userRole?.name || 'viewer';

    const token = jwtUtil.generateToken({
      id: user.id,
      email: user.email,
      role: roleName
    });

    const refreshToken = jwtUtil.generateRefreshToken(user.id);

    // Create session
    try {
      const sessAdapter = getSessionAdapter();
      await sessAdapter.create({
        userId: user.id,
        token,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastActivityAt: new Date(),
        status: 'active',
      });
    } catch (err) {
      console.warn('[Session] Failed to create session record:', err.message);
    }

    const safeUser = { ...this._toSnakeCase(user, roleName) };
    delete safeUser.password;

    return responseUtil.success({
      user: safeUser,
      token,
      refreshToken
    }, MESSAGES.LOGIN_SUCCESS);
  }

  // Load password policy from settings table
  async _getPasswordPolicy() {
    try {
      const settings = await prisma.setting.findMany({
        where: { key: { startsWith: 'password_' } },
      });
      const policy = {};
      for (const s of settings) {
        if (s.value === 'true') policy[s.key] = true;
        else if (s.value === 'false') policy[s.key] = false;
        else if (!isNaN(s.value)) policy[s.key] = Number(s.value);
        else policy[s.key] = s.value;
      }
      return policy;
    } catch {
      return {}; // Fallback to defaults
    }
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

    // Validate new password against configurable policy
    const policy = await this._getPasswordPolicy();
    const { isValid: isStrong, errors } = passwordUtil.validatePassword(newPassword, policy);

    if (!isStrong) {
      return responseUtil.error('Password does not meet requirements', errors, 'VALIDATION_ERROR');
    }

    // Check password history (prevent reuse)
    const historyCount = policy.password_history_count || 0;
    if (historyCount > 0 && user.passwordHistory) {
      const history = typeof user.passwordHistory === 'string'
        ? JSON.parse(user.passwordHistory)
        : (user.passwordHistory || []);
      for (const oldHash of history.slice(0, historyCount)) {
        if (await bcrypt.compare(newPassword, oldHash)) {
          return responseUtil.error(
            `Cannot reuse any of your last ${historyCount} passwords`,
            null, 'VALIDATION_ERROR'
          );
        }
      }
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
