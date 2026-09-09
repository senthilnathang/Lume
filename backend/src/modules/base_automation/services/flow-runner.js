import { evaluateFormula } from '../../../core/services/formula.service.js';

const MAX_STEPS = 50;

function nodeMap(nodes) {
  const map = new Map();
  for (const node of nodes || []) {
    if (node && node.id !== undefined) {
      map.set(String(node.id), node);
    }
  }
  return map;
}

function outgoing(edges, nodeId) {
  return (edges || []).filter((e) => String(e.from) === String(nodeId));
}

export async function executeNode(node, context, actions) {
  const config = node.config || {};
  switch (node.type) {
    case 'trigger':
      return { ok: true, skipped: false };
    case 'condition': {
      const expression = config.expression || config.condition || 'true';
      let result = false;
      try {
        result = !!evaluateFormula(String(expression), context.record || {});
      } catch {
        result = false;
      }
      return { ok: true, skipped: false, branch: result ? 'true' : 'false' };
    }
    case 'webhook': {
      if (!config.url) {
        return { ok: false, error: 'Webhook node has no url' };
      }
      await actions.httpPost(config.url, { event: context.event, record: context.record || null });
      return { ok: true, skipped: false };
    }
    case 'update_record': {
      if (config.recordId === undefined || !config.data || typeof config.data !== 'object') {
        return { ok: false, error: 'update_record needs recordId and data' };
      }
      await actions.updateRecord(config.recordId, config.data);
      return { ok: true, skipped: false };
    }
    case 'log': {
      await actions.log(config.message || `Flow step: ${node.label || node.id}`);
      return { ok: true, skipped: false };
    }
    default:
      return { ok: false, skipped: true, error: `Unknown node type: ${node.type}` };
  }
}

export async function executeFlow(flow, context, actions) {
  const nodes = nodeMap(flow.nodes);
  const entry = [...nodes.values()].find((n) => n.type === 'trigger' && (!n.config?.event || n.config.event === context.event));
  const log = [];
  if (!entry) {
    return { executed: false, steps: log };
  }
  let current = entry;
  let steps = 0;
  while (current && steps < MAX_STEPS) {
    steps += 1;
    let outcome;
    try {
      outcome = await executeNode(current, context, actions);
    } catch (error) {
      outcome = { ok: false, error: error.message };
    }
    log.push({ node: current.id, type: current.type, ...outcome });
    if (!outcome.ok) {
      break;
    }
    const next = outgoing(flow.edges, current.id);
    if (!next.length) {
      break;
    }
    if (current.type === 'condition') {
      const branch = next.find((e) => String(e.label || e.branch || 'true') === String(outcome.branch || 'true')) || next[0];
      current = nodes.get(String(branch.to));
    } else {
      current = nodes.get(String(next[0].to));
    }
  }
  return { executed: true, steps: log };
}

export async function fireRecordFlows({ findFlows, event, entityName, record, actions }) {
  const flows = await findFlows();
  const results = [];
  for (const flow of flows || []) {
    if (flow.status === 'draft') {
      continue;
    }
    const trigger = String(flow.trigger || 'manual');
    if (trigger !== event && trigger !== 'record.*') {
      continue;
    }
    if (flow.model && String(flow.model) !== String(entityName)) {
      continue;
    }
    try {
      results.push({ flowId: flow.id, ...(await executeFlow(flow, { event, record }, actions)) });
    } catch (error) {
      results.push({ flowId: flow.id, executed: false, error: error.message });
    }
  }
  return results;
}

export default { executeFlow, executeNode, fireRecordFlows };
