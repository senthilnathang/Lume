/**
 * Steady-State Load Test
 * Maintains constant load of 1000 req/sec for 10 minutes
 * Measures latency (P50/P95/P99), throughput, and error rates
 */

import http from 'k6/http';
import { check } from 'k6';
import {
  API_URL,
  getAuthHeaders,
  randomString,
  generatePagePayload,
  checkResponse,
  sleepWithJitter,
  setupTest,
  teardownTest,
  METRICS_THRESHOLDS,
  getThresholds
} from './config.js';

export const options = {
  stages: [
    // Ramp up to 1000 VUs over 2 minutes
    { duration: '2m', target: 1000 },
    // Maintain 1000 VUs for 10 minutes
    { duration: '10m', target: 1000 },
    // Ramp down over 1 minute
    { duration: '1m', target: 0 }
  ],
  thresholds: {
    // Latency thresholds
    'http_req_duration': [
      `p(50) < 100`,
      `p(95) < ${METRICS_THRESHOLDS.p95_threshold}`,
      `p(99) < ${METRICS_THRESHOLDS.p99_threshold}`
    ],
    'http_req_duration{staticAsset:no}': [
      `p(99) < 1000`
    ],
    'http_req_duration{staticAsset:yes}': [
      `p(99) < 100`
    ],

    // Error rate thresholds
    'http_req_failed': [
      `rate < ${METRICS_THRESHOLDS.error_rate}`
    ],

    // Successful requests must be > 99%
    'http_requests{status:200}': [
      'count > 0'
    ],

    // Connection errors
    'http_conn_connecting': [
      `p(99) < 500`
    ]
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)']
};

export function setup() {
  return setupTest();
}

export function teardown(data) {
  teardownTest(data);
}

/**
 * Read operation: GET /api/users (list users with pagination)
 */
function readUsers() {
  const page = Math.floor(Math.random() * 5) + 1;
  const limit = 20;

  const response = http.get(
    `${API_URL}/users?page=${page}&limit=${limit}`,
    {
      headers: getAuthHeaders(),
      tags: { name: 'ReadUsers', type: 'read', staticAsset: 'no' }
    }
  );

  check(response, {
    'read users: status 200': (r) => r.status === 200,
    'read users: response time < 500ms': (r) => r.timings.duration < 500
  });

  return response.status === 200;
}

/**
 * Read operation: GET /api/website/pages (list pages)
 */
function readPages() {
  const page = Math.floor(Math.random() * 10) + 1;

  const response = http.get(
    `${API_URL}/website/pages?page=${page}&limit=20`,
    {
      headers: getAuthHeaders(),
      tags: { name: 'ReadPages', type: 'read', staticAsset: 'no' }
    }
  );

  check(response, {
    'read pages: status 200': (r) => r.status === 200,
    'read pages: response time < 500ms': (r) => r.timings.duration < 500
  });

  return response.status === 200;
}

/**
 * Read operation: GET /api/base/search (complex query)
 */
function searchData() {
  const queries = ['test', 'page', 'user', 'document', 'content'];
  const query = queries[Math.floor(Math.random() * queries.length)];

  const response = http.get(
    `${API_URL}/base/search?q=${query}&limit=50`,
    {
      headers: getAuthHeaders(),
      tags: { name: 'Search', type: 'read', staticAsset: 'no' }
    }
  );

  check(response, {
    'search: status 200': (r) => r.status === 200,
    'search: response time < 800ms': (r) => r.timings.duration < 800
  });

  return response.status === 200;
}

/**
 * Read operation: GET /health (baseline health check)
 */
function checkSystemHealth() {
  const response = http.get(
    `${API_URL}/../health`,
    {
      tags: { name: 'Health', type: 'read', staticAsset: 'no' }
    }
  );

  check(response, {
    'health: status 200': (r) => r.status === 200,
    'health: response time < 100ms': (r) => r.timings.duration < 100
  });

  return response.status === 200;
}

/**
 * Write operation: POST /api/website/pages (create page)
 */
function createPage() {
  const payload = JSON.stringify(generatePagePayload());

  const response = http.post(
    `${API_URL}/website/pages`,
    payload,
    {
      headers: getAuthHeaders(),
      tags: { name: 'CreatePage', type: 'write', staticAsset: 'no' }
    }
  );

  check(response, {
    'create page: status 201': (r) => r.status === 201,
    'create page: response time < 1000ms': (r) => r.timings.duration < 1000
  });

  return response.status === 201;
}

/**
 * Compound operation: Read a user, then read their details
 */
function readUserWorkflow() {
  // Get user list
  const listResponse = http.get(
    `${API_URL}/users?limit=1`,
    {
      headers: getAuthHeaders(),
      tags: { name: 'UserWorkflow', type: 'read', staticAsset: 'no' }
    }
  );

  if (listResponse.status === 200) {
    const users = listResponse.json();
    if (users.data && users.data.length > 0) {
      const userId = users.data[0].id;

      // Get user details
      const detailResponse = http.get(
        `${API_URL}/users/${userId}`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'UserWorkflow', type: 'read', staticAsset: 'no' }
        }
      );

      check(detailResponse, {
        'user details: status 200': (r) => r.status === 200
      });
    }
  }
}

/**
 * Main test function - distributes load across different operations
 * Operations are weighted to simulate realistic traffic patterns
 */
export default function (data) {
  const operations = [
    { func: readUsers, weight: 25 },          // 25%
    { func: readPages, weight: 25 },          // 25%
    { func: searchData, weight: 15 },         // 15%
    { func: checkSystemHealth, weight: 10 },  // 10%
    { func: createPage, weight: 15 },         // 15%
    { func: readUserWorkflow, weight: 10 }    // 10%
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

  // Simulate user think time between operations
  sleepWithJitter(0.1, 50);
}
