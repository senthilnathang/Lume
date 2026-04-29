import { Injectable, ServiceUnavailableException, NotFoundException } from '@nestjs/common';
import { LoggerService } from '@core/services/logger.service';

@Injectable()
export class QueueService {
  constructor(private logger: LoggerService) {}

  /**
   * Get queue manager instance
   */
  private getQueueManager(): any {
    try {
      // This would be injected from queue-init.js in the core
      // For now we return null to indicate not initialized
      const queueManager = (global as any).queueManager;
      if (!queueManager) {
        throw new Error('Queue manager not initialized');
      }
      return queueManager;
    } catch (error) {
      throw new ServiceUnavailableException('Queue manager not initialized');
    }
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats(): Promise<any> {
    const qm = this.getQueueManager();
    const stats = await qm.getAllQueueStats();

    return {
      success: true,
      data: stats,
      summary: {
        totalQueues: stats.length,
        totalJobs: stats.reduce((sum: number, q: any) => sum + q.total, 0),
        activeJobs: stats.reduce((sum: number, q: any) => sum + q.active, 0),
        failedJobs: stats.reduce((sum: number, q: any) => sum + q.failed, 0),
      },
    };
  }

  /**
   * Get statistics for a specific queue
   */
  async getQueueStats(queueName: string): Promise<any> {
    const qm = this.getQueueManager();
    const stats = await qm.getQueueStats(queueName);

    if (!stats) {
      throw new NotFoundException(`Queue "${queueName}" not found`);
    }

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get job details
   */
  async getJob(queueName: string, jobId: string): Promise<any> {
    const qm = this.getQueueManager();
    const job = await qm.getJob(queueName, jobId);

    if (!job) {
      throw new NotFoundException(`Job "${jobId}" not found in queue "${queueName}"`);
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      success: true,
      data: {
        id: job.id,
        state,
        progress,
        data: job.data,
        result: job.returnvalue,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        createdAt: job.createdAt,
        finishedAt: job.finishedOn,
        delay: job.delay,
      },
    };
  }

  /**
   * Clear a queue
   */
  async clearQueue(queueName: string): Promise<any> {
    const qm = this.getQueueManager();
    const cleared = await qm.clearQueue(queueName);

    if (!cleared) {
      throw new NotFoundException(`Queue "${queueName}" not found`);
    }

    return {
      success: true,
      message: `Queue "${queueName}" cleared successfully`,
    };
  }

  /**
   * Add a job to a queue
   */
  async addJob(queueName: string, data: Record<string, any>, options: Record<string, any> = {}): Promise<any> {
    if (!data) {
      throw new Error('Job data is required');
    }

    const qm = this.getQueueManager();
    const job = await qm.addJob(queueName, data, options);

    return {
      success: true,
      data: {
        id: job.id,
        queueName,
        status: 'queued',
        createdAt: new Date(),
      },
      message: `Job "${job.id}" added to queue "${queueName}"`,
    };
  }

  /**
   * Add a recurring job
   */
  async addRecurringJob(
    queueName: string,
    jobName: string,
    data: Record<string, any>,
    pattern: string,
    options: Record<string, any> = {},
  ): Promise<any> {
    if (!jobName || !data || !pattern) {
      throw new Error('jobName, data, and pattern are required');
    }

    const qm = this.getQueueManager();
    const job = await qm.addRecurringJob(queueName, jobName, data, pattern, options);

    return {
      success: true,
      data: {
        id: job.id,
        queueName,
        jobName,
        pattern,
        createdAt: new Date(),
      },
      message: `Recurring job "${jobName}" added to queue "${queueName}"`,
    };
  }

  /**
   * List all queues
   */
  async getQueues(): Promise<any> {
    const qm = this.getQueueManager();
    const queues = qm.getQueues();

    return {
      success: true,
      data: queues,
      message: `Found ${queues.length} queues`,
    };
  }
}
