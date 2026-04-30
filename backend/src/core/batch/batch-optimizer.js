/**
 * @fileoverview Batch Operations Optimizer
 * Optimizes bulk create, update, delete operations for performance
 */

import logger from '../services/logger.js';

class BatchOptimizer {
  /**
   * Optimize batch insert
   * @param {Object} adapter - ORM adapter (Prisma or Drizzle)
   * @param {string} entity - Entity slug
   * @param {Object[]} records - Records to insert
   * @param {Object} options - Insert options
   * @returns {Promise<Object[]>} Inserted records
   */
  async optimizeBatchInsert(adapter, entity, records, options = {}) {
    if (records.length === 0) {
      return [];
    }

    const startTime = Date.now();
    const { batchSize = 100, useTransaction = true } = options;

    logger.info(
      `[BatchOptimizer] Starting batch insert: ${records.length} records for ${entity}`
    );

    const results = [];

    // Process in batches to avoid memory issues
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      if (useTransaction && adapter.transaction) {
        // Use transaction for consistency
        try {
          const batchResults = await adapter.transaction(async tx => {
            return await Promise.all(
              batch.map(record => this.insertRecord(adapter, entity, record, tx))
            );
          });

          results.push(...batchResults);
        } catch (error) {
          logger.error(`[BatchOptimizer] Transaction failed for batch ${i}: ${error.message}`);
          throw error;
        }
      } else {
        // Insert without transaction
        const batchResults = await Promise.all(
          batch.map(record => this.insertRecord(adapter, entity, record))
        );

        results.push(...batchResults);
      }
    }

    const duration = Date.now() - startTime;
    logger.info(
      `[BatchOptimizer] Batch insert completed: ${results.length} records in ${duration}ms (${(duration / results.length).toFixed(2)}ms/record)`
    );

