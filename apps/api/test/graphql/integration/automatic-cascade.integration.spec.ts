import { jest } from '@jest/globals';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHarness, type Harness } from './harness';
import { RecordService } from '../../../src/modules/base/services/record.service';

jest.setTimeout(120000);
describe('Automatic CRUD cascades (real MySQL and HTTP)', () => {
  let h: Harness;
  let records: RecordService;
  let relation: number;
  beforeAll(async () => { h = await createHarness(); records = h.app.get(RecordService); });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.recordRule.deleteMany();
    await h.prisma.entityRelationshipRecord.deleteMany();
    await h.prisma.entityRelationship.deleteMany();
    await h.seed();
    for (const id of [5,6,7]) await h.prisma.entityRecord.create({ data: { id, entityId: 2, companyId: id === 7 ? 2 : 1, createdBy: 1, data: JSON.stringify({ name: 'Target ' + id }) } });
    relation = (await h.prisma.entityRelationship.create({ data: { sourceEntityId: 1, targetEntityId: 2, type: 'many_to_many', name: 'targets', label: 'Targets', cascadeDelete: true, cascadeUpdate: true } })).id;
    await h.prisma.entityRelationshipRecord.createMany({ data: [5,5,6,7].map(targetRecordId => ({ relationshipId: relation, sourceRecordId: 1, targetRecordId })) });
  });
  afterEach(() => jest.restoreAllMocks());
  const row = (id = 1) => h.prisma.entityRecord.findUnique({ where: { id } });
  const data = async (id = 1) => JSON.parse((await row(id)).data);
  const update = (patch = { status: 'new' } as any) => records.updateRecord(1,patch,1,2,1);
  const deny = (modelName: string, action: string, domain: object) => h.prisma.recordRule.create({ data: { name: 'Restrict', modelName, action, groups: '[2]', domain: JSON.stringify(domain) } });
  const events = () => jest.spyOn(h.app.get(EventEmitter2),'emit');

  it('updates source and deduplicated in-tenant targets, then publishes committed events', async () => {
    const observed: Promise<void>[] = [];
    h.app.get(EventEmitter2).on('record.updated', () => {
      observed.push((async () => {
        for (const id of [1,5,6]) expect((await data(id)).status).toBe('new');
      })());
    });
    const emit = events();
    try {
      await update(); await Promise.all(observed);
      expect(emit.mock.calls.filter(call => call[0] === 'record.updated')).toHaveLength(3);
      expect((await data(7)).status).toBeUndefined();
    } finally { h.app.get(EventEmitter2).removeAllListeners('record.updated'); }
  });

  it.each(['read','write'])('rolls back the source and every target when a later target fails %s', async action => {
    await deny('entity_2',action,{ name: { ne: 'Target 6' } });
    const emit = events();
    await expect(update()).rejects.toThrow();
    for (const id of [1,5,6]) expect((await data(id)).status).toBeUndefined();
    expect(emit).not.toHaveBeenCalled();
  });

  it('rolls back target writes when source post-update authorization fails', async () => {
    await deny('entity_1','write',{ name: { ne: 'Blocked' } });
    const emit = events();
    await expect(update({ name: 'Blocked' })).rejects.toThrow();
    expect((await data()).name).toBe('Record 1'); expect((await data(5)).name).toBe('Target 5');
    expect(emit).not.toHaveBeenCalled();
  });

  it('rolls back on target validation failure', async () => {
    await h.prisma.entityField.create({ data: { entityId: 2, name: 'amount', slug: 'amount', label: 'Amount', type: 'integer' } });
    await expect(update({ name: null })).rejects.toThrow();
    expect((await data()).name).toBe('Record 1'); expect((await data(5)).name).toBe('Target 5');
  });

  it.each([true,false])('cascades deletion atomically (soft source=%s), with soft-deleted targets', async soft => {
    const emit = events();
    expect(await records.deleteRecord(1,soft,1,2,1)).toBe(true);
    if (soft) expect((await row()).deletedAt).toBeInstanceOf(Date); else expect(await row()).toBeNull();
    for (const id of [5,6]) expect((await row(id)).deletedAt).toBeInstanceOf(Date);
    expect((await row(7)).deletedAt).toBeNull();
    expect(emit.mock.calls.filter(call => call[0] === 'record.deleted')).toHaveLength(3);
  });

  it('rolls back every delete when a later target is denied', async () => {
    await deny('entity_2','unlink',{ name: { ne: 'Target 6' } });
    const emit = events();
    await expect(records.deleteRecord(1,true,1,2,1)).rejects.toThrow();
    for (const id of [1,5,6]) expect((await row(id)).deletedAt).toBeNull();
    expect(emit).not.toHaveBeenCalled();
  });

  it('preserves disabled flags and explicit automation suppression', async () => {
    await records.updateRecord(1,{ status: 'internal' },1,2,1,{ emitEvent: false });
    expect((await data(5)).status).toBeUndefined();
    await h.prisma.entityRelationship.update({ where: { id: relation }, data: { cascadeUpdate: false, cascadeDelete: false } });
    await update(); await records.deleteRecord(1,true,1,2);
    expect((await data(5)).status).toBeUndefined(); expect((await row(5)).deletedAt).toBeNull();
  });

  it('requires an actor and refuses wrong-tenant source access', async () => {
    await expect(records.updateRecord(1,{ status: 'new' },1)).rejects.toThrow();
    expect(await records.updateRecord(1,{ status: 'new' },2,2)).toBeNull();
    expect((await data(5)).status).toBeUndefined();
  });

  it('supports reverse and self-relations while remaining one-hop', async () => {
    await h.prisma.entityRelationship.update({ where: { id: relation }, data: { sourceEntityId: 2, targetEntityId: 1 } });
    await h.prisma.entityRelationshipRecord.deleteMany();
    await h.prisma.entityRelationshipRecord.create({ data: { relationshipId: relation, sourceRecordId: 5, targetRecordId: 1 } });
    await update(); expect((await data(5)).status).toBe('new');
    const self = await h.prisma.entityRelationship.create({ data: { sourceEntityId: 1, targetEntityId: 1, type: 'many_to_many', name: 'self', label: 'Self', cascadeUpdate: true } });
    await h.prisma.entityRelationshipRecord.createMany({ data: [[1,2],[2,1],[2,3]].map(([sourceRecordId,targetRecordId]) => ({ relationshipId: self.id, sourceRecordId,targetRecordId })) });
    await update({ status: 'again' });
    expect((await data(2)).status).toBe('again'); expect((await data(3)).status).toBeUndefined();
  });

  it('executes through REST updates and GraphQL deletion', async () => {
    const response = await request(h.app.getHttpServer()).put('/api/entities/1/records/1').auth(h.token(),{ type: 'bearer' }).send({ data: { name: 'Via REST' } });
    expect(response.status).toBe(200); expect((await data(5)).name).toBe('Via REST');
    const deletion = await h.query('mutation { deleteEntityRecord(recordId:1) }');
    expect(deletion.body.errors).toBeUndefined(); expect(deletion.body.data.deleteEntityRecord).toBe(true);
    expect((await row(5)).deletedAt).toBeInstanceOf(Date);
  });

  it('executes through GraphQL updates', async () => {
    const response = await h.query('mutation { updateEntityRecord(entityId:1,recordId:1,input:{data:{name:"Via GraphQL"}}) { id } }');
    expect(response.body.errors).toBeUndefined(); expect((await data(5)).name).toBe('Via GraphQL');
  });

  it('bulk deletes overlapping sources and targets once', async () => {
    const emit = events();
    const result = await records.bulkDeleteRecords([1,5,1],1,2);
    expect(result.map(r=>r.id).sort()).toEqual([1,5]);
    for (const id of [1,5,6]) expect((await row(id)).deletedAt).toBeInstanceOf(Date);
    expect(emit.mock.calls.filter(call=>call[0]==='record.deleted')).toHaveLength(3);
  });

  it('rolls back all bulk sources and cascades on target denial', async () => {
    await deny('entity_2','unlink',{ name: { ne: 'Target 6' } });
    const emit = events();
    await expect(records.bulkDeleteRecords([1,2],1,2)).rejects.toThrow();
    for (const id of [1,2,5,6]) expect((await row(id)).deletedAt).toBeNull();
    expect(emit).not.toHaveBeenCalled();
  });
});
