import { RecordService } from '../../src/modules/base/services/record.service.js';
import { makeStore, fakePrisma, parseDataField } from '../helpers/fakes.js';

describe('record lifecycle contract (F5.3 fixtures)', () => {
  test('create -> get -> update -> delete round-trip', async () => {
    const store = makeStore();
    const svc = new RecordService(fakePrisma(store));

    const created = await svc.createRecord(1, { title: 'Gadget' }, 5, 9, {});
    expect(created.data.title).toBe('Gadget');

    const fetched = await svc.getRecord(created.id, 5, {});
    expect(parseDataField(fetched).title).toBe('Gadget');

    const updated = await svc.updateRecord(created.id, { title: 'Gadget Pro' }, 5, {});
    expect(updated.data.title).toBe('Gadget Pro');

    expect(await svc.deleteRecord(created.id, true, 5, {})).toBe(true);
    expect(await svc.getRecord(created.id, 5, {})).toBeNull();
  });

  test('company isolation holds across tenants', async () => {
    const store = makeStore();
    const svc = new RecordService(fakePrisma(store));
    const created = await svc.createRecord(1, { title: 'Mine' }, 5, 9, {});
    expect(await svc.getRecord(created.id, 6, {})).toBeNull();
    const listed = await svc.listRecords(1, 5, {});
    expect(listed.records).toHaveLength(1);
    expect(await svc.listRecords(1, 6, {})).toEqual(expect.objectContaining({ records: [] }));
  });
});
