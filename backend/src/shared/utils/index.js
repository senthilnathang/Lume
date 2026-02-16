import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import crypto from 'crypto';

dayjs.extend(utc);
dayjs.extend(relativeTime);

// Password utilities
export const passwordUtil = {
  // Hash password
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  },
  
  // Verify password
  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  },
  
  // Validate password strength against configurable policy
  // policy can be passed from DB settings or falls back to defaults
  validatePassword(password, policy = {}) {
    const errors = [];
    const minLength = policy.password_min_length || 8;
    const requireUppercase = policy.password_require_uppercase !== false;
    const requireLowercase = policy.password_require_lowercase !== false;
    const requireNumber = policy.password_require_number !== false;
    const requireSpecial = policy.password_require_special !== false;

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// JWT utilities
export const jwtUtil = {
  // Generate JWT token
  generateToken(payload, expiresIn = '7d') {
    return jwt.sign(payload, process.env.JWT_SECRET || 'jwt-secret', {
      expiresIn,
      jwtid: uuidv4()
    });
  },
  
  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'jwt-secret');
    } catch (error) {
      return null;
    }
  },
  
  // Decode token without verification
  decodeToken(token) {
    return jwt.decode(token);
  },
  
  // Generate refresh token
  generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: '30d' }
    );
  }
};

// Date utilities
export const dateUtil = {
  // Get current UTC date
  now() {
    return dayjs.utc().format();
  },
  
  // Format date
  format(date, format = 'YYYY-MM-DD') {
    return dayjs(date).format(format);
  },
  
  // Format with time
  formatWithTime(date) {
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  },
  
  // Get relative time
  fromNow(date) {
    return dayjs(date).fromNow();
  },
  
  // Add days
  addDays(date, days) {
    return dayjs(date).add(days, 'day').format();
  },
  
  // Subtract days
  subtractDays(date, days) {
    return dayjs(date).subtract(days, 'day').format();
  },
  
  // Start of day
  startOfDay(date) {
    return dayjs(date).startOf('day').format();
  },
  
  // End of day
  endOfDay(date) {
    return dayjs(date).endOf('day').format();
  },
  
  // Check if date is today
  isToday(date) {
    return dayjs(date).isSame(dayjs(), 'day');
  },
  
  // Get start of month
  startOfMonth(date) {
    return dayjs(date).startOf('month').format();
  },
  
  // Get end of month
  endOfMonth(date) {
    return dayjs(date).endOf('month').format();
  }
};

// String utilities
export const stringUtil = {
  // Generate random string
  randomString(length = 10) {
    return crypto.randomBytes(length).toString('hex');
  },
  
  // Generate alphanumeric string
  alphanumeric(length = 10) {
    return crypto.randomBytes(length).toString('hex');
  },
  
  // Slugify string
  slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
  
  // Capitalize first letter
  capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  },
  
  // Truncate string
  truncate(text, length = 100, suffix = '...') {
    if (text.length <= length) return text;
    return text.substring(0, length) + suffix;
  },
  
  // Mask email
  maskEmail(email) {
    const [local, domain] = email.split('@');
    const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
    return `${maskedLocal}@${domain}`;
  },
  
  // Mask phone
  maskPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.substring(0, 3) + '*'.repeat(cleaned.length - 6) + cleaned.substring(cleaned.length - 3);
  }
};

// Validation utilities
export const validationUtil = {
  // Validate email
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },
  
  // Validate phone
  isValidPhone(phone) {
    const regex = /^\+?[\d\s-]{10,}$/;
    return regex.test(phone);
  },
  
  // Validate URL
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  // Sanitize string
  sanitizeString(str) {
    return str
      .trim()
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }
};

// File utilities
export const fileUtil = {
  // Get file extension
  getExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  },
  
  // Get file size in human readable format
  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  // Check if file type is allowed
  isAllowedType(mimeType, allowedTypes) {
    return allowedTypes.includes(mimeType);
  },
  
  // Generate unique filename
  generateUniqueFilename(originalName) {
    const ext = fileUtil.getExtension(originalName);
    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const random = crypto.randomBytes(4).toString('hex');
    return `${timestamp}_${random}.${ext}`;
  }
};

// Object utilities
export const objectUtil = {
  // Remove null/undefined values
  clean(obj) {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== null && v !== undefined)
    );
  },
  
  // Deep clone
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },
  
  // Pick specific fields
  pick(obj, keys) {
    return keys.reduce((acc, key) => {
      if (key in obj) {
        acc[key] = obj[key];
      }
      return acc;
    }, {});
  },
  
  // Omit specific fields
  omit(obj, keys) {
    return Object.fromEntries(
      Object.entries(obj).filter(([key]) => !keys.includes(key))
    );
  }
};

// Response utilities
export const responseUtil = {
  // Success response
  success(data = null, message = 'Success', meta = null) {
    const response = {
      success: true,
      message,
      data
    };
    
    if (meta) {
      response.meta = meta;
    }
    
    return response;
  },
  
  // Paginated response
  paginated(data, pagination, message = 'Success') {
    return {
      success: true,
      message,
      data,
      meta: {
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          pages: Math.ceil(pagination.total / pagination.limit)
        }
      }
    };
  },
  
  // Error response
  error(message = 'Error', errors = null, code = 'ERROR') {
    const response = {
      success: false,
      error: {
        code,
        message
      }
    };
    
    if (errors) {
      response.error.details = errors;
    }
    
    return response;
  },
  
  // Validation error response
  validationError(errors) {
    return responseUtil.error('Validation failed', errors, 'VALIDATION_ERROR');
  },
  
  // Not found response
  notFound(resource = 'Resource') {
    return responseUtil.error(`${resource} not found`, null, 'NOT_FOUND');
  },
  
  // Unauthorized response
  unauthorized(message = 'Unauthorized') {
    return responseUtil.error(message, null, 'UNAUTHORIZED');
  },
  
  // Forbidden response
  forbidden(message = 'Forbidden') {
    return responseUtil.error(message, null, 'FORBIDDEN');
  }
};

// Export all utilities
export default {
  passwordUtil,
  jwtUtil,
  dateUtil,
  stringUtil,
  validationUtil,
  fileUtil,
  objectUtil,
  responseUtil
};