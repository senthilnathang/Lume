/**
 * @fileoverview Query Optimization Interceptor
 * Enforces pagination limits, field projection, and eager loading rules
 * Inserted between OrmSelector (50) and QueryExecutor (60) - runs at stage 55
 */

import logger from '../../services/logger.js';

const PAGINATION_DEFAULTS = {
  defaultPageSize: 25,
  maxPageSize: 200,
  defaultPage: 1,
};

class QueryOptimizationInterceptor {
  /**
   * Enforce query optimization rules
   * @param {OperationRequest} request - Operation request
   * @param {EntityDefinition} entity - Entity definition
   * @param {ExecutionContext} executionContext - Execution context
   * @returns {Promise<void>}
   */
  async handle(request, entity, executionContext) {
    // Only optimize SELECT operations
    if (!['read', 'list', 'search'].includes(request.action)) {
      return;
    }

    logger.debug(`[QueryOptimization] Optimizing ${request.action} on ${entity.slug}`);

    // Enforce pagination limits
    this.optimizePagination(request, entity);

    // Enforce field projection
    this.optimizeFieldProjection(request, entity);

    // Optimize eager loading
    this.optimizeEagerLoading(request, entity);
  }

  /**
   * Enforce pagination limits and defaults
   * @private
   * @param {OperationRequest} request
   * @param {EntityDefinition} entity
   */
  optimizePagination(request, entity) {
    if (request.action === 'read') {
      // Single record read, no pagination needed
      return;
    }

    const params = request.params || {};

    // Set default page
    if (!params.page) {
      params.page = PAGINATION_DEFAULTS.defaultPage;
    }

    // Set default page size
    if (!params.pageSize && !params.limit) {
      params.pageSize = PAGINATION_DEFAULTS.defaultPageSize;
    }

    // Enforce max page size
    const pageSize = params.pageSize || params.limit || PAGINATION_DEFAULTS.defaultPageSize;
    if (pageSize > PAGINATION_DEFAULTS.maxPageSize) {
      logger.warn(
        `[QueryOptimization] Page size ${pageSize} exceeds max ${PAGINATION_DEFAULTS.maxPageSize}, limiting`
      );
      params.pageSize = PAGINATION_DEFAULTS.maxPageSize;
    }

    // Ensure page is at least 1
    if (params.page < 1) {
      params.page = 1;
    }

    request.params = params;
  }

  /**
   * Enforce field projection (SELECT only requested fields)
   * @private
   * @param {OperationRequest} request
   * @param {EntityDefinition} entity
   */
  optimizeFieldProjection(request, entity) {
    const params = request.params || {};

    // If fields explicitly requested, respect them
    if (params.fields && Array.isArray(params.fields)) {
      // Validate that requested fields exist
      const validFields = new Set(entity.fields.map(f => f.name));
      validFields.add('id');

      const requestedFields = params.fields.filter(f => validFields.has(f));

      if (requestedFields.length > 0) {
        params.fields = requestedFields;
      } else {
        // No valid fields requested, use defaults
        delete params.fields;
      }
    }

    // If no fields specified, include only non-computed fields by default
    if (!params.fields) {
      params.fields = [
        'id',
        ...entity.fields
          .filter(f => !f.computed)
          .map(f => f.name),
      ];
    }

    request.params = params;
  }

  /**
   * Optimize eager loading (only load relations when requested)
   * @private
   * @param {OperationRequest} request
   * @param {EntityDefinition} entity
   */
  optimizeEagerLoading(request, entity) {
    const params = request.params || {};

    // Only include relations if explicitly requested or needed for permission filtering
    const relationFields = entity.fields.filter(f => f.type === 'relation');

    if (!params.includeRelations && relationFields.length > 0) {
      // Don't load relations by default
      params.includeRelations = false;
    }

    // If specific relations requested, validate they exist
    if (params.relations && Array.isArray(params.relations)) {
      const validRelations = new Set(relationFields.map(f => f.name));
      params.relations = params.relations.filter(r => validRelations.has(r));
    }

    request.params = params;
  }
}

export default QueryOptimizationInterceptor;
