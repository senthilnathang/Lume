/**
 * Performance Monitoring Utilities
 *
 * Provides tools for monitoring and reporting frontend performance metrics.
 * Integrates with Web Vitals and custom metrics.
 *
 * Usage:
 * ```ts
 * // In main.ts or App.vue
 * import { initPerformanceMonitoring, reportWebVitals } from '#/utils/performance';
 *
 * initPerformanceMonitoring({
 *   reportToConsole: import.meta.env.DEV,
 *   reportToAnalytics: import.meta.env.PROD,
 * });
 * ```
 */

/**
 * Performance metric types
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
  entries?: PerformanceEntry[];
}

/**
 * Web Vitals thresholds (based on Google's recommendations)
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 }, // First Input Delay
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint
} as const;

/**
 * Get rating based on thresholds
 */
function getRating(
  value: number,
  thresholds: { good: number; poor: number },
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Report handler type
 */
type ReportHandler = (metric: PerformanceMetric) => void;

/**
 * Collected metrics
 */
const collectedMetrics: Map<string, PerformanceMetric> = new Map();
const reportHandlers: ReportHandler[] = [];

/**
 * Add a report handler
 */
export function addReportHandler(handler: ReportHandler): void {
  reportHandlers.push(handler);
}

/**
 * Report a metric to all handlers
 */
function reportMetric(metric: PerformanceMetric): void {
  collectedMetrics.set(metric.name, metric);
  reportHandlers.forEach((handler) => handler(metric));
}

/**
 * Observe Largest Contentful Paint
 */
function observeLCP(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];

      if (lastEntry) {
        const value = lastEntry.startTime;
        reportMetric({
          name: 'LCP',
          value,
          rating: getRating(value, WEB_VITALS_THRESHOLDS.LCP),
          entries: [lastEntry],
        });
      }
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    console.warn('LCP observation not supported:', e);
  }
}

/**
 * Observe First Input Delay
 */
function observeFID(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const firstEntry = entries[0] as PerformanceEventTiming | undefined;

      if (firstEntry) {
        const value = firstEntry.processingStart - firstEntry.startTime;
        reportMetric({
          name: 'FID',
          value,
          rating: getRating(value, WEB_VITALS_THRESHOLDS.FID),
          entries: [firstEntry],
        });
      }
    });

    observer.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    console.warn('FID observation not supported:', e);
  }
}

/**
 * Observe Cumulative Layout Shift
 */
function observeCLS(): void {
  if (!('PerformanceObserver' in window)) return;

  let clsValue = 0;
  let clsEntries: PerformanceEntry[] = [];
  let sessionValue = 0;
  let sessionEntries: PerformanceEntry[] = [];

  try {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0] as any;
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1] as any;

          if (
            sessionValue &&
            entry.startTime - lastSessionEntry?.startTime < 1000 &&
            entry.startTime - firstSessionEntry?.startTime < 5000
          ) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }

          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            clsEntries = [...sessionEntries];

            reportMetric({
              name: 'CLS',
              value: clsValue,
              rating: getRating(clsValue, WEB_VITALS_THRESHOLDS.CLS),
              entries: clsEntries,
            });
          }
        }
      }
    });

    observer.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    console.warn('CLS observation not supported:', e);
  }
}

/**
 * Observe First Contentful Paint
 */
function observeFCP(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntriesByName('first-contentful-paint')) {
        const value = entry.startTime;
        reportMetric({
          name: 'FCP',
          value,
          rating: getRating(value, WEB_VITALS_THRESHOLDS.FCP),
          entries: [entry],
        });
        observer.disconnect();
      }
    });

    observer.observe({ type: 'paint', buffered: true });
  } catch (e) {
    console.warn('FCP observation not supported:', e);
  }
}

/**
 * Observe Time to First Byte
 */
function observeTTFB(): void {
  try {
    const [navigationEntry] = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];

    if (navigationEntry) {
      const value = navigationEntry.responseStart;
      reportMetric({
        name: 'TTFB',
        value,
        rating: getRating(value, WEB_VITALS_THRESHOLDS.TTFB),
        entries: [navigationEntry],
      });
    }
  } catch (e) {
    console.warn('TTFB observation not supported:', e);
  }
}

