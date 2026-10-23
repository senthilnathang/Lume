import { jest } from '@jest/globals';
import { createHarness, type Harness } from './harness';

jest.setTimeout(120000);
describe('GraphQL role management (real MySQL)', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness(); });
  afterAll(async () => { await h?.close(); });
  const fields = 'id name displayName description isActive isSystem metadata createdAt updatedAt';

  it('loads role relations in batches with GraphQL field names', async () => {
    h.queries.length = 0;
    const result = await h.query(`{ roles { ${fields} permissions { id name displayName category isActive } fieldPermissions { fieldId canRead isMasked role { displayName isSystem } } } }`);
    expect(result.body.errors).toBeUndefined();
    const member = result.body.data.roles.find((r: any) => r.name === 'member');
    expect(member.permissions).toHaveLength(4);
    expect(member.permissions[0].displayName).toBe(member.permissions[0].name);
    expect(member.fieldPermissions).toHaveLength(3);
    expect(member.fieldPermissions[0].role).toEqual({ displayName: 'member', isSystem: false });
    expect(h.queries.filter(q => q.includes('FROM') && q.includes('`role_permissions`'))).toHaveLength(1);
    expect(h.queries.filter(q => q.includes('FROM') && q.includes('`entity_field_permissions`'))).toHaveLength(1);
    expect((await h.query('{ role(id:999999) { id } }')).body.data.role).toBeNull();
  });

  it('creates, updates, reads and deletes an audited custom role', async () => {
    const created = await h.query(`mutation { createRole(input:{name:" custom ",displayName:" Custom ",description:"description",metadata:"{}"}) { ${fields} permissions { id } fieldPermissions { id } } }`);
    expect(created.body.errors).toBeUndefined();
    const role = created.body.data.createRole;
    role.id = Number(role.id);
    expect(role).toMatchObject({ name: 'custom', displayName: 'Custom', isSystem: false, isActive: true, permissions: [], fieldPermissions: [] });
    const updated = await h.query(`mutation { updateRole(id:${role.id},input:{displayName:"Updated",description:null,isActive:false}) { ${fields} } }`);
    expect(updated.body.errors).toBeUndefined();
    expect(updated.body.data.updateRole).toMatchObject({ name: 'custom', displayName: 'Updated', description: null, isActive: false, metadata: '{}' });
    expect((await h.query(`{ role(id:${role.id}) { displayName } }`)).body.data.role.displayName).toBe('Updated');
    const permission = await h.prisma.permission.findFirst();
    await h.prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    await h.prisma.entityFieldPermission.create({ data: { roleId: role.id, fieldId: 1 } });
    expect((await h.query(`mutation { deleteRole(id:${role.id}) }`)).body.data.deleteRole).toBe(true);
    expect(await h.prisma.role.findUnique({ where: { id: role.id } })).toBeNull();
    expect(await h.prisma.rolePermission.count({ where: { roleId: role.id } })).toBe(0);
    expect(await h.prisma.entityFieldPermission.count({ where: { roleId: role.id } })).toBe(0);
    const logs = await h.prisma.security_logs.findMany({ where: { event: { startsWith: 'role.' } }, orderBy: { id: 'asc' } });
    expect(logs.map((log: any) => log.event)).toEqual(['role.created', 'role.updated', 'role.deleted']);
    expect(logs.every((log: any) => log.user_id === 1 && JSON.parse(log.details).roleId === role.id)).toBe(true);
  });

  it('rejects duplicate names without writing an audit success', async () => {
    const count = await h.prisma.security_logs.count();
    const result = await h.query('mutation { createRole(input:{name:"member",displayName:"Duplicate"}) { id } }');
    expect(result.body.errors[0].extensions.code).toBe('CONFLICT');
    expect(await h.prisma.security_logs.count()).toBe(count);
  });

  it.each([
    'mutation { createRole(input:{name:" ",displayName:"Role"}) { id } }',
    'mutation { createRole(input:{name:"valid",displayName:" "}) { id } }',
    'mutation { updateRole(id:2,input:{displayName:null}) { id } }',
    'mutation { updateRole(id:2,input:{isActive:null}) { id } }',
    'mutation { deleteRole(id:0) }',
    '{ role(id:-1) { id } }',
  ])('rejects invalid input: %s', async query => {
    const result = await h.query(query);
    expect(result.body.errors[0].extensions.code).toBe('BAD_REQUEST');
  });

  it('protects reserved and system roles even for admins', async () => {
    const system = await h.prisma.role.create({ data: { name: 'system', display_name: 'System', is_system: true } });
    for (const id of [1, system.id]) {
      for (const query of [`mutation { updateRole(id:${id},input:{displayName:"Changed"}) { id } }`, `mutation { deleteRole(id:${id}) }`]) {
        expect((await h.query(query)).body.errors[0].extensions.code).toBe('FORBIDDEN');
      }
    }
    expect((await h.query('mutation { createRole(input:{name:"SUPER_ADMIN",displayName:"Reserved"}) { id } }')).body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect((await h.prisma.role.findUnique({ where: { id: system.id } })).display_name).toBe('System');
  });

  it('rejects assigned-role deletion without removing its permission rows', async () => {
    const before = await h.prisma.rolePermission.count({ where: { roleId: 2 } });
    const result = await h.query('mutation { deleteRole(id:2) }');
    expect(result.body.errors[0].extensions.code).toBe('CONFLICT');
    expect(await h.prisma.rolePermission.count({ where: { roleId: 2 } })).toBe(before);
    expect(await h.prisma.entityFieldPermission.count({ where: { roleId: 2 } })).toBe(3);
  });

  it('returns not-found errors for missing mutation targets', async () => {
    for (const query of ['mutation { updateRole(id:999999,input:{displayName:"Missing"}) { id } }', 'mutation { deleteRole(id:999999) }']) {
      expect((await h.query(query)).body.errors[0].extensions.code).toBe('NOT_FOUND');
    }
  });

  it('denies role management to an unauthorized member', async () => {
    for (const query of ['{ role(id:2) { id } }', 'mutation { createRole(input:{name:"denied",displayName:"Denied"}) { id } }', 'mutation { updateRole(id:2,input:{displayName:"Denied"}) { id } }', 'mutation { deleteRole(id:2) }']) {
      expect((await h.query(query, h.token('member'))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    }
    expect((await h.prisma.role.findUnique({ where: { id: 2 } })).display_name).toBe('member');
    expect(await h.prisma.role.findUnique({ where: { name: 'denied' } })).toBeNull();
  });

  it('refreshes nested role data between serial mutation fields', async () => {
    const role = await h.prisma.role.create({ data: { name: 'cache_test', display_name: 'Before' } });
    await h.prisma.entityFieldPermission.create({ data: { roleId: role.id, fieldId: 1 } });
    const response = await h.query(`mutation {
      first:updateRole(id:${role.id},input:{displayName:"First"}) { fieldPermissions { role { displayName } } }
      second:updateRole(id:${role.id},input:{displayName:"Second"}) { fieldPermissions { role { displayName } } }
    }`);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.first.fieldPermissions[0].role.displayName).toBe('First');
    expect(response.body.data.second.fieldPermissions[0].role.displayName).toBe('Second');
  });

  it('rolls back role and relation deletion if audit persistence fails', async () => {
    const role = await h.prisma.role.create({ data: { name: 'rollback_test', display_name: 'Rollback' } });
    const permission = await h.prisma.permission.findFirst();
    await h.prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    await h.prisma.entityFieldPermission.create({ data: { roleId: role.id, fieldId: 1 } });
    let failAudit = true;
    h.prisma.$use(async (params: any, next: any) => {
      if (failAudit && params.model === 'security_logs' && params.action === 'create') throw new Error('Simulated audit storage failure');
      return next(params);
    });
    try {
      const response = await h.query(`mutation { deleteRole(id:${role.id}) }`);
      expect(response.body.errors).toBeDefined();
      expect(await h.prisma.role.findUnique({ where: { id: role.id } })).not.toBeNull();
      expect(await h.prisma.rolePermission.count({ where: { roleId: role.id } })).toBe(1);
      expect(await h.prisma.entityFieldPermission.count({ where: { roleId: role.id } })).toBe(1);
    } finally { failAudit = false; }
  });
});
