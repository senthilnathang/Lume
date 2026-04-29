/**
 * Bull Board Setup
 * Provides a UI dashboard for monitoring BullMQ queues
 * Access at: http://localhost:3000/admin/queues
 */

import { createBullBoard } from '@bull-board/express';
import { ExpressAdapter } from '@bull-board/express/dist/src/index.js';
import { BullAdapter } from '@bull-board/api/bullAdapter.js';
import { getQueueManager } from './queue-init.js';

let serverAdapter = null;

/**
 * Setup Bull Board UI dashboard
 * Call this after initializing queues
 */
export function setupBullBoard() {
  if (serverAdapter) {
    return serverAdapter;
  }

  try {
    const queueManager = getQueueManager();

    // Create server adapter
    serverAdapter = new ExpressAdapter();

    // Get all queues and create adapters
    const queueNames = queueManager.getQueues();
    const queueAdapters = queueNames.map((queueName) => {
      const queue = queueManager.getQueue(queueName);
      return new BullAdapter(queue);
    });

    // Create Bull Board
    createBullBoard({
      queues: queueAdapters,
      serverAdapter
    });

    console.log('✅ Bull Board UI configured');
    return serverAdapter;
  } catch (error) {
    console.error('❌ Failed to setup Bull Board:', error);
    throw error;
  }
}

/**
 * Get Bull Board server adapter
 */
export function getBullBoardAdapter() {
  if (!serverAdapter) {
    throw new Error('Bull Board not initialized. Call setupBullBoard() first');
  }
  return serverAdapter;
}

export default {
  setupBullBoard,
  getBullBoardAdapter
};
