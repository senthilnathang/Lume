import { Test, TestingModule } from '@nestjs/testing';
import { ImportExportResolver } from '../../../../src/graphql/grids/enterprise-grid/resolvers/import-export.resolver';

describe('ImportExportResolver', () => {
  let resolver: ImportExportResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImportExportResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<ImportExportResolver>(ImportExportResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('importHistory', () => {
    it('should return empty array', async () => {
      const result = await resolver.importHistory(1);
      expect(result).toEqual([]);
    });
  });

  describe('importRecords', () => {
    it('should import records', async () => {
      const input = { entity: 'ticket', records: [] };
      const result = await resolver.importRecords(input, 1);
      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });

  describe('exportRecords', () => {
    it('should export records as JSON', async () => {
      const input = { entity: 'ticket', format: 'json' };
      const result = await resolver.exportRecords(input, 1);
      expect(result).toBe('[]');
    });

    it('should export records as CSV', async () => {
      const input = { entity: 'ticket', format: 'csv' };
      const result = await resolver.exportRecords(input, 1);
      expect(result).toBe('id,name\n');
    });
  });
});
