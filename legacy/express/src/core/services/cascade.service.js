function referenceMatches(value, recordId) {
  if (value === null || value === undefined) {
    return false;
  }
  const candidate = typeof value === 'object' ? value.id : value;
  return Number(candidate) === Number(recordId) && candidate !== '' && recordId !== '';
}

function parseRecordData(record) {
  try {
    return typeof record.data === 'string' ? JSON.parse(record.data) : record.data || {};
  } catch {
    return {};
  }
}

export async function cascadeDeleteRecords(prisma, entityId, recordId, options = {}) {
  const { soft = true, visited = new Set() } = options;
  const key = `${entityId}:${recordId}`;
  if (visited.has(key)) {
    return 0;
  }
  visited.add(key);

  const fields = await prisma.entityField.findMany({
    where: { type: 'master-detail', deletedAt: null },
  });
  const relevant = (fields || []).filter((f) => Number(f.lookupEntityId) === Number(entityId));
  if (!relevant.length) {
    return 0;
  }

  const byEntity = new Map();
  for (const f of relevant) {
    const list = byEntity.get(f.entityId) || [];
    list.push(f);
    byEntity.set(f.entityId, list);
  }

  let count = 0;
  for (const [detailEntityId, mdFields] of byEntity) {
    const records = await prisma.entityRecord.findMany({
      where: { entityId: detailEntityId, deletedAt: null },
    });
    for (const rec of records || []) {
      const data = parseRecordData(rec);
      const owned = mdFields.some((f) => referenceMatches(data[f.name], recordId));
      if (!owned) {
        continue;
      }
      if (soft) {
        await prisma.entityRecord.update({
          where: { id: rec.id },
          data: { deletedAt: new Date() },
        });
      } else {
        await prisma.entityRecord.delete({ where: { id: rec.id } });
      }
      count += 1;
      count += await cascadeDeleteRecords(prisma, detailEntityId, rec.id, { soft, visited });
    }
  }
  return count;
}

export default { cascadeDeleteRecords };
