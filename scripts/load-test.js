#!/usr/bin/env node

/**
 * Load Testing Script for Entity Builder
 *
 * Generates realistic load against the Entity Builder system.
 * Measures:
 * - Response times (latency)
 * - Throughput (requests/second)
 * - Error rates
 * - Resource utilization
 *
 * Usage:
 *   node scripts/load-test.js --target=http://localhost:3000 --duration=60 --rps=100
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { Command } from 'commander';
import chalk from 'chalk';

class LoadTester {
  constructor(options) {
    this.baseUrl = options.target || 'http://localhost:3000';
    this.duration = options.duration || 60; // seconds
    this.rps = options.rps || 100; // requests per second
    this.concurrency = options.concurrency || 10;
    this.warmupDuration = options.warmup || 10;

    this.stats = {
      totalRequests: 0,
      successRequests: 0,
      errorRequests: 0,
      timeouts: 0,
      responseTimes: [],
      startTime: null,
      endTime: null,
      errors: {}
    };

    this.isWarmup = true;
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LoadTester/1.0'
        },
        timeout: 10000
      };

      const startTime = Date.now();

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const duration = Date.now() - startTime;

          if (!this.isWarmup) {
            this.stats.totalRequests++;
            this.stats.responseTimes.push(duration);

            if (res.statusCode >= 200 && res.statusCode < 300) {
              this.stats.successRequests++;
            } else {
              this.stats.errorRequests++;
              this.stats.errors[res.statusCode] = (this.stats.errors[res.statusCode] || 0) + 1;
            }
          }

          resolve({
            status: res.statusCode,
            duration: duration,
            size: data.length
          });
        });
      });

      req.on('error', (error) => {
        if (!this.isWarmup) {
          this.stats.errorRequests++;
          this.stats.errors['Network'] = (this.stats.errors['Network'] || 0) + 1;
        }
        reject(error);
      });

      req.on('timeout', () => {
        if (!this.isWarmup) {
          this.stats.timeouts++;
        }
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  getScenarios() {
    return [
      {
        name: 'List Entities',
        method: 'GET',
        path: '/api/entities',
        weight: 30
      },
      {
        name: 'List Records',
        method: 'GET',
        path: '/api/entities/1/records?page=1&limit=20',
        weight: 40
      },
      {
        name: 'Get Single Record',
        method: 'GET',
        path: '/api/entities/1/records/1',
        weight: 15
      },
      {
        name: 'Filter Records',
        method: 'GET',
        path: '/api/entities/1/records?filters=[{"field":"status","operator":"equals","value":"active"}]',
        weight: 10
      },
      {
        name: 'Get Entity Views',
        method: 'GET',
        path: '/api/entities/1/views',
        weight: 5
      }
    ];
  }

  selectScenario() {
    const scenarios = this.getScenarios();
    const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const scenario of scenarios) {
      random -= scenario.weight;
      if (random <= 0) {
        return scenario;
      }
    }

    return scenarios[0];
  }

  async runLoad() {
    this.stats.startTime = Date.now();
    const endTime = this.stats.startTime + (this.duration + this.warmupDuration) * 1000;

    let requestCount = 0;
    const requestInterval = 1000 / this.rps;

    // Warmup phase
    this.log(chalk.yellow(`Warmup phase: ${this.warmupDuration}s`));
    const warmupEnd = this.stats.startTime + this.warmupDuration * 1000;

    while (Date.now() < warmupEnd) {
      const scenario = this.selectScenario();
      this.makeRequest(scenario.path, scenario.method).catch(() => {});
      await this.sleep(requestInterval);
    }

    this.isWarmup = false;
    this.log(chalk.green(`Load testing phase: ${this.duration}s at ${this.rps} RPS`));

    // Load phase
    while (Date.now() < endTime) {
      const scenario = this.selectScenario();

      // Fire requests with concurrency
      const promises = [];
      for (let i = 0; i < this.concurrency; i++) {
        promises.push(
          this.makeRequest(scenario.path, scenario.method).catch(() => {})
        );
      }

      await Promise.all(promises);
      requestCount += this.concurrency;

      // Progress output
      if (requestCount % 500 === 0) {
        const elapsed = (Date.now() - this.stats.startTime) / 1000;
        const actualRps = (this.stats.totalRequests / elapsed).toFixed(2);
        this.log(`Requests: ${this.stats.totalRequests}, RPS: ${actualRps}`);
      }

      await this.sleep(requestInterval * this.concurrency);
    }

    this.stats.endTime = Date.now();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  calculateStats() {
    const responseTimes = this.stats.responseTimes.sort((a, b) => a - b);
    const count = responseTimes.length;

    return {
      duration: (this.stats.endTime - this.stats.startTime) / 1000,
      totalRequests: this.stats.totalRequests,
      successRequests: this.stats.successRequests,
      errorRequests: this.stats.errorRequests,
      timeouts: this.stats.timeouts,
      successRate: ((this.stats.successRequests / this.stats.totalRequests) * 100).toFixed(2) + '%',
      errorRate: ((this.stats.errorRequests / this.stats.totalRequests) * 100).toFixed(2) + '%',
      throughput: (this.stats.totalRequests / ((this.stats.endTime - this.stats.startTime) / 1000)).toFixed(2) + ' RPS',
      minLatency: responseTimes[0] + ' ms',
      maxLatency: responseTimes[count - 1] + ' ms',
      avgLatency: (responseTimes.reduce((a, b) => a + b) / count).toFixed(2) + ' ms',
      p50Latency: responseTimes[Math.floor(count * 0.5)] + ' ms',
      p95Latency: responseTimes[Math.floor(count * 0.95)] + ' ms',
      p99Latency: responseTimes[Math.floor(count * 0.99)] + ' ms',
      errors: this.stats.errors
    };
  }

  displayResults() {
    const stats = this.calculateStats();

    console.log('\n' + chalk.bold.blue('════════════════════════════════════════'));
    console.log(chalk.bold.blue('           Load Test Results'));
    console.log(chalk.bold.blue('════════════════════════════════════════\n'));

    console.log(chalk.cyan('Test Configuration:'));
    console.log(`  Target URL:     ${this.baseUrl}`);
    console.log(`  Duration:       ${this.duration}s`);
    console.log(`  Target RPS:     ${this.rps}`);
    console.log(`  Concurrency:    ${this.concurrency}\n`);

    console.log(chalk.cyan('Request Summary:'));
    console.log(`  Total Requests: ${chalk.green(stats.totalRequests)}`);
    console.log(`  Successful:     ${chalk.green(stats.successRequests)} (${chalk.green(stats.successRate)})`);
    console.log(`  Failed:         ${chalk.red(stats.errorRequests)} (${chalk.red(stats.errorRate)})`);
    console.log(`  Timeouts:       ${chalk.yellow(stats.timeouts)}\n`);

    console.log(chalk.cyan('Performance Metrics:'));
    console.log(`  Throughput:     ${stats.throughput}`);
    console.log(`  Avg Latency:    ${stats.avgLatency}`);
    console.log(`  Min Latency:    ${stats.minLatency}`);
    console.log(`  Max Latency:    ${stats.maxLatency}\n`);

    console.log(chalk.cyan('Percentiles:'));
    console.log(`  P50 (median):   ${stats.p50Latency}`);
    console.log(`  P95:            ${chalk.yellow(stats.p95Latency)}`);
    console.log(`  P99:            ${chalk.red(stats.p99Latency)}\n`);

    if (Object.keys(stats.errors).length > 0) {
      console.log(chalk.cyan('Errors by Type:'));
      for (const [error, count] of Object.entries(stats.errors)) {
        console.log(`  ${error}: ${chalk.red(count)}`);
      }
      console.log('');
    }

    // Pass/Fail
    const p95 = parseInt(stats.p95Latency);
    if (p95 < 500 && parseFloat(stats.errorRate) < 1) {
      console.log(chalk.green.bold('✅ PASS - Performance within acceptable limits\n'));
    } else {
      console.log(chalk.red.bold('❌ FAIL - Performance issues detected\n'));
    }

    console.log(chalk.bold.blue('════════════════════════════════════════\n'));

    return stats;
  }

  async run() {
    this.log(chalk.green(`Starting load test against ${this.baseUrl}`));
    this.log(`Duration: ${this.duration}s, Target RPS: ${this.rps}`);

    try {
      await this.runLoad();
      this.displayResults();
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('Load test failed:'), error.message);
      process.exit(1);
    }
  }
}

// CLI
const program = new Command();

program
  .name('load-test')
  .description('Run load tests against Entity Builder API')
  .version('1.0.0');

program
  .command('run')
  .description('Run load test')
  .option('-t, --target <url>', 'Target URL (default: http://localhost:3000)', 'http://localhost:3000')
  .option('-d, --duration <seconds>', 'Test duration in seconds (default: 60)', '60')
  .option('-r, --rps <number>', 'Target requests per second (default: 100)', '100')
  .option('-c, --concurrency <number>', 'Concurrent requests (default: 10)', '10')
  .option('-w, --warmup <seconds>', 'Warmup duration in seconds (default: 10)', '10')
  .action((options) => {
    const tester = new LoadTester({
      target: options.target,
      duration: parseInt(options.duration),
      rps: parseInt(options.rps),
      concurrency: parseInt(options.concurrency),
      warmup: parseInt(options.warmup)
    });

    tester.run();
  });

program.parse(process.argv);
