import { RecordService as CoreRecordService } from '../../src/core/services/record.service.js';
import { EntityService } from '../../src/core/services/entity.service.js';
import { RecordService as BaseRecordService } from '../../src/modules/base/services/record.service.js';

const field = (name, type, extra = {}) => ({ name, label: name, type, ...extra });

describe('composite and relational field types', () => {
  test('entity field definition accepts currency/address/fullname/file/signature/lookup', () => {
    const svc = new EntityService(null, null);
    for (const type of ['currency', 'address', 'fullname', 'file', 'signature', 'lookup']) {
      expect(() => svc.validateField({ name: 'f', label: 'F', type })).not.toThrow();
    }
    expect(() => svc.validateField({ name: 'f', label: 'F', type: 'nope' })).toThrow();
  });

  test('core record validation accepts composite shapes', () => {
    const svc = new CoreRecordService({}, {});
    const fields = [
      field('price', 'currency'), field('addr', 'address'), field('who', 'fullname'),
      field('doc', 'file'), field('sig', 'signature'), field('owner', 'lookup'),
    ];
    const ok = svc.validateRecord(fields, {
      price: { amount: 9.99, currency: 'USD' },
      addr: { street: '1 Main', city: 'Toronto' },
      who: { first: 'Ada', last: 'Lovelace' },
      doc: { url: 'https://cdn.example/f.pdf', name: 'f.pdf' },
      sig: 'data:image/png;base64,iVBORw0KGgo=',
      owner: 42,
    });
    expect(ok.valid).toBe(true);
    const bad = svc.validateRecord(fields, { price: 'free', addr: 7, who: {}, doc: {}, sig: 'scribble', owner: {} });
    expect(bad.valid).toBe(false);
    expect(Object.keys(bad.errors)).toEqual(expect.arrayContaining(['price', 'addr', 'who', 'doc', 'sig', 'owner']));
  });

  test('base record validation accepts new types', () => {
    const svc = new BaseRecordService(null);
    expect(() => svc.validateRecordData(
      { price: 5, doc: 'https://cdn.example/f.pdf', sig: 'https://cdn.example/s.png', owner: 'abc' },
      [field('price', 'currency'), field('doc', 'file'), field('sig', 'signature'), field('owner', 'lookup')]
    )).not.toThrow();
    try {
      svc.validateRecordData({ sig: 'not-a-signature' }, [field('sig', 'signature')]);
      expect(true).toBe(false);
    } catch (e) {
      expect(e.errors.sig).toMatch(/signature/i);
    }
  });
});
