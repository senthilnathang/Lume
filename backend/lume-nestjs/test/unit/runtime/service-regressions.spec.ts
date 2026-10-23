import { BaseSecurityService } from '../../../src/modules/base_security/services/base-security.service';
import { jest } from '@jest/globals';
import { getTableName } from 'drizzle-orm';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { FormulaService } from '../../../src/modules/base/services/formula.service';
import { RecordService } from '../../../src/modules/base/services/record.service';
import { BaseRbacService } from '../../../src/modules/base_rbac/services/base-rbac.service';
import { MediaService } from '../../../src/modules/media/services/media.service';
import { MessagesService } from '../../../src/modules/messages/services/messages.service';
import { DonationsService } from '../../../src/modules/donations/services/donations.service';
import { ActivitiesService } from '../../../src/modules/activities/services/activities.service';
import { DocumentsService } from '../../../src/modules/documents/services/documents.service';
import { TeamService } from '../../../src/modules/team/services/team.service';
import { EditorService } from '../../../src/modules/editor/services/editor.service';
import { AdvancedFeaturesService } from '../../../src/modules/advanced_features/services/advanced-features.service';

const formula = new FormulaService();
describe('Formula and record creation', () => {
  const fields = [{ name: 'price' }, { name: 'quantity' }];
  it('parses expressions and evaluates field values, including missing values', () => {
    expect(formula.evaluate('{price} * {quantity}', { price: 7, quantity: 3 }, fields)).toBe(21);
    expect(formula.evaluate('{price} + {quantity}', { price: 0 }, fields)).toBe(0);
    expect(formula.validateExpression('{price} * (', fields).valid).toBe(false);
    expect(formula.validateExpression('{missing} + 1', fields)).toEqual({ valid: false, error: 'Unknown field: missing' });
    expect(formula.validateExpression('{price} * 2', fields)).toEqual({ valid: true });
    expect(() => formula.evaluate('(', {}, fields)).toThrow('Formula evaluation failed');
  });

  it('persists computed fields and emits the newly created record', async () => {
    const create = jest.fn(async ({ data }: any) => ({ id: 12, ...data }));
    const prisma = {
      entity: { findUnique: jest.fn(async () => ({ id: 1, name: 'test_entity' })) },
      user: { findUnique: jest.fn(async () => ({ id: 4, role_id: 2 })) },
      recordRule: { findMany: jest.fn(async () => []) },
      automation_validation_rules: { findMany: jest.fn(async () => []) },
      entityField: { findMany: jest.fn(async () => [
        { name: 'price', type: 'number' },
        { name: 'total', type: 'formula', isStored: true, formulaExpression: '{price} * 2' },
      ]) },
      entityRecord: { create },
    };
    const emit = jest.fn();
    (prisma as any).$transaction = async (callback: any) => callback(prisma);
    const service = new RecordService(prisma as any, formula, { emit } as any);
    const input = { price: 8 };
    const result = await service.createRecord(1, input, 7, 4);
    expect(result).toMatchObject({ id: 12, companyId: 7, createdBy: 4, data: { price: 8, total: 16 } });
    expect(JSON.parse(create.mock.calls[0][0].data.data)).toEqual(result.data);
    expect(emit).toHaveBeenCalledWith('record.created', expect.objectContaining({ entityId: 1, record: result }));
    expect(input).toEqual({ price: 8 });
  });
});

