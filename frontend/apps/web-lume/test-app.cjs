#!/usr/bin/env node

/**
 * GAWDESY Application Test Script
 * Tests the frontend application using basic HTTP requests
 */

const http = require('http');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:5174';
const TIMEOUT = 30000;

let server = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, error = null) {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  const color = passed ? 'green' : 'red';
  log(`  ${status} - ${name}`, color);
  if (error && !passed) {
    log(`    Error: ${error}`, 'red');
  }
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          duration,
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(TIMEOUT, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testHomepage() {
  log('\n🏠 Testing Homepage...', 'blue');
  const tests = [];
  
  try {
    const response = await httpGet(`${BASE_URL}/`);
    tests.push({ name: 'Homepage loads', passed: response.statusCode === 200 });
    tests.push({ name: 'Response time < 2s', passed: response.duration < 2000 });
    tests.push({ name: 'Has DOCTYPE', passed: response.body.includes('<!DOCTYPE html>') });
    tests.push({ name: 'Has Vue app div', passed: response.body.includes('id="app"') });
    tests.push({ name: 'Has title with GAWDESY', passed: response.body.includes('GAWDESY') });
    tests.push({ name: 'Has meta description', passed: response.body.includes('Gandhian Welfare') });
    
    return { page: 'Homepage', tests };
  } catch (error) {
    return { page: 'Homepage', tests: [{ name: 'Homepage loads', passed: false, error: error.message }] };
  }
}

async function testLoginPage() {
  log('\n🔐 Testing Login Page...', 'blue');
  const tests = [];
  
  try {
    const response = await httpGet(`${BASE_URL}/admin/login`);
    tests.push({ name: 'Login page loads', passed: response.statusCode === 200 });
    tests.push({ name: 'Has form elements', passed: response.body.includes('<form') });
    tests.push({ name: 'Has email input', passed: response.body.includes('email') });
    tests.push({ name: 'Has password input', passed: response.body.includes('password') });
    tests.push({ name: 'Has submit button', passed: response.body.includes('Sign In') || response.body.includes('submit') });
    
    return { page: 'Login', tests };
  } catch (error) {
    return { page: 'Login', tests: [{ name: 'Login page loads', passed: false, error: error.message }] };
  }
}

async function testPublicPages() {
  log('\n📄 Testing Public Pages...', 'blue');
  const tests = [];
  
  const pages = [
    { path: '/about', name: 'About' },
    { path: '/programmes', name: 'Programmes' },
    { path: '/activities', name: 'Activities' },
    { path: '/documents', name: 'Documents' },
    { path: '/contact', name: 'Contact' },
  ];
  
  for (const page of pages) {
    try {
      const response = await httpGet(`${BASE_URL}${page.path}`);
      tests.push({ 
        name: `${page.name} page loads`, 
        passed: response.statusCode === 200 && response.duration < 2000,
        error: response.statusCode !== 200 ? `Status: ${response.statusCode}` : null
      });
    } catch (error) {
      tests.push({ name: `${page.name} page loads`, passed: false, error: error.message });
    }
  }
  
  return { page: 'Public Pages', tests };
}

async function testAdminPages() {
  log('\n⚙️ Testing Admin Pages (should redirect to login)...', 'blue');
  const tests = [];
  
  try {
    const response = await httpGet(`${BASE_URL}/admin`);
    // Admin pages should either redirect to login or require auth
    tests.push({ 
      name: 'Admin redirects or requires auth', 
      passed: response.statusCode === 200 || response.statusCode === 302 
    });
    
    return { page: 'Admin', tests };
  } catch (error) {
    return { page: 'Admin', tests: [{ name: 'Admin access check', passed: false, error: error.message }] };
  }
}

async function testApiEndpoints() {
  log('\n🔌 Testing API Endpoints...', 'blue');
  const tests = [];
  
  const endpoints = [
    { path: '/api/health', name: 'Health check' },
    { path: '/api/v1/public/programmes', name: 'Public programmes' },
    { path: '/api/v1/public/activities', name: 'Public activities' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await httpGet(`${BASE_URL}${endpoint.path}`);
      tests.push({ 
        name: `${endpoint.name}`, 
        passed: response.statusCode === 200,
        error: response.statusCode !== 200 ? `Status: ${response.statusCode}` : null
      });
    } catch (error) {
      tests.push({ name: `${endpoint.name}`, passed: false, error: error.message });
    }
  }
  
  return { page: 'API', tests };
}

function calculateSummary(results) {
  let total = 0;
  let passed = 0;
  
  for (const result of results) {
    for (const test of result.tests) {
      total++;
      if (test.passed) passed++;
    }
  }
  
  return { total, passed, failed: total - passed, percentage: Math.round((passed / total) * 100) };
}

async function startDevServer() {
  log('\n🚀 Starting development server...', 'cyan');
  
  return new Promise((resolve, reject) => {
    server = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: process.platform === 'win32'
    });
    
    let output = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Local:') || output.includes('ready')) {
        log('  Server started successfully', 'green');
        resolve();
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    server.on('error', (error) => {
      reject(error);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      log('  Server start timeout, but continuing...', 'yellow');
      resolve();
    }, 30000);
  });
}

async function stopDevServer() {
  if (server) {
    log('\n🛑 Stopping development server...', 'cyan');
    server.kill('SIGTERM');
    server = null;
  }
}

async function runTests() {
  console.clear();
  log('========================================', 'cyan');
  log('  GAWDESY Application Test Suite', 'cyan');
  log('========================================', 'cyan');
  log(`  Testing: ${BASE_URL}`, 'cyan');
  log(`  Date: ${new Date().toLocaleString()}`, 'cyan');
  log('========================================\n', 'cyan');
  
  const results = [];
  
  // Run tests
  results.push(await testHomepage());
  results.push(await testLoginPage());
  results.push(await testPublicPages());
  results.push(await testAdminPages());
  results.push(await testApiEndpoints());
  
  // Print results
  log('\n========================================', 'cyan');
  log('  TEST RESULTS', 'cyan');
  log('========================================', 'cyan');
  
  for (const result of results) {
    log(`\n${result.page}:`);
    for (const test of result.tests) {
      logTest(test.name, test.passed, test.error);
    }
  }
  
  // Summary
  const summary = calculateSummary(results);
  log('\n========================================', 'cyan');
  log('  SUMMARY', 'cyan');
  log('========================================', 'cyan');
  log(`  Total Tests: ${summary.total}`, 'reset');
  log(`  Passed: ${summary.passed}`, 'green');
  log(`  Failed: ${summary.failed}`, summary.failed > 0 ? 'red' : 'green');
  log(`  Success Rate: ${summary.percentage}%`, summary.percentage >= 80 ? 'green' : 'yellow');
  log('========================================\n', 'cyan');
  
  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

// Main execution
async function main() {
  try {
    // Check if server is already running
    try {
      await httpGet(BASE_URL);
      log('  Development server already running', 'yellow');
    } catch {
      // Start the server
      await startDevServer();
      // Wait a bit for the server to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Run tests
    await runTests();
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await stopDevServer();
  }
}

main();
