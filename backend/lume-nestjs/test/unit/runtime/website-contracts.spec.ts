import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { FeaturesDataController } from '../../../src/modules/base_features_data/controllers/features-data.controller';
import { jest } from '@jest/globals';
import { getTableName } from 'drizzle-orm';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import * as schema from '../../../src/modules/website/models/schema';
import { pluginLogs } from '../../../src/modules/plugins/models/schema';
import { PageService } from '../../../src/modules/website/services/page.service';
import { FontService } from '../../../src/modules/website/services/font.service';
import { PublicController } from '../../../src/modules/website/controllers/public.controller';
import { EntityService } from '../../../src/modules/base/services/entity.service';
import { EntityController } from '../../../src/modules/base/controllers/entity.controller';
import { SecurityService } from '../../../src/modules/base/services/security.service';

describe('Website and plugin schema bindings', () => {
  it('exports concrete tables for all website services', () => {
    expect(Object.keys(schema)).toHaveLength(17);
    for (const table of Object.values(schema)) expect(getTableName(table)).toMatch(/^website_/);
    expect(pluginLogs.status.enumValues).toEqual(['success', 'failed', 'warning']);
  });
  it('queries page IDs against the actual website table', async () => {
    const where = jest.fn(async (condition: any) => {
      expect(new MySqlDialect().sqlToQuery(condition).params).toEqual([12]);
      return [{ id: 12, title: 'Page' }];
    });
    const from = jest.fn((table: any) => { expect(table).toBe(schema.websitePages); return { where }; });
    const service = new PageService({ getDrizzle: () => ({ select: () => ({ from }) }) } as any);
    expect(await service.findById(12)).toEqual({ success: true, data: { id: 12, title: 'Page' } });
  });
  it.each(['{"colors":{"primary":"#123456"},"typography":{"fontSize":18}}', '{invalid'])('renders design tokens and defaults for %s', async tokens => {
    const controller = new PublicController({} as any, {} as any, { getAll: async () => ({ success: true, data: { design_tokens: tokens } }) } as any, {} as any, {} as any, {} as any, {} as any);
    const send = jest.fn();
    await controller.getStylesCss({ setHeader: jest.fn(), send });
    const css = send.mock.calls[0][0] as string;
    expect(css).toContain(tokens === '{invalid' ? '--lume-primary: #1677ff' : '--lume-primary: #123456');
    if (tokens !== '{invalid') expect(css).toContain('--lume-type-font-size: 18px');
  });
});

describe('Font catalog validation', () => {
  const service = new FontService({} as any);
  const oldKey = process.env.GOOGLE_FONTS_API_KEY;
  beforeEach(() => { process.env.GOOGLE_FONTS_API_KEY = 'local-test-key'; });
  afterEach(() => {
    jest.restoreAllMocks();
    if (oldKey === undefined) delete process.env.GOOGLE_FONTS_API_KEY;
    else process.env.GOOGLE_FONTS_API_KEY = oldKey;
  });
  it('filters malformed entries and searches valid font families', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ items: [null, {}, { family: 'Bad', variants: [2], category: 'serif' }, { family: 'Inter', variants: ['400'], category: 'sans-serif' }, { family: 'Roboto', variants: ['400'], category: 'sans-serif' }] }) } as any);
    const result = await service.searchGoogleFonts('INTER');
    expect(result.success).toBe(true);
    expect(result.data).toEqual([expect.objectContaining({ family: 'Inter', variants: ['400'] })]);
  });
  it.each([
    { ok: false, status: 503, json: async () => ({ items: [] }) },
    { ok: true, json: async () => ({ error: 'invalid key' }) },
    { ok: true, json: async () => null },
  ])('returns failure for an unavailable or invalid catalog', async response => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(response as any);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(await service.searchGoogleFonts('Inter')).toEqual({ success: false, error: 'Failed to search Google Fonts' });
  });
});

describe('Entity creator and record action contracts', () => {
  it('passes the authenticated creator from the controller into storage', async () => {
    const create = jest.fn(async ({ data }: any) => ({ id: 1, ...data }));
    const service = new EntityService({ entity: { findFirst: async () => null, create } } as any, {} as any);
    const controller = new EntityController(service);
    const result = await controller.createEntity({ name: 'lead', label: 'Lead' }, { user: { id: 7 } });
    expect(result.data.createdBy).toBe(7);
    expect(create).toHaveBeenCalledWith({ data: { name: 'lead', label: 'Lead', description: null, createdBy: 7 } });
  });
  it('rejects missing or invalid creators before database access', async () => {
    const service = new EntityService({} as any, {} as any);
    for (const id of [undefined, 0, -1, 1.5]) await expect(service.createEntity({ name: 'lead', label: 'Lead' }, id as any)).rejects.toThrow('valid creator');
  });
  it.each([['update', 'write'], ['delete', 'unlink'], ['read', 'read']])('maps %s to %s for record rules', async (action, stored) => {
    const findMany = jest.fn(async () => []);
    const service = new SecurityService({ recordRule: { findMany } } as any);
    expect(await service.checkRecordRules('lead', action, {})).toBe(true);
    expect(await service.getRecordRuleDomain('lead', action)).toEqual({});
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { modelName: 'lead', action: stored, isActive: true } }));
  });
  it('rejects unknown record actions without querying permissive empty rules', async () => {
    const findMany = jest.fn(async () => []);
    const service = new SecurityService({ recordRule: { findMany } } as any);
    await expect(service.checkRecordRules('lead', 'typo', {})).rejects.toThrow('Unsupported record action');
    await expect(service.getRecordRuleDomain('lead', 'typo')).rejects.toThrow('Unsupported record action');
    expect(findMany).not.toHaveBeenCalled();
  });
});


describe('Feature flag query parsing', () => {
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, FeaturesDataController, 'getFeatureFlags');
  const parameter: any = Object.values(args).find((arg: any) => arg.data === 'enabled');
  const pipe = parameter.pipes[0];
  it.each([['true', true], ['false', false], [undefined, undefined]])('parses %s without changing an absent filter', async (value, expected) => {
    const getFeatureFlags = jest.fn(async (filters: any) => filters);
    const controller = new FeaturesDataController({ getFeatureFlags } as any);
    const parsed = await pipe.transform(value, { type: 'query', data: 'enabled' });
    expect(await controller.getFeatureFlags(parsed)).toEqual({ enabled: expected });
  });
  it('rejects invalid boolean strings', async () => {
    await expect(pipe.transform('maybe', { type: 'query', data: 'enabled' })).rejects.toThrow('boolean string is expected');
  });
});
