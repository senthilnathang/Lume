import { EntityRegistryService } from './entity-registry.service';
import { EntityDefinition } from '@core/runtime/metadata-registry.service';

let entityRegistry: EntityRegistryService;

export function setEntityRegistry(registry: EntityRegistryService): void {
  entityRegistry = registry;
}

export function extendEntity(
  entityName: string,
  extension: Partial<EntityDefinition>,
): void {
  if (!entityRegistry) {
    throw new Error(
      'EntityRegistry not initialized. Call setEntityRegistry() first.',
    );
  }
  entityRegistry.extend(entityName, extension);
}
