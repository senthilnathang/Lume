#!/usr/bin/env node

/**
 * Lume Framework Performance Benchmark
 * Measures and tracks performance metrics over time
 *
 * Usage: node benchmark.js [options]
 *   --url <url>        API base URL (default: http://localhost:3000)
 *   --token <token>    Bearer token for authentication
 *   --output <file>    Save results to JSON file
 *   --threshold <ms>   Alert if P95 exceeds threshold
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Benchmark {
  constructor(options = {}) {
    this.baseUrl = options.url || 'http://localhost:3000';
    this.token = options.token;
    this.threshold = options.threshold || 1000;
    this.results = {};
    this.requests = [];
  }

  /**
   * Make HTTP request and measure response time
   */
  async request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (this.token) {
        options.headers['Authorization'] = `Bearer ${this.token}`;
      }

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const duration = Date.now() - startTime;
          this.requests.push({
            method,
            path,
            status: res.statusCode,
            duration,
            timestamp: new Date().toISOString(),
          });

          resolve({
            status: res.statusCode,
            duration,
            headers: res.headers,
            body: data,
          });
        });
      });

      req.on('error', (error) => {
        const duration = Date.now() - startTime;
        this.requests.push({
          method,
          path,
          status: 0,
          duration,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        reject(error);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Calculate performance metrics
   */
  calculateMetrics(durations) {
    const sorted = [...durations].sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: durations.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(sum / durations.length),
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Health check endpoint
   */
  async benchmarkHealth() {
    console.log('Testing health endpoint...');
    const durations = [];

    for (let i = 0; i < 100; i++) {
      const result = await this.request('GET', '/health');
      if (result.status === 200) {
        durations.push(result.duration);
      }
    }

    this.results.health = this.calculateMetrics(durations);
  }

  /**
   * Entity list endpoint
   */
  async benchmarkEntityList() {
    if (!this.token) {
      console.log('Skipping entity list (no token)');
      return;
    }

    console.log('Testing entity list endpoint...');
    const durations = [];

    for (let i = 0; i < 50; i++) {
      const result = await this.request('GET', '/api/entities/Lead/records?limit=25');
      if (result.status === 200) {
        durations.push(result.duration);
      }
    }

    this.results['entity-list'] = this.calculateMetrics(durations);
  }

  /**
   * Entity create endpoint
   */
  async benchmarkEntityCreate() {
    if (!this.token) {
      console.log('Skipping entity create (no token)');
      return;
    }

    console.log('Testing entity create endpoint...');
    const durations = [];

    for (let i = 0; i < 10; i++) {
      const result = await this.request('POST', '/api/entities/Lead/records', {
        firstName: `Test${i}`,
        lastName: `User${i}`,
        email: `test${i}@example.com`,
        company: `Company${i}`,
      });
      if (result.status === 201) {
        durations.push(result.duration);
      }
    }

    this.results['entity-create'] = this.calculateMetrics(durations);
  }

  /**
   * Query endpoint
   */
  async benchmarkQuery() {
    if (!this.token) {
      console.log('Skipping query (no token)');
      return;
    }

    console.log('Testing query endpoint...');
    const durations = [];

    for (let i = 0; i < 30; i++) {
      const result = await this.request('POST', '/api/query', {
        entity: 'Lead',
        filters: [{ field: 'status', operator: '!=', value: 'closed' }],
        pagination: { page: 1, limit: 25 },
      });
      if (result.status === 200) {
        durations.push(result.duration);
      }
    }

    this.results.query = this.calculateMetrics(durations);
  }

  /**
   * Admin endpoints
   */
  async benchmarkAdmin() {
    if (!this.token) {
      console.log('Skipping admin (no token)');
      return;
    }

    console.log('Testing admin endpoints...');
    const durations = [];

    // Modules list
    for (let i = 0; i < 20; i++) {
      const result = await this.request('GET', '/api/admin/modules');
      if (result.status === 200) {
        durations.push(result.duration);
      }
    }

    // Workflows list
    for (let i = 0; i < 20; i++) {
      const result = await this.request('GET', '/api/admin/workflows');
      if (result.status === 200) {
        durations.push(result.duration);
      }
    }

    // Policies list
    for (let i = 0; i < 20; i++) {
      const result = await this.request('GET', '/api/admin/policies');
      if (result.status === 200) {
        durations.push(result.duration);
      }
    }

    this.results.admin = this.calculateMetrics(durations);
  }

  /**
   * Generate report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      results: this.results,
      summary: this.generateSummary(),
    };

    return report;
  }

  /**
   * Generate summary with warnings
   */
  generateSummary() {
    const summary = {
      passed: 0,
      warnings: [],
      failed: 0,
    };

    for (const [endpoint, metrics] of Object.entries(this.results)) {
      if (metrics.p95 > this.threshold) {
        summary.warnings.push(
          `${endpoint}: P95 = ${metrics.p95}ms (threshold: ${this.threshold}ms)`
        );
      } else {
        summary.passed++;
      }
    }

    summary.failed = summary.warnings.length;
    summary.total = Object.keys(this.results).length;

    return summary;
  }

  /**
   * Run all benchmarks
   */
  async run() {
    console.log(`\nLume Framework Performance Benchmark`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    try {
      // Verify connection
      await this.request('GET', '/health');
      console.log('✓ Server is reachable\n');
    } catch (error) {
      console.error(`✗ Cannot reach server: ${error.message}`);
      process.exit(1);
    }

    // Run benchmarks
    await this.benchmarkHealth();
    await this.benchmarkEntityList();
    await this.benchmarkEntityCreate();
    await this.benchmarkQuery();
    await this.benchmarkAdmin();

    const report = this.generateReport();
    this.printResults(report);

    return report;
  }

  /**
   * Print results to console
   */
  printResults(report) {
    console.log('\n' + '='.repeat(80));
    console.log('BENCHMARK RESULTS');
    console.log('='.repeat(80));

    for (const [endpoint, metrics] of Object.entries(report.results)) {
      console.log(`\n${endpoint.toUpperCase()}`);
      console.log('-'.repeat(40));
      console.log(`  Requests: ${metrics.count}`);
      console.log(`  Min:      ${metrics.min}ms`);
      console.log(`  Max:      ${metrics.max}ms`);
      console.log(`  Avg:      ${metrics.avg}ms`);
      console.log(`  P50:      ${metrics.p50}ms`);
      console.log(`  P95:      ${metrics.p95}ms ${metrics.p95 > this.threshold ? '⚠️' : '✓'}`);
      console.log(`  P99:      ${metrics.p99}ms`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Passed:   ${report.summary.passed}/${report.summary.total}`);
    console.log(`Warnings: ${report.summary.failed}/${report.summary.total}`);

    if (report.summary.warnings.length > 0) {
      console.log('\nWarnings:');
      for (const warning of report.summary.warnings) {
        console.log(`  ⚠️ ${warning}`);
      }
    }

    console.log('\n');
  }

  /**
   * Save results to file
   */
  saveResults(filepath, report) {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`Results saved to: ${filepath}`);
  }

  /**
   * Compare with previous results
   */
  compareResults(currentReport, previousReport) {
    console.log('\n' + '='.repeat(80));
    console.log('PERFORMANCE COMPARISON');
    console.log('='.repeat(80));

    for (const endpoint of Object.keys(currentReport.results)) {
      if (!previousReport.results[endpoint]) continue;

      const current = currentReport.results[endpoint];
      const previous = previousReport.results[endpoint];

      const change = current.p95 - previous.p95;
      const changePercent = ((change / previous.p95) * 100).toFixed(1);
      const direction = change > 0 ? '↑' : '↓';
      const indicator = change > 0 ? '⚠️' : '✓';

      console.log(`\n${endpoint.toUpperCase()}`);
      console.log(`  P95 Previous: ${previous.p95}ms`);
      console.log(`  P95 Current:  ${current.p95}ms`);
      console.log(`  Change:       ${direction} ${changePercent}% (${change > 0 ? '+' : ''}${change}ms) ${indicator}`);
    }

    console.log('\n');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];

    switch (key) {
      case 'url':
        options.url = value;
        break;
      case 'token':
        options.token = value;
        break;
      case 'output':
        options.output = value;
        break;
      case 'threshold':
        options.threshold = parseInt(value, 10);
        break;
      case 'compare':
        options.compare = value;
        break;
    }
  }

  return options;
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  const benchmark = new Benchmark(options);
  const report = await benchmark.run();

  if (options.output) {
    benchmark.saveResults(options.output, report);
  }

  // Compare with previous results if provided
  if (options.compare && fs.existsSync(options.compare)) {
    const previousReport = JSON.parse(fs.readFileSync(options.compare, 'utf8'));
    benchmark.compareResults(report, previousReport);
  }

  // Exit with error if warnings found
  if (report.summary.warnings.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Benchmark failed:', error.message);
  process.exit(1);
});
