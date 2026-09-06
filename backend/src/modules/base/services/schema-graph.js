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

export default { buildSchemaGraph };
