/**
 * @fileoverview Unit tests for WorkflowJobQueue
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import WorkflowJobQueue from '../../src/core/workflows/job-queue.js';

/**
 * Helper function to create a test job
 * @param {Partial<any>} overrides Partial job properties to override defaults
 * @returns {any} A complete WorkflowJob for testing
 */
function createJob(overrides = {}) {
  return {
    id: `job-${Math.random().toString(36).substr(2, 9)}`,
    workflowId: 'workflow-1',
    instanceId: 'instance-1',
    actionId: 'action-1',
    status: 'queued',
    payload: { test: true },
    retries: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('WorkflowJobQueue', () => {
  /** @type {WorkflowJobQueue} */
  let queue;

  beforeEach(() => {
    queue = new WorkflowJobQueue();
  });

  describe('Enqueue/Dequeue', () => {
    it('should enqueue a job and increase size', () => {
      const job = createJob();
      queue.enqueue(job);

      expect(queue.size()).toBe(1);
    });

    it('should dequeue jobs in FIFO order', () => {
      const job1 = createJob({ id: 'job-1' });
      const job2 = createJob({ id: 'job-2' });

      queue.enqueue(job1);
      queue.enqueue(job2);

      const dequeued1 = queue.dequeue();
      const dequeued2 = queue.dequeue();

      expect(dequeued1?.id).toBe('job-1');
      expect(dequeued2?.id).toBe('job-2');
      expect(queue.size()).toBe(0);
    });

    it('should return null when dequeuing empty queue', () => {
      const result = queue.dequeue();

      expect(result).toBeNull();
    });
  });

  describe('Job Retrieval', () => {
    it('should retrieve job by ID without removing', () => {
      const job = createJob({ id: 'test-job' });
      queue.enqueue(job);

      const retrieved = queue.getJob('test-job');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-job');
      expect(queue.size()).toBe(1); // Job still in queue
    });

    it('should return null for non-existent job', () => {
      const result = queue.getJob('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('Job Updates', () => {
    it('should update job status', () => {
      const job = createJob({ id: 'test-job', status: 'queued' });
      queue.enqueue(job);

      queue.updateJob('test-job', { status: 'running' });

      const retrieved = queue.getJob('test-job');
      expect(retrieved?.status).toBe('running');
    });

    it('should remove job from queue when status is completed', () => {
      const job = createJob({ id: 'job-1', status: 'queued' });
      queue.enqueue(job);
      expect(queue.size()).toBe(1);

      queue.updateJob('job-1', { status: 'completed' });

      expect(queue.size()).toBe(0);
      expect(queue.getJob('job-1')).toBeNull();
    });

    it('should remove job from queue when status is failed', () => {
      const job = createJob({ id: 'job-1', status: 'queued' });
      queue.enqueue(job);
      expect(queue.size()).toBe(1);

      queue.updateJob('job-1', { status: 'failed' });

      expect(queue.size()).toBe(0);
      // Failed job remains in jobMap for potential retry
      expect(queue.getJob('job-1')).not.toBeNull();
      expect(queue.getJob('job-1')?.status).toBe('failed');
    });

    it('should increment completed count on completed status', () => {
      const job = createJob({ id: 'job-1' });
      queue.enqueue(job);

      queue.updateJob('job-1', { status: 'completed' });

      const stats = queue.getStats();
      expect(stats.completedCount).toBe(1);
    });

    it('should increment failed count on failed status', () => {
      const job = createJob({ id: 'job-1' });
      queue.enqueue(job);

      queue.updateJob('job-1', { status: 'failed' });

      const stats = queue.getStats();
      expect(stats.failedCount).toBe(1);
    });
  });

  describe('Retry Handling', () => {
    it('should check if job can retry', () => {
      const job = createJob({ retries: 0 });

      expect(queue.canRetry(job)).toBe(true);
    });

    it('should prevent retry when max retries exceeded', () => {
      const job = createJob({ retries: 3 }); // maxRetries is 3, so 3 >= 3

      expect(queue.canRetry(job)).toBe(false);
    });

    it('should allow retry within limit', () => {
      const job = createJob({ id: 'job-1', retries: 2 });
      queue.enqueue(job);

      const success = queue.retry('job-1');

      expect(success).toBe(true);
      const updated = queue.getJob('job-1');
      expect(updated?.retries).toBe(3);
      expect(updated?.status).toBe('queued');
    });

    it('should re-enqueue job on retry', () => {
      const job = createJob({ id: 'job-1', retries: 0 });
      queue.enqueue(job);
      queue.dequeue(); // Remove it

      expect(queue.size()).toBe(0);

      queue.retry('job-1');

      expect(queue.size()).toBe(1);
    });

    it('should return false when retrying non-existent job', () => {
      const success = queue.retry('non-existent');

      expect(success).toBe(false);
    });

    it('should return false when exceeding max retries', () => {
      const job = createJob({ id: 'job-1', retries: 3 });
      queue.enqueue(job);

      const success = queue.retry('job-1');

      expect(success).toBe(false);
    });

    it('should increment retries count on successful retry', () => {
      const job = createJob({ id: 'job-1', retries: 1 });
      queue.enqueue(job);

      queue.retry('job-1');

      const updated = queue.getJob('job-1');
      expect(updated?.retries).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should track queue statistics', () => {
      const job1 = createJob({ id: 'job-1' });
      const job2 = createJob({ id: 'job-2' });
      const job3 = createJob({ id: 'job-3' });

      queue.enqueue(job1);
      queue.enqueue(job2);
      queue.enqueue(job3);

      // Complete one job
      queue.updateJob('job-1', { status: 'completed' });

      // Fail one job
      queue.updateJob('job-2', { status: 'failed' });

      const stats = queue.getStats();

      expect(stats.queuedCount).toBe(1); // job-3 still queued
      expect(stats.completedCount).toBe(1);
      expect(stats.failedCount).toBe(1);
      expect(stats.totalProcessed).toBe(2); // completed + failed
    });

    it('should return zero stats for empty queue', () => {
      const stats = queue.getStats();

      expect(stats.queuedCount).toBe(0);
      expect(stats.completedCount).toBe(0);
      expect(stats.failedCount).toBe(0);
      expect(stats.totalProcessed).toBe(0);
    });
  });

  describe('Queue Management', () => {
    it('should return max retries value', () => {
      const maxRetries = queue.getMaxRetries();

      expect(maxRetries).toBe(3);
    });

    it('should clear entire queue', () => {
      const job1 = createJob({ id: 'job-1' });
      const job2 = createJob({ id: 'job-2' });

      queue.enqueue(job1);
      queue.enqueue(job2);
      expect(queue.size()).toBe(2);

      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.getJob('job-1')).toBeNull();
      expect(queue.getJob('job-2')).toBeNull();
    });

    it('should return accurate size after multiple operations', () => {
      const job1 = createJob({ id: 'job-1' });
      const job2 = createJob({ id: 'job-2' });
      const job3 = createJob({ id: 'job-3' });

      queue.enqueue(job1);
      queue.enqueue(job2);
      queue.enqueue(job3);
      expect(queue.size()).toBe(3);

      queue.dequeue();
      expect(queue.size()).toBe(2);

      queue.dequeue();
      expect(queue.size()).toBe(1);

      queue.dequeue();
      expect(queue.size()).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple completed jobs correctly', () => {
      const job1 = createJob({ id: 'job-1' });
      const job2 = createJob({ id: 'job-2' });

      queue.enqueue(job1);
      queue.enqueue(job2);

      queue.updateJob('job-1', { status: 'completed' });
      queue.updateJob('job-2', { status: 'completed' });

      const stats = queue.getStats();
      expect(stats.completedCount).toBe(2);
      expect(stats.queuedCount).toBe(0);
    });

    it('should handle job with multiple property updates', () => {
      const job = createJob({ id: 'job-1' });
      queue.enqueue(job);

      queue.updateJob('job-1', {
        status: 'running',
        startedAt: new Date(),
      });

      const updated = queue.getJob('job-1');
      expect(updated?.status).toBe('running');
      expect(updated?.startedAt).toBeDefined();
    });

    it('should maintain FIFO order with retries', () => {
      const job1 = createJob({ id: 'job-1' });
      const job2 = createJob({ id: 'job-2' });
      const job3 = createJob({ id: 'job-3' });

      queue.enqueue(job1);
      queue.enqueue(job2);
      queue.enqueue(job3);

      // Dequeue and fail job1
      const dequeued = queue.dequeue();
      queue.updateJob(dequeued.id, { status: 'failed' });

      // Retry job1 - should be added to end
      queue.retry(dequeued.id);

      // Dequeue remaining jobs
      const second = queue.dequeue();
      const third = queue.dequeue();
      const retried = queue.dequeue();

      expect(second?.id).toBe('job-2');
      expect(third?.id).toBe('job-3');
      expect(retried?.id).toBe('job-1');
    });
  });
});
