import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createClient } from './client.js';

export function buildServer(client) {
  const server = new McpServer({ name: 'lume', version: '0.1.0' });

  server.tool(
    'list_entities',
    'List custom entities in the Lume workspace',
    {},
    async () => ({ content: [{ type: 'text', text: JSON.stringify(await client.listEntities()) }] })
  );

  server.tool(
    'schema_graph',
    'Entity relationship graph (entities, fields, lookup links) for ERD-style reasoning',
    {},
    async () => ({ content: [{ type: 'text', text: JSON.stringify(await client.schemaGraph()) }] })
  );

  server.tool(
    'list_records',
    'List records of an entity with pagination',
    { entityId: z.number().describe('Entity id'), page: z.number().optional(), limit: z.number().optional() },
    async ({ entityId, page, limit }) => ({
      content: [{ type: 'text', text: JSON.stringify(await client.listRecords(entityId, { page, limit })) }],
    })
  );

  server.tool(
    'get_record',
    'Fetch a single entity record by id',
    { entityId: z.number().describe('Entity id'), recordId: z.number().describe('Record id') },
    async ({ entityId, recordId }) => ({
      content: [{ type: 'text', text: JSON.stringify(await client.getRecord(entityId, recordId)) }],
    })
  );

  server.tool(
    'create_record',
    'Create an entity record (server computes formulas, enforces validation and visibility)',
    { entityId: z.number().describe('Entity id'), data: z.record(z.unknown()).describe('Field values') },
    async ({ entityId, data }) => ({
      content: [{ type: 'text', text: JSON.stringify(await client.createRecord(entityId, data)) }],
    })
  );

  return server;
}

export async function run(client = createClient()) {
  const server = buildServer(client);
  await server.connect(new StdioServerTransport());
}

export default { buildServer, run };