    return results;
  }

  /**
   * Optimize batch update
   * @param {Object} adapter - ORM adapter
   * @param {string} entity - Entity slug
   * @param {Object[]} updates - Updates { id, data }
   * @param {Object} options - Update options
   * @returns {Promise<number>} Number of updated records
   */
  async optimizeBatchUpdate(adapter, entity, updates, options = {}) {
    if (updates.length === 0) {
      return 0;
    }

    const startTime = Date.now();
    const { batchSize = 100, useTransaction = true } = options;

    logger.info(`[BatchOptimizer] Starting batch update: ${updates.length} records for ${entity}`);

    let totalUpdated = 0;

    // Process in batches
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      if (useTransaction && adapter.transaction) {
        try {
          const batchUpdated = await adapter.transaction(async tx => {
            let count = 0;
            for (const update of batch) {
              const result = await this.updateRecord(adapter, entity, update.id, update.data, tx);
              if (result) count++;
            }
            return count;
          });

          totalUpdated += batchUpdated;
        } catch (error) {
          logger.error(`[BatchOptimizer] Transaction failed for batch ${i}: ${error.message}`);
          throw error;
        }
      } else {
        for (const update of batch) {
          const result = await this.updateRecord(adapter, entity, update.id, update.data);
          if (result) totalUpdated++;
        }
      }
    }

    const duration = Date.now() - startTime;
    logger.info(
      `[BatchOptimizer] Batch update completed: ${totalUpdated} records in ${duration}ms`
    );

    return totalUpdated;
  }

  /**
   * Optimize batch delete
   * @param {Object} adapter - ORM adapter
   * @param {string} entity - Entity slug
   * @param {number[]} ids - IDs to delete
   * @param {Object} options - Delete options
   * @returns {Promise<number>} Number of deleted records
   */
  async optimizeBatchDelete(adapter, entity, ids, options = {}) {
    if (ids.length === 0) {
      return 0;
    }

    const startTime = Date.now();
    const { batchSize = 100, useTransaction = true, soft = false } = options;

    logger.info(
      `[BatchOptimizer] Starting batch ${soft ? 'soft ' : ''}delete: ${ids.length} records for ${entity}`
    );

    let totalDeleted = 0;

    // Process in batches
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);

      if (useTransaction && adapter.transaction) {
        try {
          const batchDeleted = await adapter.transaction(async tx => {
            let count = 0;
            for (const id of batch) {
              const result = await this.deleteRecord(adapter, entity, id, soft, tx);
              if (result) count++;
            }
            return count;
          });

          totalDeleted += batchDeleted;
        } catch (error) {
          logger.error(`[BatchOptimizer] Transaction failed for batch ${i}: ${error.message}`);
          throw error;
        }
      } else {
        for (const id of batch) {
          const result = await this.deleteRecord(adapter, entity, id, soft);
          if (result) totalDeleted++;
        }
      }
    }

    const duration = Date.now() - startTime;
    logger.info(
      `[BatchOptimizer] Batch delete completed: ${totalDeleted} records in ${duration}ms (${(duration / ids.length).toFixed(2)}ms/record)`
    );

    return totalDeleted;
  }

  /**
   * Insert single record (internal)
   * @private
   * @param {Object} adapter - ORM adapter
   * @param {string} entity - Entity slug
   * @param {Object} record - Record to insert
   * @param {Object} tx - Optional transaction context
   * @returns {Promise<Object>}
   */
  async insertRecord(adapter, entity, record, tx = null) {
    // Delegate to adapter's insert method
    if (tx && adapter.insertInTx) {
      return await adapter.insertInTx(entity, record, tx);
    }

    return await adapter.create(entity, record);
  }

  /**
   * Update single record (internal)
   * @private
   * @param {Object} adapter - ORM adapter
   * @param {string} entity - Entity slug
   * @param {number} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} tx - Optional transaction context
   * @returns {Promise<boolean>}
   */
  async updateRecord(adapter, entity, id, data, tx = null) {
    // Delegate to adapter's update method
    if (tx && adapter.updateInTx) {
      return await adapter.updateInTx(entity, id, data, tx);
    }

    return !!(await adapter.update(entity, id, data));
  }

  /**
   * Delete single record (internal)
   * @private
   * @param {Object} adapter - ORM adapter
   * @param {string} entity - Entity slug
   * @param {number} id - Record ID
   * @param {boolean} soft - Soft delete
   * @param {Object} tx - Optional transaction context
   * @returns {Promise<boolean>}
   */
  async deleteRecord(adapter, entity, id, soft = false, tx = null) {
    // Delegate to adapter's delete method
    if (soft) {
      const data = { deleted_at: new Date() };
      if (tx && adapter.updateInTx) {
        return await adapter.updateInTx(entity, id, data, tx);
      }
      return !!(await adapter.update(entity, id, data));
    }

    if (tx && adapter.deleteInTx) {
      return await adapter.deleteInTx(entity, id, tx);
    }

    return !!(await adapter.delete(entity, id));
  }

  /**
   * Estimate performance improvement for batch operation
   * @param {number} recordCount - Number of records
   * @param {string} operation - Operation type (insert, update, delete)
   * @returns {Object} Performance estimate
   */
  estimatePerformance(recordCount, operation = 'insert') {
    // Baseline per-operation time in ms (estimated)
    const baselinePerOp = {
      insert: 5,
      update: 3,
      delete: 2,
    };

    const baseTime = baselinePerOp[operation] || 3;
    const singleOpTime = recordCount * baseTime;

    // Batch optimization reduces overhead (per-op overhead is ~1ms)
    const batchOverhead = 0.2; // 20% overhead per batch
    const batchCount = Math.ceil(recordCount / 100);
    const batchOpTime = recordCount * baseTime * 0.8 + batchCount * 10; // 20% reduction + batch overhead

    return {
      operation,
      recordCount,
      estimatedSingleTime: `${singleOpTime}ms`,
      estimatedBatchTime: `${Math.round(batchOpTime)}ms`,
      improvement: `${Math.round(((singleOpTime - batchOpTime) / singleOpTime) * 100)}%`,
    };
  }
}

export default BatchOptimizer;