/**
 * Configuration options
 */
export interface PerformanceMonitoringOptions {
  /** Report metrics to console */
  reportToConsole?: boolean;
  /** Custom report handler */
  onReport?: ReportHandler;
  /** Enable Web Vitals monitoring */
  webVitals?: boolean;
  /** Enable resource timing */
  resourceTiming?: boolean;
  /** Enable long task monitoring */
  longTasks?: boolean;
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(
  options: PerformanceMonitoringOptions = {},
): void {
  const {
    reportToConsole = import.meta.env.DEV,
    onReport,
    webVitals = true,
    resourceTiming: _resourceTiming = false,
    longTasks = import.meta.env.DEV,
  } = options;

  // Console reporter
  if (reportToConsole) {
    addReportHandler((metric) => {
      const color =
        metric.rating === 'good'
          ? 'color: green'
          : metric.rating === 'needs-improvement'
            ? 'color: orange'
            : 'color: red';

      console.log(
        `%c[Performance] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
        color,
      );
    });
  }

  // Custom reporter
  if (onReport) {
    addReportHandler(onReport);
  }

  // Web Vitals
  if (webVitals) {
    observeLCP();
    observeFID();
    observeCLS();
    observeFCP();
    observeTTFB();
  }

  // Long tasks
  if (longTasks && 'PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.duration > 50) {
            console.warn(
              `[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`,
              entry,
            );
          }
        }
      });

      observer.observe({ type: 'longtask', buffered: true });
    } catch (e) {
      // Long task observation not supported
    }
  }
}

/**
 * Get all collected metrics
 */
export function getCollectedMetrics(): Map<string, PerformanceMetric> {
  return new Map(collectedMetrics);
}

/**
 * Get a specific metric
 */
export function getMetric(name: string): PerformanceMetric | undefined {
  return collectedMetrics.get(name);
}

/**
 * Measure a custom operation
 *
 * @example
 * ```ts
 * const end = measureStart('api-call');
 * await fetchData();
 * end(); // Logs: [Performance] api-call: 234.56ms
 * ```
 */
export function measureStart(name: string): () => number {
  const start = performance.now();

  return () => {
    const duration = performance.now() - start;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  };
}

/**
 * Measure an async operation
 *
 * @example
 * ```ts
 * const result = await measure('fetch-employees', async () => {
 *   return await fetchEmployees();
 * });
 * ```
 */
export async function measure<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }
}

/**
 * Get resource timing summary
 */
export function getResourceTimingSummary(): {
  totalResources: number;
  totalSize: number;
  byType: Record<string, { count: number; size: number; duration: number }>;
} {
  const resources = performance.getEntriesByType(
    'resource',
  ) as PerformanceResourceTiming[];

  const byType: Record<string, { count: number; size: number; duration: number }> = {};
  let totalSize = 0;

  for (const resource of resources) {
    const type = resource.initiatorType;
    const size = resource.transferSize || 0;
    const duration = resource.duration;

    if (!byType[type]) {
      byType[type] = { count: 0, size: 0, duration: 0 };
    }

    byType[type].count++;
    byType[type].size += size;
    byType[type].duration += duration;
    totalSize += size;
  }

  return {
    totalResources: resources.length,
    totalSize,
    byType,
  };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Log resource timing summary to console
 */
export function logResourceSummary(): void {
  const summary = getResourceTimingSummary();

  console.group('[Performance] Resource Summary');
  console.log(`Total resources: ${summary.totalResources}`);
  console.log(`Total size: ${formatBytes(summary.totalSize)}`);

  console.table(
    Object.entries(summary.byType).map(([type, data]) => ({
      Type: type,
      Count: data.count,
      Size: formatBytes(data.size),
      'Avg Duration': `${(data.duration / data.count).toFixed(2)}ms`,
    })),
  );
  console.groupEnd();
}
