import { encryptValue, decryptValue, isEncryptedValue } from '../../src/core/services/field-crypto.service.js';
import { RecordService } from '../../src/modules/base/services/record.service.js';

describe('field crypto (F4.3)', () => {
  test('round-trips strings and objects', () => {
    const enc = encryptValue('secret-1');
    expect(enc).toMatch(/^enc:v1:/);
    expect(isEncryptedValue(enc)).toBe(true);
    expect(decryptValue(enc)).toBe('secret-1');
    expect(decryptValue(encryptValue({ a: 1 }))).toEqual({ a: 1 });
  });

  test('leaves plain values and empties alone', () => {
    expect(decryptValue('plain')).toBe('plain');
    expect(decryptValue(null)).toBeNull();
    expect(encryptValue('')).toBe('');
    expect(isEncryptedValue('enc:v0:xx')).toBe(false);
  });

  test('ciphertexts are non-deterministic but verifiable', () => {
    const a = encryptValue('same');
    const b = encryptValue('same');
    expect(a).not.toBe(b);
    expect(decryptValue(a)).toBe('same');
    expect(decryptValue(b)).toBe('same');
  });

  test('tampered payloads fail closed', () => {
    const enc = encryptValue('secret');
    expect(() => decryptValue(enc.slice(0, -4) + 'xxxx')).toThrow();
  });
});

function makePrisma() {
  const store = { records: [], seq: 1 };
  const fields = [
    { id: 1, entityId: 1, name: 'name', label: 'Name', type: 'text', deletedAt: null },
    { id: 2, entityId: 1, name: 'ssn', label: 'SSN', type: 'text', validation: JSON.stringify([{ type: 'encrypted' }]), deletedAt: null },
  ];
  return {
    store,
    entity: { findUnique: async () => ({ id: 1, name: 'person' }) },
    entityField: { findMany: async () => fields },
    entityFieldPermission: { findMany: async () => [] },
    entityRecord: {
      create: async ({ data }) => {
        const rec = { id: store.seq++, ...data, deletedAt: null };
        store.records.push(rec);
        return rec;
      },
      findUnique: async ({ where }) => store.records.find((r) => r.id === where.id) || null,
      findMany: async () => store.records,
      update: async ({ where, data }) => {
        const rec = store.records.find((r) => r.id === where.id);
        Object.assign(rec, data);
        return rec;
      },
    },
  };
}

describe('encrypted record storage', () => {
  test('stores ciphertext, returns plaintext', async () => {
    const prisma = makePrisma();
    const svc = new RecordService(prisma);
    const created = await svc.createRecord(1, { name: 'Ada', ssn: '123-45-6789' }, 5, 9, {});
    expect(created.data.ssn).toBe('123-45-6789');
    const raw = JSON.parse(prisma.store.records[0].data);
    expect(raw.ssn).toMatch(/^enc:v1:/);
    expect(raw.name).toBe('Ada');
    const fetched = await svc.getRecord(created.id, 5, {});
    expect(fetched.data.ssn).toBe('123-45-6789');
  });

  test('updates do not double-encrypt untouched fields', async () => {
    const prisma = makePrisma();
    const svc = new RecordService(prisma);
    const created = await svc.createRecord(1, { name: 'Ada', ssn: '123-45-6789' }, 5, 9, {});
    const updated = await svc.updateRecord(created.id, { name: 'Ada L' }, 5, {});
    expect(updated.data.ssn).toBe('123-45-6789');
    expect(updated.data.name).toBe('Ada L');
  });
});
