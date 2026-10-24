export function buildSchemaGraph(entities, fields) {
  const liveEntities = (entities || []).filter((e) => !e.deletedAt);
  const liveFields = (fields || []).filter((f) => !f.deletedAt);
  const byId = new Map(liveEntities.map((e) => [Number(e.id), e]));

  const links = liveFields
    .filter((f) => f.lookupEntityId && byId.has(Number(f.lookupEntityId)))
    .map((f) => ({
      fromEntity: Number(f.entityId),
      fromField: f.name,
      toEntity: Number(f.lookupEntityId),
      toField: f.lookupField || 'id',
      type: 'lookup',
    }));

  const outboundOf = new Map();
  const inboundOf = new Map();
  for (const link of links) {
    const out = outboundOf.get(link.fromEntity) || [];
    out.push(link);
    outboundOf.set(link.fromEntity, out);
    const inc = inboundOf.get(link.toEntity) || [];
    inc.push(link);
    inboundOf.set(link.toEntity, inc);
  }

  const nodes = liveEntities.map((e) => {
    const id = Number(e.id);
    return {
      id,
      name: e.name,
      label: e.label || e.name,
      fields: liveFields
        .filter((f) => Number(f.entityId) === id)
        .map((f) => ({
          id: f.id,
          name: f.name,
          label: f.label || f.name,
          type: f.type,
          required: !!f.required,
          primaryKey: f.name === 'id',
          foreignKey: f.lookupEntityId && byId.has(Number(f.lookupEntityId))
            ? { toEntity: Number(f.lookupEntityId), toField: f.lookupField || 'id' }
            : null,
        })),
      relationships: {
        outbound: outboundOf.get(id) || [],
        inbound: inboundOf.get(id) || [],
      },
    };
  });

  return { entities: nodes, links };
}

const IGNORED_FIELDS = new Set(['id', 'created_at', 'updated_at', 'createdAt', 'updatedAt', 'deleted_at', 'deletedAt']);

export function findDuplicateCandidates(entities, fields, threshold = 0.5) {
  const liveEntities = (entities || []).filter((e) => !e.deletedAt);
  const byEntity = new Map();
  for (const f of fields || []) {
    if (f.deletedAt || IGNORED_FIELDS.has(f.name)) {
      continue;
    }
    const key = Number(f.entityId);
    if (!byEntity.has(key)) {
      byEntity.set(key, new Set());
    }
    byEntity.get(key).add(`${f.name}:${f.type || 'text'}`);
  }
  const pairs = [];
  for (let i = 0; i < liveEntities.length; i++) {
    for (let j = i + 1; j < liveEntities.length; j++) {
      const a = liveEntities[i];
      const b = liveEntities[j];
      const setA = byEntity.get(Number(a.id)) || new Set();
      const setB = byEntity.get(Number(b.id)) || new Set();
      if (!setA.size || !setB.size) {
        continue;
      }
      const shared = [...setA].filter((x) => setB.has(x));
      const score = shared.length / Math.max(setA.size, setB.size);
      if (score >= threshold) {
        pairs.push({
          entityA: { id: Number(a.id), name: a.name, label: a.label || a.name },
          entityB: { id: Number(b.id), name: b.name, label: b.label || b.name },
          score: Math.round(score * 100) / 100,
          sharedFields: shared.map((s) => s.split(':')[0]),
          recommendation: score >= 0.85
            ? 'Near-duplicate schemas — consider merging into one entity'
            : 'High field overlap — consider a shared base entity or lookup relation',
        });
      }
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
}

export default { buildSchemaGraph, findDuplicateCandidates };
