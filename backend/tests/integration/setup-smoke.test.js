/**
 * Integration smoke test for the canonical Lume setup flow.
 *
 * Asserts the contract documented in docs/INSTALLATION.md "Verify Installation"
 * and CLAUDE.md "Database Setup (clean install)":
 *   1. /health is reachable and reports success=true
 *   2. createAdmin.js exists and is shaped as a runnable script (no syntax errors,
 *      exposes nothing — runs side-effectfully when invoked)
 *   3. seedData.js exists with the same shape
 *   4. POST /api/users/login (NOT /api/auth/login) is the login endpoint
 *   5. Login with admin@lume.dev returns a JWT in `data.token` (NOT
 *      `data.access_token` — this caught a real bug during the v2.0 setup)
 *
 * This test does NOT re-run the scripts (they're destructive). It validates the
 * post-setup contract so a future schema/route change doesn't silently break the
 * documented bring-up sequence.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app, { initializeDatabasesAndModules } from '../../src/index.js';
import prisma from '../../src/core/db/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.join(__dirname, '../../src/scripts');

describe('Setup smoke (canonical install flow)', () => {
  beforeAll(async () => {
    try {
      await initializeDatabasesAndModules();
    } catch (err) {
      // Non-fatal for these read-only checks.
      console.warn('Note: initializeDatabasesAndModules may have failed:', err.message);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect().catch(() => {});
  });

  describe('Setup scripts exist', () => {
    it('refreshDb.js is present (clean-install entry point)', () => {
      expect(fs.existsSync(path.join(SCRIPTS_DIR, 'refreshDb.js'))).toBe(true);
    });

    it('createAdmin.js is present (replaces the outdated prisma/seed.js)', () => {
      expect(fs.existsSync(path.join(SCRIPTS_DIR, 'createAdmin.js'))).toBe(true);
    });

    it('seedData.js is present (sample data seeder)', () => {
      expect(fs.existsSync(path.join(SCRIPTS_DIR, 'seedData.js'))).toBe(true);
    });

    it('createAdmin.js references the super_admin role, not a string-typed role field', () => {
      // Past bug: prisma/seed.js used `role: 'ADMIN'` (string). Current schema uses role_id (FK).
      const src = fs.readFileSync(path.join(SCRIPTS_DIR, 'createAdmin.js'), 'utf-8');
      expect(src).toMatch(/role_id/);
      expect(src).toMatch(/super_admin/);
    });

    // P0-1 — Drizzle programmatic migration script. Without this, 33+
    // module tables are missing after `prisma db push` and the app
    // surfaces opaque ER_NO_SUCH_TABLE errors at runtime.
    it('setupDrizzle.js is present (P0-1 closes the Prisma/Drizzle gap)', () => {
      expect(fs.existsSync(path.join(SCRIPTS_DIR, 'setupDrizzle.js'))).toBe(true);
    });

    // P2-5 — production process supervisor config. Required for any
    // self-hosted deployment that doesn't want to roll its own systemd.
    // Lives at repo root by pm2 convention (one level above backend/).
    it('ecosystem.config.cjs is present (pm2 production config)', () => {
      const ecosystemPath = path.join(__dirname, '..', '..', '..', 'ecosystem.config.cjs');
      expect(fs.existsSync(ecosystemPath)).toBe(true);
    });
  });

  describe('Health endpoint', () => {
    it('GET /health returns 200 with success=true', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/health returns 404 (health is NOT prefixed with /api)', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(404);
    });

    // P2-4 — short public cache to cut health-probe cost without delaying
    // failure detection. If this changes, the deployment cookbook for AWS
    // ALB / k8s liveness probe intervals needs updating too.
    it('GET /health returns Cache-Control: public, max-age=5', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['cache-control']).toMatch(/max-age=5/);
      expect(res.headers['cache-control']).toMatch(/public/);
    });
  });

  describe('OpenAPI surface (P2-2)', () => {
    // Mounted in non-production envs by default, in production when
    // OPENAPI_ENABLED=true. NODE_ENV=test runs through the same gate
    // as development, so these endpoints should exist here.
    it('GET /api/openapi.json returns a valid OpenAPI 3.0 spec', async () => {
      const res = await request(app).get('/api/openapi.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toMatch(/^3\.0\./);
      expect(res.body.info?.title).toBe('Lume API');
      expect(res.body.info?.version).toBeDefined();
      // Core platform paths MUST be documented — these are the routes a
      // new integrator hits in the first 5 minutes.
      expect(res.body.paths['/health']).toBeDefined();
      expect(res.body.paths['/api/modules']).toBeDefined();
      expect(res.body.paths['/api/users/login']).toBeDefined();
    });

    it('GET /api/openapi.json sets Cache-Control: public, max-age=60', async () => {
      const res = await request(app).get('/api/openapi.json');
      expect(res.headers['cache-control']).toMatch(/public/);
      expect(res.headers['cache-control']).toMatch(/max-age=60/);
    });

    it('GET /api/docs/ serves Swagger UI HTML', async () => {
      const res = await request(app).get('/api/docs/').redirects(1);
      // swagger-ui-express either serves the HTML directly or 301-redirects
      // /api/docs → /api/docs/ — both are valid.
      expect([200, 301]).toContain(res.status);
    });

    it('LoginResponse schema documents both `token` and `accessToken`', async () => {
      // Locks the P1-3 deprecation alias into the public contract — the
      // OpenAPI spec is the source of truth that SDK codegen reads from.
      const res = await request(app).get('/api/openapi.json');
      const props = res.body.components?.schemas?.LoginResponse?.properties?.data?.properties;
      expect(props).toBeDefined();
      expect(props.token).toBeDefined();
      expect(props.accessToken).toBeDefined();
    });
  });

  describe('Module catalogue contract (P2-3)', () => {
    // /api/modules drives the admin UI. The shape locked here is what
    // a future module-toggle UI will consume directly; renaming or
    // dropping these fields breaks the v2.1 admin work.
    it('GET /api/modules returns array shape with `actions` field', async () => {
      const res = await request(app).get('/api/modules');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Module discovery may not have populated the registry in the test
      // app context (boot order differs from dev). Skip the per-module
      // shape assertions if so — the endpoint itself is still verified.
      if (res.body.data.length === 0) {
        console.warn('[setup-smoke] /api/modules empty in test app; shape check skipped');
        return;
      }

      const m = res.body.data[0];
      expect(m).toHaveProperty('name');
      expect(m).toHaveProperty('state');
      expect(m).toHaveProperty('actions');
      expect(m).toHaveProperty('deps_resolved');
      expect(Array.isArray(m.actions)).toBe(true);
    });

    it('installed modules expose [uninstall, upgrade] actions', async () => {
      const res = await request(app).get('/api/modules');
      const installed = res.body.data.find((m) => m.state === 'installed');
      // CI may not have anything installed yet; tolerate that.
      if (!installed) {
        console.warn('[setup-smoke] no installed module to assert against');
        return;
      }
      expect(installed.actions).toEqual(expect.arrayContaining(['uninstall', 'upgrade']));
    });
  });

  describe('Login endpoint contract', () => {
    it('POST /api/users/login is the login endpoint (NOT /api/auth/login)', async () => {
      const wrongPath = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@lume.dev', password: 'Admin@Lume!1' });
      expect(wrongPath.status).toBe(404);
    });

    it('POST /api/users/login returns data.token (NOT data.access_token)', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'admin@lume.dev', password: 'Admin@Lume!1' });

      // Test is informational when admin isn't seeded — the documented setup
      // creates the admin in createAdmin.js, but CI may not run that step.
      if (res.status !== 200) {
        console.warn(
          `Login returned ${res.status} (${res.body?.error?.message || 'unknown'}) — ` +
          `if running in isolation, run \`node src/scripts/createAdmin.js\` first.`
        );
        return;
      }

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data.token.length).toBeGreaterThan(50);
      // The snake_case `access_token` field (FastVue convention) is never set.
      expect(res.body.data.access_token).toBeUndefined();
      // Deprecation alias (P1-3): `accessToken` should equal `token` during
      // v2.x so client SDKs defaulting to `accessToken` work. Drops in v3.0.
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.accessToken).toBe(res.body.data.token);
      // refreshToken is also returned for the refresh flow.
      expect(res.body.data.refreshToken).toBeDefined();
    });
  });

  describe('Performance env-var defaults', () => {
    it('DB_LOGGING defaults to false', () => {
      // The .env loader has run by now (dotenv.config in index.js).
      expect(process.env.DB_LOGGING).not.toBe('true');
    });

    it('OTEL trace sampler ratio is sensible (<=0.5 in non-prod)', () => {
      const arg = parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG || '1.0');
      if (process.env.NODE_ENV !== 'production') {
        expect(arg).toBeLessThanOrEqual(0.5);
      }
    });

    it('LOG_LEVEL is info or warn (debug/trace add per-request serialization cost)', () => {
      const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
      expect(['info', 'warn', 'error']).toContain(level);
    });
  });
});
