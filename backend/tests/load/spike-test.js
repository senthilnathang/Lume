/**
 * Spike Load Test
 * Tests system's ability to handle sudden traffic spikes
 * Pattern: Normal load (100 req/sec) → Spike (500 req/sec) → Back to normal
 * Measures recovery time and error handling under spike conditions
 */

import http from 'k6/http';
import { check } from 'k6';
import {
  API_URL,
  getAuthHeaders,
  generatePagePayload,
  sleepWithJitter,
  setupTest,
  teardownTest,
  METRICS_THRESHOLDS
} from './config.js';

export const options = {
  stages: [
    // Ramp up to normal load (100 VUs) over 1 minute
    { duration: '1m', target: 100 },
    // Maintain normal load for 5 minutes
    { duration: '5m', target: 100 },
    // Sudden spike to 500 VUs (5x increase) over 10 seconds
    { duration: '10s', target: 500 },
    // Maintain spike for 2 minutes
    { duration: '2m', target: 500 },
    // Drop back to normal load (100 VUs) over 10 seconds
    { duration: '10s', target: 100 },
    // Maintain normal load for 2 minutes to test recovery
    { duration: '2m', target: 100 },
    // Ramp down over 30 seconds
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    // During spike, allow higher latencies but still expect < 2 seconds P95
    'http_req_duration': [
      `p(50) < 200`,
      `p(95) < 2000`,
      `p(99) < 5000`
    ],

    // Error rate during spike: allow up to 5%, normally < 1%
    'http_req_failed': [
      `rate < 0.05`
    ],

    // Connection errors threshold
    'http_conn_connecting': [
      `p(99) < 2000`
    ]
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],

  // Extended timeout for spike scenarios
  timeout: '30s'
};

export function setup() {
  return setupTest();
}

export function teardown(data) {
  teardownTest(data);
}

/**
 * Fast read operation: GET /api/health
 * Tests baseline system responsiveness
 */
function healthCheck() {
  const response = http.get(
    `${API_URL}/../health`,
    {
      tags: { name: 'Health', endpoint: 'health', operation: 'read' },
      timeout: '5s'
    }
  );

  check(response, {
    'health: status 200 or recoverable': (r) => r.status === 200 || r.status === 503,
    'health: response time reasonable': (r) => r.timings.duration < 5000
  });

  return response.status === 200;
}

/**
 * Read operation: GET /api/users
 * Simple read that stresses database during spike
 */
function readUsers() {
  const page = Math.floor(Math.random() * 5) + 1;

  const response = http.get(
    `${API_URL}/users?page=${page}&limit=20`,
    {
      headers: getAuthHeaders(),
      tags: { name: 'ReadUsers', endpoint: 'users', operation: 'read' },
      timeout: '10s'
    }
  );

  check(response, {
    'read users: success or under load': (r) => r.status === 200 || r.status === 503,
    'read users: not server error': (r) => r.status !== 500
  });

  return response.status === 200;
}

/**
 * Read operation: GET /api/website/pages
 * Moderately complex read operation
 */
function readPages() {
  const page = Math.floor(Math.random() * 10) + 1;

  const response = http.get(
    `${API_URL}/website/pages?page=${page}&limit=20`,
    {
      headers: getAuthHeaders(),
      tags: { name: 'ReadPages', endpoint: 'pages', operation: 'read' },
      timeout: '10s'
    }
  );

  check(response, {
    'read pages: success or under load': (r) => r.status === 200 || r.status === 503,
    'read pages: not unauthorized': (r) => r.status !== 401
  });

  return response.status === 200;
}

/**
 * Write operation: POST /api/website/pages
 * Stresses database write capacity during spike
 */
function createPage() {
  const payload = JSON.stringify(generatePagePayload());

  const response = http.post(
    `${API_URL}/website/pages`,
    payload,
    {
      headers: getAuthHeaders(),
      tags: { name: 'CreatePage', endpoint: 'pages', operation: 'write' },
      timeout: '15s'
    }
  );

  check(response, {
    'create page: success or rate limited': (r) => r.status === 201 || r.status === 429,
    'create page: not server error': (r) => r.status !== 500
  });

  return response.status === 201;
}

/**
 * Search operation: GET /api/base/search
 * Complex query that stresses database during spike
 */
function searchData() {
  const queries = ['test', 'page', 'user', 'search', 'content', 'data'];
  const query = queries[Math.floor(Math.random() * queries.length)];

  const response = http.get(
    `${API_URL}/base/search?q=${query}&limit=50`,
    {
      headers: getAuthHeaders(),
      tags: { name: 'Search', endpoint: 'search', operation: 'read' },
      timeout: '15s'
    }
  );

  check(response, {
    'search: success or under load': (r) => r.status === 200 || r.status === 503,
    'search: reasonable response': (r) => r.timings.duration < 10000
  });

  return response.status === 200;
}

/**
 * Main test function
 * Simulates realistic traffic pattern with mix of read and write operations
 * Adjusts behavior based on current load stage
 */
export default function (data) {
  // Define operation mix for spike scenarios
  const operations = [
    { func: healthCheck, weight: 15 },   // 15% - lightweight baseline
    { func: readUsers, weight: 25 },     // 25% - simple read
    { func: readPages, weight: 25 },     // 25% - moderate read
    { func: searchData, weight: 20 },    // 20% - complex query
    { func: createPage, weight: 15 }     // 15% - database write
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

  // Minimal think time during spike to maintain pressure
  sleepWithJitter(0.05, 30);
}
