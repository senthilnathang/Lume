/**
 * @fileoverview QueryExecutorInterceptor [Stage 60] - Execute CRUD operation via ORM adapter
 * Includes field-level permission enforcement and input sanitization
 */

import logger from '../../services/logger.js';
import FieldFilter from '../../permissions/field-filter.js';

class QueryExecutorInterceptor {
  /**
   * @param {Object} adapters - ORM adapters { prisma, drizzle }
   */
  constructor(adapters) {
    this.adapters = adapters;
    this.process = this.process.bind(this);
  }

  /**
   * Execute CRUD operation
   * @param {OperationRequest} request - Operation request
   * @param {InterceptorContext} context - Execution context
   * @returns {Promise<InterceptorResult>}
   */
  async process(request, context) {
    try {
      const adapter = context.state.adapter;
      const entity = context.entity;

      if (!adapter) {
        return {
          abort: true,
          abortReason: 'No adapter selected',
        };
      }

      logger.debug(`[QueryExecutorInterceptor] Executing ${request.action} on ${entity.slug}`);

      let result = null;

      // Get operation method from adapter
      const operationMethod = this.getOperationMethod(request.action);

      if (!operationMethod) {
        return {
          abort: true,
          abortReason: `Unknown action: ${request.action}`,
        };
      }

      // Call adapter method (e.g., adapter.create(entity, data))
      const adapterMethod = adapter[operationMethod];
      if (typeof adapterMethod !== 'function') {
        return {
          abort: true,
          abortReason: `Adapter does not support ${operationMethod}`,
        };
      }

      // Build query options from request
      const fieldFilters = context.state.permissionResult?.fieldFilters || {};

      let dataToUse = request.data;
      // Sanitize input for write operations - remove fields user doesn't have permission to write
      if (['create', 'update', 'bulk_create'].includes(request.action) && dataToUse) {
        dataToUse = FieldFilter.sanitizeInput(dataToUse, fieldFilters);
      }

      const options = {
        ...request.options,
        context: context.executionContext,
        filters: context.state.permissionResult?.filters || [],
        fieldFilters,
      };

      // Execute based on action
      switch (request.action) {
        case 'create':
          result = await adapterMethod.call(adapter, entity, dataToUse, options);
          break;

        case 'read':
        case 'get':
          result = await adapterMethod.call(adapter, entity, request.data?.id, options);
          break;

        case 'list':
          result = await adapterMethod.call(adapter, entity, options);
          break;

        case 'update':
          result = await adapterMethod.call(adapter, entity, request.data?.id, dataToUse, options);
          break;

        case 'delete':
          result = await adapterMethod.call(adapter, entity, request.data?.id, options);
          break;

        case 'bulk_create':
          result = await adapterMethod.call(adapter, entity, dataToUse, options);
          break;

        case 'search':
          result = await adapterMethod.call(adapter, entity, request.data?.query, options);
          break;

        default:
          return {
            abort: true,
            abortReason: `Unknown action: ${request.action}`,
          };
      }

      // Apply field-level filtering to results (remove forbidden fields)
      if (result && ['read', 'get', 'list', 'search'].includes(request.action)) {
        result = FieldFilter.filter(result, fieldFilters, entity);
      }

      logger.debug(`[QueryExecutorInterceptor] Executed ${request.action} successfully`);

      return {
        result,
      };
    } catch (error) {
      logger.error('[QueryExecutorInterceptor] Error:', error.message);
      return {
        abort: true,
        abortReason: `Query execution error: ${error.message}`,
      };
    }
  }

  /**
   * Map action to adapter method name
   * @private
   * @param {string} action - Action name
   * @returns {string|null} Adapter method name
   */
  getOperationMethod(action) {
    const actionMap = {
      create: 'create',
      read: 'read',
      get: 'read',
      list: 'list',
      update: 'update',
      delete: 'delete',
      bulk_create: 'bulkCreate',
      search: 'search',
    };

    return actionMap[action] || null;
  }

  /**
   * Create a new QueryExecutorInterceptor
   * @static
   * @param {Object} adapters - ORM adapters
   * @returns {QueryExecutorInterceptor}
   */
  static create(adapters) {
    return new QueryExecutorInterceptor(adapters);
  }
}

export default QueryExecutorInterceptor;
