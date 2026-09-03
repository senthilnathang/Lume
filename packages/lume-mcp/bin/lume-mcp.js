#!/usr/bin/env node
import { run } from '../src/server.js';

if (!process.env.LUME_API_KEY) {
  console.error('lume-mcp: set LUME_API_KEY (a Lume API key) and optionally LUME_API_URL (default http://localhost:3000)');
  process.exit(1);
}

await run();
