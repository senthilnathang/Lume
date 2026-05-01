/**
 * Auto-Transition Processor
 * Processes pending auto-transitions at scheduled times
 * Can be run via cron job or queue processor
 */

export class AutoTransitionProcessor {
  constructor(automationService) {
    this.svc = automationService;
    this.processingInterval = null;
  }

  /**
   * Start automatic processing of pending transitions
   * Runs every minute by default
   */
  startProcessor(intervalSeconds = 60) {
    if (this.processingInterval) {
      console.warn('Auto-transition processor already running');
      return;
    }

    this.processingInterval = setInterval(async () => {
      try {
        await this.processPending();
      } catch (err) {
        console.error('[AutoTransitionProcessor] Error:', err);
      }
    }, intervalSeconds * 1000);

    console.log(`[AutoTransitionProcessor] Started (runs every ${intervalSeconds}s)`);
  }

  /**
   * Stop the automatic processor
   */
  stopProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('[AutoTransitionProcessor] Stopped');
    }
  }

  /**
   * Process all pending auto-transitions that are due
   */
  async processPending() {
    try {
      const pending = await this.svc.getPendingAutoTransitions();

      if (pending.length === 0) return;

      console.log(`[AutoTransitionProcessor] Processing ${pending.length} pending transitions`);

      for (const autoTransition of pending) {
        try {
          await this.svc.executeAutoTransition(autoTransition.id);
          console.log(`[AutoTransitionProcessor] Executed transition ${autoTransition.id}`);
        } catch (err) {
          console.error(`[AutoTransitionProcessor] Failed to execute ${autoTransition.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[AutoTransitionProcessor] Failed to fetch pending:', err);
    }
  }

  /**
   * Process a single transition immediately (for testing or manual execution)
   */
  async processOne(autoTransitionId) {
    return this.svc.executeAutoTransition(autoTransitionId);
  }
}

export default AutoTransitionProcessor;
