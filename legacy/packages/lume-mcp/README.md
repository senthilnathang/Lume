# @lume/mcp-server

MCP server exposing a Lume workspace to AI assistants (Claude, Cursor):
entities, schema graph, records (list/get/create over stdio).

```bash
cd packages/lume-mcp && npm install
LUME_API_URL=http://localhost:3000 LUME_API_KEY=<key> node bin/lume-mcp.js
```

Claude Desktop config:

```json
{
  "mcpServers": {
    "lume": {
      "command": "node",
      "args": ["/absolute/path/to/packages/lume-mcp/bin/lume-mcp.js"],
      "env": { "LUME_API_URL": "http://localhost:3000", "LUME_API_KEY": "<key>" }
    }
  }
}
```

Tools: `list_entities`, `schema_graph`, `list_records`, `get_record`,
`create_record`. Writes go through the same server-side validation,
formulas, visibility, and field policies as the API.

Tests: `node --test packages/lume-mcp/test/server.test.js`.
