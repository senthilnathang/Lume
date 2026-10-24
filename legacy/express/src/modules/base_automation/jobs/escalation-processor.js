/**
 * Escalation Processor
 * Background job that periodically processes overdue approval tasks
 * Runs every 5 minutes to check for SLA breaches and create escalations
 */

export class EscalationProcessor {
  constructor(approvalEscalationService) {
    this.escalationService = approvalEscalationService;
    this.processingInterval = null;
  }

  /**
   * Process overdue tasks and return results
   * Called by the background job queue or interval processor
   * @param {Object} job - Job object (may be empty for interval-based processing)
   * @returns {Promise<Object>} Result object with success flag and escalation count
   */
  async process(_job = {}) {
    try {
      const escalations = await this.escalationService.processOverdueTasks();

      return {
        success: true,
        escalationsProcessed: escalations.length,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Escalation job failed:', error.message);
      throw error;
    }
  }

  /**
   * Start automatic processing of overdue approvals
   * Runs every N seconds (default 5 minutes = 300 seconds)
   */
  startProcessor(intervalSeconds = 300) {
    if (this.processingInterval) {
      console.warn('Escalation processor already running');
      return;
    }

    this.processingInterval = setInterval(async () => {
      try {
        const result = await this.process({});
        if (result.escalationsProcessed > 0) {
          console.log(`[EscalationProcessor] Processed ${result.escalationsProcessed} escalations at ${result.timestamp.toISOString()}`);
        }
      } catch (err) {
        console.error('[EscalationProcessor] Error during processing:', err.message);
      }
    }, intervalSeconds * 1000);

    console.log(`[EscalationProcessor] Started (runs every ${intervalSeconds}s)`);
  }

  /**
   * Stop the automatic processor
   */
  stopProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('[EscalationProcessor] Stopped');
    }
  }
}

export default EscalationProcessor;
