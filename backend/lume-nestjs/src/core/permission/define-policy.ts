import { PolicyDefinition } from '@core/runtime/metadata-registry.service';

export function definePolicy(definition: PolicyDefinition): PolicyDefinition {
  return definition;
}

export type { PolicyDefinition } from '@core/runtime/metadata-registry.service';
