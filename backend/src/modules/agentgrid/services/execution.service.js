import { getDrizzle } from '../../../core/db/drizzle.js';
import { agentgridExecutions, agentgridExecutionLogs } from '../models/index.js';
import { eq, and, count as drizzleCount, asc, desc } from 'drizzle-orm';

export class ExecutionService {
  _db() {
    return getDrizzle();
  }

  async startExecution(agentId, input = {}, context = {}) {
    const db = this._db();
    const now = new Date();

    const result = await db.insert(agentgridExecutions).values({
      agentId: Number(agentId),
      parentExecutionId: context.parentExecutionId ? Number(context.parentExecutionId) : null,
      status: 'pending',
      input,
      output: {},
      startedAt: now,
      triggeredBy: context.triggeredBy || 'api',
      createdAt: now,
      updatedAt: now
    });

    const execution = await this.getLatestExecution(Number(agentId));
    return execution?.id;
  }

  async getLatestExecution(agentId) {
    const db = this._db();
    const result = await db.select()
      .from(agentgridExecutions)
      .where(eq(agentgridExecutions.agentId, Number(agentId)))
      .orderBy(desc(agentgridExecutions.id))
      .limit(1);
    return result[0] || null;
  }

  async updateExecution(executionId, status, output = null, error = null) {
    const db = this._db();
    const execution = await this.getExecution(executionId);

    const completedAt = ['success', 'failed', 'cancelled'].includes(status) ? new Date() : null;
    const duration = completedAt && execution?.startedAt ? Math.round((completedAt - execution.startedAt) / 1000) : null;

    await db.update(agentgridExecutions)
      .set({
        status,
        output: output || {},
        error,
        completedAt,
        duration,
        updatedAt: new Date()
      })
      .where(eq(agentgridExecutions.id, Number(executionId)));
  }

  async appendLog(executionId, level = 'info', message = '', data = {}) {
    const db = this._db();

    await db.insert(agentgridExecutionLogs).values({
      executionId: Number(executionId),
      level,
      message,
      data,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async getExecution(executionId) {
    const db = this._db();
    const result = await db.select()
      .from(agentgridExecutions)
      .where(eq(agentgridExecutions.id, Number(executionId)));

    return result[0] || null;
  }

  async getExecutionLogs(executionId) {
    const db = this._db();
    const logs = await db.select()
      .from(agentgridExecutionLogs)
      .where(eq(agentgridExecutionLogs.executionId, Number(executionId)))
      .orderBy(asc(agentgridExecutionLogs.createdAt));

    return logs;
  }

  async getExecutionWithLogs(executionId) {
    const execution = await this.getExecution(executionId);
    const logs = await this.getExecutionLogs(executionId);

    return {
      ...execution,
      logs
    };
  }

  async cancelExecution(executionId) {
    return await this.updateExecution(executionId, 'cancelled', null, 'Cancelled by user');
  }

  async listByAgent(agentId, options = {}) {
    const db = this._db();
    const { page = 1, limit = 20 } = options;

    const offset = (page - 1) * limit;

    const executions = await db.select()
      .from(agentgridExecutions)
      .where(eq(agentgridExecutions.agentId, Number(agentId)))
      .orderBy(desc(agentgridExecutions.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db.select({ value: drizzleCount() })
      .from(agentgridExecutions)
      .where(eq(agentgridExecutions.agentId, Number(agentId)));

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
