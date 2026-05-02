/**
 * Notification Scheduler Job
 * BullMQ job handler for scheduled/delayed notifications
 * Processes notification delivery with retry logic
 */

export class NotificationSchedulerJob {
  constructor(notificationService) {
    this.notificationService = notificationService;
    this.processingInterval = null;
    this.maxRetries = 3;
  }

  /**
   * Process a scheduled notification job
   * @param {Object} job - Job object containing data and metadata
   * @param {number} job.id - Job ID
   * @param {Object} job.data - Job data { templateId, recipient, variables, scheduledFor }
   * @param {number} job.attemptsMade - Number of attempts made
   * @returns {Promise<Object>} Result with success flag and details
   */
  async process(job = {}) {
    try {
      const { data = {}, attemptsMade = 0 } = job;
      const { templateId, recipient, variables = {}, scheduledFor } = data;

      // Validate required fields
      if (!templateId || !recipient) {
        throw new Error('Missing required fields: templateId and recipient');
      }

      // Check if scheduled time has been reached
      if (scheduledFor && new Date(scheduledFor) > new Date()) {
        return {
          success: false,
          scheduled: true,
          attempts: attemptsMade,
          message: 'Scheduled time not yet reached'
        };
      }

      // Send notification using template
      const result = await this.notificationService.sendFromTemplate(
        templateId,
        recipient,
        variables
      );

      if (!result.success && attemptsMade < this.maxRetries) {
        // Rethrow to trigger BullMQ retry
        throw new Error(result.error || 'Notification delivery failed');
      }

      return {
        success: result.success,
        deliveryId: result.deliveryId,
        attempts: attemptsMade + 1,
        error: result.error || null,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Notification scheduler job error:', error.message);
      throw error;
    }
  }

  /**
   * Start automatic processing of scheduled notifications
   * Runs every N seconds (for polling-based execution)
   * @param {number} intervalSeconds - Interval in seconds between checks
   */
  startProcessor(intervalSeconds = 60) {
    if (this.processingInterval) {
      console.warn('Notification scheduler processor already running');
      return;
    }

    this.processingInterval = setInterval(async () => {
      try {
        // This would be called by the actual queue processor
        // For now, just log that the interval is active
        if (process.env.DEBUG_NOTIFICATION_SCHEDULER) {
          console.log(`[NotificationScheduler] Processing cycle at ${new Date().toISOString()}`);
        }
      } catch (err) {
        console.error('[NotificationScheduler] Error during processing:', err.message);
      }
    }, intervalSeconds * 1000);

    console.log(`[NotificationScheduler] Started (runs every ${intervalSeconds}s)`);
  }

  /**
   * Stop the automatic processor
   */
  stopProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('[NotificationScheduler] Stopped');
    }
  }

  /**
   * Handle job completion callback
   * @param {Object} job - Completed job
   * @returns {Promise<void>}
   */
  async onComplete(job) {
    if (process.env.DEBUG_NOTIFICATION_SCHEDULER) {
      console.log(`[NotificationScheduler] Job ${job.id} completed successfully`);
    }
  }

  /**
   * Handle job failure callback
   * @param {Object} job - Failed job
   * @param {Error} err - Error object
   * @returns {Promise<void>}
   */
  async onFailed(job, err) {
    console.error(`[NotificationScheduler] Job ${job.id} failed:`, err.message);
  }

  /**
   * Queue a notification for later delivery
   * @param {number} templateId - Notification template ID
   * @param {string} recipient - Recipient identifier
   * @param {Object} variables - Template variables
   * @param {Date} scheduledFor - When to send the notification
   * @returns {Object} Job definition
   */
  createJob(templateId, recipient, variables = {}, scheduledFor = null) {
    return {
      templateId,
      recipient,
      variables,
      scheduledFor,
      createdAt: new Date()
    };
  }

  /**
   * Get job options for BullMQ queue
   * @param {number} delayMs - Delay in milliseconds
   * @returns {Object} Options for job configuration
   */
  getJobOptions(delayMs = 0) {
    return {
      delay: delayMs,
      attempts: this.maxRetries,
      backoff: {
        type: 'exponential',
        delay: 2000 // Start with 2 second backoff
      },
      removeOnComplete: true,
      removeOnFail: false
    };
  }
}

export default NotificationSchedulerJob;
