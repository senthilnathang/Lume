import { maskValue, parseMaskRule } from '../../src/core/services/field-mask.service.js';
import { RecordService } from '../../src/modules/base/services/record.service.js';

describe('field-mask.service (F1.4)', () => {
  test('masks strings preserving the tail', () => {
    expect(maskValue('4111111111111111', 4)).toBe('••••••••••••1111');
    expect(maskValue('AB', 4)).toBe('AB');
    expect(maskValue('secret', 0)).toBe('••••••');
    expect(maskValue(null, 4)).toBeNull();
    expect(maskValue('', 4)).toBe('');
  });

  test('parses mask rules defensively', () => {
    expect(parseMaskRule(JSON.stringify({ mode: 'mask', preserveLast: 2 }))).toEqual({ mode: 'mask', preserveLast: 2 });
    expect(parseMaskRule(JSON.stringify({ mode: 'hide' }))).toBeNull();
    expect(parseMaskRule('garbage')).toBeNull();
    expect(parseMaskRule(null)).toBeNull();
    expect(parseMaskRule(JSON.stringify({ mode: 'mask', preserveLast: 99 }))).toEqual({ mode: 'mask', preserveLast: 10 });
  });

  test('masked fields render partially on read, stay blocked on write', async () => {
    const prisma = {
      entityFieldPermission: {
        findMany: async () => [{ fieldId: 12, roleId: 7, canRead: false, canWrite: false }],
      },
      setting: {
        findFirst: async ({ where }) => (
          where.key === 'fieldmask.12.7'
            ? { key: where.key, value: JSON.stringify({ mode: 'mask', preserveLast: 4 }) }
            : null
        ),
      },
    };
    const svc = new RecordService(prisma);
    const fields = [{ id: 12, entityId: 1, name: 'ssn', label: 'SSN', type: 'text' }];
    const policy = await svc.getFieldPolicy(fields, 7);
    expect(svc.stripUnreadable({ ssn: '123-45-6789', name: 'x' }, policy)).toEqual({ ssn: '•••••••6789' });
    expect(svc.stripUnwritable({ ssn: '1', name: 'x' }, fields, policy)).toEqual({});
  });

  test('denied fields without mask rules are still stripped', async () => {
    const prisma = {
      entityFieldPermission: {
        findMany: async () => [{ fieldId: 12, roleId: 7, canRead: false, canWrite: false }],
      },
      setting: { findFirst: async () => null },
    };
    const svc = new RecordService(prisma);
    const fields = [{ id: 12, entityId: 1, name: 'ssn', label: 'SSN', type: 'text' }];
    const policy = await svc.getFieldPolicy(fields, 7);
    expect(svc.stripUnreadable({ ssn: '123', name: 'x' }, policy)).toEqual({});
  });
});
