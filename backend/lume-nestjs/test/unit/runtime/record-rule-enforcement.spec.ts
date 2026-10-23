import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { SecurityService } from '../../../src/modules/base/services/security.service';

describe('Record-rule evaluator', () => {
  const actor = { userId: 7, roleId: 2 };
  const rule = (domain: any, scope = {}) => ({ domain: JSON.stringify(domain), groups: null, users: null, ...scope });
  const service = (rows: any[]) => new SecurityService({ recordRule: { findMany: jest.fn().mockResolvedValue(rows) } } as any);

  it('applies global rules even when a scoped rule does not match', async () => {
    const security = service([rule({ status: 'active' }), rule({ owner: 99 }, { groups: '[3]' })]);
    await expect(security.checkRecordRules('lead','read',{ status:'active' },actor)).resolves.toBe(true);
    await expect(security.checkRecordRules('lead','read',{ status:'inactive' },actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([{ users: '[7]' }, { groups: '[2]' }, { users: '[99]', groups: '[2]' }, { users: '[7]', groups: '[99]' }])('applies matching user or role scopes: %s', async scope => {
    const security = service([rule({ status:'active' },scope)]);
    await expect(security.checkRecordRules('lead','read',{ status:'inactive' },actor)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(security.checkRecordRules('lead','read',{ status:'active' },actor)).resolves.toBe(true);
  });

  it('supports multiple role IDs and empty scopes as global', async () => {
    const security = service([rule({ status:'active' },{ groups:'[5]' })]);
    await expect(security.checkRecordRules('lead','read',{ status:'inactive' },{ userId:7,roleIds:[2,5] })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service([rule({ status:'active' },{ groups:'[]',users:'[]' })]).checkRecordRules('lead','read',{ status:'inactive' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not overwrite constraints on the same field', async () => {
    const security = service([rule({ score:{gte:10} }),rule({ score:{lte:20} })]);
    expect(await security.getRecordRuleDomain('lead','read',actor)).toEqual({ $and:[{score:{gte:10}},{score:{lte:20}}] });
    await expect(security.checkRecordRules('lead','read',{score:15},actor)).resolves.toBe(true);
    for (const score of [5,25]) await expect(security.checkRecordRules('lead','read',{score},actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each(['eq','ne','gt','gte','lt','lte','in','nin'])('evaluates %s', async op => {
    const operand = { eq:5,ne:4,gt:4,gte:5,lt:6,lte:5,in:[5,6],nin:[6,7] }[op];
    await expect(service([rule({value:{[op]:operand}})]).checkRecordRules('lead','read',{value:5},actor)).resolves.toBe(true);
  });

  it.each(['bad','null','{}','[0]','["2"]'])('rejects malformed persisted selectors: %s', async groups => {
    const security = service([rule({}, { groups })]);
    await expect(security.getRecordRuleDomain('lead','read',actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each(['bad','null','[]','{"score":{"in":2}}','{"score":{"unknown":2}}','{"score":{}}','{"$and":[]}'])('fails closed for malformed persisted domains: %s', async domain => {
    await expect(service([{domain}]).checkRecordRules('lead','read',{score:5},actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires trusted identity for scoped rules', async () => {
    const security = service([rule({}, {groups:'[2]'})]);
    for (const context of [{},{userId:7},{userId:7,roleId:0}]) await expect(security.checkRecordRules('lead','read',{},context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies missing or inherited record fields even for negative conditions', async () => {
    const security = service([rule({status:{ne:'blocked'}})]);
    for (const record of [{},Object.create({status:'active'}),null]) await expect(security.checkRecordRules('lead','read',record,actor)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
