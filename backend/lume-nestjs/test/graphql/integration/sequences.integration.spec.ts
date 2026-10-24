import { jest } from '@jest/globals';
import { createHarness, type Harness } from './harness';

jest.setTimeout(120000);
describe('GraphQL sequences with real MySQL allocation', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness({ sequences: true }); });
  afterAll(async () => { await h?.close(); });
  it('persists, allocates concurrently, rejects rewinds and deletes real sequences', async () => {
    const created = await h.query('mutation { createSequence(input:{name:"Invoice",code:"invoice",nextValue:10,step:2,padding:3}) {id code nextValue step} }');
    expect(created.body.errors).toBeUndefined();
    const id = created.body.data.createSequence.id;
    const allocations = await Promise.all(Array.from({length:6}, () => h.query(`mutation { nextSequenceValue(id:"${id}") }`)));
    allocations.forEach(response => expect(response.body.errors).toBeUndefined());
    expect(allocations.map(response => response.body.data.nextSequenceValue).sort((a,b)=>a-b)).toEqual([10,12,14,16,18,20]);
    const read = await h.query(`{ sequence(id:"${id}") {nextValue step} }`);
    expect(read.body.data.sequence).toEqual({nextValue:22,step:2});
    expect((await h.query(`mutation { updateSequence(id:"${id}",input:{nextValue:1}) {id} }`)).body.errors).toBeDefined();
    expect((await h.query(`mutation { updateSequence(id:"${id}",input:{name:"Renamed",nextValue:30}) {name nextValue} }`)).body.data.updateSequence).toEqual({name:'Renamed',nextValue:30});
    expect((await h.query(`mutation { deleteSequence(id:"${id}") }`)).body.data.deleteSequence).toBe(true);
    expect((await h.query(`{ sequence(id:"${id}") {id} }`)).body.data.sequence).toBeNull();
  });
  it('requires authentication and management permission on reads and writes', async () => {
    for (const query of ['{ sequences {id} }','mutation { createSequence(input:{name:"Denied"}) {id} }','mutation { nextSequenceValue(id:"1") }']) {
      expect((await h.query(query, null)).body.errors).toBeDefined();
      expect((await h.query(query, h.token('member'))).body.errors).toBeDefined();
    }
    expect((await h.query('{ nextSequenceValue(id:"1") }')).body.errors).toBeDefined();
    expect(await h.prisma.sequence.count()).toBe(0);
  });
});
