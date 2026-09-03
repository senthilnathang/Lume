export function resolveModel(body) {
  const { model, model_name, entity_type } = body || {};
  return model || model_name || entity_type || null;
}

export function stripAliases(body) {
  const { model_name: _modelName, entity_type: _entityType, ...rest } = body || {};
  return rest;
}

export default { resolveModel, stripAliases };
