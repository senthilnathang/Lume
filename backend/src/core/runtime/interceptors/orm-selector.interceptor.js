/**
 * @fileoverview OrmSelectorInterceptor [Stage 50] - Select ORM adapter (Prisma or Drizzle)
 * Routes to correct adapter based on entity.orm setting
 */

import logger from '../../services/logger.js';

class OrmSelectorInterceptor {
  /**
   * @param {Object} adapters - ORM adapters { prisma, drizzle }
   */
  constructor(adapters) {
    this.adapters = adapters;
    this.process = this.process.bind(this);
  }

  /**
   * Select and store ORM adapter in context
   * @param {OperationRequest} request - Operation request
   * @param {InterceptorContext} context - Execution context
   * @returns {Promise<InterceptorResult>}
   */
  async process(request, context) {
    try {
      const entity = context.entity;
      const ormType = entity.orm || 'drizzle';

      let adapter = null;
      if (ormType === 'prisma') {
        adapter = this.adapters.prisma;
      } else if (ormType === 'drizzle') {
        adapter = this.adapters.drizzle;
      } else {
        return {
          abort: true,
          abortReason: `Unknown ORM type: ${ormType}`,
        };
      }

      if (!adapter) {
        return {
          abort: true,
          abortReason: `${ormType} adapter not available`,
        };
      }

      logger.debug(`[OrmSelectorInterceptor] Selected ${ormType} adapter for ${entity.slug}`);

      return {
        stateUpdate: {
          orm: ormType,
          adapter,
        },
      };
    } catch (error) {
      logger.error('[OrmSelectorInterceptor] Error:', error.message);
      return {
        abort: true,
        abortReason: `ORM selection error: ${error.message}`,
      };
    }
  }

  /**
   * Create a new OrmSelectorInterceptor
   * @static
   * @param {Object} adapters - ORM adapters
   * @returns {OrmSelectorInterceptor}
   */
  static create(adapters) {
    return new OrmSelectorInterceptor(adapters);
  }
}

export default OrmSelectorInterceptor;
