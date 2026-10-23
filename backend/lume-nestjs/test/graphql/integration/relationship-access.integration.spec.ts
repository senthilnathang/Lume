import { jest } from '@jest/globals';
import request from 'supertest';
import { createHarness, type Harness } from './harness';
import { RelationshipService } from '../../../src/modules/base/services/relationship.service';

jest.setTimeout(120000);
describe('Relationship access enforcement (real MySQL and HTTP)', () => {
  let h: Harness;
  let relationshipId: number;
  let service: RelationshipService;
  const context = { userId:2, companyId:1, entityId:1 };
  beforeAll(async () => { h = await createHarness(); service = h.app.get(RelationshipService); });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.entityRelationshipRecord.deleteMany();
    await h.prisma.entityRelationship.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.seed();
    const permission = await h.prisma.permission.create({data:{name:'base.records.write',display_name:'Write records'}});
    await h.prisma.rolePermission.create({data:{roleId:2,permissionId:permission.id}});
    relationshipId = (await h.prisma.entityRelationship.create({data:{sourceEntityId:1,targetEntityId:2,type:'many_to_many',name:'related',label:'Related'}})).id;
    await h.prisma.entityRecord.createMany({data:[
      {id:5,entityId:2,companyId:1,createdBy:1,data:'{"name":"Target"}'},
      {id:6,entityId:2,companyId:2,createdBy:1,data:'{"name":"Foreign"}'},
    ]});
  });
  const http = (method: string, target = 5, source = 1, entity = 1, bearer = h.token('member'), relationship = relationshipId) =>
    request(h.app.getHttpServer())[method](`/api/entities/${entity}/records/${source}/relationships`)
      .auth(bearer,{type:'bearer'}).send({relationshipId:relationship,targetRecordId:target});
  const restrict = (modelName: string, action: string) => h.prisma.recordRule.create({data:{name:'Deny',modelName,action,groups:'[2]',domain:'{"name":"Not allowed"}'}});

  it('links and unlinks authorized records without duplicating repeated requests', async () => {
    const first = await http('post');
    expect(first.status).toBe(201);
    const again = await http('post');
    expect(again.status).toBe(201);
    expect(again.body.data.data.id).toBe(first.body.data.data.id);
    expect(await h.prisma.entityRelationshipRecord.count()).toBe(1);
    expect(await service.getLinkedRecords(1,relationshipId,context)).toEqual([5]);
    expect((await http('delete')).status).toBe(200);
    expect(await h.prisma.entityRelationshipRecord.count()).toBe(0);
    expect((await http('delete')).status).toBe(200);
  });

  it('serializes concurrent duplicate-link requests', async () => {
    const responses = await Promise.all(Array.from({length:4},()=>http('post')));
    expect(responses.map(r=>r.status)).toEqual([201,201,201,201]);
    expect(await h.prisma.entityRelationshipRecord.count()).toBe(1);
  });

  it.each([
    [6,1,1], [5,4,1], [2,1,1], [5,1,2], [1,5,1], [999999,1,1],
  ])('rejects tenant/entity mismatches or missing records (%s,%s,%s)', async (target,source,entity) => {
    expect((await http('post',target,source,entity)).status).toBe(404);
    expect(await h.prisma.entityRelationshipRecord.count()).toBe(0);
  });

  it('rejects invalid IDs and self links before writes', async () => {
    for (const target of [0,-1,1.5,1]) expect((await http('post',target)).status).toBe(400);
    expect((await http('post',5,1.5)).status).toBe(400);
    expect((await http('post',5,1,1,h.token('member'),999999)).status).toBe(404);
    expect(await h.prisma.entityRelationshipRecord.count()).toBe(0);
  });

  it.each([['entity_1','read'],['entity_1','write'],['entity_2','read'],['entity_2','write'],['EntityRecord','write']])('requires %s %s rule access on both sides', async (model,action) => {
    expect((await http('post')).status).toBe(201);
    await restrict(model,action);
    expect((await http('post')).status).toBe(403);
    expect((await http('delete')).status).toBe(403);
    expect(await h.prisma.entityRelationshipRecord.count()).toBe(1);
  });

  it.each(['record','entity'])('rejects a deleted target %s', async kind => {
    const table = kind === 'record' ? h.prisma.entityRecord : h.prisma.entity;
    await table.update({where:{id:kind === 'record' ? 5 : 2},data:{deletedAt:new Date()}});
    expect((await http('post')).status).toBe(404);
    expect(await h.prisma.entityRelationshipRecord.count()).toBe(0);
  });

  it('does not leak unauthorized or orphaned targets through relationship readers', async () => {
    await h.prisma.entityRelationshipRecord.createMany({data:[5,6,999999].map(targetRecordId=>({relationshipId,sourceRecordId:1,targetRecordId}))});
    expect(await service.getLinkedRecords(1,relationshipId,context)).toEqual([5]);
    await restrict('entity_2','read');
    expect(await service.getRecordRelationships(1,context)).toEqual([]);
    await restrict('entity_1','read');
    await expect(service.getRecordRelationships(1,context)).rejects.toMatchObject({status:403});
    await expect(service.getLinkedRecords(1,relationshipId,undefined as any)).rejects.toMatchObject({status:403});
  });

  it('requires authentication, permission, and a valid authorized tenant', async () => {
    const unauthenticated = await request(h.app.getHttpServer()).post('/api/entities/1/records/1/relationships').send({relationshipId,targetRecordId:5});
    expect(unauthenticated.status).toBe(401);
    expect((await http('post',5,1,1,h.token('none'))).status).toBe(403);
    expect((await http('post',5,1,1,h.token('admin',null))).status).toBe(403);
    expect((await http('post').set('x-org-id','2')).status).toBe(403);
    expect(await h.prisma.entityRelationshipRecord.count()).toBe(0);
  });

  it('does not unlink a cross-tenant legacy link', async () => {
    await h.prisma.entityRelationshipRecord.create({data:{relationshipId,sourceRecordId:1,targetRecordId:6}});
    expect((await http('delete',6)).status).toBe(404);
    expect(await h.prisma.entityRelationshipRecord.count()).toBe(1);
  });
});
