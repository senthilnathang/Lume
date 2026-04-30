/**
 * @fileoverview CronScheduler - Register cron jobs for scheduled agents
 * Uses BullMQ repeatable jobs for agent scheduling
 */

import logger from '../../core/services/logger.js';

class CronScheduler {
  /**
   * @param {Object} queueManager - BullMQ QueueManagerService
   */
  constructor(queueManager) {
    this.queueManager = queueManager;
    this.scheduledJobs = new Map(); // agentId -> jobId
  }

  /**
   * Schedule an agent with cron expression
   * @param {AgentDefinition} agent - Agent definition
   * @returns {Promise<Object>} Scheduled job info
   */
  async schedule(agent) {
    if (!agent.schedule) {
      return {
        success: false,
        error: 'Agent does not have a schedule',
      };
    }

    if (!this.queueManager) {
      logger.warn('[CronScheduler] QueueManager not configured, scheduling skipped');
      return {
        success: false,
        error: 'QueueManager not configured',
      };
    }

    try {
      logger.info(`[CronScheduler] Scheduling agent: ${agent.id} with cron: ${agent.schedule}`);

      // Create repeatable job via BullMQ
      const job = await this.queueManager.addRepeatableJob('agents', {
        agentId: agent.id,
        agent,
        triggerType: 'scheduled',
      }, {
        repeat: {
          cron: agent.schedule,
        },
      });

      this.scheduledJobs.set(agent.id, job.id);

      return {
        success: true,
        jobId: job.id,
        schedule: agent.schedule,
      };
    } catch (error) {
      logger.error('[CronScheduler] Error scheduling agent:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Unschedule an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>}
   */
  async unschedule(agentId) {
    const jobId = this.scheduledJobs.get(agentId);

    if (!jobId) {
      logger.warn(`[CronScheduler] No scheduled job found for agent: ${agentId}`);
      return {
        success: false,
        error: 'Agent not scheduled',
      };
    }

    if (!this.queueManager) {
      logger.warn('[CronScheduler] QueueManager not configured, unscheduling skipped');
      return {
        success: false,
        error: 'QueueManager not configured',
      };
    }

    try {
      logger.info(`[CronScheduler] Unscheduling agent: ${agentId}`);

      await this.queueManager.removeRepeatableJob('agents', jobId);

      this.scheduledJobs.delete(agentId);

      return {
        success: true,
        agentId,
      };
    } catch (error) {
      logger.error('[CronScheduler] Error unscheduling agent:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Reschedule an agent (unschedule old, schedule new)
   * @param {string} agentId - Agent ID
   * @param {AgentDefinition} updatedAgent - Updated agent definition
   * @returns {Promise<Object>}
   */
  async reschedule(agentId, updatedAgent) {
    try {
      // Unschedule old
      const unscheduled = await this.unschedule(agentId);

      if (!unscheduled.success && !unscheduled.error.includes('not scheduled')) {
        return unscheduled;
      }

      // Schedule new
      return await this.schedule(updatedAgent);
    } catch (error) {
      logger.error('[CronScheduler] Error rescheduling agent:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Schedule multiple agents
   * @param {AgentDefinition[]} agents - Agent definitions
   * @returns {Promise<Object[]>} Results for each agent
   */
  async scheduleMany(agents) {
    const results = [];

    for (const agent of agents) {
      const result = await this.schedule(agent);
      results.push({
        agentId: agent.id,
        ...result,
      });
    }

    return results;
  }

  /**
   * Unschedule multiple agents
   * @param {string[]} agentIds - Agent IDs
   * @returns {Promise<Object[]>} Results for each agent
   */
  async unscheduleMany(agentIds) {
    const results = [];

    for (const agentId of agentIds) {
      const result = await this.unschedule(agentId);
      results.push({
        agentId,
        ...result,
      });
    }

    return results;
  }

  /**
   * Get all scheduled agents
   * @returns {Map<string, string>} Map of agentId -> jobId
   */
  getScheduled() {
    return new Map(this.scheduledJobs);
  }

  /**
   * Check if agent is scheduled
   * @param {string} agentId - Agent ID
   * @returns {boolean}
   */
  isScheduled(agentId) {
    return this.scheduledJobs.has(agentId);
  }

  /**
   * Clear all scheduled jobs
   * @returns {Promise<void>}
   */
  async clearAll() {
    logger.info('[CronScheduler] Clearing all scheduled agents');

    const agentIds = Array.from(this.scheduledJobs.keys());
    await this.unscheduleMany(agentIds);

    this.scheduledJobs.clear();
  }

  /**
   * Create a new CronScheduler
   * @static
   * @param {Object} queueManager - QueueManager instance
   * @returns {CronScheduler}
   */
  static create(queueManager) {
    return new CronScheduler(queueManager);
  }
}

export default CronScheduler;
