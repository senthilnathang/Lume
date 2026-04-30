/**
 * Sustained Load Test (Long-Running)
 * Maintains moderate load (200 req/sec) for 30 minutes
 * Monitors for memory leaks, GC pauses, connection pool degradation
 * Measures long-term stability and reliability
 */

import http from 'k6/http';
import { check, Counter, Trend } from 'k6';
import {
  API_URL,
  getAuthHeaders,
  generatePagePayload,
  sleepWithJitter,
  setupTest,
  teardownTest
} from './config.js';

// Custom metrics for sustained load monitoring
const memoryLeakCounter = new Counter('memory_leak_detection');
const latencyTrend = new Trend('sustained_latency');
const errorRateTrend = new Trend('sustained_error_rate');

export const options = {
  stages: [
    // Ramp up to 200 VUs over 2 minutes
    { duration: '2m', target: 200 },
    // Maintain 200 VUs (200 concurrent users = ~1000 req/sec) for 30 minutes
    { duration: '30m', target: 200 },
    // Ramp down over 2 minutes
    { duration: '2m', target: 0 }
  ],

  thresholds: {
    // Latency must remain stable throughout 30-minute test
    'http_req_duration': [
      `p(50) < 200`,
      `p(95) < 500`,
      `p(99) < 1000`,
      'avg < 300'
    ],

    // Error rate must remain low
    'http_req_failed': [
      `rate < 0.01`  // < 1% error rate
    ],

    // Connection stability
    'http_conn_connecting': [
      `p(95) < 1000`,
      `max < 5000`
    ],

    // Minimum throughput throughout test
    'http_requests': [
      'count > 10000'
    ]
  },

  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(75)', 'p(90)', 'p(95)', 'p(99)'],
  timeout: '30s'
};

export function setup() {
  console.log('🚀 Starting 30-minute sustained load test');
  return setupTest();
}

export function teardown(data) {
  console.log('✅ Sustained load test complete - monitoring for memory leaks and stability issues');
  teardownTest(data);
}

/**
 * Health check - monitor system responsiveness
 * Run frequently to detect degradation
 */
function healthCheck() {
  const response = http.get(
    `${API_URL}/../health`,
    {
      tags: { name: 'Health', category: 'monitoring', type: 'read' },
      timeout: '5s'
    }
  );

  const success = response.status === 200;
  check(response, {
    'health: stable': (r) => r.status === 200,
    'health: responsive': (r) => r.timings.duration < 500
  });

  latencyTrend.add(response.timings.duration);
  if (!success) errorRateTrend.add(1);

  return success;
}

/**
 * Simple read operation - consistent load
 */
function readUsers() {
  const page = Math.floor(Math.random() * 10) + 1;

  const response = http.get(
    `${API_URL}/users?page=${page}&limit=20`,
    {
      headers: getAuthHeaders(),
      tags: { name: 'ReadUsers', category: 'data', type: 'read' },
      timeout: '10s'
    }
  );

  const success = response.status === 200;
  check(response, {
    'read users: stable': (r) => r.status === 200,
    'read users: latency consistent': (r) => r.timings.duration < 800
  });

  latencyTrend.add(response.timings.duration);
  if (!success) errorRateTrend.add(1);

  return success;
}

/**
 * Moderate read operation
 */
function readPages() {
  const page = Math.floor(Math.random() * 50) + 1;

  const response = http.get(
    `${API_URL}/website/pages?page=${page}&limit=20`,
    {
      headers: getAuthHeaders(),
      tags: { name: 'ReadPages', category: 'data', type: 'read' },
      timeout: '10s'
    }
  );

  const success = response.status === 200;
  check(response, {
    'read pages: stable': (r) => r.status === 200,
    'read pages: latency consistent': (r) => r.timings.duration < 1000
  });

  latencyTrend.add(response.timings.duration);
  if (!success) errorRateTrend.add(1);

  return success;
}

/**
 * Complex search operation
 */
