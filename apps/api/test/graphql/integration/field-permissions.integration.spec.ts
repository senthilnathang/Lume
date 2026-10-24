import { jest } from '@jest/globals';
import { createHarness, type Harness } from './harness';

jest.setTimeout(120000);

describe('GraphQL field permission persistence (real MySQL)', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness(); });
  afterAll(async () => { await h?.close(); });
  const selection = 'id fieldId roleId canRead canWrite isMasked maskChar createdAt updatedAt';

  it('loads an existing permission and returns null for an absent pair', async () => {
    const response = await h.query(`{ found:fieldPermission(fieldId:202,roleId:2) { ${selection} } missing:fieldPermission(fieldId:1,roleId:2) { id } }`);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.found).toMatchObject({ fieldId: 202, roleId: 2, isMasked: true, maskChar: '*' });
    expect(response.body.data.missing).toBeNull();
  });

  it('creates and updates one permission, immediately enforcing read and write restrictions', async () => {
    const created = await h.query(`mutation { setFieldPermission(input:{fieldId:1,roleId:2,canRead:false,canWrite:false}) { ${selection} } }`);
    expect(created.body.errors).toBeUndefined();
    const id = created.body.data.setFieldPermission.id;
    const read = await h.query('{ entityRecord(entityId:1,recordId:1) { data } }', h.token('member'));
    expect(read.body.errors).toBeUndefined();
    expect(read.body.data.entityRecord.data).not.toHaveProperty('name');
    const write = await h.query('mutation { updateEntityRecord(entityId:1,recordId:1,input:{data:{name:"denied"}}) { id } }', h.token('member'));
    expect(write.body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(JSON.parse((await h.prisma.entityRecord.findUnique({ where: { id: 1 } })).data).name).toBe('Record 1');
    const updated = await h.query(`mutation { setFieldPermission(input:{fieldId:1,roleId:2,canRead:true,canWrite:true}) { ${selection} } }`);
    expect(updated.body.errors).toBeUndefined();
    expect(updated.body.data.setFieldPermission.id).toBe(id);
    expect(await h.prisma.entityFieldPermission.count({ where: { fieldId: 1, roleId: 2 } })).toBe(1);
    const allowed = await h.query('mutation { updateEntityRecord(entityId:1,recordId:1,input:{data:{name:"allowed"}}) { data } }', h.token('member'));
    expect(allowed.body.errors).toBeUndefined();
    expect(allowed.body.data.updateEntityRecord.data.name).toBe('allowed');
  });

  it('sets masking and preserves it when only access flags are updated', async () => {
    const masked = await h.query(`mutation { setFieldPermission(input:{fieldId:202,roleId:2,canRead:true,isMasked:true,maskChar:"#"}) { ${selection} } }`);
    expect(masked.body.errors).toBeUndefined();
    const updated = await h.query(`mutation { setFieldPermission(input:{fieldId:202,roleId:2,canRead:true,canWrite:false}) { ${selection} } }`);
    expect(updated.body.errors).toBeUndefined();
    expect(updated.body.data.setFieldPermission).toMatchObject({ isMasked: true, maskChar: '#' });
    const read = await h.query('{ entityRecord(entityId:1,recordId:2) { data } }', h.token('member'));
    expect(read.body.data.entityRecord.data.masked).toBe('####');
  });

  it.each([
    ['fieldId:999999,roleId:2', 'NOT_FOUND'],
    ['fieldId:1,roleId:999999', 'NOT_FOUND'],
    ['fieldId:0,roleId:2', 'BAD_REQUEST'],
    ['fieldId:1,roleId:-1', 'BAD_REQUEST'],
    ['fieldId:1,roleId:2,maskChar:""', 'BAD_REQUEST'],
    ['fieldId:1,roleId:2,maskChar:"123456"', 'BAD_REQUEST'],
    ['fieldId:1,roleId:2,canRead:null', 'BAD_REQUEST'],
  ])('rejects invalid settings without modifying storage: %s', async (input, code) => {
    const before = await h.prisma.entityFieldPermission.findMany({ orderBy: { id: 'asc' } });
    const response = await h.query(`mutation { setFieldPermission(input:{${input}}) { id } }`);
    expect(response.body.errors[0].extensions.code).toBe(code);
    expect(await h.prisma.entityFieldPermission.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
  });

  it('denies permission management to a member', async () => {
    for (const query of [
      '{ fieldPermission(fieldId:1,roleId:2) { id } }',
      'mutation { setFieldPermission(input:{fieldId:1,roleId:2,canRead:false}) { id } }',
      'mutation { removeFieldPermission(fieldId:1,roleId:2) }',
    ]) {
      const response = await h.query(query, h.token('member'));
      expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    }
    expect((await h.prisma.entityFieldPermission.findUnique({ where: { fieldId_roleId: { fieldId: 1, roleId: 2 } } })).canRead).toBe(true);
  });

  it('removes only the requested pair and reports subsequent removal as false', async () => {
    const query = 'mutation { removeFieldPermission(fieldId:1,roleId:2) }';
    const removed = await h.query(query);
    expect(removed.body.errors).toBeUndefined();
    expect(removed.body.data.removeFieldPermission).toBe(true);
    expect((await h.query(query)).body.data.removeFieldPermission).toBe(false);
    expect((await h.query('{ fieldPermission(fieldId:1,roleId:2) { id } }')).body.data.fieldPermission).toBeNull();
    expect(await h.prisma.entityFieldPermission.count({ where: { roleId: 2 } })).toBe(3);
  });

  it.each(['field', 'entity'])('rejects and hides permissions for a deleted %s', async kind => {
    const table = kind === 'field' ? h.prisma.entityField : h.prisma.entity;
    const id = kind === 'field' ? 202 : 1;
    await table.update({ where: { id }, data: { deletedAt: new Date() } });
    try {
      const write = await h.query('mutation { setFieldPermission(input:{fieldId:202,roleId:2}) { id } }');
      expect(write.body.errors[0].extensions.code).toBe('NOT_FOUND');
      const read = await h.query('{ fieldPermission(fieldId:202,roleId:2) { id } fieldPermissions(fieldId:202) { id } }');
      expect(read.body.errors).toBeUndefined();
      expect(read.body.data).toEqual({ fieldPermission: null, fieldPermissions: [] });
    } finally {
      await table.update({ where: { id }, data: { deletedAt: null } });
    }
  });
});
