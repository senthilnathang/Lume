import { jest } from '@jest/globals';
import request from 'supertest';
import { createHarness, Harness } from './harness';

jest.setTimeout(120000);
describe('persisted framework GraphQL settings', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness({ frameworkSettings: true }); });
  beforeEach(async () => { await h.prisma.setting.deleteMany(); await h.seed(); });
  afterAll(async () => { await h?.close(); });
  const fields = 'key value group label updatedAt';
  const save = (inputs: any[], token?: string | null) => request(h.app.getHttpServer()).post('/api/v2/graphql')
    .set(token === null ? {} : { Authorization: `Bearer ${token ?? h.token('admin')}` })
    .send({ query: `mutation($inputs:[UpsertSettingInput!]!){ bulkUpsertSettings(inputs:$inputs){ ${fields} } }`, variables: { inputs } });
  it('persists typed values and metadata shared with REST', async () => {
    const result = await save([{ key: 'enabled', value: false, group: 'system', label: 'Enabled' }, { key: 'config', value: { count: 3, names: ['a'] } }]);
    expect(result.body.errors).toBeUndefined();
    expect(result.body.data.bulkUpsertSettings[0]).toMatchObject({ key: 'enabled', value: false, group: 'system', label: 'Enabled' });
    expect(await h.prisma.setting.count()).toBe(2);
    const rest = await request(h.app.getHttpServer()).get('/settings/config').auth(h.token('admin'), { type: 'bearer' });
    expect(rest.body.data.value).toEqual({ count: 3, names: ['a'] });
    const read = await h.query(`{ systemSettings(group:"system"){ ${fields} } systemSetting(key:"missing"){key} }`);
    expect(read.body.errors).toBeUndefined();
    expect(read.body.data.systemSettings).toHaveLength(1);
    expect(read.body.data.systemSetting).toBeNull();
    await save([{ key: 'enabled', value: true }]);
    expect((await h.query('{systemSetting(key:"enabled"){value group label}}')).body.data.systemSetting)
      .toEqual({ value: true, group: 'system', label: 'Enabled' });
  });
  it('requires independent read and write permissions', async () => {
    expect((await save([{ key: 'secret', value: 'x' }], null)).body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect((await save([{ key: 'secret', value: 'x' }], h.token('member'))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect((await h.query('{systemSettings{key}}', h.token('member'))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    const permission = await h.prisma.permission.create({ data: { name: 'settings.read', display_name: 'Read settings' } });
    await h.prisma.rolePermission.create({ data: { roleId: 2, permissionId: permission.id } });
    expect((await h.query('{systemSettings{key}}', h.token('member'))).body.errors).toBeUndefined();
    expect((await save([{ key: 'secret', value: 'x' }], h.token('member'))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(await h.prisma.setting.count()).toBe(0);
  });
  it.each([
    [], [{ key: '', value: 1 }], [{ key: 'x'.repeat(101), value: 1 }],
    [{ key: 'a', value: 1 }, { key: 'a', value: 2 }], [{ key: 'a', value: 1, group: 'x'.repeat(51) }],
    [{ key: 'a', value: 'x'.repeat(60001) }], [{ key: '__proto__', value: 1 }],
  ].map((inputs, index) => ({ inputs, index })))('rejects invalid batch $index before writes', async ({ inputs }) => {
    expect((await save(inputs)).body.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect(await h.prisma.setting.count()).toBe(0);
  });
  it('rolls back every setting when persistence fails midway', async () => {
    await h.prisma.$executeRawUnsafe("CREATE TRIGGER reject_setting BEFORE INSERT ON settings FOR EACH ROW BEGIN IF NEW.`key`='second' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test failure'; END IF; END");
    try {
      expect((await save([{ key: 'first', value: 1 }, { key: 'second', value: 2 }])).body.errors).toBeDefined();
      expect(await h.prisma.setting.count()).toBe(0);
    } finally { await h.prisma.$executeRawUnsafe('DROP TRIGGER reject_setting'); }
  });
});
