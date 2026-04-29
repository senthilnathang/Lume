import { Injectable } from '@nestjs/common';

export interface EntityDefinition<T = any> {
  name: string;
  label: string;
  description?: string;
  icon?: string;
  fields: Record<string, FieldDefinition>;
  computed?: Record<string, ComputedFieldDefinition>;
  hooks?: EntityHooks<T>;
  permissions?: EntityPermissionDef;
  triggers?: EntityTriggerDef[];
  indexes?: IndexDefinition[];
  extends?: string;
  aiMetadata?: EntityAIMetadata;
}

export interface FieldDefinition {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  unique?: boolean;
  isIndexed?: boolean;
  defaultValue?: any;
  validation?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ComputedFieldDefinition {
  name: string;
  formula: string;
  type: string;
  recomputeOn?: string[];
}

export interface EntityHooks<T = any> {
  beforeCreate?: (data: Partial<T>, ctx: RequestContext) => Promise<Partial<T>>;
  afterCreate?: (record: T, ctx: RequestContext) => Promise<void>;
  beforeUpdate?: (id: number, data: Partial<T>, ctx: RequestContext) => Promise<Partial<T>>;
  afterUpdate?: (record: T, ctx: RequestContext) => Promise<void>;
  beforeDelete?: (id: number, ctx: RequestContext) => Promise<void>;
  afterDelete?: (id: number, ctx: RequestContext) => Promise<void>;
}

export interface EntityPermissionDef {
  fieldLevel?: Record<string, FieldPermission>;
  recordLevel?: RecordPermissionDef;
}

export interface FieldPermission {
  readRoles?: string[];
  writeRoles?: string[];
}

export interface RecordPermissionDef {
  owner?: string;
  sharingModel?: 'public' | 'private' | 'role-based';
}

export interface EntityTriggerDef {
  name: string;
  event: 'create' | 'update' | 'delete';
  action: string;
}

export interface IndexDefinition {
  name: string;
  fields: string[];
  unique?: boolean;
}

export interface EntityAIMetadata {
  description?: string;
  sensitiveFields?: string[];
  summarizeWith?: string;
}

export interface ModuleDefinition {
  name: string;
  version: string;
  description?: string;
  depends?: string[];
  entities?: EntityDefinition[];
  workflows?: WorkflowDefinition[];
  views?: ViewDefinition[];
  services?: ServiceProvider[];
  permissions?: string[];
  hooks?: ModuleLifecycleHooks;
  frontend?: ModuleFrontendManifest;
}

export interface ModuleLifecycleHooks {
  onInstall?: (db: any) => Promise<void>;
  onUninstall?: (db: any) => Promise<void>;
  onLoad?: () => Promise<void>;
  onUpgrade?: (fromVersion: string) => Promise<void>;
}

export interface ModuleFrontendManifest {
  routes?: string[];
  components?: string[];
}

export interface ServiceProvider {
  name: string;
  factory: any;
}

export interface WorkflowDefinition {
  name: string;
  version?: string;
  entity: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  onError?: 'stop' | 'continue' | 'retry';
  maxRetries?: number;
  timeout?: number;
}

export type WorkflowTrigger =
  | { type: 'record.created' | 'record.updated' | 'record.deleted' }
  | { type: 'schedule'; cron: string }
  | { type: 'manual'; key: string }
  | { type: 'field_changed'; field: string; from?: any; to?: any };

export type WorkflowStep =
  | { type: 'condition'; if: ConditionExpr; then: WorkflowStep[]; else?: WorkflowStep[] }
  | { type: 'set_field'; field: string; value: any }
  | { type: 'send_notification'; to: string; template: string }
  | { type: 'call_webhook'; url: string; method: string; body?: any }
  | { type: 'create_record'; entity: string; data: Record<string, any> }
  | { type: 'ai'; prompt: string; outputField: string }
  | { type: 'delay'; duration: number; unit: 'seconds' | 'minutes' | 'hours' | 'days' }
  | { type: 'custom'; handler: string };

export type ConditionExpr = Record<string, any>;

export interface ViewDefinition {
  name: string;
  entity: string;
  type: 'form' | 'table' | 'kanban' | 'calendar' | 'dashboard' | 'grid';
  label: string;
  isDefault?: boolean;
  config: FormViewConfig | TableViewConfig | KanbanViewConfig | CalendarViewConfig | DashboardViewConfig;
}

export interface FormViewConfig {
  sections: FormSection[];
}

export interface FormSection {
  id: string;
  label?: string;
  columns?: number;
  rows: FormRow[];
}

export interface FormRow {
  fields: FormField[];
}

export interface FormField {
  fieldName: string;
  label?: string;
  colspan?: number;
}

export interface TableViewConfig {
  columns: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
}

export interface KanbanViewConfig {
  groupByField: string;
  displayField?: string;
}

export interface CalendarViewConfig {
  startDateField: string;
  endDateField?: string;
}

export interface DashboardViewConfig {
  widgets: DashboardWidget[];
}

export interface DashboardWidget {
  type: 'counter' | 'chart' | 'table' | 'metric';
  title: string;
  config: any;
}

export interface PolicyDefinition {
  name: string;
  entity: string;
  actions: ('read' | 'write' | 'delete' | 'create' | '*')[];
  conditions?: PolicyCondition[];
  roles?: string[];
  deny?: boolean;
}

export interface PolicyCondition {
  field: string;
  operator: '==' | '!=' | 'in' | 'contains' | '>' | '<';
  value: string | number | '$userId' | '$roleId' | '$companyId';
}

export interface RequestContext {
  userId?: number;
  roleId?: number;
  userRoles?: string[];
  companyId?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class MetadataRegistryService {
  private entities = new Map<string, EntityDefinition>();
  private modules = new Map<string, ModuleDefinition>();
  private workflows = new Map<string, WorkflowDefinition>();
  private views = new Map<string, ViewDefinition>();
  private policies = new Map<string, PolicyDefinition>();
  private entityExtensions = new Map<string, Partial<EntityDefinition>[]>();

  registerEntity(definition: EntityDefinition): void {
    this.entities.set(definition.name, definition);
  }

  registerModule(definition: ModuleDefinition): void {
    this.modules.set(definition.name, definition);
  }

  registerWorkflow(definition: WorkflowDefinition): void {
    this.workflows.set(definition.name, definition);
  }

  registerView(definition: ViewDefinition): void {
    this.views.set(definition.name, definition);
  }

  registerPolicy(definition: PolicyDefinition): void {
    this.policies.set(definition.name, definition);
  }

  extendEntity(entityName: string, extension: Partial<EntityDefinition>): void {
    if (!this.entityExtensions.has(entityName)) {
      this.entityExtensions.set(entityName, []);
    }
    this.entityExtensions.get(entityName)!.push(extension);
  }

  getEntity(name: string): EntityDefinition | undefined {
    return this.entities.get(name);
  }

  getModule(name: string): ModuleDefinition | undefined {
    return this.modules.get(name);
  }

  getWorkflow(name: string): WorkflowDefinition | undefined {
    return this.workflows.get(name);
  }

  getView(name: string): ViewDefinition | undefined {
    return this.views.get(name);
  }

  getPolicy(name: string): PolicyDefinition | undefined {
    return this.policies.get(name);
  }

  listEntities(): EntityDefinition[] {
    return Array.from(this.entities.values());
  }

  listModules(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  listViews(): ViewDefinition[] {
    return Array.from(this.views.values());
  }

  listPolicies(): PolicyDefinition[] {
    return Array.from(this.policies.values());
  }

  getEntityWithExtensions(name: string): EntityDefinition | undefined {
    const base = this.entities.get(name);
    if (!base) return undefined;

    const extensions = this.entityExtensions.get(name) || [];
    if (extensions.length === 0) return base;

    return {
      ...base,
      fields: {
        ...base.fields,
        ...extensions.flatMap(e => e.fields || {}).reduce((acc, val) => ({ ...acc, ...val }), {}),
      },
      hooks: {
        ...base.hooks,
        ...extensions.flatMap(e => e.hooks || {}).reduce((acc, val) => ({ ...acc, ...val }), {}),
      },
    };
  }

  unregisterEntity(name: string): void {
    this.entities.delete(name);
    this.entityExtensions.delete(name);
  }

  unregisterModule(name: string): void {
    this.modules.delete(name);
  }

  unregisterWorkflow(name: string): void {
    this.workflows.delete(name);
  }

  unregisterView(name: string): void {
    this.views.delete(name);
  }

  unregisterPolicy(name: string): void {
    this.policies.delete(name);
  }
}
