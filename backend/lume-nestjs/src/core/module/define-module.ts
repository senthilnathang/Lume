import type { ModuleDefinition } from '@core/runtime/metadata-registry.service';

export function defineModule(definition: ModuleDefinition): ModuleDefinition {
  return definition;
}

export type { ModuleDefinition } from '@core/runtime/metadata-registry.service';

/** Metadata for module discovery and frontend assets, separate from runtime definitions. */
export interface ModuleManifest {
  name: string;
  displayName: string;
  version: string;
  description?: string;
  dependencies?: string[];
  permissions?: string[];
  staticViews?: Record<string, { path: string; displayName: string; route: string; icon?: string }>;
  apiEndpoints?: Array<{ path: string; methods: string[]; description?: string }>;
}
