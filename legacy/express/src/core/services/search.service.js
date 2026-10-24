function parseData(record) {
  try {
    return typeof record?.data === 'string' ? JSON.parse(record.data) : record?.data || {};
  } catch {
    return {};
  }
}

function titleOf(data) {
  for (const key of ['title', 'name', 'subject', 'label']) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      return String(data[key]);
    }
  }
  return '';
}

function matches(text, query) {
  return text.toLowerCase().includes(query.toLowerCase());
}

function rank(title, query) {
  const lower = title.toLowerCase();
  const q = query.toLowerCase();
  if (lower === q) {
    return 0;
  }
  if (lower.startsWith(q)) {
    return 1;
  }
  return 2;
}

export async function searchRecords(prisma, { query, companyId, userId, isPrivileged = false, limit = 20 }) {
  const q = String(query || '').trim();
  if (!q) {
    return [];
  }
  const where = { companyId, deletedAt: null };
  const records = await prisma.entityRecord.findMany({ where });
  const entities = {};
  const results = [];
  for (const record of records || []) {
    if (!isPrivileged && userId !== undefined && userId !== null) {
      const visible = !record.visibility || record.visibility !== 'private' || Number(record.createdBy) === Number(userId);
      if (!visible) {
        continue;
      }
    }
    const data = parseData(record);
    const title = titleOf(data);
    if (!title || !matches(title, q)) {
      continue;
    }
    let entityName = entities[record.entityId];
    if (entityName === undefined) {
      try {
        const entity = await prisma.entity.findUnique({ where: { id: record.entityId } });
        entityName = entity?.name || `entity_${record.entityId}`;
      } catch {
        entityName = `entity_${record.entityId}`;
      }
      entities[record.entityId] = entityName;
    }
    results.push({
      id: record.id,
      title,
      description: String(data.description || data.excerpt || '').slice(0, 140),
      model: entityName,
      group: 'Records',
    });
  }
  return results
    .sort((a, b) => rank(a.title, q) - rank(b.title, q))
    .slice(0, limit);
}

export async function searchDocuments(prisma, { query, limit = 10 }) {
  const q = String(query || '').trim();
  if (!q || !prisma.documents) {
    return [];
  }
  let rows = [];
  try {
    rows = await prisma.documents.findMany({ where: { deletedAt: null } });
  } catch {
    return [];
  }
  return (rows || [])
    .filter((doc) => matches(doc.title || '', q))
    .slice(0, limit)
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      description: String(doc.description || '').slice(0, 140),
      model: 'documents',
      group: 'Documents',
    }));
}

export async function globalSearch(prisma, context) {
  const limit = Math.min(Number(context.limit) || 20, 50);
  const [records, documents] = await Promise.all([
    searchRecords(prisma, { ...context, limit }),
    searchDocuments(prisma, context),
  ]);
  const rows = [...records, ...documents].slice(0, limit);
  return { results: rows, total: rows.length, query: String(context.query || '') };
}

export default { searchRecords, searchDocuments, globalSearch };
