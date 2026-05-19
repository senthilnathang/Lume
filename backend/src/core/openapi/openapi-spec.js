/**
 * OpenAPI 3.0 spec for Lume's HTTP API.
 *
 * Two layers:
 *   1. `baseSpec` — hand-curated descriptors for the platform-level routes
 *      (health, auth, modules). These are the routes a new integrator hits
 *      in the first 5 minutes.
 *   2. `swagger-jsdoc` scrapes any `@swagger` / `@openapi` JSDoc comments
 *      from src/modules/(asterisk)/api/(asterisk).js so module authors can
 *      self-document without touching this file.
 *
 * The result is served at:
 *   - GET /api/docs        — Swagger UI (interactive explorer)
 *   - GET /api/openapi.json — raw JSON spec (for codegen + client SDKs)
 *
 * Both endpoints are mounted unconditionally in non-production env, and
 * gated by OPENAPI_ENABLED=true (default false) in production — public
 * docs in production should usually live on docs.lume.dev or similar,
 * not inside the API surface.
 */

import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '..', '..', '..');

const baseSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Lume API',
    version: '2.0.0',
    description:
      "HTTP API for the Lume framework. Authentication is JWT bearer " +
      "(obtain via `POST /api/users/login`). Multi-tenant: every request " +
      "is scoped to the authenticated user's company unless they hold " +
      "the `super_admin` role.",
    contact: { name: 'Lume', url: 'https://github.com/senthilnathang/Lume' },
    license: { name: 'MIT' },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local dev' },
    { url: 'https://staging.lume.dev', description: 'Staging' },
    { url: 'https://api.lume.dev', description: 'Production' },
  ],
  tags: [
    { name: 'Platform', description: 'Health, metrics, module catalogue' },
    { name: 'Auth', description: 'Login, refresh, password reset' },
    { name: 'Activities', description: 'Events module' },
    { name: 'Team', description: 'Team-directory module' },
    { name: 'Website', description: 'CMS module (pages, menus, settings)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          "JWT issued by `POST /api/users/login`. Sent as " +
          "`Authorization: Bearer <token>`. Login also returns " +
          "`data.accessToken` (alias for `data.token`). `accessToken` " +
          "becomes canonical in v3.0; `token` will be removed.",
      },
    },
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { description: 'Endpoint-specific payload' },
        },
        required: ['success', 'data'],
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'NOT_FOUND' },
              message: { type: 'string', example: 'Endpoint not found' },
            },
          },
        },
        required: ['success', 'error'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@lume.dev' },
          password: { type: 'string', format: 'password', example: 'Admin@Lume!1' },
          twoFactorToken: { type: 'string', description: 'Optional 6-digit TOTP if 2FA enabled' },
        },
        required: ['email', 'password'],
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          message: { type: 'string', example: 'Login successful' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              token: { type: 'string', description: 'JWT access token (canonical v2 name)' },
              accessToken: {
                type: 'string',
                description:
                  "Alias for `token`. Same value. Use this in new clients — " +
                  "`token` is deprecated and removed in v3.0.",
              },
              refreshToken: { type: 'string', description: 'JWT refresh token' },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          email: { type: 'string', format: 'email' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          role_id: { type: 'integer' },
          role: { type: 'string', example: 'super_admin' },
          is_active: { type: 'boolean' },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          message: { type: 'string', example: 'Lume Framework is running' },
          version: { type: 'string', example: '2.0.0' },
          framework: { type: 'string', example: 'Lume' },
          modular: { type: 'boolean' },
          metrics: {
            type: 'object',
            properties: {
              uptime: { type: 'number', description: 'Seconds since boot' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Platform'],
        summary: 'Liveness + observability metrics',
        description:
          "Returns 200 once the backend has bound port 3000 and connected " +
          "to MySQL + Redis. Returns `Cache-Control: public, max-age=5` " +
          "— suitable for k8s liveness probes and AWS ALB health checks.",
        responses: {
          200: {
            description: 'Healthy',
            headers: {
              'Cache-Control': { schema: { type: 'string', example: 'public, max-age=5' } },
            },
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } },
            },
          },
        },
      },
    },
    '/api/modules': {
      get: {
        tags: ['Platform'],
        summary: 'List all installed modules',
        description:
          "Returns the manifest + install state for every module discovered " +
          "at boot. Response is **not** cached (`Cache-Control: no-store`) " +
          "because module install/uninstall must be immediately visible.",
        responses: {
          200: {
            description: 'List of modules',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/users/login': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange credentials for a JWT',
        description:
          "Login endpoint. Returns both `data.token` and `data.accessToken` " +
          "(same JWT). `accessToken` is the canonical name from v3.0 onwards.\n\n" +
          "Note: login is at `/api/users/login`, not `/api/auth/login`.",
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: {
            description: 'JWT issued',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          401: {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

export function buildOpenApiSpec() {
  const options = {
    definition: baseSpec,
    apis: [
      path.join(BACKEND_ROOT, 'src', 'modules', '*', 'api', '*.js'),
      path.join(BACKEND_ROOT, 'src', 'modules', '*', '*.routes.js'),
      path.join(BACKEND_ROOT, 'src', 'index.js'),
    ],
  };
  return swaggerJsdoc(options);
}
