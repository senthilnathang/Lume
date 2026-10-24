import { jest } from '@jest/globals';
import { SequenceResolver } from '../../../../src/graphql/grids/meta-grid/resolvers/sequence.resolver';

describe('Sequence resolver contracts', () => {
  const row = { id: 7, code: 'invoice', name: 'Invoice', nextNumber: 8, increment: 2, padding: 3 };
  const settings = {
    sequences: jest.fn(async () => [row]), sequence: jest.fn(async () => row),
    nextSequence: jest.fn(async () => ({ number: 8 })),
    createSequence: jest.fn(async data => ({ ...row, ...data })),
    updateSequence: jest.fn(async (_id, data) => ({ ...row, ...data })),
    deleteSequence: jest.fn(async () => row),
  };
  const resolver = new SequenceResolver(settings as any);
  beforeEach(() => jest.clearAllMocks());
  it('maps persisted IDs, counters and increment to GraphQL fields', async () => {
    expect(await resolver.sequence('7')).toMatchObject({ id: '7', code: 'invoice', nextValue: 8, step: 2 });
    expect((await resolver.sequences()).length).toBe(1);
  });
  it('allocates through the transactional service', async () => {
    expect(await resolver.nextSequenceValue('7')).toBe(8);
    expect(settings.nextSequence).toHaveBeenCalledWith('invoice');
  });
  it('validates creation before persistence', async () => {
    await expect(resolver.createSequence({name:'Invoice',code:'invoice',step:0})).rejects.toThrow();
    await expect(resolver.createSequence({name:'Invoice',code:'invoice',format:'unsupported'})).rejects.toThrow();
    expect(settings.createSequence).not.toHaveBeenCalled();
    expect(await resolver.createSequence({name:'Invoice',code:'invoice',step:2,nextValue:8})).toMatchObject({nextValue:8,step:2});
  });
  it('rejects invalid IDs and null counters before writing', async () => {
    for (const id of ['1junk','0','-1','9007199254740992']) await expect(resolver.deleteSequence(id)).rejects.toThrow();
    await expect(resolver.updateSequence('7',{nextValue:null})).rejects.toThrow();
    expect(settings.deleteSequence).not.toHaveBeenCalled();
    expect(settings.updateSequence).not.toHaveBeenCalled();
  });
});
