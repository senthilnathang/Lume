import { jest } from '@jest/globals';
import { Reflector } from '@nestjs/core';
import { SystemSettingResolver } from '../../../../src/graphql/grids/meta-grid/resolvers/system-setting.resolver';
import { PERMISSIONS_KEY } from '../../../../src/core/decorators/permissions.decorator';

describe('SystemSettingResolver persisted adapter', () => {
  const row = { key: 'stored', value: { enabled: true }, updatedAt: new Date() };
  const settings = { records: jest.fn(async () => [row]), record: jest.fn(async () => row),
    upsertRecords: jest.fn(async () => [row]) };
  const resolver = new SystemSettingResolver(settings as any);
  beforeEach(() => { jest.clearAllMocks(); });
  it('returns service metadata and passes the group filter', async () => {
    expect(await resolver.systemSettings('system')).toEqual([row]);
    expect(settings.records).toHaveBeenCalledWith('system');
    expect(await resolver.systemSetting('stored')).toBe(row);
    expect(settings.record).toHaveBeenCalledWith('stored');
  });
  it('uses the same atomic writer for single and bulk mutations', async () => {
    const input = { key: 'stored', value: { enabled: true } };
    expect(await resolver.upsertSystemSetting(input)).toBe(row);
    expect(settings.upsertRecords).toHaveBeenCalledWith([input]);
    expect(await resolver.bulkUpsertSettings([input])).toEqual([row]);
  });
  it('propagates persistence failures rather than fabricating success', async () => {
    settings.upsertRecords.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(resolver.upsertSystemSetting({ key: 'stored', value: {} })).rejects.toThrow('Database unavailable');
  });
  it('declares separate read and write permissions', () => {
    const reflector = new Reflector();
    for (const name of ['systemSettings', 'systemSetting']) expect(reflector.get(PERMISSIONS_KEY, SystemSettingResolver.prototype[name])).toEqual(['settings.read']);
    for (const name of ['upsertSystemSetting', 'bulkUpsertSettings']) expect(reflector.get(PERMISSIONS_KEY, SystemSettingResolver.prototype[name])).toEqual(['settings.write']);
  });
});
