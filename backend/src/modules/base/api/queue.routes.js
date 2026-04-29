/**
 * Queue Management REST API Routes
 *
 * Provides endpoints for queue management, job monitoring, and statistics
 *
 * Routes:
 *   GET    /queue/stats           - Get all queue statistics
 *   GET    /queue/:queueName      - Get queue stats by name
 *   GET    /queue/:queueName/:jobId - Get job details
 *   POST   /queue/:queueName/clear - Clear a queue
 *   POST   /queue/:queueName/job   - Add job to queue
 */

import { Router } from 'express';
import { getQueueManager } from '../../../core/queue/queue-init.js';

const createQueueRoutes = () => {
  const router = Router();

  // Middleware to get queue manager
  const getQM = (req, res, next) => {
    try {
      req.queueManager = getQueueManager();
      next();
    } catch (error) {
      res.status(503).json({
        success: false,
        message: 'Queue manager not initialized'
      });
    }
  };

  router.use(getQM);

  // GET /queue/stats - Get all queue statistics
  router.get('/stats', async (req, res) => {
    try {
      const stats = await req.queueManager.getAllQueueStats();

      res.json({
        success: true,
        data: stats,
        summary: {
          totalQueues: stats.length,
          totalJobs: stats.reduce((sum, q) => sum + q.total, 0),
          activeJobs: stats.reduce((sum, q) => sum + q.active, 0),
          failedJobs: stats.reduce((sum, q) => sum + q.failed, 0)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /queue/:queueName - Get queue stats by name
  router.get('/:queueName', async (req, res) => {
    try {
      const { queueName } = req.params;
      const stats = await req.queueManager.getQueueStats(queueName);

      if (!stats) {
        return res.status(404).json({
          success: false,
          message: `Queue "${queueName}" not found`
        });
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /queue/:queueName/:jobId - Get job details
  router.get('/:queueName/:jobId', async (req, res) => {
    try {
      const { queueName, jobId } = req.params;
      const job = await req.queueManager.getJob(queueName, jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: `Job "${jobId}" not found in queue "${queueName}"`
        });
      }

      const state = await job.getState();
      const progress = job.progress();

      res.json({
        success: true,
        data: {
          id: job.id,
          state,
          progress,
          data: job.data,
          result: job.returnvalue,
          failedReason: job.failedReason,
          stacktrace: job.stacktrace,
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          createdAt: job.createdAt,
          finishedAt: job.finishedOn,
          delay: job.delay
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /queue/:queueName/clear - Clear a queue
  router.post('/:queueName/clear', async (req, res) => {
    try {
      const { queueName } = req.params;
      const cleared = await req.queueManager.clearQueue(queueName);

      if (!cleared) {
        return res.status(404).json({
          success: false,
          message: `Queue "${queueName}" not found`
        });
      }

      res.json({
        success: true,
        message: `Queue "${queueName}" cleared successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /queue/:queueName/job - Add job to queue
  router.post('/:queueName/job', async (req, res) => {
    try {
      const { queueName } = req.params;
      const { data, options = {} } = req.body;

      if (!data) {
        return res.status(400).json({
          success: false,
          message: 'Job data is required'
        });
      }

      const job = await req.queueManager.addJob(queueName, data, options);

      res.status(201).json({
        success: true,
        data: {
          id: job.id,
          queueName,
          status: 'queued',
          createdAt: new Date()
        },
        message: `Job "${job.id}" added to queue "${queueName}"`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /queue/:queueName/recurring - Add recurring job
  router.post('/:queueName/recurring', async (req, res) => {
    try {
      const { queueName } = req.params;
      const { jobName, data, pattern, options = {} } = req.body;

      if (!jobName || !data || !pattern) {
        return res.status(400).json({
          success: false,
          message: 'jobName, data, and pattern are required'
        });
      }

      const job = await req.queueManager.addRecurringJob(
        queueName,
        jobName,
        data,
        pattern,
        options
      );

      res.status(201).json({
        success: true,
        data: {
          id: job.id,
          queueName,
          jobName,
          pattern,
          createdAt: new Date()
        },
        message: `Recurring job "${jobName}" added to queue "${queueName}"`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /queue/list - List all queues
  router.get('/', (req, res) => {
    try {
      const queues = req.queueManager.getQueues();

      res.json({
        success: true,
        data: queues,
        message: `Found ${queues.length} queues`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  return router;
};

export default createQueueRoutes;
