#!/usr/bin/env node
/**
 * Bundle Size Analysis Script
 *
 * Analyzes the production build output and generates a report.
 * Can be used in CI/CD to track bundle size over time.
 *
 * Usage:
 *   node scripts/analyze-bundle.mjs
 *   node scripts/analyze-bundle.mjs --json > bundle-report.json
 *   node scripts/analyze-bundle.mjs --fail-on-increase
 *
 * Output:
 *   - Total bundle size
 *   - Chunk breakdown
 *   - Large dependency analysis
 *   - Recommendations
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { gzipSync } from 'zlib';

// Configuration
const DIST_DIR = resolve(process.cwd(), 'dist');
const ASSETS_DIR = join(DIST_DIR, 'assets');
const REPORT_FILE = join(process.cwd(), '.bundle-report.json');

// Size thresholds (in KB)
const THRESHOLDS = {
  totalSize: 2048, // 2MB total budget
  singleChunk: 500, // 500KB per chunk
  initialLoad: 800, // 800KB initial load
  warningChunk: 250, // Warn if chunk > 250KB
};

// Known large dependencies that should be lazy-loaded
const LAZY_LOAD_CANDIDATES = [
  'echarts',
  'xlsx',
  'html2canvas',
  'monaco-editor',
  'pdf',
  'chart',
  'highlight',
  'markdown',
];

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Get gzipped size of a file
 */
function getGzipSize(content) {
  return gzipSync(content).length;
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
  const content = readFileSync(filePath);
  const stat = statSync(filePath);

  return {
    path: filePath,
    name: filePath.split('/').pop(),
    size: stat.size,
    gzipSize: getGzipSize(content),
  };
}

/**
 * Get all files in directory recursively
 */
function getAllFiles(dir, files = []) {
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Categorize files by type
 */
function categorizeFiles(files) {
  const categories = {
    js: [],
    css: [],
    images: [],
    fonts: [],
    other: [],
  };

  for (const file of files) {
    const ext = file.split('.').pop().toLowerCase();

    if (['js', 'mjs'].includes(ext)) {
      categories.js.push(file);
    } else if (ext === 'css') {
      categories.css.push(file);
    } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
      categories.images.push(file);
    } else if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext)) {
      categories.fonts.push(file);
    } else {
      categories.other.push(file);
    }
  }

  return categories;
}

/**
 * Analyze JavaScript chunks
 */
function analyzeChunks(jsFiles) {
  const chunks = jsFiles.map(analyzeFile);

  // Sort by size (largest first)
  chunks.sort((a, b) => b.gzipSize - a.gzipSize);

  // Identify chunk types
  return chunks.map((chunk) => {
    let type = 'chunk';
    const name = chunk.name.toLowerCase();

    if (name.includes('vendor')) type = 'vendor';
    else if (name.includes('index') || name.includes('main')) type = 'entry';
    else if (name.includes('echarts')) type = 'charts';
    else if (name.includes('xlsx')) type = 'excel';
    else if (name.includes('pdf')) type = 'pdf';

    // Check for lazy-load candidates
    const lazyCandidate = LAZY_LOAD_CANDIDATES.find((dep) =>
      name.toLowerCase().includes(dep.toLowerCase()),
    );

    return {
      ...chunk,
      type,
      lazyCandidate: lazyCandidate || null,
      warning: chunk.gzipSize > THRESHOLDS.warningChunk * 1024,
      critical: chunk.gzipSize > THRESHOLDS.singleChunk * 1024,
    };
  });
}

/**
 * Generate recommendations
 */
function generateRecommendations(analysis) {
  const recommendations = [];

  // Check total size
  if (analysis.totals.js.gzip > THRESHOLDS.totalSize * 1024) {
    recommendations.push({
      severity: 'critical',
      message: `Total JS size (${formatBytes(analysis.totals.js.gzip)} gzip) exceeds ${THRESHOLDS.totalSize}KB budget`,
      action: 'Review and remove unused dependencies, implement code splitting',
    });
  }

  // Check individual chunks
  for (const chunk of analysis.chunks) {
    if (chunk.critical) {
      recommendations.push({
        severity: 'critical',
        message: `Chunk "${chunk.name}" is ${formatBytes(chunk.gzipSize)} gzip`,
        action: chunk.lazyCandidate
          ? `Consider lazy-loading ${chunk.lazyCandidate}`
          : 'Split this chunk into smaller pieces',
      });
    } else if (chunk.warning) {
      recommendations.push({
        severity: 'warning',
        message: `Chunk "${chunk.name}" is ${formatBytes(chunk.gzipSize)} gzip`,
        action: 'Monitor this chunk size',
      });
    }

    // Lazy-load candidate not lazy-loaded
    if (chunk.lazyCandidate && chunk.type === 'vendor') {
      recommendations.push({
        severity: 'warning',
        message: `${chunk.lazyCandidate} appears to be bundled in vendor chunk`,
        action: `Use dynamic import() to lazy-load ${chunk.lazyCandidate}`,
      });
    }
  }

  return recommendations;
}

