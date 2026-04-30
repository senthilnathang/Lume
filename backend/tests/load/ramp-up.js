/**
 * Ramp-Up Load Test
 * Gradually increases load to identify system capacity limits
 * Pattern: Start at 10 req/sec, increase by 50 req/sec every minute
 * Monitors for saturation point where error rates or latency degrade
 */

import http from 'k6/http';
import { check, group } from 'k6';
import {
  API_URL,
  getAuthHeaders,
  generatePagePayload,
  sleepWithJitter,
  setupTest,
  teardownTest
} from './config.js';

export const options = {
  stages: [
    // Stage 1: 10 VUs (50 req/sec) for 1 minute
    { duration: '1m', target: 10 },
    // Stage 2: 50 VUs (250 req/sec) for 1 minute
    { duration: '1m', target: 50 },
    // Stage 3: 100 VUs (500 req/sec) for 1 minute
    { duration: '1m', target: 100 },
    // Stage 4: 200 VUs (1000 req/sec) for 1 minute
    { duration: '1m', target: 200 },
    // Stage 5: 400 VUs (2000 req/sec) for 1 minute
    { duration: '1m', target: 400 },
    // Stage 6: 600 VUs (3000 req/sec) for 1 minute
    { duration: '1m', target: 600 },
    // Stage 7: 800 VUs (4000 req/sec) for 1 minute
    { duration: '1m', target: 800 },
    // Stage 8: 1000 VUs (5000 req/sec) for 1 minute
    { duration: '1m', target: 1000 },
    // Ramp down over 30 seconds
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    // Track latency increase during ramp-up
    'http_req_duration': [
      `p(50) < 500`,
      `p(95) < 3000`,
      `p(99) < 5000`
    ],

    // Track error rate increase
    'http_req_failed': [
      `rate < 0.10`  // Allow up to 10% error rate during ramp-up
    ],

    // Track connection issues
    'http_conn_connecting': [
      `p(99) < 3000`
    ],

    // Must maintain minimum throughput
    'http_requests': [
      'count > 500'
    ]
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(75)', 'p(90)', 'p(95)', 'p(99)'],
  timeout: '30s'
};

export function setup() {
  return setupTest();
}

export function teardown(data) {
  teardownTest(data);
}

/**
 * Lightweight health check
 * Used to detect when system becomes unresponsive
 */
function healthCheck() {
  return group('health_check', () => {
    const response = http.get(
      `${API_URL}/../health`,
      {
        tags: { name: 'Health', stage: 'baseline', type: 'read' },
        timeout: '5s'
      }
    );

    check(response, {
      'health: responsive': (r) => r.status === 200,
      'health: fast': (r) => r.timings.duration < 500
    });

    return response.status === 200;
  });
}

/**
 * Simple read operation
 * Baseline database query performance
 */
function readUsers() {
  return group('read_users', () => {
    const page = Math.floor(Math.random() * 5) + 1;

    const response = http.get(
      `${API_URL}/users?page=${page}&limit=20`,
      {
        headers: getAuthHeaders(),
        tags: { name: 'ReadUsers', stage: 'database', type: 'read' },
        timeout: '15s'
      }
    );

    check(response, {
      'read users: success': (r) => r.status === 200,
      'read users: response time acceptable': (r) => r.timings.duration < 3000,
      'read users: has data': (r) => r.body.length > 0
    });

    return response.status === 200;
  });
}

/**
 * Moderately complex read operation
 * Tests database query complexity
 */
function readPages() {
  return group('read_pages', () => {
    const page = Math.floor(Math.random() * 20) + 1;

    const response = http.get(
      `${API_URL}/website/pages?page=${page}&limit=50`,
      {
        headers: getAuthHeaders(),
        tags: { name: 'ReadPages', stage: 'database', type: 'read' },
        timeout: '15s'
      }
    );

    check(response, {
      'read pages: success': (r) => r.status === 200,
      'read pages: response time acceptable': (r) => r.timings.duration < 4000
    });

    return response.status === 200;
  });
}

/**
 * Complex search operation
 * Tests query optimization under load
 */
function searchData() {
  return group('search_data', () => {
    const queries = ['test', 'page', 'user', 'content', 'data', 'search', 'query'];
    const query = queries[Math.floor(Math.random() * queries.length)];

    const response = http.get(
      `${API_URL}/base/search?q=${query}&limit=100`,
      {
        headers: getAuthHeaders(),
        tags: { name: 'Search', stage: 'database', type: 'read' },
        timeout: '20s'
      }
    );

    check(response, {
      'search: success': (r) => r.status === 200,
      'search: response time acceptable': (r) => r.timings.duration < 5000,
      'search: reasonable for complex query': (r) => r.timings.duration < 10000
    });

    return response.status === 200;
  });
}

/**
 * Write operation - tests database write capacity
 * Important for identifying write bottlenecks
 */
function createPage() {
  return group('create_page', () => {
    const payload = JSON.stringify(generatePagePayload());

    const response = http.post(
      `${API_URL}/website/pages`,
      payload,
      {
        headers: getAuthHeaders(),
        tags: { name: 'CreatePage', stage: 'database', type: 'write' },
        timeout: '20s'
      }
    );

    check(response, {
      'create page: success': (r) => r.status === 201,
      'create page: response time reasonable': (r) => r.timings.duration < 5000,
      'create page: not rate limited': (r) => r.status !== 429
    });

    return response.status === 201;
  });
}

/**
 * Multi-step workflow
 * Tests system under complex operations
 */
function userWorkflow() {
  return group('user_workflow', () => {
    // Step 1: Get user list
    const listResponse = http.get(
      `${API_URL}/users?limit=5`,
      {
        headers: getAuthHeaders(),
        tags: { name: 'UserWorkflow', step: 'list', type: 'read' },
        timeout: '10s'
      }
    );

    if (listResponse.status === 200) {
      check(listResponse, {
        'workflow: list success': (r) => r.status === 200
      });

      // Step 2: Get first user's details if available
      try {
        const users = listResponse.json();
        if (users.data && users.data.length > 0) {
          const userId = users.data[0].id;

          const detailResponse = http.get(
            `${API_URL}/users/${userId}`,
            {
              headers: getAuthHeaders(),
              tags: { name: 'UserWorkflow', step: 'detail', type: 'read' },
              timeout: '10s'
            }
          );

          check(detailResponse, {
            'workflow: detail success': (r) => r.status === 200,
            'workflow: reasonable response': (r) => r.timings.duration < 3000
          });
        }
      } catch (e) {
        // Silent catch for JSON parse errors during high load
      }
    }
  });
}

/**
 * Main test function
 * Distributes operations during ramp-up
 * Mix emphasizes reads initially, shifts toward writes as load increases
 */
export default function (data) {
  const operations = [
    { func: healthCheck, weight: 10 },      // 10% - baseline
    { func: readUsers, weight: 30 },        // 30% - simple reads
    { func: readPages, weight: 25 },        // 25% - moderate reads
    { func: searchData, weight: 15 },       // 15% - complex reads
    { func: createPage, weight: 12 },       // 12% - writes
    { func: userWorkflow, weight: 8 }       // 8% - workflows
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

  // Brief think time to prevent thundering herd
  sleepWithJitter(0.05, 40);
}
