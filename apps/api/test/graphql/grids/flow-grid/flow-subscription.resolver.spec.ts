import { SUBSCRIPTION_OPTIONS_METADATA } from '@nestjs/graphql/dist/graphql.constants';
import { GqlJwtGuard } from '../../../../src/graphql/guards/gql-jwt.guard';
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { FlowSubscriptionResolver } from '../../../../src/graphql/grids/flow-grid/resolvers/flow-subscription.resolver';

describe('FlowSubscriptionResolver', () => {
  let resolver: FlowSubscriptionResolver;

  const mockPubSub = {
    asyncIterableIterator: jest
      .fn()
      .mockReturnValue(
        (async function* () {
          yield { flowExecuted: { id: 1, status: 'completed' } };
        })(),
      ),
    publish: jest.fn(),
    subscribe: jest.fn(),
  };

  const mockUser = {
    sub: 1,
    email: 'test@test.com',
    role_id: 2,
    role_name: 'admin',
    company_id: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlowSubscriptionResolver,
        {
          provide: 'PubSub',
          useValue: mockPubSub,
        },
      ],
    })
      .overrideGuard(GqlJwtGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<FlowSubscriptionResolver>(FlowSubscriptionResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should return async iterator for flowExecuted subscription', async () => {
    const iterator = resolver.flowExecuted();

    expect(iterator).toBeDefined();
    expect(mockPubSub.asyncIterableIterator).toHaveBeenCalledWith([
      'flowExecuted',
    ]);
  });

  it('should return async iterator for flowFailed subscription', async () => {
    const iterator = resolver.flowFailed();

    expect(iterator).toBeDefined();
    expect(mockPubSub.asyncIterableIterator).toHaveBeenCalledWith([
      'flowFailed',
    ]);
  });

  it('should return async iterator for flowProgress subscription', async () => {
    const iterator = resolver.flowProgress();

    expect(iterator).toBeDefined();
    expect(mockPubSub.asyncIterableIterator).toHaveBeenCalledWith([
      'flowProgress',
    ]);
  });

  it.each(['flowExecuted', 'flowFailed', 'flowProgress'] as const)(
    '%s only delivers events to an authenticated matching tenant', async (event) => {
      const { filter } = Reflect.getMetadata(SUBSCRIPTION_OPTIONS_METADATA, resolver[event]);
      expect(await filter({ [event]: { companyId: 1 } }, {}, { canReceiveTenantEvent: async id => id === mockUser.company_id })).toBe(true);
      expect(await filter({ [event]: { companyId: 2 } }, {}, { canReceiveTenantEvent: async id => id === mockUser.company_id })).toBe(false);
      expect(await filter({ [event]: {} }, {}, {})).toBe(false);
      expect(await filter({ [event]: { companyId: 1 } }, {}, { user: null })).toBe(false);
      expect(await filter({ [event]: { companyId: null } }, {}, { user: { company_id: null } })).toBe(false);
    },
  );
});
