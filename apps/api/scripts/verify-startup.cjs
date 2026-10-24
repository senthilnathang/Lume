// Application startup/health verification, including normal initialization hooks.
// Never runs delivery workers.
require('dotenv').config({ quiet: true });
process.env.AUTOMATION_WORKER_ENABLED = 'false';
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
(async () => {
  const app = await NestFactory.create(AppModule, { logger: ['error'], abortOnError: false });
  try {
    app.setGlobalPrefix('api/v2');
    await app.listen(0, '127.0.0.1');
    const response = await fetch(`http://127.0.0.1:${app.getHttpServer().address().port}/api/v2/health`, { signal: AbortSignal.timeout(10000) });
    if (response.status !== 200 || (await response.json()).status !== 'ok') throw new Error('Health check failed');
    const graphql = await fetch(`http://127.0.0.1:${app.getHttpServer().address().port}/api/v2/graphql`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }), signal: AbortSignal.timeout(10000),
    });
    const result = await graphql.json();
    if (graphql.status !== 200 || result.errors || result.data?.__typename !== 'Query') throw new Error('GraphQL check failed');
    console.log('Complete AppModule startup, HTTP health and GraphQL checks passed');
  } finally { await app.close(); }
})().catch(error => { console.error(error.message); process.exit(1); });
