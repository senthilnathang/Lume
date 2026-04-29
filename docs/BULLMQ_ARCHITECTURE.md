# BullMQ Job Queue Architecture

**Status:** ✅ Implemented  
**Date:** 2026-04-22  
**Version:** 1.0.0

---

## Overview

Lume Framework now includes **BullMQ**, a robust job queue system for handling background jobs, scheduled tasks, and asynchronous operations. This enables scalable processing of long-running operations without blocking HTTP requests.

### Why BullMQ?

- ✅ **Redis-backed** - Uses existing Redis infrastructure
- ✅ **Reliable delivery** - Automatic retries with exponential backoff
- ✅ **Scalable** - Handle thousands of jobs efficiently
- ✅ **Monitoring** - Built-in Bull Board UI dashboard
- ✅ **Flexible** - Support for delayed jobs, recurring jobs, priorities
- ✅ **Production-ready** - Used by Twenty.js and other enterprise frameworks

### Architecture Comparison

| Aspect | Before | After (BullMQ) |
|--------|--------|----------------|
| Async Jobs | HTTP request blocking | Queued + Workers |
| Long Operations | Timeouts/failures | Async processing |
| Monitoring | None | Bull Board UI |
| Retries | Manual | Automatic |
| Scheduling | Node-cron only | BullMQ + Cron |
| Webhooks | Sync (unreliable) | Async + Retry |
| Scalability | Single process | Distributed workers |

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Express HTTP Server                      │
├─────────────────────────────────────────────────────────────┤
│  API Routes                 │  Bull Board UI               │
│  /api/queue/*              │  /admin/queues               │
│                            │                              │
│  ┌──────────────────┐      │  ┌──────────────────────┐   │
│  │ Queue Routes     │      │  │ Job Monitoring       │   │
│  │ - Add job        │      │  │ - Queue stats        │   │
│  │ - Get stats      │◄────►│  │ - Job details        │   │
│  │ - Clear queue    │      │  │ - Worker status      │   │
│  └──────────────────┘      │  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ QueueManager    │
                    │ Service         │
                    └────────┬────────┘
                             │
                  ┌──────────▼──────────┐
                  │      Redis          │
                  │  (Queue Storage)    │
                  └──────────┬──────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐         ┌────▼────┐        ┌────▼────┐
   │ Workers │         │ Workers │        │ Workers │
   │(Proc 1) │         │(Proc 2) │        │(Proc N) │
   │         │         │         │        │         │
   │ entity- │         │automation        │ export  │
   │records  │         │        │         │ s       │
   │ handler │         │ handler │        │ handler │
   └────┬────┘         └────┬────┘        └────┬────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
              ┌─────────────▼──────────────┐
              │ Database & Services        │
              │ - Prisma models            │
              │ - RecordService            │
              │ - EmailService             │
              │ - etc.                     │
              └────────────────────────────┘
```

### Job Queues

| Queue | Purpose | Processors | Concurrency |
|-------|---------|-----------|-------------|
| **entity-records** | Bulk import/export/delete | bulkImport, bulkExport, bulkDelete | 3 |
| **automations** | Workflow execution | executeWorkflow, executeRule | 5 |
| **notifications** | Email/webhook delivery | sendEmail, sendWebhook | 10 |
| **exports** | CSV/Excel/PDF generation | generateCsvExport, generateExcelExport, generatePdfExport | 2 |
| **media** | Image processing | processMedia, generateThumbnails | 4 |
| **webhooks** | Outbound webhooks | sendWebhook (with retry) | 10 |
| **reports** | Report generation | generateReport | 2 |

---

## Job Types

### 1. Entity Records Queue

#### Bulk Import
```javascript
// Add job
await queueManager.addJob('entity-records', {
  type: 'bulk-import',
  entityId: 1,
  companyId: 1,
  userId: 1,
  records: [
    { name: 'John', email: 'john@example.com' },
    { name: 'Jane', email: 'jane@example.com' }
  ]
});

// Returns { imported: 2, failed: 0, errors: [] }
```

#### Bulk Export
```javascript
// Add job
await queueManager.addJob('entity-records', {
  type: 'bulk-export',
  entityId: 1,
  companyId: 1,
  format: 'csv'
});

// Returns { format: 'csv', recordCount: 1000, exportedAt: '...' }
```

#### Bulk Delete
```javascript
await queueManager.addJob('entity-records', {
  type: 'bulk-delete',
  entityId: 1,
  companyId: 1,
  recordIds: [1, 2, 3, 4, 5],
  softDelete: true
});

// Returns { deleted: 5, failed: 0 }
```

### 2. Automation Queue

#### Execute Workflow
```javascript
await queueManager.addJob('automations', {
  type: 'execute-workflow',
  workflowId: 10,
  recordId: 123,
  entityId: 1,
  userId: 1
});

// Returns [
//   { step: 'send-email', status: 'completed', result: {...} },
//   { step: 'update-status', status: 'completed', result: {...} }
// ]
```

### 3. Notifications Queue

#### Send Email
```javascript
await queueManager.addJob('notifications', {
  type: 'email',
  to: 'user@example.com',
  subject: 'Welcome to Lume',
  template: 'welcome',
  data: { name: 'John', activationUrl: '...' }
});
```

#### Send Webhook
```javascript
await queueManager.addJob('notifications', {
  type: 'webhook',
  url: 'https://webhook.site/your-endpoint',
  event: 'record.created',
  payload: { recordId: 123, entityId: 1, ... }
});
```

### 4. Exports Queue

#### CSV Export
```javascript
await queueManager.addJob('exports', {
  format: 'csv',
  entityId: 1,
  viewId: 5,
  companyId: 1,
  userId: 1
});
```

#### Excel Export
```javascript
await queueManager.addJob('exports', {
  format: 'xlsx',
  entityId: 1,
  viewId: 5,
  companyId: 1
});
```

### 5. Recurring Jobs

Schedule jobs to run on a cron pattern:

```javascript
// Run every day at 9am
await queueManager.addRecurringJob(
  'reports',
  'daily-summary',
  {
    type: 'generate',
    reportId: 10,
    entityId: 1
  },
  '0 9 * * *'  // Cron pattern (9am daily)
);

// Run every Monday at 10am
await queueManager.addRecurringJob(
  'automations',
  'weekly-cleanup',
  {
    type: 'execute-workflow',
    workflowId: 5
  },
  '0 10 * * MON'
);
```

---

## API Endpoints

### Queue Management

**GET /api/queue/stats**
Get statistics for all queues

```bash
curl http://localhost:3000/api/queue/stats
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "name": "entity-records",
      "waiting": 5,
      "active": 2,
      "completed": 150,
      "failed": 1,
      "total": 158
    },
    ...
  ],
  "summary": {
    "totalQueues": 7,
    "totalJobs": 1234,
    "activeJobs": 15,
    "failedJobs": 8
  }
}
```

**GET /api/queue/:queueName**
Get specific queue stats

```bash
curl http://localhost:3000/api/queue/entity-records
```

**GET /api/queue/:queueName/:jobId**
Get job details

```bash
curl http://localhost:3000/api/queue/entity-records/job-123
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "job-123",
    "state": "completed",
    "progress": 100,
    "data": { "type": "bulk-import", ... },
    "result": { "imported": 100, "failed": 0 },
    "createdAt": "2026-04-22T10:30:00Z",
    "finishedAt": "2026-04-22T10:35:00Z"
  }
}
```

**POST /api/queue/:queueName/job**
Add job to queue

```bash
curl -X POST http://localhost:3000/api/queue/entity-records/job \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "type": "bulk-import",
      "entityId": 1,
      "companyId": 1,
      "records": [...]
    },
    "options": {
      "delay": 5000,
      "priority": 5
    }
  }'
```

**POST /api/queue/:queueName/recurring**
Add recurring job

```bash
curl -X POST http://localhost:3000/api/queue/reports/recurring \
  -H "Content-Type: application/json" \
  -d '{
    "jobName": "daily-report",
    "data": { "type": "generate", ... },
    "pattern": "0 9 * * *"
  }'
```

**POST /api/queue/:queueName/clear**
Clear all jobs in a queue

```bash
curl -X POST http://localhost:3000/api/queue/entity-records/clear
```

---

## Bull Board UI Dashboard

Access the job queue dashboard at:

```
http://localhost:3000/admin/queues
```

### Features

- 📊 **Real-time Statistics** - Active jobs, waiting, completed, failed
- 👁️ **Job Monitoring** - View job details, progress, results
- 🔍 **Job Search** - Find jobs by ID or status
- ⏸️ **Job Control** - Pause/resume/retry jobs
- 📈 **Performance Metrics** - Job throughput and processing time
- 🗑️ **Queue Management** - Clear queues, remove jobs

---

## Integration Examples

### Entity Record Operations

```javascript
import { getQueueManager } from '@/core/queue/queue-init.js';

// In a route handler or service
const queueManager = getQueueManager();

// Bulk import records from CSV
router.post('/entities/:id/import', async (req, res) => {
  const { records } = req.body;
  
  const job = await queueManager.addJob('entity-records', {
    type: 'bulk-import',
    entityId: req.params.id,
    companyId: req.user.companyId,
    userId: req.user.id,
    records
  });

  res.json({
    success: true,
    data: { jobId: job.id },
    message: 'Import started, check /api/queue/entity-records/' + job.id
  });
});
```

### Automation Workflows

```javascript
// Execute workflow asynchronously
router.post('/records/:recordId/trigger-workflow/:workflowId', async (req, res) => {
  const queueManager = getQueueManager();

  const job = await queueManager.addJob('automations', {
    type: 'execute-workflow',
    workflowId: req.params.workflowId,
    recordId: req.params.recordId,
    entityId: req.body.entityId,
    userId: req.user.id
  });

  res.json({
    success: true,
    jobId: job.id,
    message: 'Workflow queued for execution'
  });
});
```

### Email Notifications

```javascript
// Send bulk emails without blocking response
async function notifyUsers(users, template, data) {
  const queueManager = getQueueManager();

  for (const user of users) {
    await queueManager.addJob('notifications', {
      type: 'email',
      to: user.email,
      subject: `Welcome, ${user.name}!`,
      template,
      data: { ...data, name: user.name }
    }, {
      delay: Math.random() * 60000  // Stagger emails
    });
  }
}
```

### Webhook Delivery

```javascript
// Send webhooks asynchronously with automatic retries
async function triggerWebhook(event, payload) {
  const queueManager = getQueueManager();

  await queueManager.addJob('webhooks', {
    type: 'webhook',
    url: process.env.WEBHOOK_URL,
    event,
    payload
  }, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 }
  });
}
```

---

## Configuration

### Redis Connection

Configure Redis in `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Queue Concurrency

Adjust worker concurrency in `queue-init.js`:

```javascript
queueManager.registerProcessor('queue-name', processor, {
  concurrency: 10  // Process 10 jobs in parallel
});
```

### Job Retry Strategy

Default retry strategy (in QueueManagerService):

```javascript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000  // Start with 2s, exponentially backoff
  }
}
```

### Graceful Shutdown

Queue system automatically cleans up on SIGTERM/SIGINT:

```javascript
// Process termination triggers:
// 1. Close all workers
// 2. Close all schedulers
// 3. Close all queues
// 4. Disconnect Redis
```

---

## Monitoring

### Queue Metrics

Available via `/api/queue/stats`:

- **Waiting** - Jobs queued, not yet processed
- **Active** - Jobs currently being processed
- **Completed** - Successfully completed jobs
- **Failed** - Jobs that failed after retries
- **Total** - All jobs in this queue

### Health Check

Monitor queue health:

```javascript
// In monitoring/alerting service
const stats = await queueManager.getAllQueueStats();
const failedJobs = stats.reduce((sum, q) => sum + q.failed, 0);

if (failedJobs > 100) {
  alert('High number of failed jobs detected');
}
```

---

## Best Practices

### 1. Add Jobs Asynchronously

❌ Don't wait for job completion in HTTP response:
```javascript
const result = await job.waitUntilFinished(); // Bad!
res.json(result);
```

✅ Return job ID and let client poll:
```javascript
res.json({ jobId: job.id, status: 'processing' });
```

### 2. Handle Job Failures

Use the Bull Board UI to monitor failed jobs, then:

```javascript
// Retry failed job
const job = await queueManager.getJob('queue-name', 'job-id');
await job.retry();
```

### 3. Estimate Job Duration

Use job progress for long operations:

```javascript
async bulkImport(job) {
  for (let i = 0; i < records.length; i++) {
    // ... process record ...
    job.progress((i + 1) / records.length * 100);
  }
}
```

### 4. Use Job Priorities

```javascript
// High priority job (processed first)
await queueManager.addJob('queue-name', data, {
  priority: 10
});

// Low priority job (processed last)
await queueManager.addJob('queue-name', data, {
  priority: -10
});
```

### 5. Schedule Regular Cleanup

```javascript
// Clear completed jobs daily
await queueManager.addRecurringJob(
  'system',
  'cleanup-completed',
  { type: 'cleanup' },
  '0 2 * * *'  // 2am daily
);
```

---

## Future Enhancements

- [ ] Job deadletter queue for permanently failed jobs
- [ ] Distributed worker deployment (horizontal scaling)
- [ ] Job notifications (Slack, email on completion)
- [ ] Custom job processors per module
- [ ] Job rate limiting and throttling
- [ ] Advanced scheduling (timezone-aware cron)
- [ ] Job dependencies and workflows
- [ ] Historical analytics and reporting

---

## Troubleshooting

### Queue not starting?

Check Redis connection:
```bash
redis-cli ping
# Should respond with PONG
```

### Jobs not processing?

Check Bull Board at `/admin/queues` for:
- Worker status
- Failed job reasons
- Job data and results

### High memory usage?

Reduce job retention in Bull Board or clear completed jobs:
```javascript
await queueManager.clearQueue('queue-name');
```

---

## References

- [BullMQ Documentation](https://docs.bullmq.io)
- [Bull Board Documentation](https://github.com/felixmosh/bull-board)
- [Redis Documentation](https://redis.io/docs)
- [Lume Entity Builder with BullMQ Integration](./BULLMQ_ARCHITECTURE.md)

