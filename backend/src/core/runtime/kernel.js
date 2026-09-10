import { EventBus } from './event-bus.js';
import { evaluateFormula } from '../services/formula.service.js';

const sharedBusHolders = [];

function sharedEmit(event) {
  for (const bus of sharedBusHolders) {
    try {
      const maybePromise = bus.emitLocal(event);
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {});
      }
    } catch {
      /* listener errors never break publishers */
    }
  }
}

export class EntityEngine {
  constructor(registry, options = {}) {
    this.registry = registry;
    this.workflowExecutor = options.workflowExecutor || new WorkflowExecutor(registry);
    this.records = new Map();
    this.seq = 1;
  }

  key(entity, id) {
    return `${entity}:${id}`;
  }

  fieldEntries(entityDef) {
    const fields = entityDef?.fields;
    if (Array.isArray(fields)) {
      return fields.map((f) => (typeof f === 'string' ? { name: f } : f));
    }
    if (fields && typeof fields === 'object') {
      return Object.entries(fields).map(([name, def]) => ({ name, ...(typeof def === 'object' ? def : {}) }));
    }
    return [];
  }

  async runHooks(entityDef, hookName, payload) {
    const hooks = entityDef?.hooks?.[hookName];
    if (typeof hooks === 'function') {
      return hooks(payload) || payload;
    }
    if (Array.isArray(hooks)) {
      let data = payload;
      for (const hook of hooks) {
        if (typeof hook === 'function') {
          data = (await hook(data)) || data;
        }
      }
      return data;
    }
    return payload;
  }

  applyDefaultsAndComputed(entityDef, data) {
    const out = { ...data };
    for (const field of this.fieldEntries(entityDef)) {
      if (out[field.name] === undefined && field.defaultValue !== undefined) {
        out[field.name] = field.defaultValue;
      }
    }
    for (const [name, computed] of Object.entries(entityDef?.computed || {})) {
      if (out[name] === undefined && computed?.formula) {
        try {
          out[name] = evaluateFormula(computed.formula, out);
        } catch {
          out[name] = null;
        }
      }
    }
    return out;
  }

  validateRequired(entityDef, data) {
    const missing = this.fieldEntries(entityDef)
      .filter((f) => f.required && (data[f.name] === undefined || data[f.name] === null || data[f.name] === ''))
      .map((f) => f.name);
    if (missing.length) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  checkPolicies(entityDef, entity, action, record, context = {}) {
    const policies = [];
    if (typeof this.registry?.getPermissions === 'function') {
      try {
        const found = this.registry.getPermissions(entity, action);
        if (Array.isArray(found)) {
          policies.push(...found);
        }
      } catch {
        /* policy lookup is best-effort */
      }
    }
    const relevant = policies.filter((p) => !p.entity || p.entity === entity);
    if (!relevant.length) {
      return;
    }
    const allowed = relevant.some((policy) => {
      if (Array.isArray(policy.roles) && policy.roles.length && context.role && !policy.roles.includes(context.role)) {
        return false;
      }
      return (policy.conditions || []).every((condition) => {
        const expected = condition.value === '$userId' ? context.userId : condition.value;
        const actual = record?.[condition.field];
        switch (condition.operator) {
          case '==': return actual === expected;
          case '!=': return actual !== expected;
          default: return true;
        }
      });
    });
    if (!allowed) {
      throw new Error(`Access denied for ${action} on ${entity}`);
    }
  }

  async create(entity, data, context = {}) {
    const def = await this.registry?.getEntity?.(entity);
    if (!def) {
      throw new Error(`Unknown entity: ${entity}`);
    }
    const prepared = await this.runHooks(def, 'beforeCreate', { ...data });
    const withDefaults = this.applyDefaultsAndComputed(def, prepared);
    this.validateRequired(def, withDefaults);
    const record = { id: this.seq++, ...withDefaults };
    this.records.set(this.key(entity, record.id), record);
    await this.runHooks(def, 'afterCreate', { ...record });
    await this.fireWorkflows(entity, 'record.created', { ...record });
    return { ...record };
  }

  async read(entity, id, context = {}) {
    const record = this.records.get(this.key(entity, id)) || null;
    if (!record) {
      return null;
    }
    this.checkPolicies(await this.registry?.getEntity?.(entity), entity, 'read', record, context);
    return { ...record };
  }

  async update(entity, id, data, context = {}) {
    const existing = await this.read(entity, id, context);
    if (!existing) {
      return null;
    }
    const merged = { ...existing, ...data };
    this.records.set(this.key(entity, id), merged);
    return { ...merged };
  }

  async delete(entity, id) {
    return this.records.delete(this.key(entity, id));
  }

  async list(entity) {
    return [...this.records.entries()]
      .filter(([key]) => key.startsWith(`${entity}:`))
      .map(([, record]) => ({ ...record }));
  }

  async fireWorkflows(entity, triggerType, record) {
    if (!this.workflowExecutor) {
      return [];
    }
    const names = await this.workflowExecutor.workflowNamesFor(entity, triggerType);
    const results = [];
    for (const name of names) {
      results.push(await this.workflowExecutor.execute(name, { type: triggerType, entity, data: record }));
    }
    return results;
  }
}

const sharedRuns = [];
let runSeq = 1;

export class WorkflowExecutor {
  constructor(registry) {
    this.registry = registry;
    this.runs = sharedRuns;
  }

