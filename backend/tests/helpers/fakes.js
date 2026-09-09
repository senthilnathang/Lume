function matchValue(actual, expected) {
  if (expected === null || expected === undefined) {
    return actual === null || actual === undefined;
  }
  if (typeof expected === 'object') {
    if ('in' in expected) {
      return expected.in.includes(actual);
    }
    if ('not' in expected) {
      return actual !== expected.not;
    }
    return true;
  }
  return actual === expected;
}

export function matchWhere(record, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') {
      return value.some((clause) => matchWhere(record, clause));
    }
    if (key === 'AND') {
      return value.every((clause) => matchWhere(record, clause));
    }
    return matchValue(record[key], value);
  });
}

export function parseDataField(record) {
  try {
    return typeof record?.data === 'string' ? JSON.parse(record.data) : record?.data || {};
  } catch {
    return {};
  }
}

export function makeStore(overrides = {}) {
  return {
    entities: [{ id: 1, name: 'widget', label: 'Widget', deletedAt: null }],
    fields: [
      { id: 11, entityId: 1, name: 'title', label: 'Title', type: 'text', required: true, deletedAt: null },
      { id: 12, entityId: 1, name: 'status', label: 'Status', type: 'select', deletedAt: null },
    ],
    records: [],
    fieldPermissions: [],
    settings: [],
    users: [{ id: 9, role_id: 3 }],
    roles: [{ id: 3, name: 'editor', isActive: true, metadata: null }],
    seq: { record: 100, field: 100 },
    ...overrides,
  };
}

export function fakePrisma(store) {
  return {
    entity: {
      findUnique: async ({ where }) => store.entities.find((e) => matchWhere(e, where)) || null,
      findFirst: async ({ where } = {}) => store.entities.find((e) => matchWhere(e, where)) || null,
    },
    entityField: {
      findMany: async ({ where } = {}) => store.fields.filter((f) => matchWhere(f, where)),
    },
    entityFieldPermission: {
      findMany: async ({ where } = {}) => store.fieldPermissions.filter((p) => matchWhere(p, where)),
    },
    entityRecord: {
      create: async ({ data }) => {
        const rec = { id: store.seq.record++, deletedAt: null, ...data };
        store.records.push(rec);
        return rec;
      },
      findUnique: async ({ where }) => store.records.find((r) => r.id === where.id) || null,
      findMany: async ({ where } = {}) => store.records.filter((r) => matchWhere(r, where)),
      update: async ({ where, data }) => {
        const rec = store.records.find((r) => r.id === where.id);
        Object.assign(rec, data);
        return rec;
      },
      delete: async ({ where }) => {
        const i = store.records.findIndex((r) => r.id === where.id);
        return store.records.splice(i, 1)[0];
      },
      deleteMany: async ({ where } = {}) => {
        const before = store.records.length;
        store.records = store.records.filter((r) => !matchWhere(r, where));
        return { count: before - store.records.length };
      },
    },
    setting: {
      findFirst: async ({ where } = {}) => {
        const hit = store.settings.find((s) => matchWhere(s, where));
        return hit || null;
      },
    },
    user: {
      findUnique: async ({ where }) => store.users.find((u) => matchWhere(u, where)) || null,
    },
    role: {
      findUnique: async ({ where }) => store.roles.find((r) => matchWhere(r, where)) || null,
      findMany: async () => store.roles,
    },
  };
}

export const factories = {
  field: (overrides = {}) => ({
    id: 900, entityId: 1, name: 'field', label: 'Field', type: 'text', deletedAt: null, ...overrides,
  }),
};

export default { matchWhere, parseDataField, makeStore, fakePrisma, factories };
