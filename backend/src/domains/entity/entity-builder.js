/**
 * @fileoverview Entity Builder - Factory functions for defining entities and fields
 * Provides defineEntity() and defineField() APIs for declarative entity definition
 */

import { randomUUID } from 'crypto';
import logger from '../../core/services/logger.js';

/**
 * Define a field within an entity
 * @param {string} name - Field name (snake_case)
 * @param {string} type - Field type (text, number, date, select, relation, etc.)
 * @param {Object} options - Field options
 * @returns {FieldDefinition}
 */
export function defineField(name, type, options = {}) {
  if (!name || !type) {
    throw new Error('Field name and type are required');
  }

  const field = {
    id: randomUUID(),
    name,
    type,
    label: options.label || name.charAt(0).toUpperCase() + name.slice(1),
    required: options.required ?? false,
    unique: options.unique ?? false,
    indexed: options.indexed ?? false,
    defaultValue: options.defaultValue ?? null,
    computed: options.computed ?? false,
    computed_expression: options.computed_expression ?? null,
    validation: options.validation ?? [],
    config: options.config ?? {},
  };

  // Validate field configuration
  if (field.computed && !field.computed_expression) {
    throw new Error(`Computed field '${name}' must have a computed_expression`);
  }

  if (field.required && field.computed) {
    throw new Error(`Field '${name}' cannot be both required and computed`);
  }

  logger.debug(`[EntityBuilder] Defined field: ${name} (${type})`);
  return field;
}

/**
 * Define a relation between entities
 * @param {string} name - Relation name
 * @param {string} target - Target entity slug
 * @param {'many-to-one'|'one-to-many'|'many-to-many'} type - Relation type
 * @param {Object} options - Relation options
 * @returns {RelationDefinition}
 */
export function defineRelation(name, target, type, options = {}) {
  return {
    name,
    target,
    type,
    required: options.required ?? false,
    foreignKey: options.foreignKey ?? `${name}_id`,
    throughTable: options.throughTable ?? null,
  };
}

/**
 * Define a permission policy for an entity
 * @param {string} resource - Resource name (entity slug)
 * @param {string} action - Action name
 * @param {Object} options - Policy options
 * @returns {PermissionPolicy}
 */
export function definePermission(resource, action, options = {}) {
  return {
    resource,
    action,
    rule: options.rule ?? null,
    scope: options.scope ?? null,
    fieldLevel: options.fieldLevel ?? {},
    allow: options.allow ?? true,
  };
}

/**
 * Define a hook for an entity
 * @param {string} trigger - Hook trigger (beforeCreate, afterCreate, etc.)
 * @param {Function} fn - Hook function
 * @returns {{ trigger: string, fn: Function }}
 */
export function defineHook(trigger, fn) {
  if (typeof fn !== 'function') {
    throw new Error(`Hook for '${trigger}' must be a function`);
  }

  return { trigger, fn };
}

/**
 * Define a view for an entity
 * @param {string} type - View type (table, form, kanban, calendar, timeline)
 * @param {Object} options - View options
 * @returns {ViewDefinition}
 */
export function defineView(type, options = {}) {
  if (!['table', 'form', 'kanban', 'calendar', 'timeline'].includes(type)) {
    throw new Error(`Invalid view type: ${type}`);
  }

  return {
    id: options.id ?? type,
    type,
    label: options.label ?? type.charAt(0).toUpperCase() + type.slice(1),
    columns: options.columns ?? [],
    filters: options.filters ?? [],
    groupBy: options.groupBy ?? null,
    dateField: options.dateField ?? null,
    defaultSort: options.defaultSort ?? null,
    config: options.config ?? {},
  };
}

/**
 * Define an agent (reactive automation)
 * @param {string} id - Agent ID
 * @param {Object} options - Agent options
 * @returns {AgentDefinition}
 */
export function defineAgent(id, options = {}) {
  if (!id) {
    throw new Error('Agent ID is required');
  }

  if (!options.trigger && !options.schedule) {
    throw new Error(`Agent '${id}' must have a trigger or schedule`);
  }

  if (!options.action) {
    throw new Error(`Agent '${id}' must have an action`);
  }

  return {
    id,
    trigger: options.trigger ?? null,
    schedule: options.schedule ?? null,
    action: {
      type: options.action.type,
      updates: options.action.updates ?? null,
      workflowId: options.action.workflowId ?? null,
      notify: options.action.notify ?? null,
    },
  };
}

/**
 * Define a workflow
 * @param {string} id - Workflow ID
 * @param {Object} options - Workflow options
 * @returns {WorkflowDefinition}
 */
export function defineWorkflow(id, options = {}) {
  if (!id) {
    throw new Error('Workflow ID is required');
  }

  if (!options.trigger) {
    throw new Error(`Workflow '${id}' must have a trigger`);
  }

  if (!options.steps || !Array.isArray(options.steps)) {
    throw new Error(`Workflow '${id}' must have steps`);
  }

  return {
    id,
    trigger: options.trigger,
    name: options.name ?? id,
    steps: options.steps,
    errorHandler: options.errorHandler ?? { type: 'fail' },
    status: options.status ?? 'draft',
  };
}

/**
 * Define an entity
 * @param {Object} options - Entity options
 * @returns {EntityDefinition}
 */
