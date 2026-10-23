import { jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHarness, type Harness } from './harness';
import { CascadeService } from '../../../src/modules/base/services/cascade.service';
import { RecordService } from '../../../src/modules/base/services/record.service';

jest.setTimeout(120000);
describe('Cascade authorization and atomicity (real MySQL)', () => {
  let h: Harness;
  let service: CascadeService;
  let relation: number;
  const context = { companyId: 1, userId: 2 };
  beforeAll(async () => { h = await createHarness(); service = new CascadeService(h.prisma, h.app.get(RecordService)); });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.recordRule.deleteMany();
    await h.prisma.entityRelationshipRecord.deleteMany();
    await h.prisma.entityRelationship.deleteMany();
    await h.seed();
    for (const id of [5, 6, 7]) await h.prisma.entityRecord.create({ data: { id, entityId: 2, companyId: id === 7 ? 2 : 1, createdBy: 1, data: JSON.stringify({ name: `Target ${id}`, keep: true }) } });
    relation = (await h.prisma.entityRelationship.create({ data: { sourceEntityId: 1, targetEntityId: 2, type: 'many_to_many', name: 'targets', label: 'Targets', cascadeDelete: true, cascadeUpdate: true } })).id;
    await h.prisma.entityRelationshipRecord.createMany({ data: [5, 5, 6, 7, 999, 2].map(targetRecordId => ({ relationshipId: relation, sourceRecordId: 1, targetRecordId })) });
  });
  afterEach(() => jest.restoreAllMocks());
  const row = (id = 5) => h.prisma.entityRecord.findUnique({ where: { id } });
  const data = async (id = 5) => JSON.parse((await row(id)).data);
  const update = () => service.handleCascadeUpdate(1, 1, { status: 'new' }, context);
  const deny = (modelName: string, action: string, domain = '{"name":"Denied"}') => h.prisma.recordRule.create({ data: { name: 'Restrict', modelName, action, groups: '[2]', domain } });
  const reverse = async () => {
    await h.prisma.entityRelationship.update({ where: { id: relation }, data: { sourceEntityId: 2, targetEntityId: 1 } });
    await h.prisma.entityRelationshipRecord.deleteMany();
    await h.prisma.entityRelationshipRecord.createMany({ data: [5, 5, 6, 7, 999, 2].map(sourceRecordId => ({ relationshipId: relation, sourceRecordId, targetRecordId: 1 })) });
  };

  it.each(['source', 'target'])('updates only valid linked targets in the %s direction', async direction => {
    if (direction === 'target') await reverse();
    const writes = jest.spyOn(RecordService.prototype, 'updateRecord');
    await update();
    expect(await data()).toEqual({ name: 'Target 5', keep: true, status: 'new' });
    expect((await data(6)).status).toBe('new');
    expect((await data(7)).status).toBeUndefined();
    expect((await data(2)).status).toBeUndefined();
    expect(writes).toHaveBeenCalledTimes(2);
  });
  it.each(['source', 'target'])('soft deletes valid targets in the %s direction', async direction => {
    if (direction === 'target') await reverse();
    await service.handleCascadeDelete(1, 1, context);
    expect((await row()).deletedAt).toBeInstanceOf(Date);
    expect((await row(6)).deletedAt).toBeInstanceOf(Date);
    expect((await row(7)).deletedAt).toBeNull();
    expect((await row(1)).deletedAt).toBeNull();
  });
  it('respects disabled cascade flags', async () => {
    await h.prisma.entityRelationship.update({ where: { id: relation }, data: { cascadeDelete: false, cascadeUpdate: false } });
    await update(); await service.handleCascadeDelete(1, 1, context);
    expect((await data()).status).toBeUndefined(); expect((await row()).deletedAt).toBeNull();
  });
  it.each([undefined, { companyId: 1 }, { companyId: 0, userId: 2 }, { companyId: 1, userId: 999 }])('rejects missing or invalid identity %j', async ctx => {
    await expect(service.handleCascadeUpdate(1, 1, {}, ctx as any)).rejects.toThrow();
  });
  it('rejects wrong-tenant, wrong-entity and deleted sources', async () => {
    await expect(service.handleCascadeUpdate(1, 1, {}, { ...context, companyId: 2 })).rejects.toThrow();
    await expect(service.handleCascadeUpdate(2, 1, {}, context)).rejects.toThrow();
    await h.prisma.entityRecord.update({ where: { id: 1 }, data: { deletedAt: new Date() } });
    await expect(update()).rejects.toThrow();
  });
  it.each([['entity_1', 'read'], ['entity_1', 'write'], ['entity_2', 'read'], ['entity_2', 'write']])('enforces %s %s rules', async (model, action) => {
    await deny(model, action); await expect(update()).rejects.toThrow();
    expect((await data()).status).toBeUndefined();
  });
  it.each(['entity_1', 'entity_2'])('enforces %s unlink rules', async model => {
    await deny(model, 'unlink'); await expect(service.handleCascadeDelete(1, 1, context)).rejects.toThrow();
    expect((await row()).deletedAt).toBeNull();
  });
  it.each(['update', 'delete'])('rolls back earlier writes when a later %s target is denied', async operation => {
    await deny('entity_2', operation === 'delete' ? 'unlink' : 'write', '{"name":{"ne":"Target 6"}}');
    const emit = jest.spyOn(h.app.get(EventEmitter2), 'emit');
    await expect(operation === 'delete' ? service.handleCascadeDelete(1, 1, context) : update()).rejects.toThrow();
    expect((await data()).status).toBeUndefined(); expect((await row()).deletedAt).toBeNull();
    expect(emit.mock.calls.filter(call => ['record.updated', 'record.deleted'].includes(String(call[0])))).toHaveLength(0);
  });
  it('validates required fields and post-update rules', async () => {
    await expect(service.handleCascadeUpdate(1, 1, { name: null }, context)).rejects.toThrow();
    await deny('entity_2', 'write', '{"name":{"ne":"Blocked"}}');
    await expect(service.handleCascadeUpdate(1, 1, { name: 'Blocked' }, context)).rejects.toThrow();
    expect((await data()).name).toBe('Target 5');
  });
  it('skips deleted targets and unrelated relationship links', async () => {
    await h.prisma.entityRecord.update({ where: { id: 5 }, data: { deletedAt: new Date() } });
    const other = await h.prisma.entityRelationship.create({ data: { sourceEntityId: 1, targetEntityId: 1, type: 'many_to_many', name: 'other', label: 'Other' } });
    await h.prisma.entityRelationshipRecord.create({ data: { relationshipId: other.id, sourceRecordId: 1, targetRecordId: 3 } });
    await update();
    expect((await data()).status).toBeUndefined(); expect((await data(3)).status).toBeUndefined();
    expect((await data(6)).status).toBe('new');
  });

  it('handles both directions of a self-relation without rewriting the source', async () => {
    await h.prisma.entityRelationshipRecord.deleteMany();
    await h.prisma.entityRelationship.update({ where: { id: relation }, data: { targetEntityId: 1 } });
    await h.prisma.entityRelationshipRecord.createMany({ data: [[1, 2], [3, 1], [1, 1], [2, 1]].map(([sourceRecordId, targetRecordId]) => ({ relationshipId: relation, sourceRecordId, targetRecordId })) });
    const writes = jest.spyOn(RecordService.prototype, 'updateRecord');
    await update();
    expect(writes).toHaveBeenCalledTimes(2);
    expect((await data(1)).status).toBeUndefined();
    expect((await data(2)).status).toBe('new'); expect((await data(3)).status).toBe('new');
  });

  it('computes stored formulas through normal record validation', async () => {
    await h.prisma.entityField.create({ data: { entityId: 2, name: 'total', slug: 'total', label: 'Total', type: 'formula', formulaExpression: '2 * 5', isStored: true } });
    await service.handleCascadeUpdate(1, 1, { total: 999 }, context);
    expect((await data()).total).toBe(10); expect((await data(6)).total).toBe(10);
  });

  it('rolls back earlier writes on a database failure', async () => {
    const original = RecordService.prototype.updateRecord;
    jest.spyOn(RecordService.prototype, 'updateRecord').mockImplementation(async function (...args: Parameters<RecordService['updateRecord']>) {
      if (args[0] === 6) throw new Error('write failed');
      return original.apply(this, args);
    });
    await expect(update()).rejects.toThrow('write failed');
    expect((await data()).status).toBeUndefined();
  });
});
