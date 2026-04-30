/**
 * Version Configuration
 * Reads package version for telemetry and metrics
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let packageVersion = '2.0.0';

try {
  const packageJsonPath = join(__dirname, '../../package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  packageVersion = packageJson.version || '2.0.0';
} catch (error) {
  console.warn('⚠️ Could not read package version:', error.message);
}

export { packageVersion };
