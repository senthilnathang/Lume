/**
 * Queue Initialization
 * Initialize all job queues and register processors
 */

import QueueManagerService from '../services/queue-manager.service.js';
import {
  entityRecordProcessors,
  automationProcessors,
  notificationProcessors,
  exportProcessors,
  mediaProcessors,
  reportProcessors
} from '../services/job-processors.js';

let queueManager = null;

/**
 * Initialize all queues with processors
 */
export async function initializeQueues() {
  if (queueManager && queueManager.initialized) {
    return queueManager;
  }

  queueManager = new QueueManagerService();
  await queueManager.initialize();

  // Register processors for each queue
  registerEntityRecordProcessors();
  registerAutomationProcessors();
  registerNotificationProcessors();
  registerExportProcessors();
  registerMediaProcessors();
  registerReportProcessors();

  return queueManager;
}

function registerEntityRecordProcessors() {
  queueManager.registerProcessor(
    'entity-records',
    async (job) => {
      const { type } = job.data;

      switch (type) {
        case 'bulk-import':
          return await entityRecordProcessors.bulkImport(job);
        case 'bulk-export':
          return await entityRecordProcessors.bulkExport(job);
        case 'bulk-delete':
          return await entityRecordProcessors.bulkDelete(job);
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    },
    { concurrency: 3 }
  );
}

function registerAutomationProcessors() {
  queueManager.registerProcessor(
    'automations',
    async (job) => {
      const { type } = job.data;

      switch (type) {
        case 'execute-workflow':
          return await automationProcessors.executeWorkflow(job);
        case 'execute-rule':
          return await automationProcessors.executeBusinessRule(job);
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    },
    { concurrency: 5 }
  );
}

function registerNotificationProcessors() {
  queueManager.registerProcessor(
    'notifications',
    async (job) => {
      const { type } = job.data;

      switch (type) {
        case 'email':
          return await notificationProcessors.sendEmail(job);
        case 'webhook':
          return await notificationProcessors.sendWebhook(job);
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    },
    { concurrency: 10 }
  );
}

function registerExportProcessors() {
  queueManager.registerProcessor(
    'exports',
    async (job) => {
      const { format } = job.data;

      switch (format) {
        case 'csv':
          return await exportProcessors.generateCsvExport(job);
        case 'xlsx':
          return await exportProcessors.generateExcelExport(job);
        case 'pdf':
          return await exportProcessors.generatePdfExport(job);
        default:
          throw new Error(`Unknown export format: ${format}`);
      }
    },
    { concurrency: 2 }
  );
}

function registerMediaProcessors() {
  queueManager.registerProcessor(
    'media',
    async (job) => {
      const { type } = job.data;

      switch (type) {
        case 'process':
          return await mediaProcessors.processMedia(job);
        case 'thumbnails':
          return await mediaProcessors.generateThumbnails(job);
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    },
    { concurrency: 4 }
  );
}

function registerReportProcessors() {
  queueManager.registerProcessor(
    'reports',
    async (job) => {
      const { type } = job.data;

      switch (type) {
        case 'generate':
          return await reportProcessors.generateReport(job);
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    },
    { concurrency: 2 }
  );
}

/**
 * Get queue manager instance
 */
export function getQueueManager() {
  if (!queueManager) {
    throw new Error('Queue manager not initialized. Call initializeQueues() first');
  }
  return queueManager;
}

/**
 * Shutdown all queues
 */
export async function shutdownQueues() {
  if (queueManager) {
    await queueManager.shutdown();
    queueManager = null;
  }
}

export default {
  initializeQueues,
  getQueueManager,
  shutdownQueues
};
