import { jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHarness, type Harness } from './harness';
import { RecordService } from '../../../src/modules/base/services/record.service';

jest.setTimeout(120000);
describe('Transactional uniqueness (real MySQL)', () => {
  let h: Harness;
  let records: RecordService;
  beforeAll(async () => { h = await createHarness(); records = h.app.get(RecordService); });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.automation_validation_rules.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.prisma.entityRelationshipRecord.deleteMany();
    await h.prisma.entityRelationship.deleteMany();
    await h.seed();
    await h.prisma.automation_validation_rules.create({data:{name:'Unique code',model:'entity_1',field:'code',rule_type:'unique',config:'{}'}});
  });
  afterEach(() => jest.restoreAllMocks());
  const create = (code: any = 'same', company = 1) => records.createRecord(1,{name:'Candidate',code},company,2);
  const count = async (code = 'same') => (await h.prisma.entityRecord.findMany()).filter(row=>JSON.parse(row.data).code === code && !row.deletedAt).length;
  const oneWinner = (results: PromiseSettledResult<any>[]) => {
    expect(results.filter(r=>r.status === 'fulfilled')).toHaveLength(1);
    for (const result of results) if (result.status === 'rejected') expect(result.reason.message).toBe('Record validation failed');
  };

  it('allows one winner for simultaneous duplicate creates and publishes only its event', async () => {
    const emit = jest.spyOn(h.app.get(EventEmitter2),'emit');
    oneWinner(await Promise.allSettled([create(),create(),create()]));
    expect(await count()).toBe(1);
    expect(emit.mock.calls.filter(call=>call[0]==='record.created')).toHaveLength(1);
  });

  it('allows one winner for simultaneous updates of different records', async () => {
    oneWinner(await Promise.allSettled([1,2,3].map(id=>records.updateRecord(id,{code:'same'},1,2))));
    expect(await count()).toBe(1);
  });

  it('serializes creates against updates', async () => {
    oneWinner(await Promise.allSettled([create(),records.updateRecord(1,{code:'same'},1,2)]));
    expect(await count()).toBe(1);
  });

  it('enforces uniqueness when events and cascades are suppressed', async () => {
    oneWinner(await Promise.allSettled([1,2].map(id=>records.updateRecord(id,{code:'same'},1,2,1,{emitEvent:false}))));
    expect(await count()).toBe(1);
  });

  it('reads committed values after waiting even with an existing transaction snapshot', async () => {
    let arrived = 0;
    let release!: () => void;
    const ready = new Promise<void>(resolve=>{release=resolve;});
    const write = (id: number) => h.prisma.$transaction(async tx => {
      // Establish both REPEATABLE READ snapshots before either write is allowed.
      await tx.entityRecord.findMany();
      if (++arrived === 2) release();
      await ready;
      return records.withTransaction(tx).updateRecord(id,{code:'same'},1,2,1,{emitEvent:false});
    });
    oneWinner(await Promise.allSettled([write(1),write(2)]));
    expect(await count()).toBe(1);
  });

  it('allows identical values in different tenants', async () => {
    const result = await Promise.all([create('same',1),create('same',2)]);
    expect(result).toHaveLength(2); expect(await count()).toBe(2);
  });

  it('allows unchanged self values and releases values after soft deletion', async () => {
    const first = await create();
    await expect(records.updateRecord(first.id,{name:'Renamed'},1,2)).resolves.toBeTruthy();
    await records.deleteRecord(first.id,true,1,2);
    await expect(create()).resolves.toBeTruthy(); expect(await count()).toBe(1);
  });

  it('rolls back a cascade that would assign the same unique value to source and target', async () => {
    const relation = await h.prisma.entityRelationship.create({data:{sourceEntityId:1,targetEntityId:1,type:'many_to_many',name:'peer',label:'Peer',cascadeUpdate:true}});
    await h.prisma.entityRelationshipRecord.create({data:{relationshipId:relation.id,sourceRecordId:1,targetRecordId:2}});
    const emit = jest.spyOn(h.app.get(EventEmitter2),'emit');
    await expect(records.updateRecord(1,{code:'same'},1,2)).rejects.toThrow('Record validation failed');
    expect(await count()).toBe(0); expect(emit).not.toHaveBeenCalled();
  });

  it('publishes creation only after commit and releases locks after a rejected write', async () => {
    const existing = await create();
    await expect(create()).rejects.toThrow('Record validation failed');
    const seen: Promise<any>[] = [];
    const listener = (event: any) => { seen.push(h.prisma.entityRecord.findUnique({where:{id:event.record.id}})); };
    h.app.get(EventEmitter2).on('record.created',listener);
    try {
      const next = await create('different');
      expect((await Promise.all(seen)).map(row=>row.id)).toEqual([next.id]);
      expect(next.id).not.toBe(existing.id);
    } finally { h.app.get(EventEmitter2).off('record.created',listener); }
  });

  it.each([true,false])('rejects stale deletion authorization in an outer transaction (soft=%s)', async soft => {
    await h.prisma.recordRule.create({data:{name:'Protect blocked',modelName:'entity_1',action:'unlink',groups:'[2]',domain:'{"name":{"ne":"Blocked"}}'}});
    let intercept = true;
    h.prisma.$use(async (params: any, next: any) => {
      if (intercept && params.model === 'EntityRecord' && ['updateMany','deleteMany'].includes(params.action)) {
        intercept = false;
        await h.prisma.entityRecord.update({where:{id:1},data:{data:'{"name":"Blocked"}'}});
      }
      return next(params);
    });
    try {
      await expect(h.prisma.$transaction(tx=>records.withTransaction(tx).deleteRecord(1,soft,1,2,1,{emitEvent:false})))
        .rejects.toThrow('Record changed during authorization');
      const row = await h.prisma.entityRecord.findUnique({where:{id:1}});
      expect(JSON.parse(row.data).name).toBe('Blocked'); expect(row.deletedAt).toBeNull();
    } finally { intercept = false; }
  });
});
