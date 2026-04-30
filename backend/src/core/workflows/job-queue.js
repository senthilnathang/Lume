/**
 * Workflow Job Queue
 * FIFO queue for async job processing with retry support and statistics tracking
 *
 * @module JobQueue
 */

/**
 * @typedef {Object} QueueStats
 * @property {number} queuedCount - Number of jobs currently waiting to be processed
 * @property {number} completedCount - Number of jobs that have completed successfully
 * @property {number} failedCount - Number of jobs that have failed
 * @property {number} totalProcessed - Total number of jobs processed (completed + failed)
 */

/**
 * WorkflowJobQueue - FIFO queue for managing async workflow jobs
 *
 * Provides O(1) job enqueue/dequeue operations, O(1) job lookup by ID,
 * and built-in retry logic with configurable max retries.
 *
 * @class WorkflowJobQueue
 * @example
 * const queue = new WorkflowJobQueue();
 * queue.enqueue(job);
 * const nextJob = queue.dequeue();
 * queue.updateJob(job.id, { status: 'completed' });
 */
export default class WorkflowJobQueue {
  /**
   * Initialize a new WorkflowJobQueue
   */
  constructor() {
    /**
     * FIFO queue array storing jobs in order
     * @type {Array<any>}
     * @private
     */
    this.queue = [];

    /**
     * Map for O(1) job lookup by ID
     * @type {Map<string, any>}
     * @private
     */
    this.jobMap = new Map();

    /**
     * Maximum number of retry attempts per job
     * @type {number}
     * @private
     */
    this.maxRetries = 3;

    /**
     * Statistics tracking completed and failed jobs
     * @type {{completed: number, failed: number}}
     * @private
     */
    this.stats = {
      completed: 0,
      failed: 0,
    };
  }

  /**
   * Add a job to the end of the queue (FIFO)
   *
   * @param {any} job - The job to enqueue
   * @public
   */
  enqueue(job) {
    this.queue.push(job);
    this.jobMap.set(job.id, job);
  }

  /**
   * Remove and return the next job from the queue (FIFO)
   * Returns null if queue is empty.
   * Note: Job remains in jobMap for potential retry operations.
   *
   * @returns {any|null} The first job in queue, or null if empty
   * @public
   */
  dequeue() {
    const job = this.queue.shift();
    return job || null;
  }

  /**
   * Retrieve a job by ID without removing it from the queue
   * Provides O(1) lookup time.
   *
   * @param {string} jobId - The ID of the job to retrieve
   * @returns {any|null} The job if found, null otherwise
   * @public
   */
  getJob(jobId) {
    return this.jobMap.get(jobId) || null;
  }

  /**
   * Update one or more properties of a job
   *
   * When a job is marked as 'completed' or 'failed', it is removed
   * from the queue and the appropriate stat counter is incremented.
   * Completed jobs are also removed from jobMap.
   * Failed jobs remain in jobMap for potential retry operations.
   *
   * @param {string} jobId - The ID of the job to update
   * @param {any} updates - Partial job object with fields to update
   * @public
   */
  updateJob(jobId, updates) {
    const job = this.jobMap.get(jobId);
    if (!job) {
      return;
    }

    // Apply updates
    Object.assign(job, updates);

    // Handle status transitions
    if (updates.status === 'completed') {
      this.stats.completed++;
      this.queue = this.queue.filter(j => j.id !== jobId);
      this.jobMap.delete(jobId);
    } else if (updates.status === 'failed') {
      this.stats.failed++;
      this.queue = this.queue.filter(j => j.id !== jobId);
      // Keep in jobMap for potential retry
    }
  }

  /**
   * Check if a job can be retried based on retry count
   *
   * @param {any} job - The job to check
   * @returns {boolean} true if job.retries < maxRetries, false otherwise
   * @public
   */
  canRetry(job) {
    return job.retries < this.maxRetries;
  }

  /**
   * Retry a failed job by incrementing retries and re-enqueueing
   *
   * Re-queues the job to the end of the queue if retry is allowed.
   * Returns false if job not found or max retries exceeded.
   *
   * @param {string} jobId - The ID of the job to retry
   * @returns {boolean} true if retry succeeded, false otherwise
   * @public
   */
  retry(jobId) {
    const job = this.jobMap.get(jobId);
    if (!job) {
      return false;
    }

    if (!this.canRetry(job)) {
      return false;
    }

    // Increment retries and reset status
    job.retries++;
    job.status = 'queued';

    // Re-enqueue to the end of the queue (job already in jobMap)
    this.queue.push(job);

    return true;
  }

  /**
   * Get the current number of jobs in the queue
   *
   * @returns {number} The number of jobs awaiting processing
   * @public
   */
  size() {
    return this.queue.length;
  }

  /**
   * Get statistics about the current queue state
   *
   * Counts queued jobs (status='queued') from the current queue
   * and returns cumulative completed/failed counts.
   *
   * @returns {QueueStats} QueueStats object with queue metrics
   * @public
   */
  getStats() {
    const queuedCount = this.queue.filter(j => j.status === 'queued').length;
    const totalProcessed = this.stats.completed + this.stats.failed;

    return {
      queuedCount,
      completedCount: this.stats.completed,
      failedCount: this.stats.failed,
      totalProcessed,
    };
  }

  /**
   * Get the maximum number of retries allowed per job
   *
   * @returns {number} The maxRetries value (currently 3)
   * @public
   */
  getMaxRetries() {
    return this.maxRetries;
  }

  /**
   * Clear all jobs from the queue
   * Resets both the queue array and the job map.
   *
   * @public
   */
  clear() {
    this.queue = [];
    this.jobMap.clear();
  }
}
