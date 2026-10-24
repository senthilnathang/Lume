import {
  HTTP_STATUS,
  MESSAGES,
  USER_ROLES,
  ACTIVITY_STATUS,
  DONATION_STATUS,
  PAGINATION,
  FILE_UPLOAD,
  AUDIT_ACTIONS,
  CACHE_KEYS,
  CACHE_TTL
} from '../../src/shared/constants/index.js';

describe('HTTP_STATUS', () => {
  test('has standard success codes', () => {
    expect(HTTP_STATUS.OK).toBe(200);
    expect(HTTP_STATUS.CREATED).toBe(201);
    expect(HTTP_STATUS.NO_CONTENT).toBe(204);
  });

  test('has standard client error codes', () => {
    expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
    expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    expect(HTTP_STATUS.CONFLICT).toBe(409);
  });

  test('has server error codes', () => {
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
  });
});

describe('MESSAGES', () => {
  test('has success messages', () => {
    expect(MESSAGES.SUCCESS).toBeDefined();
    expect(MESSAGES.CREATED).toBeDefined();
    expect(MESSAGES.DELETED).toBeDefined();
  });

  test('has auth messages', () => {
    expect(MESSAGES.LOGIN_SUCCESS).toBeDefined();
    expect(MESSAGES.INVALID_CREDENTIALS).toBeDefined();
    expect(MESSAGES.TOKEN_EXPIRED).toBeDefined();
  });
});

describe('USER_ROLES', () => {
  test('has standard roles', () => {
    expect(USER_ROLES.ADMIN).toBe('admin');
    expect(USER_ROLES.USER).toBe('user');
    expect(USER_ROLES.SUPER_ADMIN).toBe('super_admin');
    expect(USER_ROLES.GUEST).toBe('guest');
  });
});

describe('ACTIVITY_STATUS', () => {
  test('has expected statuses', () => {
    expect(ACTIVITY_STATUS.DRAFT).toBe('draft');
    expect(ACTIVITY_STATUS.PUBLISHED).toBe('published');
    expect(ACTIVITY_STATUS.COMPLETED).toBe('completed');
    expect(ACTIVITY_STATUS.CANCELLED).toBe('cancelled');
  });
});

describe('DONATION_STATUS', () => {
  test('has expected statuses', () => {
    expect(DONATION_STATUS.PENDING).toBe('pending');
    expect(DONATION_STATUS.COMPLETED).toBe('completed');
    expect(DONATION_STATUS.FAILED).toBe('failed');
    expect(DONATION_STATUS.REFUNDED).toBe('refunded');
  });
});

describe('PAGINATION', () => {
  test('has sensible defaults', () => {
    expect(PAGINATION.DEFAULT_PAGE).toBe(1);
    expect(PAGINATION.DEFAULT_LIMIT).toBe(20);
    expect(PAGINATION.MAX_LIMIT).toBe(100);
    expect(PAGINATION.DEFAULT_LIMIT).toBeLessThanOrEqual(PAGINATION.MAX_LIMIT);
  });
});

describe('FILE_UPLOAD', () => {
  test('has max size of 10MB', () => {
    expect(FILE_UPLOAD.MAX_SIZE).toBe(10 * 1024 * 1024);
  });

  test('allows common image types', () => {
    expect(FILE_UPLOAD.ALLOWED_TYPES).toContain('image/jpeg');
    expect(FILE_UPLOAD.ALLOWED_TYPES).toContain('image/png');
  });

  test('allows PDF', () => {
    expect(FILE_UPLOAD.ALLOWED_TYPES).toContain('application/pdf');
  });
});

describe('CACHE_KEYS', () => {
  test('generates correct cache keys', () => {
    expect(CACHE_KEYS.USER(1)).toBe('user:1');
    expect(CACHE_KEYS.ROLE(5)).toBe('role:5');
    expect(CACHE_KEYS.SETTINGS('theme')).toBe('settings:theme');
  });
});

describe('CACHE_TTL', () => {
  test('has increasing TTL values', () => {
    expect(CACHE_TTL.SHORT).toBeLessThan(CACHE_TTL.MEDIUM);
    expect(CACHE_TTL.MEDIUM).toBeLessThan(CACHE_TTL.LONG);
    expect(CACHE_TTL.LONG).toBeLessThan(CACHE_TTL.VERY_LONG);
  });
});

describe('AUDIT_ACTIONS', () => {
  test('has user actions', () => {
    expect(AUDIT_ACTIONS.USER_LOGIN).toBe('user.login');
    expect(AUDIT_ACTIONS.USER_REGISTER).toBe('user.register');
  });

  test('follows dot notation pattern', () => {
    for (const [, value] of Object.entries(AUDIT_ACTIONS)) {
      expect(value).toMatch(/^\w+\.\w+$/);
    }
  });
});
