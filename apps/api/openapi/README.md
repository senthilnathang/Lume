# Lume Framework OpenAPI Documentation

Complete OpenAPI 3.0 specification for the Lume metadata-driven framework API.

## Overview

The OpenAPI specification (`framework.openapi.yaml`) documents all REST endpoints for:
- Dynamic entity CRUD operations
- Module lifecycle management
- Workflow definition and execution
- ABAC+RBAC access control policies
- Plugin installation and management
- Advanced query building with filtering and aggregations
- AI-powered natural language queries
- Record versioning and audit trails

## Using the Documentation

### 1. View with Swagger UI

Online (recommended):
```
https://swagger.io/tools/swagger-ui/
```

Locally:
```bash
# Install swagger-ui-dist
npm install swagger-ui-dist --save-dev

# Serve the spec
npx http-server -p 8080

# Open in browser
# http://localhost:8080/?url=./openapi/framework.openapi.yaml
```

### 2. View with Redoc

Online:
```
https://redocly.com/redoc
```

Locally:
```bash
npm install redoc redoc-cli --save-dev

# Serve HTML with redoc
redoc-cli serve ./openapi/framework.openapi.yaml
```

### 3. Generate Client SDKs

Using OpenAPI Generator:
```bash
# Install
npm install @openapitools/openapi-generator-cli --save-dev

# Generate TypeScript client
npx openapi-generator generate \
  -i openapi/framework.openapi.yaml \
  -g typescript-fetch \
  -o generated/api-client

# Generate Python client
npx openapi-generator generate \
  -i openapi/framework.openapi.yaml \
  -g python \
  -o generated/api-python
```

## API Endpoints Reference

### Admin APIs

**Modules Management**
- `GET /admin/modules` - List installed modules
- `GET /admin/modules/{moduleName}` - Get module details
- `POST /admin/modules/{moduleName}/install` - Install module
- `POST /admin/modules/{moduleName}/reload` - Reload module
- `DELETE /admin/modules/{moduleName}` - Uninstall module

**Workflows Management**
- `GET /admin/workflows` - List all workflows
- `GET /admin/workflows/{workflowName}` - Get workflow details
- `POST /admin/workflows/{workflowName}/execute` - Execute workflow
- `POST /admin/workflows/test/{workflowName}` - Test workflow
- `POST /admin/workflows/versions/{workflowName}` - Save workflow version

**Policies Management**
- `GET /admin/policies` - List all policies
- `GET /admin/policies/{policyName}` - Get policy details
- `POST /admin/policies` - Create policy
- `PUT /admin/policies/{policyName}` - Update policy
- `DELETE /admin/policies/{policyName}` - Delete policy
- `POST /admin/policies/test` - Test policy with context

**Plugins Management**
- `GET /admin/plugins` - List plugins
- `GET /admin/plugins/{pluginName}` - Get plugin details
- `POST /admin/plugins/install` - Install plugin
- `POST /admin/plugins/{pluginName}/enable` - Enable plugin
- `POST /admin/plugins/{pluginName}/disable` - Disable plugin
- `DELETE /admin/plugins/{pluginName}` - Uninstall plugin
- `POST /admin/plugins/check-compatibility` - Check compatibility

### Entity Record APIs

**CRUD Operations**
- `GET /entities/{entityName}/records` - List records with pagination
- `POST /entities/{entityName}/records` - Create record
- `GET /entities/{entityName}/records/{recordId}` - Get single record
- `PUT /entities/{entityName}/records/{recordId}` - Update record
- `DELETE /entities/{entityName}/records/{recordId}` - Delete record

### Query APIs

**Query Builder**
- `POST /query` - Execute complex queries with filters, grouping, aggregations

Supports:
- Filtering by multiple conditions
- Text search across indexed fields
- Grouping and aggregations (count, sum, avg, min, max)
- Sorting and pagination
- Field selection

Example:
```json
POST /query
{
  "entity": "Lead",
  "filters": [
    { "field": "status", "operator": "==", "value": "qualified" },
    { "field": "leadScore", "operator": ">", "value": "50" }
  ],
  "groupBy": "owner",
  "aggregations": ["count", "sum:leadScore"],
  "orderBy": [{ "field": "leadScore", "order": "desc" }],
  "pagination": { "page": 1, "limit": 25 }
}
```

### AI APIs

**Natural Language Queries**
- `POST /ai/ask` - Ask questions in natural language

Example:
```json
POST /ai/ask
{
  "entity": "Lead",
  "question": "Show me all qualified leads owned by John with score above 100"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "answer": "Found 7 qualified leads owned by John with score above 100",
    "records": [ /* matching lead records */ ],
    "confidence": 0.95
  }
}
```

## Authentication

