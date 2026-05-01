// Common constants used across the application

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// Response Messages
export const MESSAGES = {
  // Success messages
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  RESTORED: 'Resource restored successfully',
  
  // Error messages
  ERROR: 'An error occurred',
  VALIDATION_ERROR: 'Validation failed',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  CONFLICT: 'Resource conflict',
  SERVER_ERROR: 'Internal server error',
  
  // Auth messages
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  TOKEN_EXPIRED: 'Token expired',
  INVALID_TOKEN: 'Invalid token',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_LOCKED: 'Account is locked',
  ACCOUNT_DEACTIVATED: 'Account is deactivated',
  
  // Database messages
  CONNECTION_ERROR: 'Database connection error',
  TRANSACTION_ERROR: 'Transaction failed',
  
  // File messages
  UPLOAD_SUCCESS: 'File uploaded successfully',
  UPLOAD_ERROR: 'File upload failed',
  FILE_NOT_FOUND: 'File not found',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_TOO_LARGE: 'File too large'
};

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  USER: 'user',
  VIEWER: 'viewer',
  GUEST: 'guest'
};

// Permission Categories
export const PERMISSION_CATEGORIES = {
  USER_MANAGEMENT: 'user_management',
  ROLE_MANAGEMENT: 'role_management',
  CONTENT_MANAGEMENT: 'content_management',
  FINANCIAL: 'financial',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  AUDIT: 'audit'
};

// Activity Status
export const ACTIVITY_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Donation Status
export const DONATION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CHEQUE: 'cheque',
  BANK_TRANSFER: 'bank_transfer',
  ONLINE: 'online',
  OTHER: 'other'
};

// Document Types
export const DOCUMENT_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  AUDIO: 'audio',
  OTHER: 'other'
};

// Message Status
export const MESSAGE_STATUS = {
  NEW: 'new',
  READ: 'read',
  REPLIED: 'replied',
  ARCHIVED: 'archived'
};

// Cache Keys
export const CACHE_KEYS = {
  USER: (id) => `user:${id}`,
  ROLE: (id) => `role:${id}`,
  PERMISSION: (id) => `permission:${id}`,
  ACTIVITY: (id) => `activity:${id}`,
  DONATION: (id) => `donation:${id}`,
  DONOR: (id) => `donor:${id}`,
  DOCUMENT: (id) => `document:${id}`,
  TEAM_MEMBER: (id) => `team_member:${id}`,
  MESSAGE: (id) => `message:${id}`,
  SETTINGS: (key) => `settings:${key}`,
  STATS: (key) => `stats:${key}`
};

// Cache TTL (in seconds)
export const CACHE_TTL = {
  SHORT: 60,          // 1 minute
  MEDIUM: 300,        // 5 minutes
  LONG: 3600,         // 1 hour
  VERY_LONG: 86400,   // 24 hours
  INFINITE: -1        // No cache
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'YYYY-MM-DD',
  DISPLAY_TIME: 'YYYY-MM-DD HH:mm:ss',
  API: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  FILE: 'YYYYMMDD_HHmmss'
};

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'audio/mpeg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

// Audit Actions
export const AUDIT_ACTIONS = {
  // User actions
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_REGISTER: 'user.register',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_PASSWORD_CHANGE: 'user.password_change',
  
  // Activity actions
  ACTIVITY_CREATE: 'activity.create',
  ACTIVITY_UPDATE: 'activity.update',
  ACTIVITY_DELETE: 'activity.delete',
  ACTIVITY_PUBLISH: 'activity.publish',
  ACTIVITY_CANCEL: 'activity.cancel',
  
  // Donation actions
  DONATION_CREATE: 'donation.create',
  DONATION_UPDATE: 'donation.update',
  DONATION_STATUS_CHANGE: 'donation.status_change',
  
  // Document actions
  DOCUMENT_UPLOAD: 'document.upload',
  DOCUMENT_DOWNLOAD: 'document.download',
  DOCUMENT_DELETE: 'document.delete',
  
  // Settings actions
  SETTINGS_UPDATE: 'settings.update',
  
  // System actions
  SYSTEM_BACKUP: 'system.backup',
  SYSTEM_RESTORE: 'system.restore'
};

// API Response Status
export const RESPONSE_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  PENDING: 'pending'
};

// Default export
export default {
  HTTP_STATUS,
  MESSAGES,
  USER_ROLES,
  PERMISSION_CATEGORIES,
  ACTIVITY_STATUS,
  DONATION_STATUS,
  PAYMENT_METHODS,
  DOCUMENT_TYPES,
  MESSAGE_STATUS,
  CACHE_KEYS,
  CACHE_TTL,
  PAGINATION,
  DATE_FORMATS,
  FILE_UPLOAD,
  AUDIT_ACTIONS,
  RESPONSE_STATUS
};