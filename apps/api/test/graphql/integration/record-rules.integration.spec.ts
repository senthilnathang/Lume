import { jest } from '@jest/globals';
import { createHarness, type Harness } from './harness';
import { SecurityService } from '../../../src/modules/base/services/security.service';
import { ForbiddenException } from '@nestjs/common';

jest.setTimeout(120000);
describe('GraphQL record-rule management (real MySQL)', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness(); });
  afterAll(async () => { await h?.close(); });
  const fields = 'id name modelName action domain groups users sequence isActive createdAt updatedAt';
  const create = (extra = {}, token?: string) => h.query(`mutation($name:String!,$model:String!,$action:String!,$domain:String!,$groups:String,$users:String,$sequence:Int) {
    createRecordRule(name:$name,modelName:$model,action:$action,domain:$domain,groups:$groups,users:$users,sequence:$sequence) { ${fields} }
  }`, token ?? h.token(), { name: 'Rule', model: 'entity_1', action: 'read', domain: '{"name":{"ne":"hidden"}}', ...extra });

  it('persists, updates and deactivates rules with actor audit records', async () => {
    const created = await create({ groups: '[2]', users: '[2]' });
    expect(created.body.errors).toBeUndefined();
    const rule = created.body.data.createRecordRule;
    const id = Number(rule.id);
    expect(rule).toMatchObject({ sequence: 10, isActive: true, groups: '[2]', users: '[2]' });
    expect(rule.createdAt).not.toBeNull();
    const updated = await h.query(`mutation { updateRecordRule(id:${id},name:"Updated",action:"delete",groups:null,sequence:0) { ${fields} } }`);
    expect(updated.body.errors).toBeUndefined();
    expect(updated.body.data.updateRecordRule).toMatchObject({ name: 'Updated', action: 'unlink', groups: null, users: '[2]', sequence: 0, domain: rule.domain });
    expect((await h.query(`{ recordRule(id:${id}) { name } }`)).body.data.recordRule.name).toBe('Updated');
    expect((await h.query(`mutation { deleteRecordRule(id:${id}) }`)).body.data.deleteRecordRule).toBe(true);
    expect((await h.query(`mutation { deleteRecordRule(id:${id}) }`)).body.data.deleteRecordRule).toBe(false);
    expect((await h.prisma.recordRule.findUnique({ where: { id } })).isActive).toBe(false);
    const logs = await h.prisma.security_logs.findMany({ where: { event: { startsWith: 'record_rule.' } }, orderBy: { id: 'asc' } });
    expect(logs.map((log: any) => log.event)).toEqual(['record_rule.created', 'record_rule.updated', 'record_rule.deleted']);
    expect(logs.every((log: any) => log.user_id === 1 && JSON.parse(log.details).ruleId === id)).toBe(true);
  });

  it('filters, paginates and orders rules with stable tie breaking', async () => {
    for (const name of ['First','Second','Third']) expect((await create({ name, model: 'entity_2', sequence: 20 })).body.errors).toBeUndefined();
    const response = await h.query('{ recordRules(modelName:"entity_2",pagination:{page:2,limit:1}) { name } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.recordRules).toEqual([{ name: 'Second' }]);
    const next = await create({ model: 'entity_2' });
    expect(next.body.data.createRecordRule.sequence).toBe(30);
    expect((await create({ model: 'EntityRecord' })).body.errors).toBeUndefined();
  });

  it('represents legacy null timestamps without making the query fail', async () => {
    const row = await h.prisma.recordRule.create({ data: { name: 'Legacy', modelName: 'EntityRecord', action: 'read', domain: '{}', isActive: null, sequence: null } });
    const response = await h.query(`{ recordRule(id:${row.id}) { ${fields} } }`);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.recordRule).toMatchObject({ createdAt: null, updatedAt: null, isActive: null, sequence: null });
  });

  it.each([
    [{ name: ' ' }, 'BAD_REQUEST'], [{ model: 'missing_model' }, 'NOT_FOUND'],
    [{ action: 'execute' }, 'BAD_REQUEST'], [{ domain: 'invalid' }, 'BAD_REQUEST'],
    [{ domain: 'null' }, 'BAD_REQUEST'], [{ domain: '[]' }, 'BAD_REQUEST'],
    [{ domain: '{"name":{"unknown":1}}' }, 'BAD_REQUEST'],
    [{ domain: '{"name":{"in":1}}' }, 'BAD_REQUEST'],
    [{ groups: '{}' }, 'BAD_REQUEST'], [{ users: '[0]' }, 'BAD_REQUEST'],
    [{ sequence: -1 }, 'BAD_REQUEST'],
  ])('rejects invalid rule data without writes: %s', async (input, code) => {
    const before = await h.prisma.recordRule.count();
    const response = await create(input);
    expect(response.body.errors[0].extensions.code).toBe(code);
    expect(await h.prisma.recordRule.count()).toBe(before);
  });

  it('atomically rejects a reorder with a missing ID or duplicates', async () => {
    const rows = await h.prisma.recordRule.findMany({ where: { modelName: 'entity_2' }, orderBy: { id: 'asc' } });
    for (const ids of [[rows[0].id,999999], [rows[0].id,rows[0].id]]) {
      const response = await h.query(`mutation { reorderRecordRules(rules:[${ids.join(',')}]) { id } }`);
      expect(response.body.errors[0].extensions.code).toBe(ids[1] === 999999 ? 'NOT_FOUND' : 'BAD_REQUEST');
      expect(await h.prisma.recordRule.findMany({ where: { modelName: 'entity_2' }, orderBy: { id: 'asc' } })).toEqual(rows);
    }
    const ids = rows.map((row: any) => row.id).reverse();
    const response = await h.query(`mutation { reorderRecordRules(rules:[${ids.join(',')}]) { id sequence } }`);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.reorderRecordRules).toEqual(ids.map((id: number, i: number) => ({ id: String(id), sequence: (i + 1) * 10 })));
  });

  it('rejects missing mutation targets and invalid IDs', async () => {
    for (const query of ['mutation { updateRecordRule(id:999999,name:"Missing") { id } }','mutation { deleteRecordRule(id:999999) }']) {
      expect((await h.query(query)).body.errors[0].extensions.code).toBe('NOT_FOUND');
    }
    expect((await h.query('{ recordRule(id:999999) { id } }')).body.data.recordRule).toBeNull();
    expect((await h.query('{ recordRule(id:0) { id } }')).body.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect((await h.query('{ recordRules(pagination:{page:0}) { id } }')).body.errors[0].extensions.code).toBe('BAD_REQUEST');
  });

  it('requires management permissions for reads and every mutation', async () => {
    expect((await create({}, h.token('member'))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    for (const query of ['{ recordRules { id } }','{ recordRule(id:1) { id } }','mutation { updateRecordRule(id:1,name:"Denied") { id } }','mutation { deleteRecordRule(id:1) }','mutation { reorderRecordRules(rules:[1]) { id } }']) {
      expect((await h.query(query, h.token('member'))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    }
  });

  it('rolls back reordering when audit persistence fails', async () => {
    const rows = await h.prisma.recordRule.findMany({ where: { modelName: 'entity_2' }, orderBy: { id: 'asc' } });
    let fail = true;
    h.prisma.$use(async (params: any, next: any) => {
      if (fail && params.model === 'security_logs' && params.action === 'create') throw new Error('Simulated audit failure');
      return next(params);
    });
    try {
      const response = await h.query(`mutation { reorderRecordRules(rules:[${rows.map((r: any) => r.id).join(',')}]) { id } }`);
      expect(response.body.errors).toBeDefined();
      expect(await h.prisma.recordRule.findMany({ where: { modelName: 'entity_2' }, orderBy: { id: 'asc' } })).toEqual(rows);
    } finally { fail = false; }
  });

  it('evaluates persisted group and user scopes without dropping global constraints', async () => {
    const security = new SecurityService(h.prisma);
    for (const input of [
      { domain: '{"score":{"gte":10}}' },
      { domain: '{"score":{"lte":20}}', groups: '[2]' },
      { domain: '{"score":{"ne":15}}', users: '[2]' },
    ]) expect((await create({ model:'entity_3', ...input })).body.errors).toBeUndefined();
    await expect(security.checkRecordRules('entity_3','read',{score:12},{userId:2,roleId:2})).resolves.toBe(true);
    for (const score of [5,15,25]) await expect(security.checkRecordRules('entity_3','read',{score},{userId:2,roleId:2})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(security.checkRecordRules('entity_3','read',{score:25},{userId:3,roleId:3})).resolves.toBe(true);
    await expect(security.checkRecordRules('entity_3','read',{score:5},{userId:3,roleId:3})).rejects.toBeInstanceOf(ForbiddenException);
    const domains = await security.getRecordRuleDomain('entity_3','read',{userId:2,roleId:2});
    expect(domains.$and).toHaveLength(3);
  });

  it('honors action, model and activation changes without stale rule caching', async () => {
    const security = new SecurityService(h.prisma);
    const created = await create({ model:'entity_4', action:'delete', domain:'{"status":"active"}', groups:'[2]' });
    expect(created.body.errors).toBeUndefined();
    const id = created.body.data.createRecordRule.id;
    const context = {userId:2,roleId:2};
    await expect(security.checkRecordRules('entity_4','delete',{status:'blocked'},context)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(security.checkRecordRules('entity_4','read',{status:'blocked'},context)).resolves.toBe(true);
    await expect(security.checkRecordRules('entity_5','delete',{status:'blocked'},context)).resolves.toBe(true);
    expect((await h.query(`mutation { deleteRecordRule(id:${id}) }`)).body.data.deleteRecordRule).toBe(true);
    await expect(security.checkRecordRules('entity_4','delete',{status:'blocked'},context)).resolves.toBe(true);
  });

  it('fails closed on malformed legacy scopes and domains', async () => {
    const security = new SecurityService(h.prisma);
    const rule = await h.prisma.recordRule.create({ data: { name:'Malformed',modelName:'entity_5',action:'read',domain:'{}',groups:'not-json' } });
    await expect(security.checkRecordRules('entity_5','read',{}, {userId:2,roleId:2})).rejects.toBeInstanceOf(ForbiddenException);
    await h.prisma.recordRule.update({ where:{id:rule.id}, data:{groups:null,domain:'{"value":{"in":1}}'} });
    await expect(security.checkRecordRules('entity_5','read',{value:1}, {userId:2,roleId:2})).rejects.toBeInstanceOf(ForbiddenException);
  });
});