All endpoints require Bearer token authentication:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.lumeframework.dev/api/admin/modules
```

Tokens are obtained from the authentication endpoint:
```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 3600
}
```

## Response Format

### Successful Responses

All successful responses follow this structure:

```json
{
  "success": true,
  "data": {
    /* Response data */
  }
}
```

For list endpoints with pagination:

```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 150
  }
}
```

### Error Responses

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., module already installed)
- `500` - Server Error

## Common Workflows

### 1. Install and Load a Module

```bash
# 1. Install module
curl -X POST \
  https://api.lumeframework.dev/api/admin/modules/crm/install \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "manifestPath": "/path/to/crm-module.json"
  }'

# 2. List entities in module
curl https://api.lumeframework.dev/api/admin/modules/crm \
  -H "Authorization: Bearer TOKEN"

# 3. Create a record in an entity from the module
curl -X POST \
  https://api.lumeframework.dev/api/entities/Lead/records \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "company": "Acme Inc"
  }'
```

### 2. Define and Test a Policy

```bash
# 1. Create a policy
curl -X POST \
  https://api.lumeframework.dev/api/admin/policies \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "lead-owner-only",
    "entity": "Lead",
    "actions": ["read", "write"],
    "conditions": [
      { "field": "owner", "operator": "==", "value": "$userId" }
    ],
    "roles": ["sales_rep"]
  }'

# 2. Test the policy
curl -X POST \
  https://api.lumeframework.dev/api/admin/policies/test \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "policyName": "lead-owner-only",
    "userId": 123,
    "roleId": 2,
    "action": "read"
  }'
```

### 3. Query with Advanced Filters

```bash
# Query leads by multiple conditions with grouping
curl -X POST \
  https://api.lumeframework.dev/api/query \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "Lead",
    "filters": [
      { "field": "status", "operator": "==", "value": "qualified" },
      { "field": "leadScore", "operator": ">", "value": "50" },
      { "field": "createdAt", "operator": ">", "value": "2026-01-01" }
    ],
    "search": "Acme",
    "groupBy": "owner",
    "aggregations": ["count", "sum:leadScore", "avg:leadScore"],
    "orderBy": [
      { "field": "leadScore", "order": "desc" }
    ],
    "pagination": {
      "page": 1,
      "limit": 50
    }
  }'
```

### 4. Execute a Workflow

```bash
# Execute a workflow manually
curl -X POST \
  https://api.lumeframework.dev/api/admin/workflows/lead-assignment/execute \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": 42,
    "data": {
      "customField": "customValue"
    }
  }'
```

### 5. Ask a Natural Language Question

```bash
# Ask AI a question
curl -X POST \
  https://api.lumeframework.dev/api/ai/ask \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "Opportunity",
    "question": "What are my highest-value deals closing this month?"
  }'
```

## Integration Examples

### JavaScript/TypeScript

```typescript
import { Configuration, AdminApi } from './generated/api-client';

const config = new Configuration({
  basePath: 'https://api.lumeframework.dev/api',
  accessToken: 'YOUR_TOKEN',
});

const adminApi = new AdminApi(config);

// List modules
const modules = await adminApi.listModules();
console.log(modules.data);

// Create policy
const policy = await adminApi.createPolicy({
  name: 'my-policy',
  entity: 'Lead',
  actions: ['read'],
});
```

### Python

```python
from openapi_client import ApiClient, Configuration
from openapi_client.apis.admin_api import AdminApi

config = Configuration(
    host='https://api.lumeframework.dev/api',
    access_token='YOUR_TOKEN'
)

with ApiClient(config) as api_client:
    admin_api = AdminApi(api_client)
    
    # List modules
    modules = admin_api.list_modules()
    print(modules.data)
    
    # Get module details
    crm = admin_api.get_module('crm')
    print(f"CRM module has {crm.data.entities} entities")
```

### cURL

See "Common Workflows" section above for cURL examples.

## Extending the Specification

To add new endpoints:

1. Define the path and operation in `framework.openapi.yaml`
2. Add request/response schemas to `components.schemas`
3. Add to appropriate tag for organization
4. Include security requirements (bearerAuth)
5. Document with description and examples

Example new endpoint:

```yaml
/custom/my-endpoint:
  post:
    summary: My custom endpoint
    operationId: myCustomOperation
    tags:
      - Custom
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/MyRequest'
    responses:
      '200':
        description: Success
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MyResponse'
```

## Troubleshooting

### CORS Issues

If testing from a browser, ensure CORS is enabled:

```bash
curl -i https://api.lumeframework.dev/api/admin/modules
# Look for Access-Control-Allow-Origin header
```

### Token Expiration

Tokens expire after 1 hour. Use the refresh token:

```bash
POST /auth/refresh
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

### Rate Limiting

API is rate-limited to 100 requests per minute per user. Headers show limits:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1714478400
```

## Support

- [Lume Framework Documentation](../docs/README.md)
- [GitHub Issues](https://github.com/lumeframework/lume/issues)
- [Email Support](mailto:support@lumeframework.dev)