  async workflowNamesFor(entity, triggerType) {
    const workflows = typeof this.registry?.listWorkflows === 'function'
      ? await this.registry.listWorkflows()
      : [];
    return (workflows || [])
      .filter((w) => (!w.entity || w.entity === entity) && (!w.trigger || w.trigger.type === triggerType || w.trigger === triggerType))
      .map((w) => w.name || w.id);
  }

  evaluateCondition(condition, record) {
    if (!condition) {
      return true;
    }
    const actual = record?.[condition.field];
    switch (condition.operator) {
      case '==': return actual === condition.value;
      case '!=': return actual !== condition.value;
      case '>': return actual > condition.value;
      case '<': return actual < condition.value;
      default: return true;
    }
  }

  async runSteps(steps, record) {
    const stepsLog = [];
    const working = { ...record };
    const runList = async (list) => {
      for (const step of list || []) {
        if (step.type === 'condition') {
          const passed = this.evaluateCondition(step.if, working);
          stepsLog.push({ step: step.type, passed });
          if (passed) {
            await runList(step.then);
          } else if (step.else) {
            await runList(step.else);
          }
        } else if (step.type === 'set_field') {
          working[step.field] = step.value;
          stepsLog.push({ step: step.type, field: step.field, value: step.value });
        } else if (step.type === 'log') {
          stepsLog.push({ step: step.type, message: step.message || '' });
        } else {
          stepsLog.push({ step: step.type || 'unknown', skipped: true });
        }
      }
    };
    await runList(steps);
    return { record: working, stepsLog };
  }

  async execute(name, event = {}) {
    const workflow = await this.registry?.getWorkflow?.(name);
    if (!workflow) {
      throw new Error(`Unknown workflow: ${name}`);
    }
    const { record, stepsLog } = await this.runSteps(workflow.steps, event.data || {});
    const run = { id: `run-${runSeq++}`, name, status: 'completed', stepsLog, record, at: new Date() };
    this.runs.push(run);
    sharedEmit({ type: 'workflow.completed', workflow: name, runId: run.id, ...(event.data ? { data: event.data } : {}) });
    return run;
  }

  async getRunHistory(name = null) {
    if (!name) {
      return [...this.runs];
    }
    return this.runs.filter((run) => run.name === name);
  }
}

export class EventBusService extends EventBus {
  constructor(...args) {
    super(...args);
    sharedBusHolders.push(this);
  }

  emitLocal(event) {
    return super.emit(event);
  }

  async emit(event) {
    await super.emit(event);
    return event;
  }
}

export default { EntityEngine, WorkflowExecutor, EventBusService };