describe('Drizzle service schema bindings', () => {
  it.each([
    [MediaService, 'media_library'],
    [MessagesService, 'messages'],
    [DonationsService, 'donations'],
  ])('%p can insert immediately after construction', async (Service, tableName) => {
    const values = jest.fn(async () => [{ insertId: 42 }]);
    const insert = jest.fn((table: any) => {
      expect(getTableName(table)).toBe(tableName);
      return { values };
    });
    const service = new Service({ getDrizzle: () => ({ insert }) } as any);
    const result = await service.create({ title: 'Test' } as any);
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(42);
    expect(values).toHaveBeenCalledTimes(1);
  });

  it('lists API keys using the service connection and user scope', async () => {
    const query: any = {};
    query.where = jest.fn((condition: any) => {
      expect(new MySqlDialect().sqlToQuery(condition).params).toEqual([7]);
      return query;
    });
    query.orderBy = () => query;
    query.limit = async () => [{ id: 1, userId: 7 }];
    const service = new BaseSecurityService({ getDrizzle: () => ({ select: () => ({ from: () => query }) }) } as any);
    expect(await service.getApiKeys(7)).toEqual([{ id: 1, userId: 7 }]);
    expect(query.where).toHaveBeenCalledTimes(1);
  });

  it.each([ActivitiesService, DocumentsService, TeamService])('%p reads back the MySQL inserted ID', async (Service) => {
    const where = jest.fn((condition: any) => {
      expect(new MySqlDialect().sqlToQuery(condition).params).toEqual([42]);
      return { limit: async () => [{ id: 42 }] };
    });
    const db = {
      insert: () => ({ values: async () => [{ insertId: 42 }, []] }),
      select: () => ({ from: () => ({ where }) }),
    };
    const service = new (Service as any)({ getDrizzle: () => db });
    expect(await service.create({ title: 'Test', firstName: 'Test' }, 4)).toMatchObject({ success: true, data: { id: 42 } });
    expect(where).toHaveBeenCalledTimes(1);
  });

  it.each([
    [ActivitiesService, 'activities', 'findById'],
    [DocumentsService, 'documents', 'findById'],
    [TeamService, 'team_members', 'findById'],
    [EditorService, 'editor_templates', 'findTemplateById'],
    [AdvancedFeaturesService, 'webhooks', 'getWebhooks'],
  ])('%p queries a real table without attaching schema to the connection', async (Service, tableName, method) => {
    const row = { id: 1, title: 'Test' };
    const query: any = { then: (resolve: any) => Promise.resolve([row]).then(resolve) };
    for (const name of ['where', 'limit', 'offset', 'orderBy']) query[name] = jest.fn(() => query);
    const from = jest.fn((table: any) => { expect(getTableName(table)).toBe(tableName); return query; });
    const service = new (Service as any)({ getDrizzle: () => ({ select: () => ({ from }) }) });
    const result = await service[method](method.startsWith('find') ? 1 : {});
    expect(result.success).toBe(true);
    expect(from).toHaveBeenCalled();
  });
});

describe('Prisma RBAC model bindings', () => {
  it('reads actual role_permissions and permission names for non-admin users', async () => {
    const role = { name: 'member', role_permissions: [{ permission: { name: 'base.users.read' } }] };
    const findUnique = jest.fn(async () => ({ role }));
    const service = new BaseRbacService({ user: { findUnique }, role: { findUnique: async () => role } } as any);
    expect(await service.hasPermission(2, 'base.users.read')).toBe(true);
    expect(await service.hasPermission(2, 'base.users.delete')).toBe(false);
    expect(await service.hasAnyPermission(2, ['base.users.delete', 'base.users.read'])).toBe(true);
    expect(await service.hasAllPermissions(2, ['base.users.delete', 'base.users.read'])).toBe(false);
    expect(await service.getUserPermissions(2)).toEqual(['base.users.read']);
    expect(await service.getRolePermissions(3)).toEqual(['base.users.read']);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 2 }, include: { role: { include: { role_permissions: { include: { permission: true } } } } } });
  });

  it('orders and groups permissions by their persisted names', async () => {
    const permissions = [{ name: 'base.users.read' }, { name: 'website.pages.read' }];
    const findMany = jest.fn(async () => permissions);
    const service = new BaseRbacService({ permission: { findMany } } as any);
    expect(await service.getAllPermissions()).toEqual(permissions);
    expect(await service.getPermissionsGrouped()).toEqual({ base: [permissions[0]], website: [permissions[1]] });
    expect(findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });
});
