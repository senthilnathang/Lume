/**
 * Queue Manager Service
 * Centralized job queue management using BullMQ
 * Handles background job processing for:
 * - Entity record batch operations (import, export, delete)
 * - Automation workflows and business rules execution
 * - Email notifications and webhooks
 * - File processing and media operations
 * - Report generation and exports
 */

import { Queue, Worker, QueueScheduler } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

export class QueueManagerService {
  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.schedulers = new Map();
    this.redis = redis;
    this.initialized = false;
  }

  /**
   * Initialize all job queues
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Create queues for different job types
      this.createQueue('entity-records', {
        description: 'Entity record batch operations (import, export, delete)'
      });

      this.createQueue('automations', {
        description: 'Workflow and automation rule execution'
      });

      this.createQueue('notifications', {
        description: 'Email, SMS, and webhook notifications'
      });

      this.createQueue('exports', {
        description: 'Data export operations (CSV, Excel, PDF)'
      });

      this.createQueue('media', {
        description: 'Media processing and optimization'
      });

      this.createQueue('webhooks', {
        description: 'Outbound webhook delivery and retries'
      });

      this.createQueue('reports', {
        description: 'Report generation and scheduling'
      });

      this.initialized = true;
      console.log('✅ QueueManager initialized with 7 job queues');
    } catch (error) {
      console.error('❌ QueueManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new job queue with scheduler
   * @param {string} queueName - Queue name
   * @param {Object} options - Queue options
   */
  createQueue(queueName, options = {}) {
    if (this.queues.has(queueName)) {
      return this.queues.get(queueName);
    }

    const queue = new Queue(queueName, {
      connection: redis,
      ...options
    });

    // Create scheduler for this queue (handles delayed/recurring jobs)
    const scheduler = new QueueScheduler(queueName, {
      connection: redis
    });

    this.queues.set(queueName, queue);
    this.schedulers.set(queueName, scheduler);

    console.log(`📦 Created queue: ${queueName}`);

    return queue;
  }

  /**
   * Register a job processor for a specific queue
   * @param {string} queueName - Queue name
   * @param {Function} processor - Async job handler function(job)
   * @param {Object} options - Worker options (concurrency, etc)
   */
  registerProcessor(queueName, processor, options = {}) {
    if (!this.queues.has(queueName)) {
      throw new Error(`Queue "${queueName}" does not exist`);
    }

    const queue = this.queues.get(queueName);

    // Create worker if not exists
    if (!this.workers.has(queueName)) {
      const worker = new Worker(queueName, processor, {
        connection: redis,
        concurrency: options.concurrency || 5,
        ...options
      });

      // Handle worker events
      worker.on('completed', (job) => {
        console.log(`✅ Job ${job.id} completed in ${queueName}`);
      });

      worker.on('failed', (job, err) => {
        console.error(`❌ Job ${job.id} failed in ${queueName}:`, err.message);
      });

      worker.on('error', (err) => {
        console.error(`⚠️ Worker error in ${queueName}:`, err);
      });

      this.workers.set(queueName, worker);
      console.log(`👷 Registered processor for queue: ${queueName}`);
    }

    return queue;
  }

  /**
   * Add a job to a queue
   * @param {string} queueName - Queue name
   * @param {Object} data - Job data
   * @param {Object} options - Job options (priority, delay, repeat, etc)
   * @returns {Promise<Job>}
   */
  async addJob(queueName, data, options = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    const job = await queue.add(data.name || 'job', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      ...options
    });

    return job;
  }

  /**
   * Add a recurring job to a queue
   * @param {string} queueName - Queue name
   * @param {string} jobName - Job name
   * @param {Object} data - Job data
   * @param {string} repeatPattern - Cron pattern (e.g., '0 9 * * *' for 9am daily)
   * @param {Object} options - Additional options
   */
  async addRecurringJob(queueName, jobName, data, repeatPattern, options = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    const job = await queue.add(jobName, data, {
      repeat: {
        pattern: repeatPattern
      },
      ...options
    });

    return job;
  }

  /**
   * Get job by ID
   * @param {string} queueName - Queue name
   * @param {string} jobId - Job ID
   */
  async getJob(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const job = await queue.getJob(jobId);
    return job;
  }

  /**
   * Get queue statistics
   * @param {string} queueName - Queue name
   */
  async getQueueStats(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const counts = await queue.getJobCounts();
    const waitingCount = counts.waiting || 0;
    const activeCount = counts.active || 0;
    const completedCount = counts.completed || 0;
    const failedCount = counts.failed || 0;

    return {
      name: queueName,
      waiting: waitingCount,
      active: activeCount,
      completed: completedCount,
      failed: failedCount,
      total: waitingCount + activeCount + completedCount + failedCount
    };
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats() {
    const stats = [];
    for (const [queueName] of this.queues) {
      stats.push(await this.getQueueStats(queueName));
    }
    return stats;
  }

  /**
   * Clear a queue (remove all jobs)
   * @param {string} queueName - Queue name
   */
  async clearQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    await queue.clean(0, 'completed');
    await queue.clean(0, 'failed');
    return true;
  }

  /**
   * Shutdown all workers and queues
   */
  async shutdown() {
    console.log('🛑 Shutting down QueueManager...');

    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      console.log(`Closed worker: ${name}`);
    }

    // Close all schedulers
    for (const [name, scheduler] of this.schedulers) {
      await scheduler.close();
      console.log(`Closed scheduler: ${name}`);
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      console.log(`Closed queue: ${name}`);
    }

    await redis.quit();
    console.log('✅ QueueManager shutdown complete');
  }

  /**
   * Get list of all queues
   */
  getQueues() {
    return Array.from(this.queues.keys());
  }

  /**
   * Get a specific queue instance
   */
  getQueue(queueName) {
    return this.queues.get(queueName);
  }
}

export default QueueManagerService;