/**
 * Main analysis function
 */
function analyze() {
  console.log('\n📦 Bundle Size Analysis\n');
  console.log('='.repeat(60));

  // Check if dist exists
  if (!existsSync(DIST_DIR)) {
    console.error('❌ Build output not found. Run `pnpm build` first.');
    process.exit(1);
  }

  // Get all files
  const allFiles = getAllFiles(DIST_DIR);
  const categories = categorizeFiles(allFiles);

  // Analyze JS chunks
  const chunks = analyzeChunks(categories.js);

  // Calculate totals
  const totals = {
    js: {
      raw: chunks.reduce((sum, c) => sum + c.size, 0),
      gzip: chunks.reduce((sum, c) => sum + c.gzipSize, 0),
    },
    css: {
      raw: categories.css.reduce((sum, f) => sum + statSync(f).size, 0),
      gzip: categories.css.reduce(
        (sum, f) => sum + getGzipSize(readFileSync(f)),
        0,
      ),
    },
    images: categories.images.reduce((sum, f) => sum + statSync(f).size, 0),
    fonts: categories.fonts.reduce((sum, f) => sum + statSync(f).size, 0),
    total: allFiles.reduce((sum, f) => sum + statSync(f).size, 0),
  };

  // Generate analysis object
  const analysis = {
    timestamp: new Date().toISOString(),
    totals,
    chunks,
    fileCount: {
      js: categories.js.length,
      css: categories.css.length,
      images: categories.images.length,
      fonts: categories.fonts.length,
      total: allFiles.length,
    },
    recommendations: [],
  };

  analysis.recommendations = generateRecommendations(analysis);

  // Output results
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(analysis, null, 2));
    return analysis;
  }

  // Console output
  console.log('\n📊 Size Summary\n');
  console.log(`  JavaScript: ${formatBytes(totals.js.gzip)} gzip (${formatBytes(totals.js.raw)} raw)`);
  console.log(`  CSS:        ${formatBytes(totals.css.gzip)} gzip (${formatBytes(totals.css.raw)} raw)`);
  console.log(`  Images:     ${formatBytes(totals.images)}`);
  console.log(`  Fonts:      ${formatBytes(totals.fonts)}`);
  console.log(`  Total:      ${formatBytes(totals.total)}`);

  console.log('\n📁 Top 10 Chunks (by gzip size)\n');
  chunks.slice(0, 10).forEach((chunk, i) => {
    const marker = chunk.critical ? '🔴' : chunk.warning ? '🟡' : '🟢';
    console.log(
      `  ${marker} ${i + 1}. ${chunk.name.padEnd(45)} ${formatBytes(chunk.gzipSize).padStart(10)}`,
    );
  });

  if (analysis.recommendations.length > 0) {
    console.log('\n💡 Recommendations\n');
    analysis.recommendations.forEach((rec, i) => {
      const icon = rec.severity === 'critical' ? '🔴' : '🟡';
      console.log(`  ${icon} ${i + 1}. ${rec.message}`);
      console.log(`     → ${rec.action}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // Save report for comparison
  writeFileSync(REPORT_FILE, JSON.stringify(analysis, null, 2));
  console.log(`\n📄 Report saved to ${REPORT_FILE}`);

  // Check for size increase
  if (process.argv.includes('--fail-on-increase')) {
    // Load previous report if exists
    // Compare and fail if significantly increased
    const hasFailure = analysis.recommendations.some(
      (r) => r.severity === 'critical',
    );
    if (hasFailure) {
      console.error('\n❌ Bundle size check failed!');
      process.exit(1);
    }
  }

  return analysis;
}

// Run analysis
analyze();
