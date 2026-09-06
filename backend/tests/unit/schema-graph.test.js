import { buildSchemaGraph, findDuplicateCandidates } from '../../src/modules/base/services/schema-graph.js';

const entities = [
  { id: 1, name: 'order', label: 'Order', deletedAt: null },
  { id: 2, name: 'line_item', label: 'Line Item', deletedAt: null },
  { id: 9, name: 'ghost', label: 'Ghost', deletedAt: new Date() },
];
const fields = [
  { id: 11, entityId: 1, name: 'id', label: 'ID', type: 'number', required: true },
  { id: 12, entityId: 1, name: 'title', label: 'Title', type: 'text' },
  { id: 21, entityId: 2, name: 'id', label: 'ID', type: 'number', required: true },
  { id: 22, entityId: 2, name: 'order_ref', label: 'Order', type: 'lookup', lookupEntityId: 1, lookupField: 'id' },
  { id: 23, entityId: 2, name: 'stale_ref', label: 'Stale', type: 'lookup', lookupEntityId: 999 },
];

describe('schema graph builder (ERD extras)', () => {
  const graph = buildSchemaGraph(entities, fields);

  test('excludes soft-deleted entities', () => {
    expect(graph.entities.map((e) => e.name).sort()).toEqual(['line_item', 'order']);
  });

  test('flags primary and foreign keys', () => {
    const order = graph.entities.find((e) => e.name === 'order');
    expect(order.fields.find((f) => f.name === 'id').primaryKey).toBe(true);
    expect(order.fields.find((f) => f.name === 'title').primaryKey).toBe(false);
    const item = graph.entities.find((e) => e.name === 'line_item');
    expect(item.fields.find((f) => f.name === 'order_ref').foreignKey).toEqual({ toEntity: 1, toField: 'id' });
    expect(item.fields.find((f) => f.name === 'stale_ref').foreignKey).toBeNull();
  });

  test('builds links and per-entity relationship trees', () => {
    expect(graph.links).toHaveLength(1);
    const order = graph.entities.find((e) => e.name === 'order');
    const item = graph.entities.find((e) => e.name === 'line_item');
    expect(order.relationships.inbound).toHaveLength(1);
    expect(order.relationships.outbound).toHaveLength(0);
    expect(item.relationships.outbound).toHaveLength(1);
    expect(item.relationships.inbound).toHaveLength(0);
  });
});

describe('duplicate analysis (FastVue erd_viewer port)', () => {
  const dupEntities = [
    { id: 1, name: 'customer', label: 'Customer', deletedAt: null },
    { id: 2, name: 'client', label: 'Client', deletedAt: null },
    { id: 3, name: 'invoice', label: 'Invoice', deletedAt: null },
  ];
  const dupFields = [
    { entityId: 1, name: 'id', type: 'number' },
    { entityId: 1, name: 'email', type: 'email' },
    { entityId: 1, name: 'phone', type: 'phone' },
    { entityId: 1, name: 'address', type: 'text' },
    { entityId: 2, name: 'id', type: 'number' },
    { entityId: 2, name: 'email', type: 'email' },
    { entityId: 2, name: 'phone', type: 'phone' },
    { entityId: 2, name: 'address', type: 'text' },
    { entityId: 3, name: 'id', type: 'number' },
    { entityId: 3, name: 'total', type: 'number' },
  ];

  test('flags near-duplicate schemas with recommendations', () => {
    const pairs = findDuplicateCandidates(dupEntities, dupFields, 0.5);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].entityA.name).toBe('customer');
    expect(pairs[0].entityB.name).toBe('client');
    expect(pairs[0].score).toBe(1);
    expect(pairs[0].sharedFields).toEqual(expect.arrayContaining(['email', 'phone']));
    expect(pairs[0].recommendation).toMatch(/merging/i);
  });

  test('respects thresholds and ignores id-only overlap', () => {
    expect(findDuplicateCandidates(dupEntities, dupFields, 0.99)).toHaveLength(1);
    expect(findDuplicateCandidates(dupEntities, dupFields, 1)).toHaveLength(1);
    const idOnly = [
      { id: 1, name: 'a', deletedAt: null },
      { id: 2, name: 'b', deletedAt: null },
    ];
    const idFields = [
      { entityId: 1, name: 'id', type: 'number' },
      { entityId: 2, name: 'id', type: 'number' },
    ];
    expect(findDuplicateCandidates(idOnly, idFields, 0.5)).toHaveLength(0);
  });
});
