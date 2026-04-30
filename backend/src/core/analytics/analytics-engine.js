/**
 * @fileoverview Analytics Engine - Advanced metrics and insights
 * Tracks user activity, entity changes, and system performance
 */

import logger from '../services/logger.js';

class AnalyticsEngine {
  /**
   * @param {Object} config - Configuration
   * @param {Object} config.auditLogger - AuditLogger instance
   * @param {Object} config.cacheOptimizer - CacheOptimizer instance
   */
  constructor(config = {}) {
    this.auditLogger = config.auditLogger;
    this.cacheOptimizer = config.cacheOptimizer;
    this.metrics = new Map(); // metricName -> MetricData
    this.events = []; // Event stream
  }

  /**
   * Record a metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {Object} tags - Tag metadata
   */
  recordMetric(name, value, tags = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        values: [],
        min: Infinity,
        max: -Infinity,
        sum: 0,
        count: 0,
      });
    }

    const metric = this.metrics.get(name);
    metric.values.push({ value, timestamp: Date.now(), tags });
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.sum += value;
    metric.count++;
  }

  /**
   * Record an event
   * @param {string} name - Event name
   * @param {Object} data - Event data
   */
  recordEvent(name, data = {}) {
    const event = {
      name,
      data,
      timestamp: Date.now(),
    };

    this.events.push(event);

    // Keep only last 10,000 events
    if (this.events.length > 10000) {
      this.events.shift();
    }
  }

  /**
   * Get entity usage statistics
   * @returns {Object} Usage stats by entity
   */
  getEntityUsageStats() {
    if (!this.auditLogger) {
      return {};
    }

    const stats = this.auditLogger.getStatistics();
    const usage = {};

    for (const [entity, count] of Object.entries(stats.byEntity)) {
      usage[entity] = {
        changes: count,
        percentage: ((count / stats.totalLogs) * 100).toFixed(2),
      };
    }

    return usage;
  }

  /**
   * Get user activity statistics
   * @returns {Object} Activity by user
   */
  getUserActivityStats() {
    if (!this.auditLogger) {
      return {};
    }

    const stats = this.auditLogger.getStatistics();
    return stats.byUser;
  }

  /**
   * Get cache performance metrics
   * @returns {Object} Cache stats
   */
  getCacheMetrics() {
    if (!this.cacheOptimizer) {
      return {};
    }

    const stats = this.cacheOptimizer.getStats();
    return {
      hitRate: stats.hitRate,
      totalHits: stats.hits,
      totalMisses: stats.misses,
      byLayer: stats.byLayer,
    };
  }

  /**
   * Get performance metrics (latency, throughput)
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const metrics = {};

    for (const [name, metric] of this.metrics) {
      if (metric.count === 0) continue;

      metrics[name] = {
        min: metric.min,
        max: metric.max,
        avg: (metric.sum / metric.count).toFixed(2),
        sum: metric.sum,
        count: metric.count,
      };
    }

    return metrics;
  }

  /**
   * Get dashboard summary (high-level overview)
   * @returns {Object} Dashboard data
   */
  getDashboardSummary() {
    const auditStats = this.auditLogger ? this.auditLogger.getStatistics() : {};
    const cacheStats = this.getCacheMetrics();

    return {
      summary: {
        totalChanges: auditStats.totalLogs || 0,
        cacheHitRate: cacheStats.hitRate || '0%',
        topEntity: this.getTopEntity(auditStats),
        topUser: this.getTopUser(auditStats),
      },
      usage: this.getEntityUsageStats(),
      activity: this.getUserActivityStats(),
      cache: cacheStats,
      performance: this.getPerformanceMetrics(),
      timeline: this.getActivityTimeline(),
    };
  }

  /**
   * Get activity timeline (hourly aggregation)
   * @returns {Object} Timeline data
   */
  getActivityTimeline() {
    if (!this.auditLogger) {
      return {};
    }

    const timeline = {};
    const logs = this.auditLogger.logs;

    for (const log of logs) {
      const hour = log.timestamp.toISOString().slice(0, 13);

      if (!timeline[hour]) {
        timeline[hour] = { create: 0, update: 0, delete: 0 };
      }

      timeline[hour][log.action]++;
    }

    return timeline;
  }

  /**
   * Get trending metrics
   * @param {number} windowMinutes - Time window
   * @returns {Object} Trending metrics
   */
  getTrendingMetrics(windowMinutes = 60) {
    const cutoffTime = Date.now() - windowMinutes * 60 * 1000;
    const trends = {};

    for (const [name, metric] of this.metrics) {
      const recentValues = metric.values.filter(v => v.timestamp > cutoffTime);

      if (recentValues.length === 0) continue;

      const sum = recentValues.reduce((s, v) => s + v.value, 0);

      trends[name] = {
        avg: (sum / recentValues.length).toFixed(2),
        count: recentValues.length,
        trend: this.calculateTrend(recentValues),
      };
    }

    return trends;
  }

  /**
   * Calculate trend direction
   * @private
   * @param {Object[]} values - Values with timestamps
   * @returns {string} 'up', 'down', or 'stable'
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const avgFirst = firstHalf.reduce((s, v) => s + v.value, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, v) => s + v.value, 0) / secondHalf.length;

    if (avgSecond > avgFirst * 1.1) return 'up';
    if (avgSecond < avgFirst * 0.9) return 'down';
    return 'stable';
  }

  /**
   * Get top entity by changes
   * @private
   * @param {Object} stats - Audit statistics
   * @returns {string} Top entity
   */
  getTopEntity(stats) {
    let max = 0;
    let topEntity = null;

    for (const [entity, count] of Object.entries(stats.byEntity || {})) {
      if (count > max) {
        max = count;
        topEntity = entity;
      }
    }

    return topEntity;
  }

  /**
   * Get top user by changes
   * @private
   * @param {Object} stats - Audit statistics
   * @returns {string} Top user
   */
  getTopUser(stats) {
    let max = 0;
    let topUser = null;

    for (const [user, count] of Object.entries(stats.byUser || {})) {
      if (count > max) {
        max = count;
        topUser = user;
      }
    }

    return topUser;
  }

  /**
   * Export analytics as JSON
   * @returns {Object} Complete analytics data
   */
  exportAnalytics() {
    return {
      summary: this.getDashboardSummary(),
      trends: this.getTrendingMetrics(),
      events: this.events.slice(-1000), // Last 1000 events
      timestamp: new Date(),
    };
  }

  /**
   * Clear all metrics and events
   */
  clear() {
    this.metrics.clear();
    this.events = [];
    logger.info('[AnalyticsEngine] All analytics data cleared');
  }
}

export default AnalyticsEngine;
