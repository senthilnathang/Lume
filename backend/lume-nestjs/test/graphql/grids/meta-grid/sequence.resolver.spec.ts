import { Test, TestingModule } from '@nestjs/testing';
import { SequenceResolver } from '../../../../src/graphql/grids/meta-grid/resolvers/sequence.resolver';

describe('SequenceResolver', () => {
  let resolver: SequenceResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SequenceResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<SequenceResolver>(SequenceResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('sequences', () => {
    it('should return empty array', async () => {
      const result = await resolver.sequences();
      expect(result).toEqual([]);
    });
  });

  describe('sequence', () => {
    it('should return null for missing sequence', async () => {
      const result = await resolver.sequence('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('nextSequenceValue', () => {
    it('should return next value', async () => {
      const result = await resolver.nextSequenceValue('1');
      expect(result).toBe(1);
    });
  });

  describe('createSequence', () => {
    it('should return null', async () => {
      const result = await resolver.createSequence({ name: 'SEQ001', prefix: 'SEQ' });
      expect(result).toBeNull();
    });
  });

  describe('deleteSequence', () => {
    it('should return true', async () => {
      const result = await resolver.deleteSequence('1');
      expect(result).toBe(true);
    });
  });
});
