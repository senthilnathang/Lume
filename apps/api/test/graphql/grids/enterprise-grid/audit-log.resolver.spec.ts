import { GqlRbacGuard } from '../../../../src/graphql/guards/gql-rbac.guard';
import { GqlJwtGuard } from '../../../../src/graphql/guards/gql-jwt.guard';
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogResolver } from '../../../../src/graphql/grids/enterprise-grid/resolvers/audit-log.resolver';
import { AuditService } from '../../../../src/modules/audit/services/audit.service';
import { NotFoundException } from '@nestjs/common';

describe('AuditLogResolver', () => {
  let resolver: AuditLogResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogResolver,
        { provide: AuditService, useValue: {
          findAll: jest.fn(async () => ({ data: [], meta: { total: 0, pages: 0 } })),
          findById: jest.fn(async () => { throw new NotFoundException(); }),
        } },
        { provide: 'PubSub', useValue: { asyncIterableIterator: jest.fn() } },
      ],
    })
      .overrideGuard(GqlJwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(GqlRbacGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<AuditLogResolver>(AuditLogResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('auditLogs', () => {
    it('should return paginated audit logs', async () => {
      const result = await resolver.auditLogs(undefined, undefined, { sub: 1 } as any);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.hasNextPage).toBe(false);
    });
  });

  describe('auditLog', () => {
    it('should return null for missing audit log', async () => {
      const result = await resolver.auditLog('999', { sub: 1 } as any);
      expect(result).toBeNull();
    });
  });

  describe('recordAuditHistory', () => {
    it('should return empty array for non-existent record', async () => {
      const result = await resolver.recordAuditHistory('ticket', 999, { sub: 1 } as any);
      expect(result).toEqual([]);
    });
  });

  describe('auditLogCreated', () => {
    it('should subscribe to audit log events', () => {
      const pubSub = { asyncIterableIterator: jest.fn() };
      const result = resolver['pubSub'] = pubSub;
      resolver.auditLogCreated(undefined, 1);
      expect(pubSub.asyncIterableIterator).toHaveBeenCalledWith(['AUDIT_LOG_CREATED']);
    });
  });
});
