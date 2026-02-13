import { getDatabase } from '../../config.js';
import { Op } from 'sequelize';
import { passwordUtil, jwtUtil, responseUtil } from '../../shared/utils/index.js';
import { MESSAGES, USER_ROLES, PAGINATION } from '../../shared/constants/index.js';

export class UserService {
  constructor() {
    this.db = getDatabase();
    this.User = this.db.models.User;
  }
  
  // Create a new user
  async create(userData) {
    try {
      const user = await this.User.create(userData);
      return responseUtil.success(user, MESSAGES.CREATED);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return responseUtil.error('Email already exists', null, 'CONFLICT');
      }
      throw error;
    }
  }
  
  // Find user by ID
  async findById(id) {
    const user = await this.User.findByPk(id);
    if (!user) {
      return responseUtil.notFound('User');
    }
    return responseUtil.success(user);
  }
  
  // Find user by email
  async findByEmail(email) {
    const user = await this.User.findOne({
      where: { email }
    });
    return user;
  }
  
  // Get all users with pagination
  async findAll(options = {}) {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, search, role_id, is_active } = options;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (role_id) {
      where.role_id = role_id;
    }
    
    if (is_active !== undefined) {
      where.is_active = is_active;
    }
    
    const { count, rows } = await this.User.findAndCountAll({
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
  
  // Update user
  async update(id, userData) {
    const user = await this.User.findByPk(id);
    
    if (!user) {
      return responseUtil.notFound('User');
    }
    
    // Don't allow changing email
    delete userData.email;
    
    await user.update(userData);
    return responseUtil.success(user, MESSAGES.UPDATED);
  }
  
  // Delete user (soft delete)
  async delete(id, deletedBy) {
    const user = await this.User.findByPk(id);
    
    if (!user) {
      return responseUtil.notFound('User');
    }
    
    await user.softDelete(deletedBy);
    return responseUtil.success(null, MESSAGES.DELETED);
  }
  
  // Restore user
  async restore(id) {
    const user = await this.User.findByPk(id, { paranoid: false });
    
    if (!user) {
      return responseUtil.notFound('User');
    }
    
    await user.restore();
    return responseUtil.success(user, MESSAGES.RESTORED);
  }
  
  // Login user
  async login(email, password) {
    const user = await this.User.findOne({
      where: { email }
    });
    
    if (!user) {
      return responseUtil.error(MESSAGES.INVALID_CREDENTIALS, null, 'UNAUTHORIZED');
    }
    
    if (!user.is_active) {
      return responseUtil.error(MESSAGES.ACCOUNT_DEACTIVATED, null, 'FORBIDDEN');
    }
    
    if (user.isLocked()) {
      return responseUtil.error(MESSAGES.ACCOUNT_LOCKED, null, 'FORBIDDEN');
    }
    
    const isValid = await user.validatePassword(password);
    
    if (!isValid) {
      await user.incrementLoginAttempts();
      return responseUtil.error(MESSAGES.INVALID_CREDENTIALS, null, 'UNAUTHORIZED');
    }
    
    await user.resetLoginAttempts();
    
    // Update last login
    user.last_login = new Date();
    await user.save();
    
    // Generate tokens
    const token = jwtUtil.generateToken({
      id: user.id,
      email: user.email,
      role: user.role_id
    });
    
    const refreshToken = jwtUtil.generateRefreshToken(user.id);
    
    // Save refresh token
    user.refresh_token = refreshToken;
    await user.save();
    
    return responseUtil.success({
      user: user.toJSON(),
      token,
      refreshToken
    }, MESSAGES.LOGIN_SUCCESS);
  }
  
  // Logout user
  async logout(id) {
    const user = await this.User.findByPk(id);
    
    if (user) {
      user.refresh_token = null;
      await user.save();
    }
    
    return responseUtil.success(null, MESSAGES.LOGOUT_SUCCESS);
  }
  
  // Change password
  async changePassword(id, oldPassword, newPassword) {
    const user = await this.User.findByPk(id);
    
    if (!user) {
      return responseUtil.notFound('User');
    }
    
    const isValid = await user.validatePassword(oldPassword);
    
    if (!isValid) {
      return responseUtil.error('Current password is incorrect', null, 'BAD_REQUEST');
    }
    
    // Validate new password strength
    const { isValid: isStrong, errors } = passwordUtil.validatePassword(newPassword);
    
    if (!isStrong) {
      return responseUtil.error('Password does not meet requirements', errors, 'VALIDATION_ERROR');
    }
    
    user.password = newPassword;
    await user.save();
    
    return responseUtil.success(null, 'Password changed successfully');
  }
  
  // Get user statistics
  async getStats() {
    const total = await this.User.count();
    const active = await this.User.count({ where: { is_active: true } });
    const newThisMonth = await this.User.count({
      where: {
        created_at: {
          [Op.gte]: dayjs().startOf('month').format()
        }
      }
    });
    
    return responseUtil.success({
      total,
      active,
      inactive: total - active,
      newThisMonth
    });
  }
}

export default UserService;