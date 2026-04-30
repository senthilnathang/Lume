/**
 * @fileoverview EventEmitterInterceptor [Stage 80] - Emit events to BullMQ and async processing
 * Queues workflows, agents, and cache invalidation
 */

import logger from '../../services/logger.js';

class EventEmitterInterceptor {
  /**
   * @param {Object} queueManager - QueueManager service instance
   */
  constructor(queueManager) {
    this.queueManager = queueManager;
    this.process = this.process.bind(this);
  }

  /**
   * Emit events to async queues
   * @param {OperationRequest} request - Operation request
   * @param {InterceptorContext} context - Execution context
   * @returns {Promise<InterceptorResult>}
   */
  async process(request, context) {
    try {
      if (!this.queueManager) {
        logger.debug('[EventEmitterInterceptor] No queue manager, skipping async events');
        return {};
      }

      const entity = context.entity;
      const action = request.action;
      const result = context.result;

      // Trigger workflows based on action
      if (entity.workflows) {
        let workflowIds = [];

        if (action === 'create' && entity.workflows.onCreate) {
          workflowIds = entity.workflows.onCreate;
        } else if (action === 'update' && entity.workflows.onUpdate) {
          workflowIds = entity.workflows.onUpdate;
        } else if (action === 'delete' && entity.workflows.onDelete) {
          workflowIds = entity.workflows.onDelete;
        }

        for (const workflowId of workflowIds) {
          try {
            logger.info(
              `[EventEmitterInterceptor] Queueing workflow: ${workflowId} for ${entity.slug}#${action}`
            );
            await this.queueManager.addJob('automation', {
              type: 'workflow',
              workflowId,
              entitySlug: entity.slug,
              recordId: result?.id,
              action,
              timestamp: new Date().toISOString(),
              userId: context.executionContext.userId,
            });
          } catch (error) {
            logger.error(
              `[EventEmitterInterceptor] Error queueing workflow ${workflowId}:`,
              error.message
            );
          }
        }
      }

      // Trigger agents based on event
      if (entity.agents && Array.isArray(entity.agents)) {
        const triggerEvent = this.getAgentTriggerEvent(action);

        for (const agent of entity.agents) {
          // Check if agent has trigger event or trigger expression
          if (agent.trigger && triggerEvent !== 'manual') {
            try {
              logger.info(
                `[EventEmitterInterceptor] Queueing agent: ${agent.id} for ${entity.slug}#${action}`
              );
              await this.queueManager.addJob('agents', {
                type: 'agent',
                agentId: agent.id,
                entitySlug: entity.slug,
                recordId: result?.id,
                action: triggerEvent,
                timestamp: new Date().toISOString(),
                userId: context.executionContext.userId,
              });
            } catch (error) {
              logger.error(
                `[EventEmitterInterceptor] Error queueing agent ${agent.id}:`,
                error.message
              );
            }
          }
        }
      }

      // Invalidate relevant caches
      try {
        if (this.queueManager && ['create', 'update', 'delete'].includes(action)) {
          await this.queueManager.addJob('cache', {
            type: 'invalidate',
            entity: entity.slug,
            action,
            timestamp: new Date().toISOString(),
          });
          logger.debug(`[EventEmitterInterceptor] Queued cache invalidation for ${entity.slug}`);
        }
      } catch (error) {
        logger.warn(`[EventEmitterInterceptor] Error queueing cache invalidation:`, error.message);
      }

      return {
        stateUpdate: {
          eventsEmitted: true,
        },
      };
    } catch (error) {
      logger.error('[EventEmitterInterceptor] Error:', error.message);
      // Don't abort on event emission errors - operation already succeeded
      logger.warn('[EventEmitterInterceptor] Event emission error (non-fatal)');
      return {};
    }
  }

  /**
   * Map action to agent trigger event
   * @private
   * @param {string} action - Action name
   * @returns {string} Trigger event
   */
  getAgentTriggerEvent(action) {
    const map = {
      create: 'onCreate',
      update: 'onUpdate',
      delete: 'onDelete',
    };
    return map[action] || 'manual';
  }

  /**
   * Create a new EventEmitterInterceptor
   * @static
   * @param {Object} queueManager - QueueManager instance
   * @returns {EventEmitterInterceptor}
   */
  static create(queueManager) {
    return new EventEmitterInterceptor(queueManager);
  }
}

export default EventEmitterInterceptor;
