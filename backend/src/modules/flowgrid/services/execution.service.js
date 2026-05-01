import { getDrizzle } from '../../../core/db/drizzle.js';
import { flowgridExecutions, flowgridNodeExecutions } from '../models/index.js';
import { eq, and, count as drizzleCount, asc } from 'drizzle-orm';

export class ExecutionService {
  _db() {
    return getDrizzle();
  }

  async startExecution(workflowId, input = {}, context = {}) {
    const db = this._db();
    const now = new Date();
    const result = await db.insert(flowgridExecutions).values({
      workflowId: Number(workflowId),
      status: 'pending',
      input,
      variables: input,
      startedAt: now,
      triggeredBy: context.triggeredBy || 'api',
      createdAt: now,
      updatedAt: now
    });

    const inserted = await this.getLatestExecution(Number(workflowId));
    return inserted?.id;
  }

  async getLatestExecution(workflowId) {
    const db = this._db();
    const result = await db.select()
      .from(flowgridExecutions)
      .where(eq(flowgridExecutions.workflowId, Number(workflowId)))
      .orderBy(asc(flowgridExecutions.id))
      .limit(1);
    return result[0] || null;
  }

  async updateExecution(executionId, status, output = null, error = null) {
    const db = this._db();
    const execution = await this.getExecution(executionId);

    const completedAt = ['success', 'failed', 'cancelled'].includes(status) ? new Date() : null;
    const duration = completedAt && execution?.startedAt ? Math.round((completedAt - execution.startedAt) / 1000) : null;

    await db.update(flowgridExecutions)
      .set({
        status,
        output: output || {},
        error,
        completedAt,
        duration,
        updatedAt: new Date()
      })
      .where(eq(flowgridExecutions.id, Number(executionId)));
  }

  async recordNodeExecution(executionId, nodeId, nodeType, config, input = null, status = 'pending', output = null, error = null) {
    const db = this._db();
    const now = new Date();

    const result = await db.insert(flowgridNodeExecutions).values({
      executionId: Number(executionId),
      nodeId: String(nodeId),
      nodeType: String(nodeType),
      status,
      input: input || config,
      output: output || {},
      error,
      startedAt: now,
      createdAt: now,
      updatedAt: now
    });

    const inserted = await this.getLatestNodeExecution(Number(executionId));
    return inserted?.id;
  }

  async getLatestNodeExecution(executionId) {
    const db = this._db();
    const result = await db.select()
      .from(flowgridNodeExecutions)
      .where(eq(flowgridNodeExecutions.executionId, Number(executionId)))
      .orderBy(asc(flowgridNodeExecutions.id))
      .limit(1);
    return result[0] || null;
  }

  async updateNodeExecution(id, status, output = null, error = null, tokens = null, cost = null) {
    const db = this._db();

    await db.update(flowgridNodeExecutions)
      .set({
        status,
        output: output || {},
        error,
        tokens,
        cost,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(flowgridNodeExecutions.id, Number(id)));
  }

  async getExecution(executionId) {
    const db = this._db();
    const result = await db.select()
      .from(flowgridExecutions)
      .where(eq(flowgridExecutions.id, Number(executionId)));

    return result[0] || null;
  }

  async getExecutionTimeline(executionId) {
    const db = this._db();
    const nodeExecutions = await db.select()
      .from(flowgridNodeExecutions)
      .where(eq(flowgridNodeExecutions.executionId, Number(executionId)))
      .orderBy(asc(flowgridNodeExecutions.createdAt));

    return nodeExecutions;
  }

  async getExecutionWithTimeline(executionId) {
    const execution = await this.getExecution(executionId);
    const timeline = await this.getExecutionTimeline(executionId);

    return {
      ...execution,
      timeline
    };
  }

  async cancelExecution(executionId) {
    return await this.updateExecution(executionId, 'cancelled', null, 'Cancelled by user');
  }

  async listExecutions(workflowId, options = {}) {
    const db = this._db();
    const { page = 1, limit = 20 } = options;

    const offset = (page - 1) * limit;

    const executions = await db.select()
      .from(flowgridExecutions)
      .where(eq(flowgridExecutions.workflowId, Number(workflowId)))
      .orderBy(asc(flowgridExecutions.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db.select({ value: drizzleCount() })
      .from(flowgridExecutions)
      .where(eq(flowgridExecutions.workflowId, Number(workflowId)));

    const total = countResult[0]?.value || 0;

    return {
      executions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}
