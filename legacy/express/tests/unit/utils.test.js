import {
  passwordUtil,
  jwtUtil,
  dateUtil,
  stringUtil,
  validationUtil,
  fileUtil,
  objectUtil,
  responseUtil
} from '../../src/shared/utils/index.js';

// ─── Password Utilities ──────────────────────────────────────────────────────

describe('passwordUtil', () => {
  test('hashPassword returns a bcrypt hash', async () => {
    const hash = await passwordUtil.hashPassword('TestPass1!');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('TestPass1!');
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  test('verifyPassword returns true for correct password', async () => {
    const hash = await passwordUtil.hashPassword('TestPass1!');
    const result = await passwordUtil.verifyPassword('TestPass1!', hash);
    expect(result).toBe(true);
  });

  test('verifyPassword returns false for wrong password', async () => {
    const hash = await passwordUtil.hashPassword('TestPass1!');
    const result = await passwordUtil.verifyPassword('WrongPass1!', hash);
    expect(result).toBe(false);
  });

  test('validatePassword accepts strong password', () => {
    const result = passwordUtil.validatePassword('Str0ng!Pass');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validatePassword rejects short password', () => {
    const result = passwordUtil.validatePassword('Ab1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });

  test('validatePassword rejects password without uppercase', () => {
    const result = passwordUtil.validatePassword('lowercase1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  test('validatePassword rejects password without lowercase', () => {
    const result = passwordUtil.validatePassword('UPPERCASE1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  test('validatePassword rejects password without number', () => {
    const result = passwordUtil.validatePassword('NoNumber!!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  test('validatePassword rejects password without special char', () => {
    const result = passwordUtil.validatePassword('NoSpecial1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character');
  });

  test('validatePassword returns multiple errors', () => {
    const result = passwordUtil.validatePassword('abc');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// ─── JWT Utilities ───────────────────────────────────────────────────────────

describe('jwtUtil', () => {
  test('generateToken creates a valid JWT', () => {
    const token = jwtUtil.generateToken({ userId: 1, role: 'admin' });
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  test('verifyToken returns payload for valid token', () => {
    const token = jwtUtil.generateToken({ userId: 1, role: 'admin' });
    const decoded = jwtUtil.verifyToken(token);
    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe(1);
    expect(decoded.role).toBe('admin');
  });

  test('verifyToken returns null for invalid token', () => {
    const decoded = jwtUtil.verifyToken('invalid.token.here');
    expect(decoded).toBeNull();
  });

  test('verifyToken returns null for tampered token', () => {
    const token = jwtUtil.generateToken({ userId: 1 });
    const tampered = token.slice(0, -5) + 'XXXXX';
    const decoded = jwtUtil.verifyToken(tampered);
    expect(decoded).toBeNull();
  });

  test('decodeToken decodes without verification', () => {
    const token = jwtUtil.generateToken({ userId: 42 });
    const decoded = jwtUtil.decodeToken(token);
    expect(decoded.userId).toBe(42);
  });

  test('generateRefreshToken creates a refresh token', () => {
    const token = jwtUtil.generateRefreshToken(1);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  test('token contains jti (unique ID)', () => {
    const token = jwtUtil.generateToken({ userId: 1 });
    const decoded = jwtUtil.decodeToken(token);
    expect(decoded.jti).toBeDefined();
  });

  test('two tokens have different jti', () => {
    const token1 = jwtUtil.generateToken({ userId: 1 });
    const token2 = jwtUtil.generateToken({ userId: 1 });
    const d1 = jwtUtil.decodeToken(token1);
    const d2 = jwtUtil.decodeToken(token2);
    expect(d1.jti).not.toBe(d2.jti);
  });
});

// ─── Date Utilities ──────────────────────────────────────────────────────────

describe('dateUtil', () => {
  test('now returns an ISO date string', () => {
    const now = dateUtil.now();
    expect(now).toBeDefined();
    expect(new Date(now).toString()).not.toBe('Invalid Date');
  });

  test('format returns YYYY-MM-DD by default', () => {
    const result = dateUtil.format('2024-06-15T12:00:00Z');
    expect(result).toBe('2024-06-15');
  });

  test('format accepts custom format', () => {
    const result = dateUtil.format('2024-06-15T12:00:00Z', 'DD/MM/YYYY');
    expect(result).toBe('15/06/2024');
  });

  test('formatWithTime includes hours and minutes', () => {
    const result = dateUtil.formatWithTime('2024-06-15T14:30:45Z');
    expect(result).toMatch(/2024-06-15/);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  test('fromNow returns relative time string', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const result = dateUtil.fromNow(pastDate);
    expect(result).toMatch(/ago/);
  });

  test('addDays adds days correctly', () => {
    const result = dateUtil.addDays('2024-01-01', 5);
    expect(result).toMatch(/2024-01-06/);
  });

  test('subtractDays subtracts days correctly', () => {
    const result = dateUtil.subtractDays('2024-01-10', 5);
    expect(result).toMatch(/2024-01-05/);
  });

  test('startOfDay returns start of day', () => {
    const result = dateUtil.startOfDay('2024-06-15T14:30:00');
    expect(result).toMatch(/2024-06-15/);
  });

  test('endOfDay returns end of day', () => {
    const result = dateUtil.endOfDay('2024-06-15T14:30:00');
    expect(result).toMatch(/2024-06-15/);
  });

  test('startOfMonth returns first of month', () => {
    const result = dateUtil.startOfMonth('2024-06-15');
    expect(result).toMatch(/2024-06-01/);
  });

  test('endOfMonth returns last of month', () => {
    const result = dateUtil.endOfMonth('2024-06-15');
    expect(result).toMatch(/2024-06-30/);
  });
});

// ─── String Utilities ────────────────────────────────────────────────────────

describe('stringUtil', () => {
  test('randomString returns hex string of specified length', () => {
    const result = stringUtil.randomString(16);
    expect(result).toHaveLength(32); // hex doubles
    expect(/^[0-9a-f]+$/.test(result)).toBe(true);
  });

  test('randomString defaults to 10 bytes', () => {
    const result = stringUtil.randomString();
    expect(result).toHaveLength(20);
  });

  test('slugify converts text to URL-safe slug', () => {
    expect(stringUtil.slugify('Hello World')).toBe('hello-world');
    expect(stringUtil.slugify('  Foo  Bar  ')).toBe('foo-bar');
    expect(stringUtil.slugify('Café & Restaurant!')).toBe('caf-restaurant');
  });

  test('capitalize uppercases first letter', () => {
    expect(stringUtil.capitalize('hello')).toBe('Hello');
    expect(stringUtil.capitalize('HELLO')).toBe('HELLO');
  });

  test('truncate shortens long text', () => {
    expect(stringUtil.truncate('Hello World', 5)).toBe('Hello...');
    expect(stringUtil.truncate('Hi', 10)).toBe('Hi');
  });

  test('truncate uses custom suffix', () => {
    expect(stringUtil.truncate('Hello World', 5, '…')).toBe('Hello…');
  });

  test('maskEmail hides middle of local part', () => {
    const result = stringUtil.maskEmail('john@example.com');
    expect(result).toMatch(/^j\*+n@example\.com$/);
  });

  test('maskPhone hides middle digits', () => {
    const result = stringUtil.maskPhone('1234567890');
    expect(result.startsWith('123')).toBe(true);
    expect(result.endsWith('890')).toBe(true);
    expect(result).toContain('*');
  });
});

// ─── Validation Utilities ────────────────────────────────────────────────────

describe('validationUtil', () => {
  test('isValidEmail accepts valid emails', () => {
    expect(validationUtil.isValidEmail('user@example.com')).toBe(true);
    expect(validationUtil.isValidEmail('a@b.co')).toBe(true);
  });

  test('isValidEmail rejects invalid emails', () => {
    expect(validationUtil.isValidEmail('not-an-email')).toBe(false);
    expect(validationUtil.isValidEmail('@example.com')).toBe(false);
    expect(validationUtil.isValidEmail('user@')).toBe(false);
  });

  test('isValidPhone accepts valid phones', () => {
    expect(validationUtil.isValidPhone('+1234567890')).toBe(true);
    expect(validationUtil.isValidPhone('123-456-7890')).toBe(true);
  });

  test('isValidPhone rejects short numbers', () => {
    expect(validationUtil.isValidPhone('123')).toBe(false);
  });

  test('isValidUrl accepts valid URLs', () => {
    expect(validationUtil.isValidUrl('https://example.com')).toBe(true);
    expect(validationUtil.isValidUrl('http://localhost:3000')).toBe(true);
  });

  test('isValidUrl rejects invalid URLs', () => {
    expect(validationUtil.isValidUrl('not-a-url')).toBe(false);
    expect(validationUtil.isValidUrl('')).toBe(false);
  });

  test('sanitizeString strips HTML tags', () => {
    expect(validationUtil.sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(validationUtil.sanitizeString('<b>Bold</b>')).toBe('Bold');
  });

  test('sanitizeString strips javascript: URIs', () => {
    expect(validationUtil.sanitizeString('javascript:alert(1)')).not.toContain('javascript:');
  });

  test('sanitizeString strips event handlers', () => {
    expect(validationUtil.sanitizeString('onload=alert(1)')).not.toMatch(/onload=/i);
  });
});

// ─── File Utilities ──────────────────────────────────────────────────────────

describe('fileUtil', () => {
  test('getExtension extracts file extension', () => {
    expect(fileUtil.getExtension('photo.jpg')).toBe('jpg');
    expect(fileUtil.getExtension('archive.tar.gz')).toBe('gz');
    expect(fileUtil.getExtension('noext')).toBe('');
  });

  test('formatSize formats bytes', () => {
    expect(fileUtil.formatSize(0)).toBe('0 Bytes');
    expect(fileUtil.formatSize(1024)).toBe('1 KB');
    expect(fileUtil.formatSize(1048576)).toBe('1 MB');
    expect(fileUtil.formatSize(1073741824)).toBe('1 GB');
  });

  test('isAllowedType checks mime type', () => {
    const allowed = ['image/jpeg', 'image/png'];
    expect(fileUtil.isAllowedType('image/jpeg', allowed)).toBe(true);
    expect(fileUtil.isAllowedType('application/pdf', allowed)).toBe(false);
  });

  test('generateUniqueFilename creates unique name with extension', () => {
    const name = fileUtil.generateUniqueFilename('photo.jpg');
    expect(name).toMatch(/\.jpg$/);
    expect(name).not.toBe('photo.jpg');
  });
});

// ─── Object Utilities ────────────────────────────────────────────────────────

describe('objectUtil', () => {
  test('clean removes null and undefined values', () => {
    const result = objectUtil.clean({ a: 1, b: null, c: undefined, d: 'hello' });
    expect(result).toEqual({ a: 1, d: 'hello' });
  });

  test('clean keeps falsy but non-null values', () => {
    const result = objectUtil.clean({ a: 0, b: '', c: false, d: null });
    expect(result).toEqual({ a: 0, b: '', c: false });
  });

  test('deepClone creates independent copy', () => {
    const original = { a: { b: [1, 2, 3] } };
    const clone = objectUtil.deepClone(original);
    clone.a.b.push(4);
    expect(original.a.b).toEqual([1, 2, 3]);
    expect(clone.a.b).toEqual([1, 2, 3, 4]);
  });

  test('pick selects specified keys', () => {
    const result = objectUtil.pick({ a: 1, b: 2, c: 3 }, ['a', 'c']);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  test('pick ignores missing keys', () => {
    const result = objectUtil.pick({ a: 1 }, ['a', 'missing']);
    expect(result).toEqual({ a: 1 });
  });

  test('omit removes specified keys', () => {
    const result = objectUtil.omit({ a: 1, b: 2, c: 3 }, ['b']);
    expect(result).toEqual({ a: 1, c: 3 });
  });
});

// ─── Response Utilities ──────────────────────────────────────────────────────

describe('responseUtil', () => {
  test('success returns proper structure', () => {
    const result = responseUtil.success({ id: 1 }, 'Created');
    expect(result.success).toBe(true);
    expect(result.message).toBe('Created');
    expect(result.data).toEqual({ id: 1 });
  });

  test('success includes meta when provided', () => {
    const result = responseUtil.success(null, 'OK', { version: '1.0' });
    expect(result.meta).toEqual({ version: '1.0' });
  });

  test('success excludes meta when not provided', () => {
    const result = responseUtil.success(null);
    expect(result.meta).toBeUndefined();
  });

  test('paginated returns pagination meta', () => {
    const result = responseUtil.paginated([1, 2], { page: 1, limit: 10, total: 50 });
    expect(result.success).toBe(true);
    expect(result.meta.pagination.page).toBe(1);
    expect(result.meta.pagination.limit).toBe(10);
    expect(result.meta.pagination.total).toBe(50);
    expect(result.meta.pagination.pages).toBe(5);
  });

  test('error returns proper structure', () => {
    const result = responseUtil.error('Something failed', null, 'FAIL');
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('FAIL');
    expect(result.error.message).toBe('Something failed');
  });

  test('error includes details when provided', () => {
    const details = [{ field: 'email', message: 'required' }];
    const result = responseUtil.error('Validation', details, 'VALIDATION');
    expect(result.error.details).toEqual(details);
  });

  test('validationError uses VALIDATION_ERROR code', () => {
    const result = responseUtil.validationError([]);
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  test('notFound formats resource name', () => {
    const result = responseUtil.notFound('User');
    expect(result.error.message).toBe('User not found');
    expect(result.error.code).toBe('NOT_FOUND');
  });

  test('unauthorized returns proper structure', () => {
    const result = responseUtil.unauthorized('Token expired');
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(result.error.message).toBe('Token expired');
  });

  test('forbidden returns proper structure', () => {
    const result = responseUtil.forbidden('No access');
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('FORBIDDEN');
  });
});
