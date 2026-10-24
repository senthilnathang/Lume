#!/usr/bin/env node

/**
 * Runtime Security Test Suite
 * Tests actual security behavior of running server
 *
 * Usage: npm run dev (in another terminal)
 *        node scripts/test-security.js
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️';

let testsPassed = 0;
let testsFailed = 0;
let testsWarned = 0;

const client = axios.create({
  baseURL: API_URL,
  validateStatus: () => true, // Don't throw on any status code
});

async function test(name, fn) {
  try {
    const result = await fn();
    if (result.pass) {
      console.log(`${PASS} ${name}`);
      testsPassed++;
    } else {
      console.log(`${FAIL} ${name}`);
      if (result.message) console.log(`     ${result.message}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`${FAIL} ${name} (ERROR)`);
    console.log(`     ${error.message}`);
    testsFailed++;
  }
}

async function warn(name, message = '') {
  console.log(`${WARN} ${name}`);
  if (message) console.log(`     ${message}`);
  testsWarned++;
}

console.log(`\n🔐 LUME RUNTIME SECURITY TESTS\n`);
console.log(`API URL: ${API_URL}\n`);

// ───────────────────────────────────────────────────────────────────────────
// Test 1: Security Headers
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n📋 SECURITY HEADERS\n`);

await test('HSTS header present', async () => {
  const response = await client.get('/health');
  const hsts = response.headers['strict-transport-security'];
  return {
    pass: hsts !== undefined,
    message: hsts ? `HSTS: ${hsts}` : 'HSTS header missing'
  };
});

await test('X-Content-Type-Options header', async () => {
  const response = await client.get('/health');
  const header = response.headers['x-content-type-options'];
  return {
    pass: header === 'nosniff' || header !== undefined,
    message: header ? `Set to: ${header}` : 'Not set (should be nosniff)'
  };
});

await test('X-Frame-Options header', async () => {
  const response = await client.get('/health');
  const header = response.headers['x-frame-options'];
  return {
    pass: header !== undefined,
    message: header ? `Set to: ${header}` : 'Not set'
  };
});

// ───────────────────────────────────────────────────────────────────────────
// Test 2: CORS
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n🌐 CORS VALIDATION\n`);

await test('CORS allows valid origin', async () => {
  const response = await client.get('/health', {
    headers: { Origin: 'http://localhost:5173' }
  });
  const allowedOrigin = response.headers['access-control-allow-origin'];
  return {
    pass: allowedOrigin !== undefined && allowedOrigin !== '',
    message: allowedOrigin ? `Allowed: ${allowedOrigin}` : 'No CORS header'
  };
});

await test('CORS respects preflight', async () => {
  const response = await client.options('/api/users', {
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  });
  return {
    pass: response.status === 200 || response.status === 204,
    message: `Status: ${response.status}`
  };
});

// ───────────────────────────────────────────────────────────────────────────
// Test 3: Rate Limiting
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n🚦 RATE LIMITING\n`);

await test('General rate limit headers present', async () => {
  const response = await client.get('/api/modules');
  const limitHeader = response.headers['ratelimit-limit'];
  return {
    pass: limitHeader !== undefined,
    message: limitHeader ? `Limit: ${limitHeader}` : 'Rate limit headers missing'
  };
});

await test('Rate limit blocks excessive requests', async () => {
  // Send 101 requests (global limit is 100 per 15 min)
  const results = [];
  for (let i = 0; i < 101; i++) {
    const response = await client.get('/api/modules');
    results.push(response.status);
  }

  // Last request should be 429 (Too Many Requests)
  const lastStatus = results[results.length - 1];
  return {
    pass: lastStatus === 429,
    message: `Statuses: ${results.slice(-5).join(', ')} ... (last should be 429)`
  };
});

// ───────────────────────────────────────────────────────────────────────────
// Test 4: Authentication
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n🔐 AUTHENTICATION\n`);

await test('Unauthenticated requests rejected', async () => {
  const response = await client.get('/api/users');
  return {
    pass: response.status === 401 || response.status === 403,
    message: `Status: ${response.status} (expected 401/403)`
  };
});

await test('Invalid token rejected', async () => {
  const response = await client.get('/api/users', {
    headers: { Authorization: 'Bearer invalid.token.here' }
  });
  return {
    pass: response.status === 401,
    message: `Status: ${response.status}`
  };
});

await test('Missing Bearer prefix rejected', async () => {
  const response = await client.get('/api/users', {
    headers: { Authorization: 'SomeRandomToken' }
  });
  return {
    pass: response.status === 401,
    message: `Status: ${response.status}`
  };
});

// ───────────────────────────────────────────────────────────────────────────
// Test 5: Input Validation
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n✅ INPUT VALIDATION\n`);

await test('Oversized payload rejected', async () => {
  const hugePayload = 'x'.repeat(11 * 1024 * 1024); // 11MB
  const response = await client.post('/api/users/login', {
    email: 'test@test.com',
    password: hugePayload
  });
  return {
    pass: response.status === 413 || response.status === 400,
    message: `Status: ${response.status} (expected 413 or 400)`
  };
});

await test('Missing required fields rejected', async () => {
  // Try to login without email
  const response = await client.post('/api/users/login', {
    password: 'test'
  });
  return {
    pass: response.status === 400,
    message: `Status: ${response.status} (should reject incomplete input)`
  };
});

// ───────────────────────────────────────────────────────────────────────────
// Test 6: Public Endpoints
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n🔓 PUBLIC ENDPOINTS\n`);

await test('/health endpoint accessible', async () => {
  const response = await client.get('/health');
  return {
    pass: response.status === 200,
    message: `Status: ${response.status}`
  };
});

await test('/api/public/config endpoint accessible', async () => {
  const response = await client.get('/api/public/config');
  return {
    pass: response.status === 200,
    message: `Status: ${response.status}`
  };
});

// ───────────────────────────────────────────────────────────────────────────
// Summary
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}\n`);
console.log(`✅ PASSED:  ${testsPassed}`);
console.log(`❌ FAILED:  ${testsFailed}`);
console.log(`⚠️  WARNED: ${testsWarned}`);
console.log(`\n${'─'.repeat(60)}\n`);

if (testsFailed === 0) {
  console.log('🎉 All security tests passed!\n');
  process.exit(0);
} else {
  console.log(`❌ ${testsFailed} test(s) failed!\n`);
  process.exit(1);
}
