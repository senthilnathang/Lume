import { BadRequestException } from '@nestjs/common';
import { WorkflowDefinition, WorkflowStep } from '@core/runtime/metadata-registry.service';
import { transitionConditionError } from './workflow-transition-condition';

const invalid = (message: string): never => { throw new BadRequestException(`Invalid flow: ${message}`); };
function array(value: unknown): any[] {
  try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; if (Array.isArray(parsed)) return parsed; } catch { /* reported below */ }
  return invalid('nodes and edges must be arrays');
}
const plain = (value: any) => value && typeof value === 'object' && !Array.isArray(value);
const key = (value: any) => typeof value === 'string' && /^[A-Za-z_][\w.-]{0,99}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
function json(value: any, depth = 0) {
  if (depth > 20) invalid('configuration nesting exceeds 20 levels');
  if (value === undefined || typeof value === 'function' || typeof value === 'number' && !Number.isFinite(value)) invalid('configuration must be JSON');
  if (value && typeof value === 'object') for (const [name, child] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(name)) invalid('unsafe configuration key');
    json(child, depth + 1);
  }
}

/** Compile bounded acyclic graphs; never silently skip an edge or node. */
export function compileFlow(flow: any): WorkflowDefinition {
  if (typeof flow.name !== 'string' || !flow.name.trim() || typeof flow.model !== 'string' || !flow.model.trim()) invalid('name and model are required');
  if (flow.trigger !== 'manual') invalid('only manual flows can execute');
  const nodes = array(flow.nodes), edges = array(flow.edges);
  if (nodes.length < 2 || nodes.length > 100 || edges.length > 198) invalid('use 2–100 nodes and at most 198 edges');
  const byId = new Map<string, any>();
  const next = new Map<string, any[]>(), incoming = new Map<string, number>();
  for (const node of nodes) {
    if (!plain(node) || !key(node.id) || byId.has(node.id)) invalid('node IDs must be unique identifiers');
    if (Object.keys(node).some(k => !['id', 'type', 'name', 'position', 'config'].includes(k))) invalid('unsupported node properties');
    if (!['trigger_manual', 'condition_if', 'action_set_field', 'action_update_record', 'action_create_record', 'action_send_notification', 'end_success'].includes(node.type)) invalid(`unsupported node type ${String(node.type)}`);
    if (node.config !== undefined && !plain(node.config)) invalid('node config must be an object');
    json(node.config ?? {});
    byId.set(node.id, node);
  }
  for (const edge of edges) {
    if (!plain(edge) || !byId.has(edge.source) || !byId.has(edge.target) || edge.source === edge.target) invalid('edge references are invalid');
    if (Object.keys(edge).some(k => !['id', 'source', 'target', 'branch'].includes(k))) invalid('unsupported edge properties');
    next.set(edge.source, [...(next.get(edge.source) ?? []), edge]); incoming.set(edge.target, 1);
  }
  const starts = nodes.filter(n => n.type === 'trigger_manual'), ends = nodes.filter(n => n.type === 'end_success');
  if (starts.length !== 1 || ends.length !== 1 || incoming.has(starts[0].id) || next.has(ends[0].id)) invalid('one start and one terminal success node are required');
  for (const node of nodes) {
    const outgoing = next.get(node.id) ?? [];
    if (node.type === 'condition_if') {
      if (outgoing.length !== 2 || outgoing.filter(e => e.branch === 'then').length !== 1 || outgoing.filter(e => e.branch === 'else').length !== 1) invalid('conditions require one then edge and one else edge');
    } else if (outgoing.length !== (node.type === 'end_success' ? 0 : 1) || outgoing.some(e => e.branch !== undefined)) invalid('actions require one unlabelled edge to the success path');
  }
  const seen = new Set<string>(), visiting = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) invalid('cycles are not supported');
    if (seen.has(id)) return;
    visiting.add(id);
    for (const edge of next.get(id) ?? []) visit(edge.target);
    visiting.delete(id); seen.add(id);
  }
  visit(starts[0].id);
  if (seen.size !== nodes.length) invalid('all nodes must be reachable from the start');
  let compiled = 0;
  function path(id: string, depth = 0): WorkflowStep[] {
    if (depth > 10) return invalid('conditions may nest at most 10 levels');
    const steps: WorkflowStep[] = [];
    while (id !== undefined) {
      if (++compiled > 1000) invalid('expanded graph exceeds 1000 steps');
      const node = byId.get(id), config = node.config ?? {};
      if (node.type === 'condition_if') {
        if (Object.keys(config).some(k => k !== 'condition') || !plain(config.condition) || transitionConditionError(config.condition)) invalid('invalid condition predicate');
        const outgoing = next.get(id)!;
        steps.push({ type: 'record_condition', condition: config.condition,
          then: path(outgoing.find(e => e.branch === 'then').target, depth + 1),
          else: path(outgoing.find(e => e.branch === 'else').target, depth + 1) });
        return steps;
      }
      if (node.type === 'action_set_field') {
        if (Object.keys(config).some(k => !['fieldName', 'value'].includes(k)) || !key(config.fieldName) || !Object.prototype.hasOwnProperty.call(config, 'value')) invalid('field updates require fieldName and value');
        steps.push({ type: 'update_record', data: { [config.fieldName]: config.value } });
      } else if (node.type === 'action_update_record') {
        if (Object.keys(config).some(k => k !== 'data') || !plain(config.data) ||
          Object.keys(config.data).length < 1 || Object.keys(config.data).length > 100 ||
          Object.keys(config.data).some(k => !key(k))) invalid('record updates require data with 1–100 valid field names');
        steps.push({ type: 'update_record', data: config.data });
      } else if (node.type === 'action_create_record') {
        if (Object.keys(config).some(k => !['entity', 'data'].includes(k)) || !key(config.entity) || !plain(config.data) || Object.keys(config.data).some(k => !key(k))) invalid('record creation requires entity and data');
        steps.push({ type: 'create_record', entity: config.entity, data: config.data });
      } else if (node.type === 'action_send_notification') {
        if (Object.keys(config).some(k => !['recipientId', 'title', 'message'].includes(k)) ||
          !Number.isSafeInteger(config.recipientId) || config.recipientId < 1 || config.recipientId > 2147483647 ||
          typeof config.message !== 'string' || !config.message.trim() || config.message.length > 10000 ||
          (config.title !== undefined && (typeof config.title !== 'string' || !config.title.trim() || config.title.length > 255))) {
          invalid('in-app notifications require recipientId, a message of 1–10000 characters and an optional title of 1–255 characters');
        }
        steps.push({ type: 'send_notification', channel: 'in_app', to: String(config.recipientId), message: config.message,
          ...(config.title === undefined ? {} : { title: config.title }) });
      } else if (Object.keys(config).length) invalid('start/end configuration is not supported');
      id = next.get(id)?.[0]?.target;
    }
    return steps;
  }
  const steps = path(starts[0].id);
  return { name: `flow:${flow.id ?? 'draft'}`, entity: flow.model, trigger: { type: 'manual', key: 'flow' }, steps, onError: 'stop' };
}
