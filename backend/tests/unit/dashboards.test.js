import { DashboardService } from '../../src/modules/advanced_features/services/dashboards.js';

function makeService() {
  const store = { dashboards: [], widgets: [{ id: 7, name: 'KPI' }], seq: 1 };
  const svc = new DashboardService();
  const byId = (rows) => async (id) => rows.find((r) => r.id === Number(id)) || null;
  svc.dashboards = {
    findAll: async () => ({ rows: store.dashboards, total: store.dashboards.length }),
    findById: byId(store.dashboards),
    create: async (data) => {
      const row = { id: store.seq++, ...data };
      store.dashboards.push(row);
      return row;
    },
    update: async (id, data) => {
      const row = store.dashboards.find((r) => r.id === Number(id));
      Object.assign(row, data);
      return row;
    },
    destroy: async (id) => {
      const i = store.dashboards.findIndex((r) => r.id === Number(id));
      store.dashboards.splice(i, 1);
      return true;
    },
  };
  svc.categories = {
    findAll: async () => ({ rows: [], total: 0 }),
    create: async (data) => ({ id: 1, ...data }),
  };
  svc.widgets = { findById: byId(store.widgets) };
  return svc;
}

describe('dashboards (FastVue port)', () => {
  test('validates dashboard definitions', async () => {
    const svc = makeService();
    try {
      await svc.createDashboard({});
      expect(true).toBe(false);
    } catch (error) {
      expect(error.errors.name).toMatch(/required/i);
      expect(error.errors.code).toMatch(/required/i);
    }
    const ok = await svc.createDashboard({ name: 'Exec', code: 'exec' });
    expect(ok.visibility).toBe('company');
    expect(ok.isActive).toBe(true);
  });

  test('assigns widget placements and resolves them on read', async () => {
    const svc = makeService();
    const dash = await svc.createDashboard({ name: 'Exec', code: 'exec' });
    await svc.assignWidgets(dash.id, [{ widgetId: 7, x: 0, y: 0, w: 3, h: 2 }, { widgetId: 'nope' }]);
    const full = await svc.getDashboardWithWidgets(dash.id);
    expect(full.widgets).toHaveLength(1);
    expect(full.widgets[0].layout).toEqual({ x: 0, y: 0, w: 3, h: 2 });
  });

  test('setDefault keeps a single default', async () => {
    const svc = makeService();
    const a = await svc.createDashboard({ name: 'A', code: 'a' });
    const b = await svc.createDashboard({ name: 'B', code: 'b' });
    await svc.setDefault(a.id);
    await svc.setDefault(b.id);
    const { rows } = await svc.listDashboards();
    expect(rows.filter((d) => d.isDefault)).toHaveLength(1);
  });

  test('returns null/false for unknown dashboards', async () => {
    const svc = makeService();
    expect(await svc.getDashboardWithWidgets(999)).toBeNull();
    expect(await svc.removeDashboard(999)).toBe(false);
    expect(await svc.assignWidgets(999, [])).toBeNull();
  });
});
