import { EntityService } from '../../src/core/services/entity.service.js';

function makeService() {
  const created = [];
  const entities = new Map([
    [1, { id: 1, name: 'order' }],
    [2, { id: 2, name: 'line_item' }],
  ]);
  const adapter = {
    findById: async (id) => entities.get(Number(id)) || null,
  };
  const fieldsAdapter = {
    create: async (data) => {
      const row = { id: created.length + 1, ...data };
      created.push(row);
      return row;
    },
  };
  return { svc: new EntityService(adapter, fieldsAdapter), created };
}

describe('entity relation fields (drag-to-relate backend)', () => {
  test('creates lookup field with target entity link', async () => {
    const { svc, created } = makeService();
    const field = await svc.createField(2, {
      name: 'order_ref', label: 'Order', type: 'lookup', lookupEntityId: 1,
    });
    expect(field.lookupEntityId).toBe(1);
    expect(created[0].lookupField).toBeNull();
  });

  test('rejects lookup without target and with unknown target', async () => {
    const { svc } = makeService();
    await expect(svc.createField(2, { name: 'x', label: 'X', type: 'lookup' }))
      .rejects.toMatchObject({ errors: { lookupEntityId: expect.any(String) } });
    await expect(svc.createField(2, { name: 'x', label: 'X', type: 'master-detail', lookupEntityId: 999 }))
      .rejects.toMatchObject({ errors: { lookupEntityId: expect.any(String) } });
  });

  test('persists formula expressions on fields', async () => {
    const { svc } = makeService();
    const field = await svc.createField(1, {
      name: 'total', label: 'Total', type: 'number', formulaExpression: '{a} + {b}',
    });
    expect(field.formulaExpression).toBe('{a} + {b}');
  });
});
