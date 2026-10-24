import { jest } from '@jest/globals';
import { ValidatePipe } from '../../../src/core/pipes/validation.pipe';
import { CreateFlowDto, UpdateFlowDto, CreateWorkflowDto } from '../../../src/modules/base_automation/dtos';
import { AutomationService } from '../../../src/modules/base_automation/services/automation.service';
import { RbacService } from '../../../src/modules/rbac/services/rbac.service';
import { MySqlDialect } from 'drizzle-orm/mysql-core';

describe('automation HTTP contracts', () => {
  const pipe = new ValidatePipe();
  it('accepts valid definitions and rejects missing model and malformed nodes', async () => {
    await expect(pipe.transform({ name: 'Flow', model: 'Entity', nodes: [] }, { type: 'body', metatype: CreateFlowDto })).resolves.toMatchObject({ name: 'Flow' });
    await expect(pipe.transform({ name: 'Flow' }, { type: 'body', metatype: CreateFlowDto })).rejects.toThrow('Validation failed');
    await expect(pipe.transform({ nodes: {} }, { type: 'body', metatype: UpdateFlowDto })).rejects.toThrow('Validation failed');
    await expect(pipe.transform({ name: 'Workflow', model: 'Entity', states: [] }, { type: 'body', metatype: CreateWorkflowDto })).resolves.toMatchObject({ model: 'Entity' });
  });
  it('returns the generated MySQL ID rather than a supplied or undefined ID', async () => {
    const service = new AutomationService({ getDrizzle: () => ({ insert: () => ({ values: async () => [{ insertId: 41 }, []] }) }) } as any);
    expect((await service.createFlow({ name: 'Flow', model: 'Entity', id: 999 } as any)).data.id).toBe(41);
    expect((await service.createWorkflow({ name: 'Workflow', model: 'Entity' })).data.id).toBe(41);
  });
  it('applies model and status filters in the same database predicate', async () => {
    const where = jest.fn(async (_condition: any) => []);
    const service = new AutomationService({ getDrizzle: () => ({ select: () => ({ from: () => ({ where }) }) }) } as any);
    await service.getFlows({ status: 'active', model: 'Ticket' });
    expect(where).toHaveBeenCalledTimes(1);
    const query = new MySqlDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.params).toEqual(['active', 'Ticket']);
    expect(query.sql).toContain(' and ');
  });
});

describe('role permission writes', () => {
  function fixture() {
    const create = jest.fn(async (args: any) => args.data);
    const update = jest.fn(async (args: any) => args.data);
    const prisma: any = {
      role: { findUnique: jest.fn(async () => ({ id: 7, is_system: false })), create, update },
      permission: { findMany: jest.fn(async ({ where }: any) => where.name.in.includes('read_user') ? [{ id: 3, name: 'read_user' }] : []) },
    };
    return { prisma, create, update, service: new RbacService(prisma) };
  }
  it('stores deduplicated permissions atomically with role creation', async () => {
    const { service, prisma, create } = fixture();
    prisma.role.findUnique.mockResolvedValue(null);
    await service.createRole({ name: 'reviewer', permissions: ['read_user', 'read_user'] });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      role_permissions: { create: [{ permissionId: 3 }] },
    }) }));
  });
  it('clears explicit empty permissions but preserves omitted permissions', async () => {
    const { service, update } = fixture();
    await service.updateRole(7, { permissions: [] });
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { role_permissions: { deleteMany: {}, create: [] } } }));
    await service.updateRole(7, { description: 'changed' });
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { description: 'changed' } }));
  });
  it('rejects unknown permissions without modifying the role', async () => {
    const { service, update } = fixture();
    await expect(service.updateRole(7, { permissions: ['read_user', 'unknown'] })).rejects.toThrow('Unknown permission');
    expect(update).not.toHaveBeenCalled();
  });
});