export function defineEntity(options = {}) {
  // Validate required fields
  if (!options.slug) {
    throw new Error('Entity slug is required');
  }

  if (!options.orm || !['prisma', 'drizzle'].includes(options.orm)) {
    throw new Error('Entity must specify orm: "prisma" or "drizzle"');
  }

  if (!options.tableName) {
    throw new Error('Entity tableName is required');
  }

  if (!Array.isArray(options.fields)) {
    throw new Error('Entity fields must be an array');
  }

  // Build entity definition
  const entity = {
    id: options.id ?? randomUUID(),
    slug: options.slug,
    name: options.name ?? options.slug,
    label: options.label ?? options.name ?? options.slug,
    description: options.description ?? null,
    icon: options.icon ?? null,
    color: options.color ?? null,
    orm: options.orm,
    tableName: options.tableName,
    fields: options.fields || [],
    relations: options.relations || [],
    hooks: this.normalizeHooks(options.hooks),
    workflows: options.workflows ?? { onCreate: [], onUpdate: [], onDelete: [] },
    agents: options.agents || [],
    permissions: options.permissions || [],
    views: options.views || [],
    softDelete: options.softDelete ?? true,
    auditable: options.auditable ?? true,
  };

  // Validate entities have at least one field
  if (entity.fields.length === 0) {
    throw new Error(`Entity '${entity.slug}' must have at least one field`);
  }

  logger.info(`[EntityBuilder] Defined entity: ${entity.slug}`);

  return entity;
}

/**
 * Normalize hooks from hook definitions to internal format
 * @private
 * @param {Object} hooksConfig - Hooks configuration
 * @returns {Object} Normalized hooks
 */
function normalizeHooks(hooksConfig = {}) {
  const normalized = {
    beforeCreate: [],
    afterCreate: [],
    beforeUpdate: [],
    afterUpdate: [],
    beforeDelete: [],
    afterDelete: [],
  };

  if (!hooksConfig) {
    return normalized;
  }

  // Convert single function to array
  for (const [key, value] of Object.entries(hooksConfig)) {
    if (key in normalized) {
      if (typeof value === 'function') {
        normalized[key] = [value];
      } else if (Array.isArray(value)) {
        normalized[key] = value.filter(v => typeof v === 'function');
      }
    }
  }

  return normalized;
}

/**
 * Build a complete entity with fluent API (alternative to options object)
 * @param {string} slug - Entity slug
 * @returns {EntityBuilder} Builder instance
 */
export class EntityBuilder {
  constructor(slug) {
    this.config = {
      slug,
      name: slug,
      orm: 'drizzle',
      tableName: slug,
      fields: [],
      relations: [],
      hooks: {},
      workflows: { onCreate: [], onUpdate: [], onDelete: [] },
      agents: [],
      permissions: [],
      views: [],
      softDelete: true,
      auditable: true,
    };
  }

  name(name) {
    this.config.name = name;
    return this;
  }

  label(label) {
    this.config.label = label;
    return this;
  }

  orm(orm) {
    if (!['prisma', 'drizzle'].includes(orm)) {
      throw new Error('ORM must be "prisma" or "drizzle"');
    }
    this.config.orm = orm;
    return this;
  }

  tableName(tableName) {
    this.config.tableName = tableName;
    return this;
  }

  field(field) {
    this.config.fields.push(field);
    return this;
  }

  fields(fields) {
    this.config.fields.push(...fields);
    return this;
  }

  relation(relation) {
    this.config.relations.push(relation);
    return this;
  }

  relations(relations) {
    this.config.relations.push(...relations);
    return this;
  }

  permission(permission) {
    this.config.permissions.push(permission);
    return this;
  }

  permissions(permissions) {
    this.config.permissions.push(...permissions);
    return this;
  }

  hook(trigger, fn) {
    if (!this.config.hooks[trigger]) {
      this.config.hooks[trigger] = [];
    }
    this.config.hooks[trigger].push(fn);
    return this;
  }

  beforeCreate(fn) {
    return this.hook('beforeCreate', fn);
  }

  afterCreate(fn) {
    return this.hook('afterCreate', fn);
  }

  beforeUpdate(fn) {
    return this.hook('beforeUpdate', fn);
  }

  afterUpdate(fn) {
    return this.hook('afterUpdate', fn);
  }

  beforeDelete(fn) {
    return this.hook('beforeDelete', fn);
  }

  afterDelete(fn) {
    return this.hook('afterDelete', fn);
  }

  workflow(trigger, workflowIds) {
    if (!this.config.workflows[trigger]) {
      this.config.workflows[trigger] = [];
    }
    if (Array.isArray(workflowIds)) {
      this.config.workflows[trigger].push(...workflowIds);
    } else {
      this.config.workflows[trigger].push(workflowIds);
    }
    return this;
  }

  agent(agent) {
    this.config.agents.push(agent);
    return this;
  }

  agents(agents) {
    this.config.agents.push(...agents);
    return this;
  }

  view(view) {
    this.config.views.push(view);
    return this;
  }

  views(views) {
    this.config.views.push(...views);
    return this;
  }

  softDelete(enabled) {
    this.config.softDelete = enabled;
    return this;
  }

  auditable(enabled) {
    this.config.auditable = enabled;
    return this;
  }

  icon(icon) {
    this.config.icon = icon;
    return this;
  }

  color(color) {
    this.config.color = color;
    return this;
  }

  build() {
    return defineEntity(this.config);
  }
}

/**
 * Create a new entity builder
 * @param {string} slug - Entity slug
 * @returns {EntityBuilder}
 */
export function entity(slug) {
  return new EntityBuilder(slug);
}

export default {
  defineEntity,
  defineField,
  defineRelation,
  definePermission,
  defineHook,
  defineView,
  defineAgent,
  defineWorkflow,
  entity,
  EntityBuilder,
};
