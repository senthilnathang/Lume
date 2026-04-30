/**
 * @fileoverview LumeRuntime - Main unified runtime entry point
 * Single execute() method that flows all operations through interceptor pipeline
 */

import MetadataRegistry from './registry.js';
import InterceptorPipeline from './interceptor-pipeline.js';
import ContextLoader from './execution-context.js';
import logger from '../services/logger.js';

// Interceptor imports
import AuthInterceptor from './interceptors/auth.interceptor.js';
import PermissionInterceptor from './interceptors/permission.interceptor.js';
import SchemaInterceptor from './interceptors/schema.interceptor.js';
import PreHooksInterceptor from './interceptors/pre-hooks.interceptor.js';
import OrmSelectorInterceptor from './interceptors/orm-selector.interceptor.js';
import QueryOptimizationInterceptor from './interceptors/query-optimization.interceptor.js';
import QueryExecutorInterceptor from './interceptors/query-executor.interceptor.js';
import PostHooksInterceptor from './interceptors/post-hooks.interceptor.js';
import EventEmitterInterceptor from './interceptors/event-emitter.interceptor.js';

class LumeRuntime {
  /**
   * @param {MetadataRegistry} registry - Metadata registry
   * @param {InterceptorPipeline} pipeline - Interceptor pipeline
   * @param {Object} adapters - ORM adapters { prisma, drizzle }
   * @param {Object} services - Other services (HookRegistry, QueueManager, etc.)
   * @param {Redis|null} redisClient - Optional Redis client for caching
   */
  constructor(registry, pipeline, adapters, services, redisClient = null) {
    this.registry = registry;
    this.pipeline = pipeline;
    this.adapters = adapters;
    this.services = services;
    this.redisClient = redisClient;
    this.contextLoader = new ContextLoader();

    logger.info('[LumeRuntime] Initialized');
  }

  /**
   * Main entry point - execute an operation
   * @param {OperationRequest} request - Operation request
   * @param {*} [expressReq] - Express request object (to extract user context)
   * @returns {Promise<OperationResult>}
   */
  async execute(request, expressReq = null) {
    const startTime = Date.now();

    try {
      // Extract execution context from Express request or use provided context
      let executionContext = request.context;
      if (expressReq && !executionContext) {
        executionContext = await this.contextLoader.loadFromRequest(expressReq);
      }

      if (!executionContext) {
        return {
          success: false,
          errors: [{ message: 'No execution context provided', code: 'NO_CONTEXT' }],
          metadata: { duration: Date.now() - startTime },
        };
      }

      // Get entity definition
      const entity = await this.registry.getEntity(request.entity);
      if (!entity) {
        return {
          success: false,
          errors: [{ message: `Entity not found: ${request.entity}`, code: 'ENTITY_NOT_FOUND' }],
          metadata: {
            duration: Date.now() - startTime,
            executedAt: new Date().toISOString(),
          },
        };
      }

      // Execute through interceptor pipeline
      const pipelineContext = await this.pipeline.execute(
        request,
        entity,
        executionContext
      );

      // Build result from pipeline context
      const result = {
        success: !pipelineContext.aborted && (!pipelineContext.errors || pipelineContext.errors.length === 0),
        data: pipelineContext.result,
        errors: pipelineContext.errors || [],
        metadata: {
          executedAt: new Date().toISOString(),
          duration: pipelineContext.duration,
          interceptorsRun: pipelineContext.interceptorsRun,
          permissionChecks: pipelineContext.permissionChecks,
        },
      };

      if (pipelineContext.abortReason) {
        result.metadata.abortReason = pipelineContext.abortReason;
      }

      logger.info(
        `[LumeRuntime] Executed ${request.entity}#${request.action} - Success: ${result.success} (${pipelineContext.duration}ms)`
      );

      return result;
    } catch (error) {
      logger.error('[LumeRuntime] Fatal error:', error.message, error.stack);

      return {
        success: false,
        errors: [{ message: error.message, code: 'RUNTIME_ERROR' }],
        metadata: {
          duration: Date.now() - startTime,
          executedAt: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Create a LumeRuntime with all default interceptors
   * @static
   * @param {MetadataRegistry} registry - Metadata registry
   * @param {Object} adapters - ORM adapters { prisma, drizzle }
   * @param {Object} services - Services { hookRegistry, queueManager, policyEngine, etc. }
   * @param {Redis|null} redisClient - Redis client
   * @returns {LumeRuntime}
   */
  static create(registry, adapters, services, redisClient = null) {
    const pipeline = new InterceptorPipeline();

    // Register all interceptors in order
    pipeline.register(
      'auth',
      10,
      AuthInterceptor.process,
      true
    );

    pipeline.register(
      'permission',
      20,
      PermissionInterceptor.create(services.policyEngine).process,
      true
    );

    pipeline.register(
      'schema',
      30,
      SchemaInterceptor.process,
      true
    );

    pipeline.register(
      'pre-hooks',
      40,
      PreHooksInterceptor.create(services.hookRegistry).process,
      true
    );

    pipeline.register(
      'orm-selector',
      50,
      OrmSelectorInterceptor.create(adapters).process,
      true
    );

    pipeline.register(
      'query-optimization',
      55,
      new QueryOptimizationInterceptor().handle.bind(new QueryOptimizationInterceptor()),
      true
    );

    pipeline.register(
      'query-executor',
      60,
      QueryExecutorInterceptor.create(adapters).process,
      true
    );

    pipeline.register(
      'post-hooks',
      70,
      PostHooksInterceptor.create(services.hookRegistry).process,
      true
    );

    pipeline.register(
      'event-emitter',
      80,
      EventEmitterInterceptor.create(services.queueManager).process,
      true
    );

    logger.info('[LumeRuntime] Registered all 9 interceptors');

    return new LumeRuntime(registry, pipeline, adapters, services, redisClient);
  }
}

export default LumeRuntime;
