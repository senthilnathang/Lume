#!/usr/bin/env node
/**
 * Module packager (F5.1).
 *
 *   node src/scripts/pack-module.js <technicalName> [--out dir]
 *     → writes <technicalName>-<version>.lume-pack (tar.gz) containing
 *       manifest.json (name, version, depends, files, sha256) + module files
 *
 *   node src/scripts/pack-module.js --install <pack> [--dir modulesDir]
 *     → verifies integrity, checks `depends` against installed modules,
 *       and extracts into the modules directory (refuses to overwrite).
 */

import { createReadStream, readdirSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = path.resolve(__dirname, '..', 'modules');

const PACK_DIRS = ['api', 'models', 'services', 'static', 'data'];

export function collectModuleFiles(modulesDir, technicalName) {
  const root = path.join(modulesDir, technicalName);
  const files = ['__manifest__.js'];
  for (const dir of PACK_DIRS) {
    const full = path.join(root, dir);
    if (!existsSync(full)) {
      continue;
    }
    const walk = (dirPath) => {
      for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
        const rel = path.relative(root, path.join(dirPath, entry.name));
        if (entry.isDirectory()) {
          walk(path.join(dirPath, entry.name));
        } else if (!entry.name.endsWith('.map')) {
          files.push(rel);
        }
      }
    };
    walk(full);
  }
  return { root, files };
}

export async function readManifest(modulesDir, technicalName) {
  const manifest = (await import(pathToFileURL(path.join(modulesDir, technicalName, '__manifest__.js')).href)).default || {};
  return manifest;
}

export async function installedModules(modulesDir) {
  const names = new Set();
  for (const entry of readdirSync(modulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    try {
      const manifest = await readManifest(modulesDir, entry.name);
      names.add(manifest.technicalName || entry.name);
    } catch {
      /* unreadable module — skip */
    }
  }
  return names;
}

export async function packModule(modulesDir, technicalName, outDir) {
  const manifest = await readManifest(modulesDir, technicalName);
  const version = manifest.version || '0.0.0';
  const { root, files } = collectModuleFiles(modulesDir, technicalName);
  for (const file of files) {
    if (!existsSync(path.join(root, file))) {
      throw new Error(`Module file missing: ${file}`);
    }
  }
  mkdirSync(outDir, { recursive: true });
  const packName = `${technicalName}-${version}.lume-pack`;
  const packPath = path.join(outDir, packName);
  const fileArgs = files.map((f) => ['-C', root, f]).flat();
  await execFileAsync('tar', ['-czf', packPath, ...fileArgs]);
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    createReadStream(packPath)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', resolve)
      .on('error', reject);
  });
  const descriptor = {
    format: 'lume-pack/1',
    name: manifest.name || technicalName,
    technicalName,
    version,
    depends: manifest.depends || [],
    files,
    sha256: hash.digest('hex'),
  };
  return { packPath, descriptor };
}

export async function installPack(packPath, modulesDir, { descriptor: provided } = {}) {
  const descriptor = provided || null;
  const target = path.join(modulesDir, descriptor?.technicalName || 'unknown');
  if (existsSync(target)) {
    throw new Error(`Refusing to overwrite existing directory: ${target}`);
  }
  const installed = await installedModules(modulesDir);
  const missing = (descriptor?.depends || []).filter((d) => d !== 'base' && !installed.has(d));
  if (missing.length) {
    throw new Error(`Missing dependencies: ${missing.join(', ')}`);
  }
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    createReadStream(packPath)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', resolve)
      .on('error', reject);
  });
  if (descriptor && hash.digest('hex') !== descriptor.sha256) {
    throw new Error('Pack integrity check failed (sha256 mismatch)');
  }
  mkdirSync(target, { recursive: true });
  try {
    await execFileAsync('tar', ['-xzf', packPath, '-C', target]);
  } catch (error) {
    rmSync(target, { recursive: true, force: true });
    throw error;
  }
  return target;
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--install') {
    const packPath = args[1];
    if (!packPath || !existsSync(packPath)) {
      console.error('Usage: pack-module.js --install <pack> [--dir modulesDir]');
      process.exit(1);
    }
    const dirIndex = args.indexOf('--dir');
    const modulesDir = dirIndex >= 0 ? path.resolve(args[dirIndex + 1]) : MODULES_DIR;
    const sidecar = `${path.resolve(packPath)}.json`;
    const descriptor = existsSync(sidecar) ? JSON.parse(readFileSync(sidecar, 'utf8')) : null;
    const target = await installPack(path.resolve(packPath), modulesDir, { descriptor });
    console.log(`Installed to ${target}${descriptor ? '' : ' (no descriptor: integrity + dependency checks skipped)'}`);
    return;
  }
  const [technicalName] = args.filter((a) => !a.startsWith('-'));
  if (!technicalName) {
    console.error('Usage: pack-module.js <technicalName> [--out dir]');
    process.exit(1);
  }
  const outIndex = args.indexOf('--out');
  const outDir = outIndex >= 0 ? path.resolve(args[outIndex + 1]) : path.resolve('packs');
  const { packPath, descriptor } = await packModule(MODULES_DIR, technicalName, outDir);
  writeFileSync(`${packPath}.json`, JSON.stringify(descriptor, null, 2));
  console.log(`Packed ${packPath} (+ .json descriptor)`);
  console.log(JSON.stringify({ ...descriptor, files: descriptor.files.length }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
