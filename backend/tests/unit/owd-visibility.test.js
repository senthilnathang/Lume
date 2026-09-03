import { AccessControlService } from '../../src/core/services/access-control.service.js';
import { RecordService } from '../../src/modules/base/services/record.service.js';

function prismaWithSettings(settings) {
  return {
    setting: {
      findFirst: async ({ where }) => {
        const hit = settings[where.key];
        return hit === undefined ? null : { key: where.key, value: hit };
      },
    },
  };
}

describe('org-wide default visibility merge', () => {
  test('explicit record visibility always wins', async () => {
    const ac = new AccessControlService(prismaWithSettings({ 'owd.entity.1': 'public' }));
    expect(await ac.resolveRecordVisibility(1, 'private')).toBe('private');
    expect(await ac.resolveRecordVisibility(1, 'COMPANY')).toBe('company');
  });

  test('falls back to entity default, then private', async () => {
    const ac = new AccessControlService(prismaWithSettings({ 'owd.entity.1': 'company' }));
    expect(await ac.resolveRecordVisibility(1, undefined)).toBe('company');
    const missing = new AccessControlService(prismaWithSettings({}));
    expect(await missing.resolveRecordVisibility(9, undefined)).toBe('private');
    const broken = new AccessControlService(prismaWithSettings({ 'owd.entity.9': 'everyone' }));
    expect(await broken.resolveRecordVisibility(9, undefined)).toBe('private');
  });

  test('base createRecord stores merged visibility', async () => {
    const created = [];
    const prisma = {
      ...prismaWithSettings({ 'owd.entity.1': 'company' }),
      entity: { findUnique: async () => ({ id: 1 }) },
      entityField: { findMany: async () => [] },
      entityFieldPermission: { findMany: async () => [] },
      entityRecord: {
        create: async ({ data }) => {
          const rec = { id: 1, ...data, deletedAt: null };
          created.push(rec);
          return rec;
        },
        findMany: async () => [],
      },
    };
    const svc = new RecordService(prisma);
    await svc.createRecord(1, { title: 'A' }, 5, 9, {});
    expect(created[0].visibility).toBe('company');
    await svc.createRecord(1, { title: 'B', visibility: 'public' }, 5, 9, {});
    expect(created[1].visibility).toBe('public');
  });
});