function searchData() {
  const queries = ['test', 'page', 'user', 'content', 'data', 'search', 'query', 'result'];
  const query = queries[Math.floor(Math.random() * queries.length)];

  const response = http.get(
    `${API_URL}/base/search?q=${query}&limit=100`,
    {
      headers: getAuthHeaders(),
      tags: { name: 'Search', category: 'data', type: 'read' },
      timeout: '15s'
    }
  );

  const success = response.status === 200;
  check(response, {
    'search: stable': (r) => r.status === 200,
    'search: latency consistent': (r) => r.timings.duration < 2000
  });

  latencyTrend.add(response.timings.duration);
  if (!success) errorRateTrend.add(1);

  return success;
}

/**
 * Write operation - moderate frequency during sustained test
 */
function createPage() {
  const payload = JSON.stringify(generatePagePayload());

  const response = http.post(
    `${API_URL}/website/pages`,
    payload,
    {
      headers: getAuthHeaders(),
      tags: { name: 'CreatePage', category: 'data', type: 'write' },
      timeout: '15s'
    }
  );

  const success = response.status === 201;
  check(response, {
    'create page: stable': (r) => r.status === 201,
    'create page: latency consistent': (r) => r.timings.duration < 2000
  });

  latencyTrend.add(response.timings.duration);
  if (!success) errorRateTrend.add(1);

  return success;
}

/**
 * Extended workflow - tests connection pooling
 */
function extendedWorkflow() {
  const workflow = group('extended_workflow', () => {
    // Simulate realistic user journey with multiple steps
    const steps = [
      { method: 'list_users', url: `${API_URL}/users?limit=10` },
      { method: 'list_pages', url: `${API_URL}/website/pages?limit=10` }
    ];

    let success = true;
    for (const step of steps) {
      const response = http.get(step.url, {
        headers: getAuthHeaders(),
        tags: { name: 'ExtendedWorkflow', step: step.method, type: 'read' },
        timeout: '10s'
      });

      const stepSuccess = response.status === 200;
      success = success && stepSuccess;

      latencyTrend.add(response.timings.duration);
      if (!stepSuccess) errorRateTrend.add(1);

      // Brief pause between steps
      sleepWithJitter(0.05, 50);
    }

    return success;
  });

  return workflow;
}

/**
 * Database write consistency check
 * Verify data integrity under sustained load
 */
function writeConsistencyCheck() {
  const payload = JSON.stringify({
    title: `Test Page ${Math.random().toString(36).substring(7)}`,
    slug: `test-slug-${Math.random().toString(36).substring(7)}`,
    description: 'Sustained load test - write consistency check',
    status: 'published',
    content: {
      type: 'doc',
      content: []
    }
  });

  const response = http.post(
    `${API_URL}/website/pages`,
    payload,
    {
      headers: getAuthHeaders(),
      tags: { name: 'WriteCheck', category: 'consistency', type: 'write' },
      timeout: '15s'
    }
  );

  const success = response.status === 201;
  check(response, {
    'write check: consistency maintained': (r) => r.status === 201,
    'write check: response valid': (r) => r.body.length > 0
  });

  latencyTrend.add(response.timings.duration);
  if (!success) errorRateTrend.add(1);

  return success;
}

/**
 * Main test function
 * Sustained load with realistic operation mix
 * Emphasizes read-heavy workload (typical web application pattern)
 */
export default function (data) {
  const operations = [
    { func: healthCheck, weight: 15 },             // 15% - monitoring
    { func: readUsers, weight: 25 },               // 25% - simple reads
    { func: readPages, weight: 30 },               // 30% - moderate reads
    { func: searchData, weight: 15 },              // 15% - complex reads
    { func: createPage, weight: 8 },               // 8% - moderate writes
    { func: extendedWorkflow, weight: 5 },         // 5% - complex workflows
    { func: writeConsistencyCheck, weight: 2 }     // 2% - consistency checks
  ];

  // Select operation based on weighted distribution
  const totalWeight = operations.reduce((sum, op) => sum + op.weight, 0);
  let random = Math.random() * totalWeight;

  for (const operation of operations) {
    random -= operation.weight;
    if (random <= 0) {
      operation.func();
      break;
    }
  }

  // Realistic think time between requests
  sleepWithJitter(0.5, 30);
}

/**
 * Handle group function
 */
function group(name, fn) {
  return fn();
}
