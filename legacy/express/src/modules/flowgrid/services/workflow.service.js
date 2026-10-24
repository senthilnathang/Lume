import { BaseService } from '../../../core/services/base.service.js';
import { DrizzleAdapter } from '../../../core/db/adapters/drizzle-adapter.js';
import { flowgridWorkflows } from '../models/index.js';

export class WorkflowService extends BaseService {
  constructor() {
    const adapter = new DrizzleAdapter(flowgridWorkflows, {
      fieldMeta: {
        id: { type: 'int', primaryKey: true },
        tenantId: { type: 'int' },
        name: { type: 'varchar' },
        status: { type: 'varchar' },
        createdById: { type: 'int' },
        publishedAt: { type: 'timestamp' },
        deletedAt: { type: 'timestamp' }
      }
    });
    super(adapter, { softDelete: true, audit: true, modelName: 'workflow' });
  }

  async publishWorkflow(id, context = {}) {
    const workflow = await this.read(id);
    if (!workflow) throw new Error('Workflow not found');

    const validation = this.validateWorkflow(workflow);
    if (validation.errors.length > 0) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    return await this.update(id, {
      status: 'published',
      publishedAt: new Date()
    }, context);
  }

  async archiveWorkflow(id, context = {}) {
    const workflow = await this.read(id);
    if (!workflow) throw new Error('Workflow not found');
    return await this.update(id, { status: 'archived' }, context);
  }

  async pauseWorkflow(id, context = {}) {
    const workflow = await this.read(id);
    if (!workflow) throw new Error('Workflow not found');
    return await this.update(id, { status: 'paused' }, context);
  }

  async duplicateWorkflow(id, context = {}) {
    const workflow = await this.read(id);
    if (!workflow) throw new Error('Workflow not found');

    const duplicate = {
      name: `${workflow.name} (Copy)`,
      description: workflow.description,
      nodes: JSON.parse(JSON.stringify(workflow.nodes || [])),
      edges: JSON.parse(JSON.stringify(workflow.edges || [])),
      variables: JSON.parse(JSON.stringify(workflow.variables || {})),
      trigger: JSON.parse(JSON.stringify(workflow.trigger || {})),
      settings: JSON.parse(JSON.stringify(workflow.settings || {})),
      status: 'draft',
      tenantId: workflow.tenantId,
      createdById: context.userId
    };

    return await this.create(duplicate, context);
  }

  validateWorkflow(workflow) {
    const errors = [];
    const warnings = [];

    if (!workflow.name) errors.push('Workflow name is required');
    if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    if (workflow.nodes && workflow.edges) {
      const nodeIds = new Set(workflow.nodes.map(n => n.id));
      const edgeErrors = this.detectCycles(workflow.nodes, workflow.edges);
      if (edgeErrors.length > 0) {
        errors.push(...edgeErrors);
      }

      workflow.edges.forEach(edge => {
        if (!nodeIds.has(edge.source)) {
          warnings.push(`Edge references non-existent source node: ${edge.source}`);
        }
        if (!nodeIds.has(edge.target)) {
          warnings.push(`Edge references non-existent target node: ${edge.target}`);
        }
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  detectCycles(nodes, edges) {
    const nodeIds = new Set(nodes.map(n => n.id));
    const adjacencyList = new Map();

    nodeIds.forEach(id => adjacencyList.set(id, []));
    edges.forEach(edge => {
      if (adjacencyList.has(edge.source)) {
        adjacencyList.get(edge.source).push(edge.target);
      }
    });

    const visited = new Set();
    const recStack = new Set();
    const errors = [];

    const dfs = (nodeId) => {
      visited.add(nodeId);
      recStack.add(nodeId);

      (adjacencyList.get(nodeId) || []).forEach(neighbor => {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          errors.push(`Cycle detected: ${nodeId} -> ${neighbor}`);
        }
      });

      recStack.delete(nodeId);
    };

    nodeIds.forEach(nodeId => {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    });

    return errors;
  }
}
