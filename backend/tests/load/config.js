/**
 * Shared Load Testing Configuration
 * Defines base URL, authentication, helper functions, and metrics thresholds
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const API_URL = `${BASE_URL}/api`;

// Auth token - obtained via login flow
let authToken = null;

/**
 * Login and obtain auth token for subsequent requests
 * @returns {string} JWT auth token
 */
export function getAuthToken() {
  if (authToken) return authToken;

  const loginPayload = JSON.stringify({
    email: 'admin@lume.dev',
    password: 'admin123'
  });

  const loginResponse = http.post(`${API_URL}/users/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' }
  });

  check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login returns token': (r) => r.json().token !== undefined
  });

  if (loginResponse.status === 200 && loginResponse.json().token) {
    authToken = loginResponse.json().token;
  }

  return authToken;
}

/**
 * Get common request headers with authentication
 * @returns {object} Headers object with Bearer token
 */
export function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'k6-load-test'
  };
}

/**
 * Generate random string for unique data
 * @param {number} length - String length
 * @returns {string} Random alphanumeric string
 */
export function randomString(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random integer
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
export function randomInt(min = 0, max = 1000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random email
 * @returns {string} Random email address
 */
export function randomEmail() {
  return `user-${randomString(8)}@loadtest.local`;
}

/**
 * Generate page payload for POST requests
 * @returns {object} Page data object
 */
export function generatePagePayload() {
  return {
    title: `Test Page ${randomString(10)}`,
    slug: `test-${randomString(8)}`,
    description: `Generated test page for load testing`,
    status: 'published',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: `Load test content generated at ${new Date().toISOString()}`
            }
          ]
        }
      ]
    }
  };
}

/**
 * Generate user payload for POST requests
 * @returns {object} User data object
 */
export function generateUserPayload() {
  return {
    email: randomEmail(),
    password: 'TestPass123!',
    firstName: `User${randomInt(1000, 9999)}`,
    lastName: 'LoadTest',
    phone: `555${randomInt(1000000, 9999999)}`
  };
}

/**
 * Standard health check response validator
 * @param {object} response - HTTP response object
 * @param {string} endpoint - Endpoint path for error reporting
 * @returns {boolean} True if response is healthy
 */
export function checkHealth(response, endpoint = '') {
  return check(response, {
    [`${endpoint} status is 200`]: (r) => r.status === 200,
    [`${endpoint} has data`]: (r) => r.body.length > 0,
    [`${endpoint} response time < 1000ms`]: (r) => r.timings.duration < 1000
  });
}

/**
 * Standard API response validator
 * @param {object} response - HTTP response object
 * @param {number} expectedStatus - Expected HTTP status code
 * @param {string} endpoint - Endpoint path for error reporting
 * @returns {boolean} True if response is valid
 */
export function checkResponse(response, expectedStatus = 200, endpoint = '') {
  const success = response.status === expectedStatus;
  check(response, {
    [`${endpoint} status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${endpoint} response time < 2000ms`]: (r) => r.timings.duration < 2000
  });
  return success;
}

/**
 * Standard error rate check
 * @param {number} statusCode - HTTP status code
 * @returns {boolean} True if status indicates success (2xx)
 */
export function isSuccessStatus(statusCode) {
  return statusCode >= 200 && statusCode < 300;
}

/**
 * Sleep with jitter to simulate real user behavior
 * @param {number} baseSeconds - Base sleep duration
 * @param {number} jitterPercent - Jitter percentage (0-100)
 */
export function sleepWithJitter(baseSeconds = 1, jitterPercent = 20) {
  const jitter = (baseSeconds * jitterPercent) / 100;
  const actualSleep = baseSeconds + (Math.random() - 0.5) * 2 * jitter;
  sleep(Math.max(0.1, actualSleep));
}

/**
 * Common metrics thresholds for validation
 */
export const METRICS_THRESHOLDS = {
  // Latency thresholds
  p95_threshold: 500,        // P95 latency < 500ms
  p99_threshold: 1000,       // P99 latency < 1000ms
  max_latency: 5000,         // Max latency < 5 seconds
  avg_latency: 200,          // Average latency < 200ms

  // Error rate thresholds
  error_rate: 0.01,          // Error rate < 1%
  connection_errors: 0.001,  // Connection errors < 0.1%

  // Throughput expectations
  min_rps: 800,              // Minimum 800 req/sec on steady-state
  expected_rps: 1000         // Expected 1000 req/sec on steady-state
};

/**
 * Get thresholds configuration for k6
 * @returns {object} Thresholds configuration
 */
export function getThresholds() {
  return {
    // Latency thresholds
    'http_req_duration': [
      `p(95) < ${METRICS_THRESHOLDS.p95_threshold}`,
      `p(99) < ${METRICS_THRESHOLDS.p99_threshold}`
    ],
    'http_req_duration{type:read}': [
      `p(95) < ${METRICS_THRESHOLDS.p95_threshold}`
    ],
    'http_req_duration{type:write}': [
      `p(95) < 1000`
    ],

    // Error rate thresholds
    'http_req_failed': [
      `rate < ${METRICS_THRESHOLDS.error_rate}`
    ],

    // Connection thresholds
    'http_requests': ['count > 1000']
  };
}

/**
 * Standard test setup function
 * Initializes auth and performs baseline checks
 */
export function setupTest() {
  console.log(`Starting load test against ${BASE_URL}`);

  // Verify connectivity
  const healthCheck = http.get(`${BASE_URL}/health`);
  check(healthCheck, {
    'Backend health check passed': (r) => r.status === 200
  });

  // Obtain auth token
  const token = getAuthToken();
  if (!token) {
    throw new Error('Failed to obtain authentication token');
  }

  console.log('Load test setup complete');
  return { token };
}

/**
 * Standard teardown function
 * Logs final metrics
 */
export function teardownTest(data) {
  console.log('Load test complete');
}
