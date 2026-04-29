import { EntityDefinition } from '@core/runtime/metadata-registry.service';

export function defineEntity<T = any>(
  name: string,
  definition: Omit<EntityDefinition<T>, 'name'>,
): EntityDefinition<T> {
  return {
    name,
    ...definition,
  };
}
