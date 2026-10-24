import { jest } from '@jest/globals';
import { createHarness, type Harness } from './harness';
jest.setTimeout(120000);

describe('GraphQL DataGrid integration (real MySQL)', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness(); });
  afterAll(async () => { await h?.close(); });
  it.each([[undefined, 20], [10, 10], [500, 100]])('paginates entities at limit %s', async (limit, expected) => {
    const response = await h.query(`{ entities${limit ? `(pagination:{limit:${limit}})` : ''} { id name label } }`);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entities).toHaveLength(expected);
  });
  it('rejects invalid pagination', async () => {
    const response = await h.query('{ entities(pagination:{page:0,limit:-1}) { id } }');
    expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
  });
  it('gets a stored entity by ID', async () => {
    const response = await h.query('{ entity(id:1) { id name label } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entity).toEqual({ id: 1, name: 'entity_1', label: 'Entity 1' });
  });
  it('resolves fields through one batched query', async () => {
    h.queries.length = 0;
    const response = await h.query('{ entities(pagination:{limit:5}) { id fields { name type } } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entities.every((entity: any) => entity.fields.some((field: any) => field.name === 'name'))).toBe(true);
    expect(h.queries.filter(sql => sql.includes('FROM') && sql.includes('`entity_fields`'))).toHaveLength(1);
  });
  it('returns tenant-scoped pagination and parsed JSON data', async () => {
    const response = await h.query('{ entityRecords(entityId:1,pagination:{limit:2}) { items { id data } total page totalPages hasNextPage } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entityRecords).toMatchObject({ total: 3, page: 1, totalPages: 2, hasNextPage: true });
    expect(response.body.data.entityRecords.items).toHaveLength(2);
    expect(typeof response.body.data.entityRecords.items[0].data).toBe('object');
  });
  it('gets a record without leaking a different tenant or entity', async () => {
    const response = await h.query('{ own:entityRecord(entityId:1,recordId:1) { id data } other:entityRecord(entityId:1,recordId:4) { id } wrong:entityRecord(entityId:2,recordId:1) { id } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.own.data.name).toBe('Record 1');
    expect(response.body.data.other).toBeNull();
    expect(response.body.data.wrong).toBeNull();
  });
  it('hides unreadable fields and masks protected values for non-admins', async () => {
    const response = await h.query('{ entityRecord(entityId:1,recordId:1) { data } }', h.token('member'));
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entityRecord.data).toEqual({ name: 'Record 1', readonly: 'fixed', masked: '****' });
  });
  it('rejects writes to read-only fields without modifying storage', async () => {
    const response = await h.query('mutation { updateEntityRecord(entityId:1,recordId:1,input:{data:{readonly:"changed"}}) { id } }', h.token('member'));
    expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(JSON.parse((await h.prisma.entityRecord.findUnique({ where: { id: 1 } })).data).readonly).toBe('fixed');
  });
  it('creates, updates, and soft-deletes entity metadata with actor attribution', async () => {
    const created = await h.query('mutation { createEntity(input:{name:"new_entity",label:"New"}) { id name createdBy } }');
    expect(created.body.errors).toBeUndefined();
    const id = created.body.data.createEntity.id;
    expect(created.body.data.createEntity.createdBy).toBe(1);
    const updated = await h.query(`mutation { updateEntity(id:${id},input:{label:"Updated"}) { label } }`);
    expect(updated.body.data.updateEntity.label).toBe('Updated');
    const deleted = await h.query(`mutation { deleteEntity(id:${id}) }`);
    expect(deleted.body.data.deleteEntity).toBe(true);
    expect((await h.prisma.entity.findUnique({ where: { id } })).deletedAt).not.toBeNull();
    expect((await h.query(`{ entity(id:${id}) { id } }`)).body.data.entity).toBeNull();
  });
  it('creates and updates records with validated JSON data', async () => {
    const created = await h.query('mutation { createEntityRecord(entityId:1,input:{data:{name:"New"}}) { id data companyId createdBy } }');
    expect(created.body.errors).toBeUndefined();
    const record = created.body.data.createEntityRecord;
    expect(record).toMatchObject({ data: { name: 'New' }, companyId: 1, createdBy: 1 });
    const response = await h.query(`mutation { updateEntityRecord(entityId:1,recordId:${record.id},input:{data:{name:"Updated"}}) { data } }`);
    expect(response.body.data.updateEntityRecord.data.name).toBe('Updated');
  });
  it('validates required fields on create', async () => {
    const count = await h.prisma.entityRecord.count();
    const response = await h.query('mutation { createEntityRecord(entityId:1,input:{data:{secret:"value"}}) { id } }');
    expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect(await h.prisma.entityRecord.count()).toBe(count);
  });
  it('rejects cross-tenant updates', async () => {
    const response = await h.query('mutation { updateEntityRecord(entityId:1,recordId:4,input:{data:{name:"Wrong"}}) { id } }');
    expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    expect(JSON.parse((await h.prisma.entityRecord.findUnique({ where: { id: 4 } })).data).name).toBe('Record 4');
  });
  it('atomically rejects mixed-tenant bulk deletion', async () => {
    const response = await h.query('mutation { deleteEntityRecords(recordIds:[1,4]) { id } }');
    expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
    expect((await h.prisma.entityRecord.findUnique({ where: { id: 1 } })).deletedAt).toBeNull();
  });
  it('soft-deletes a batch without removing rows', async () => {
    const response = await h.query('mutation { deleteEntityRecords(recordIds:[1,2,3]) { id deletedAt } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.deleteEntityRecords).toHaveLength(3);
    expect(await h.prisma.entityRecord.count({ where: { id: { in: [1,2,3] }, deletedAt: { not: null } } })).toBe(3);
  });
});
