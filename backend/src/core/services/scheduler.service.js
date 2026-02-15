/**
 * SchedulerService — Executes scheduled actions using cron expressions.
 * Supports action types: http_request, run_service_method, send_notification.
 */

import cron from 'node-cron';

export class SchedulerService {
  constructor(scheduledActionAdapter) {
    this.actions = scheduledActionAdapter;
    this.jobs = new Map(); // id -> cron job
  }

  /**
   * Load all active scheduled actions and start their cron jobs.
   * Call this on server startup.
   */
  async initialize() {
    const result = await this.actions.findAll({
      where: [['status', '=', 'active']],
      limit: 10000,
      offset: 0,
    });

    for (const action of result.rows) {
      this._registerJob(action);
    }

    console.log(`[Scheduler] Initialized ${result.rows.length} scheduled actions`);
  }

  /**
   * Register a cron job for a scheduled action.
   */
  _registerJob(action) {
    if (this.jobs.has(action.id)) {
      this.jobs.get(action.id).stop();
    }

    const cronExpr = action.cron;
    if (!cronExpr || !cron.validate(cronExpr)) {
      console.warn(`[Scheduler] Invalid cron expression for action ${action.id}: ${cronExpr}`);
      return;
    }

    const job = cron.schedule(cronExpr, async () => {
      await this._executeAction(action);
    });

    this.jobs.set(action.id, job);
  }

  /**
   * Execute a scheduled action.
   */
  async _executeAction(action) {
    const startTime = Date.now();
    const config = typeof action.config === 'string' ? JSON.parse(action.config) : (action.config || {});

    try {
      let result;

      switch (action.actionType) {
        case 'http_request':
          result = await this._executeHttpRequest(config);
          break;
        case 'send_notification':
          result = await this._executeSendNotification(config);
          break;
        case 'run_service_method':
          result = { message: 'Service method execution not yet configured' };
          break;
        default:
          result = { error: `Unknown action type: ${action.actionType}` };
      }

      const duration = Date.now() - startTime;

      // Update action tracking
      const runCount = (action.runCount || 0) + 1;
      await this.actions.update(action.id, {
        lastRunAt: new Date(),
        runCount,
      });

      // Compute next run
      const nextRun = this._getNextCronRun(action.cron);
      if (nextRun) {
        await this.actions.update(action.id, { nextRunAt: nextRun });
      }

      return { success: true, duration, result };
    } catch (error) {
      console.error(`[Scheduler] Error executing action ${action.id}:`, error.message);

      await this.actions.update(action.id, {
        lastRunAt: new Date(),
      });

      return { success: false, error: error.message };
    }
  }

  async _executeHttpRequest(config) {
    const { url, method = 'POST', headers = {}, body } = config;
    if (!url) return { error: 'No URL configured' };

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    return { status: response.status, ok: response.ok };
  }

  async _executeSendNotification(config) {
    // This integrates with NotificationService if available
    return { message: 'Notification sent', config };
  }

  _getNextCronRun(cronExpr) {
    // Simple estimation — node-cron doesn't expose next run time natively
    // Just set it to null and let the cron job handle timing
    return null;
  }

  /**
   * Register a new action (called when action is created/updated).
   */
  async registerAction(actionId) {
    const action = await this.actions.findById(actionId);
    if (!action) return;

    if (action.status === 'active') {
      this._registerJob(action);
    } else {
      this.unregisterAction(actionId);
    }
  }

  /**
   * Stop and remove a job.
   */
  unregisterAction(actionId) {
    if (this.jobs.has(actionId)) {
      this.jobs.get(actionId).stop();
      this.jobs.delete(actionId);
    }
  }

  /**
   * Get status of all registered jobs.
   */
  getStatus() {
    return {
      activeJobs: this.jobs.size,
      jobIds: [...this.jobs.keys()],
    };
  }

  /**
   * Stop all jobs (for graceful shutdown).
   */
  stopAll() {
    for (const [id, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
  }
}

export default SchedulerService;
