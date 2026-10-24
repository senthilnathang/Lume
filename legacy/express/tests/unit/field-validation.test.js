import { parseRules, applyRules, requiresUnique, findUniqueConflict } from '../../src/core/services/field-validation.service.js';
import { RecordService } from '../../src/modules/base/services/record.service.js';

const field = (name, extra = {}) => ({ name, label: name, type: 'text', ...extra });

describe('field-validation.service', () => {
  test('parses string and array rules, tolerates garbage', () => {
    expect(parseRules({})).toEqual([]);
    expect(parseRules({ validation: 'nope' })).toEqual([]);
    expect(parseRules({ validation: JSON.stringify([{ type: 'min', value: 2 }]) })).toEqual([{ type: 'min', value: 2 }]);
  });

  test('applies regex, length, and range rules', () => {
    const code = field('code', { validation: JSON.stringify([{ type: 'regex', pattern: '^[A-Z]{3}$' }]) });
    expect(applyRules(code, 'ABC')).toBeNull();
    expect(applyRules(code, 'abc')).toMatch(/invalid format/i);
    const age = field('age', { validation: [{ type: 'min', value: 0 }, { type: 'max', value: 150 }] });
    expect(applyRules(age, 42)).toBeNull();
    expect(applyRules(age, 200)).toMatch(/at most 150/);
    const name = field('name', { validation: [{ type: 'minLength', value: 3 }] });
    expect(applyRules(name, 'Al')).toMatch(/at least 3/);
  });

  test('skips empty values and invalid patterns safely', () => {
    expect(applyRules(field('a'), '')).toBeNull();
    expect(applyRules(field('a', { validation: [{ type: 'regex', pattern: '([' }] }), 'x')).toMatch(/invalid validation pattern/);
  });

  test('detects unique requirement from flag or rule', () => {
    expect(requiresUnique(field('a', { unique: true }))).toBe(true);
    expect(requiresUnique(field('a', { validation: [{ type: 'unique' }] }))).toBe(true);
    expect(requiresUnique(field('a'))).toBe(false);
  });

  test('finds conflicts excluding self and deleted rows', async () => {
    const rows = [
      { id: 1, data: JSON.stringify({ email: 'a@x.com' }), deletedAt: null },
      { id: 2, data: JSON.stringify({ email: 'b@x.com' }), deletedAt: new Date() },
    ];
    const find = async () => rows;
    const f = field('email');
    expect(await findUniqueConflict(find, 1, f, 'a@x.com')).toBe(true);
    expect(await findUniqueConflict(find, 1, f, 'a@x.com', 1)).toBe(false);
    expect(await findUniqueConflict(find, 1, f, 'b@x.com')).toBe(false);
    expect(await findUniqueConflict(find, 1, f, 'c@x.com')).toBe(false);
  });
});

describe('record unique enforcement (base service)', () => {
  function makePrisma(records) {
    const store = {
      fields: [{ id: 1, entityId: 1, name: 'email', label: 'Email', type: 'email', unique: true, deletedAt: null }],
      records: records.map((r, i) => ({ id: i + 1, entityId: 1, companyId: 5, deletedAt: null, ...r })),
    };
    return {
      entity: { findUnique: async () => ({ id: 1 }) },
      entityField: { findMany: async () => store.fields },
      entityFieldPermission: { findMany: async () => [] },
      entityRecord: {
        create: async ({ data }) => {
          const rec = { id: 100 + store.records.length, ...data, deletedAt: null };
          store.records.push(rec);
          return rec;
        },
        findUnique: async ({ where }) => store.records.find((r) => r.id === where.id) || null,
        findMany: async ({ where }) => store.records.filter((r) => Object.entries(where || {}).every(([k, v]) => r[k] === v)),
        update: async ({ where, data }) => {
          const rec = store.records.find((r) => r.id === where.id);
          Object.assign(rec, data);
          return rec;
        },
      },
    };
  }

  test('rejects duplicate unique values on create', async () => {
    const svc = new RecordService(makePrisma([{ data: JSON.stringify({ email: 'a@x.com' }) }]));
    await expect(svc.createRecord(1, { email: 'a@x.com' }, 5, 9)).rejects.toMatchObject({ errors: { email: expect.stringMatching(/unique/i) } });
    const ok = await svc.createRecord(1, { email: 'b@x.com' }, 5, 9);
    expect(ok.data.email).toBe('b@x.com');
  });

  test('allows keeping own value on update but blocks others', async () => {
    const svc = new RecordService(makePrisma([
      { data: JSON.stringify({ email: 'a@x.com' }) },
      { data: JSON.stringify({ email: 'b@x.com' }) },
    ]));
    const same = await svc.updateRecord(1, { email: 'a@x.com' }, 5, {});
    expect(same.data.email).toBe('a@x.com');
    await expect(svc.updateRecord(1, { email: 'b@x.com' }, 5, {})).rejects.toMatchObject({ errors: { email: expect.any(String) } });
  });
});
