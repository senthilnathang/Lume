import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogResolver } from '../../../../src/graphql/grids/enterprise-grid/resolvers/audit-log.resolver';

describe('AuditLogResolver', () => {
  let resolver: AuditLogResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogResolver,
        { provide: 'PubSub', useValue: { asyncIterableIterator: jest.fn() } },
      ],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<AuditLogResolver>(AuditLogResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('auditLogs', () => {
    it('should return paginated audit logs', async () => {
      const result = await resolver.auditLogs(undefined, undefined, 1);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.hasNextPage).toBe(false);
    });
  });

  describe('auditLog', () => {
    it('should return null for missing audit log', async () => {
      const result = await resolver.auditLog('non-existent', 1);
      expect(result).toBeNull();
    });
  });

  describe('recordAuditHistory', () => {
    it('should return empty array for non-existent record', async () => {
      const result = await resolver.recordAuditHistory('ticket', 999, 1);
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
