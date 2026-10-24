import { jest } from '@jest/globals';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHarness, type Harness } from './harness';
import { RelationshipService } from '../../../src/modules/base/services/relationship.service';
import { RelationshipChangedEvent } from '../../../src/modules/base/events/relationship.events';

jest.setTimeout(120000);
describe('Relationship-driven rollups (real MySQL, HTTP and Nest events)', () => {
  let h: Harness;
  let service: RelationshipService;
  let relation: number;
  const context = { entityId: 2, companyId: 1, userId: 2 };
  beforeAll(async () => { h = await createHarness({ rollups: true }); service = h.app.get(RelationshipService); });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.automation_rollup_fields.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.prisma.entityRelationshipRecord.deleteMany();
    await h.prisma.entityRelationship.deleteMany();
    await h.seed();
    for (const id of [1,2,3,4]) await h.prisma.entityRecord.update({ where: { id }, data: { data: JSON.stringify({ name: 'Child ' + id, amount: id * 10 }) } });
    for (const id of [5,6,7]) await h.prisma.entityRecord.create({ data: { id, entityId: 2, companyId: id === 7 ? 2 : 1, createdBy: 1, data: JSON.stringify({ name: 'Parent ' + id, total: -1 }) } });
    relation = (await h.prisma.entityRelationship.create({ data: { sourceEntityId: 2, targetEntityId: 1, type: 'many_to_many', name: 'children', label: 'Children' } })).id;
    await h.prisma.automation_rollup_fields.create({ data: { name: 'Total', parent_model: 'entity_2', child_model: 'entity_1', rollup_field: 'amount', target_field: 'total', operation: 'sum', filter_condition: '{}' } });
  });
  afterEach(() => jest.restoreAllMocks());
  const total = async (id = 5) => JSON.parse((await h.prisma.entityRecord.findUnique({ where: { id } })).data).total;
  const link = (child = 1, parent = 5) => service.linkRecords(relation,parent,child,context);
  const unlink = (child = 1) => service.unlinkRecords(relation,5,child,context);

  it('recomputes on committed links and resets after the final unlink', async () => {
    await link(); expect(await total()).toBe(10);
    await link(2); expect(await total()).toBe(30);
    await unlink(); expect(await total()).toBe(20);
    await unlink(2); expect(await total()).toBe(0);
    expect(await total(6)).toBe(-1); expect(await total(7)).toBe(-1);
  });

  it('works through authenticated HTTP endpoints and real decorated listeners', async () => {
    const endpoint = '/api/entities/2/records/5/relationships';
    const body = { relationshipId: relation, targetRecordId: 1 };
    expect((await request(h.app.getHttpServer()).post(endpoint).auth(h.token(), { type: 'bearer' }).send(body)).status).toBe(201);
    expect(await total()).toBe(10);
    expect((await request(h.app.getHttpServer()).delete(endpoint).auth(h.token(), { type: 'bearer' }).send(body)).status).toBe(200);
    expect(await total()).toBe(0);
  });

  it('handles relationships whose source is the child', async () => {
    await h.prisma.entityRelationship.update({ where: { id: relation }, data: { sourceEntityId: 1, targetEntityId: 2 } });
    const ctx = { ...context, entityId: 1 };
    await service.linkRecords(relation,1,5,ctx); expect(await total()).toBe(10);
    await service.unlinkRecords(relation,1,5,ctx); expect(await total()).toBe(0);
  });

  it('uses source as parent for self-relations', async () => {
    await h.prisma.entityRelationship.update({ where: { id: relation }, data: { sourceEntityId: 1 } });
    await h.prisma.automation_rollup_fields.updateMany({ data: { parent_model: 'entity_1' } });
    const ctx = { ...context, entityId: 1 };
    await service.linkRecords(relation,1,2,ctx); expect(await total(1)).toBe(20);
    expect(await total(2)).toBeUndefined();
    await service.unlinkRecords(relation,1,2,ctx); expect(await total(1)).toBe(0);
  });

  it('does not emit events for duplicate links, missing unlinks or denied mutations', async () => {
    const emit = jest.spyOn(h.app.get(EventEmitter2),'emitAsync');
    await link(); await link(); await unlink(); await unlink();
    await expect(link(4)).rejects.toThrow();
    expect(emit.mock.calls.filter(call => call[0] === 'relationship.changed')).toHaveLength(2);
  });

  it('deduplicates children across relationships and preserves remaining links', async () => {
    await link();
    const other = await h.prisma.entityRelationship.create({ data: { sourceEntityId: 2, targetEntityId: 1, type: 'many_to_many', name: 'other', label: 'Other' } });
    await service.linkRecords(other.id,5,1,context); expect(await total()).toBe(10);
    await unlink(); expect(await total()).toBe(10);
    await service.unlinkRecords(other.id,5,1,context); expect(await total()).toBe(0);
  });

  it.each(['avg','min','max'])('resets empty %s to null', async operation => {
    await h.prisma.automation_rollup_fields.updateMany({ data: { operation } });
    await link(); await unlink(); expect(await total()).toBeNull();
  });

  it('applies filters and excludes legacy foreign-tenant links', async () => {
    await h.prisma.automation_rollup_fields.updateMany({ data: { filter_condition: '{"amount":{"$gte":20}}' } });
    await h.prisma.entityRelationshipRecord.create({ data: { relationshipId: relation, sourceRecordId: 5, targetRecordId: 4 } });
    await link(); expect(await total()).toBe(0);
    await link(2); expect(await total()).toBe(20);
  });

  it('does not publish partial totals when another contributor is unreadable', async () => {
    await link();
    await h.prisma.recordRule.create({ data: { name: 'Hide first', modelName: 'entity_1', action: 'read', groups: '[2]', domain: '{"name":{"ne":"Child 1"}}' } });
    jest.spyOn(console,'error').mockImplementation(() => {});
    await link(2);
    expect(await total()).toBe(10);
    expect(await h.prisma.entityRelationshipRecord.count()).toBe(2);
  });

  it('honors post-update parent rules while retaining the committed link', async () => {
    await h.prisma.recordRule.create({ data: { name: 'No total change', modelName: 'entity_2', action: 'write', groups: '[2]', domain: '{"total":-1}' } });
    jest.spyOn(console,'error').mockImplementation(() => {});
    await link(); expect(await total()).toBe(-1);
    expect(await h.prisma.entityRelationshipRecord.count()).toBe(1);
  });

  it('serializes concurrent link recomputations to the final persisted total', async () => {
    await Promise.all([link(1),link(2),link(3)]);
    expect(await total()).toBe(60);
  });

  it.each([true,false])('resets a parent when the removed child is deleted before event delivery (soft=%s)', async soft => {
    await link();
    await h.prisma.entityRelationshipRecord.deleteMany();
    if (soft) await h.prisma.entityRecord.update({ where: { id: 1 }, data: { deletedAt: new Date() } });
    else await h.prisma.entityRecord.delete({ where: { id: 1 } });
    await h.app.get(EventEmitter2).emitAsync('relationship.changed', new RelationshipChangedEvent(relation,5,1,2,1));
    expect(await total()).toBe(0);
  });
});
