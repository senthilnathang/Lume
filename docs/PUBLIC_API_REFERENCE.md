# Lume v2.0 API Reference

**Last Updated:** April 28, 2026  
**Version:** 2.0.0  
**Base URL:** `https://api.lume.dev` or `http://localhost:3000` (development)

Complete API reference for Lume v2.0 with 100+ endpoints, authentication, pagination, and code examples.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Common Patterns](#common-patterns)
3. [Entities API](#entities-api)
4. [Records API](#records-api)
5. [Views API](#views-api)
6. [Automations API](#automations-api)
7. [Webhooks API](#webhooks-api)
8. [Users & Permissions API](#users--permissions-api)
9. [File Upload API](#file-upload-api)
10. [Code Examples](#code-examples)

---

## Authentication

### Login Endpoint

```
POST /api/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "role": "editor"
    }
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect"
  }
}
```

### Refresh Token

```
POST /api/auth/refresh
```

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Token Details:**
- **Access Token Expiry:** 1 hour (3600 seconds)
- **Refresh Token Expiry:** 7 days (604800 seconds)
- **Token Format:** JWT with `sub` (user ID), `role`, `exp` (expiration), `iat` (issued at)

### Using Tokens

All authenticated requests require the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example:**
```bash
curl -X GET https://api.lume.dev/api/contacts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Logout

```
POST /api/auth/logout
```

No body required. Invalidates current session.

---

## Common Patterns

### Response Format

All API responses follow a standard format:

**Success Response:**
```json
{
  "success": true,
  "data": {
    // Actual response data
  },
  "timestamp": "2026-04-28T10:30:00Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Pagination

List endpoints support pagination with `limit` and `offset`:

**Query Parameters:**
- `limit` — Number of records to return (default: 20, max: 100)
- `offset` — Number of records to skip (default: 0)

**Example:**
```bash
GET /api/contacts?limit=50&offset=100
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 500,
    "limit": 50,
    "offset": 100,
    "hasMore": true,
    "pageCount": 10
  }
}
```

### Filtering

Filter records with query parameters:

**Query Parameter Format:**
```
?filters[0][field]=name&filters[0][operator]=contains&filters[0][value]=john
```

**Operators:**
- `equals` — Exact match
- `notEquals` — Not equal
- `contains` — String contains (case-insensitive)
- `notContains` — Does not contain
- `gt` — Greater than (numbers/dates)
- `gte` — Greater than or equal
- `lt` — Less than
- `lte` — Less than or equal
- `isEmpty` — Field is null/empty
- `isNotEmpty` — Field is not null/empty
- `in` — Value is in array
- `nin` — Value not in array (not in)

**Examples:**
```bash
# Get contacts where name contains "John"
GET /api/contacts?filters[0][field]=firstName&filters[0][operator]=contains&filters[0][value]=john

# Get contacts created in last 7 days
GET /api/contacts?filters[0][field]=created_at&filters[0][operator]=gte&filters[0][value]=2026-04-21

# Multiple filters (AND logic)
GET /api/contacts?filters[0][field]=status&filters[0][operator]=equals&filters[0][value]=customer&filters[1][field]=company&filters[1][operator]=equals&filters[1][value]=acme
```

### Sorting

Sort results with query parameters:

**Query Parameters:**
- `sort` — Field to sort by
- `order` — ASC (ascending) or DESC (descending)

**Examples:**
```bash
# Sort by first name A→Z
GET /api/contacts?sort=firstName&order=ASC

# Sort by creation date, newest first
GET /api/contacts?sort=created_at&order=DESC

# Multiple sort (primary, secondary)
GET /api/contacts?sort=status,firstName&order=ASC,ASC
```

### Include Related Data

Expand related records in response:

**Query Parameter:**
```bash
GET /api/contacts?include=company,manager
```

Response will include nested company and manager data:
```json
{
  "id": 1,
  "firstName": "John",
  "company": {
    "id": 5,
    "name": "Acme Corp"
  },
  "manager": {
    "id": 3,
    "firstName": "Jane"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | User lacks required permissions for this action |
| `NOT_FOUND` | 404 | Resource (entity, record, field) not found |
| `VALIDATION_ERROR` | 400 | Invalid request data (validation failed) |
| `CONFLICT` | 409 | Resource already exists (unique constraint) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests, try again later |
| `INTERNAL_ERROR` | 500 | Server error (contact support) |

---

## Entities API

### List Entities

```
GET /api/entities
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "contacts",
        "name": "Contacts",
        "singular": "Contact",
        "description": "Customer and lead information",
        "recordCount": 250,
        "fields": [
          {
            "name": "firstName",
            "type": "text",
            "required": true,
            "unique": false
          }
        ]
      }
    ],
    "total": 15
  }
}
```

### Get Entity

```
GET /api/entities/:id
```

**Example:**
```bash
GET /api/entities/contacts
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "contacts",
    "name": "Contacts",
    "singular": "Contact",
    "fields": [...],
    "views": [...],
    "permissions": [...]
  }
}
```

### Create Entity

```
POST /api/entities
```

**Request:**
```json
{
  "name": "Products",
  "singular": "Product",
  "description": "Product catalog",
  "icon": "package"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "products",
    "name": "Products",
    "singular": "Product",
    "createdAt": "2026-04-28T10:30:00Z"
  }
}
```

### Update Entity

```
PUT /api/entities/:id
```

**Request:**
```json
{
  "name": "Customers",
  "description": "Customer database"
}
```

### Delete Entity

```
DELETE /api/entities/:id
```

⚠️ **Warning:** Deletes all records in the entity. Cannot be undone.

---

## Records API

### List Records

```
GET /api/:entity
GET /api/contacts
```

**Query Parameters:**
- `limit` — Records per page
- `offset` — Pagination offset
- `sort` — Sort field
- `order` — ASC or DESC
- `filters` — Filter conditions
- `include` — Include related records

**Example:**
```bash
GET /api/contacts?limit=20&offset=0&sort=firstName&order=ASC&filters[0][field]=status&filters[0][operator]=equals&filters[0][value]=customer
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "firstName": "John",
        "lastName": "Smith",
        "email": "john@example.com",
        "status": "customer",
        "company_id": 5,
        "created_at": "2026-04-01T08:00:00Z",
        "updated_at": "2026-04-28T10:30:00Z"
      }
    ],
    "total": 250,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get Single Record

```
GET /api/:entity/:id
GET /api/contacts/1
```

**Example with Relationships:**
```bash
GET /api/contacts/1?include=company,manager
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "status": "customer",
    "company": {
      "id": 5,
      "name": "Acme Corp"
    },
    "manager": {
      "id": 3,
      "firstName": "Jane",
      "lastName": "Doe"
    },
    "created_at": "2026-04-01T08:00:00Z"
  }
}
```

### Create Record

```
POST /api/:entity
POST /api/contacts
```

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "status": "lead",
  "company_id": 5
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 251,
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "status": "lead",
    "company_id": 5,
    "created_at": "2026-04-28T10:45:00Z"
  }
}
```

### Update Record

```
PUT /api/:entity/:id
PUT /api/contacts/1
```

**Request:**
```json
{
  "status": "customer",
  "company_id": 10
}
```

**Partial Update:** Only include fields to change. Other fields remain unchanged.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "status": "customer",
    "company_id": 10,
    "updated_at": "2026-04-28T11:00:00Z"
  }
}
```

### Delete Record (Soft Delete)

```
DELETE /api/:entity/:id
DELETE /api/contacts/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "deleted_at": "2026-04-28T11:05:00Z"
  }
}
```

Record is marked deleted but can be restored.

### Permanently Delete Record

```
DELETE /api/:entity/:id?permanent=true
```

⚠️ **Warning:** Cannot be undone.

### Bulk Create Records

```
POST /api/:entity/bulk
POST /api/contacts/bulk
```

**Request:**
```json
{
  "records": [
    {
      "firstName": "Alice",
      "lastName": "Johnson",
      "email": "alice@example.com"
    },
    {
      "firstName": "Bob",
      "lastName": "Wilson",
      "email": "bob@example.com"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created": 2,
    "records": [
      {
        "id": 252,
        "firstName": "Alice",
        "lastName": "Johnson"
      },
      {
        "id": 253,
        "firstName": "Bob",
        "lastName": "Wilson"
      }
    ]
  }
}
```

### Bulk Update Records

```
PUT /api/:entity/bulk
```

**Request:**
```json
{
  "records": [
    {
      "id": 1,
      "status": "customer"
    },
    {
      "id": 2,
      "status": "customer"
    }
  ]
}
```

### Bulk Delete Records

```
DELETE /api/:entity/bulk
```

**Request:**
```json
{
  "ids": [1, 2, 3]
}
```

### Export Records

```
GET /api/:entity/export
```

**Query Parameters:**
- `format` — csv, xlsx, json (default: csv)
- `fields` — Comma-separated field names to include

**Example:**
```bash
GET /api/contacts/export?format=csv&fields=firstName,lastName,email
```

Response is CSV/Excel file download.

---

## Views API

### List Views

```
GET /api/:entity/views
GET /api/contacts/views
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "All Contacts",
        "type": "list",
        "fields": ["firstName", "lastName", "email"],
        "sort": "firstName",
        "filters": []
      }
    ],
    "total": 3
  }
}
```

### Get View

```
GET /api/:entity/views/:viewId
```

### Create View

```
POST /api/:entity/views
```

**Request:**
```json
{
  "name": "Customers Only",
  "type": "list",
  "fields": ["firstName", "lastName", "email", "status"],
  "filters": [
    {
      "field": "status",
      "operator": "equals",
      "value": "customer"
    }
  ]
}
```

### Update View

```
PUT /api/:entity/views/:viewId
```

### Delete View

```
DELETE /api/:entity/views/:viewId
```

---

## Automations API

### List Automations

```
GET /api/:entity/automations
GET /api/contacts/automations
```

### Get Automation

```
GET /api/:entity/automations/:automationId
```

### Create Automation

```
POST /api/:entity/automations
```

**Request:**
```json
{
  "name": "Email on new contact",
  "trigger": "created",
  "conditions": [],
  "actions": [
    {
      "type": "email",
      "to": "contact.email",
      "subject": "Welcome, {contact.firstName}!",
      "body": "<h1>Welcome</h1><p>Thanks for signing up.</p>"
    }
  ],
  "enabled": true
}
```

### Update Automation

```
PUT /api/:entity/automations/:automationId
```

### Delete Automation

```
DELETE /api/:entity/automations/:automationId
```

### Test Automation

```
POST /api/:entity/automations/:automationId/test
```

**Request:**
```json
{
  "recordId": 1
}
```

Response shows what would happen if automation triggers.

### List Automation Executions

```
GET /api/:entity/automations/:automationId/executions
```

View logs of past automation runs (success/failure).

---

## Webhooks API

### List Webhooks

```
GET /api/:entity/webhooks
```

### Create Webhook

```
POST /api/:entity/webhooks
```

**Request:**
```json
{
  "url": "https://external-system.com/api/contacts",
  "event": "created",
  "headers": {
    "Authorization": "Bearer API_KEY"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://external-system.com/api/contacts",
    "event": "created",
    "created_at": "2026-04-28T10:30:00Z"
  }
}
```

### Webhook Payload

When event triggers, Lume POSTs JSON to your URL:

```json
{
  "event": "contact.created",
  "timestamp": "2026-04-28T10:30:00Z",
  "data": {
    "id": 251,
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "status": "lead",
    "created_at": "2026-04-28T10:30:00Z"
  }
}
```

**Response Status:** Lume expects HTTP 200 OK within 30 seconds.

### Test Webhook

```
POST /api/:entity/webhooks/:webhookId/test
```

Sends test payload to webhook URL.

### Webhook Deliveries

```
GET /api/:entity/webhooks/:webhookId/deliveries
```

View delivery history and failures.

### Retry Failed Delivery

```
POST /api/:entity/webhooks/:webhookId/deliveries/:deliveryId/retry
```

---

## Users & Permissions API

### List Users

```
GET /api/users
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "email": "admin@lume.dev",
        "firstName": "Admin",
        "lastName": "User",
        "role": "admin",
        "status": "active",
        "created_at": "2026-04-01T00:00:00Z"
      }
    ],
    "total": 5
  }
}
```

### Get User

```
GET /api/users/:id
```

### Create User

```
POST /api/users
```

**Request:**
```json
{
  "email": "newuser@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "role": "editor"
}
```

System sends invitation email automatically.

### Update User

```
PUT /api/users/:id
```

**Request:**
```json
{
  "firstName": "Jane",
  "role": "admin"
}
```

### Delete User

```
DELETE /api/users/:id
```

### List Permissions

```
GET /api/permissions
```

Returns all 140+ granular permissions in system:
- entity.contacts.view
- entity.contacts.create
- entity.contacts.edit
- entity.contacts.delete
- automations.manage
- webhooks.manage
- etc.

### Get User Permissions

```
GET /api/users/:id/permissions
```

Returns permissions granted to user based on role.

---

## File Upload API

### Upload File

```
POST /api/files/upload
```

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer YOUR_TOKEN
```

**Form Data:**
- `file` — File to upload (binary)
- `folder` — Optional folder name (default: "general")

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "filename": "document.pdf",
    "originalName": "My Document.pdf",
    "url": "/uploads/general/document.pdf",
    "fullUrl": "https://api.lume.dev/uploads/general/document.pdf",
    "mimeType": "application/pdf",
    "size": 102400,
    "width": null,
    "height": null,
    "createdAt": "2026-04-28T10:30:00Z"
  }
}
```

**Image Upload Response (includes dimensions):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "filename": "photo.jpg",
    "mimeType": "image/jpeg",
    "width": 1920,
    "height": 1080,
    "url": "/uploads/general/photo.jpg",
    "thumbnailUrl": "/uploads/general/photo-thumb.jpg"
  }
}
```

### List Files

```
GET /api/files
```

**Query Parameters:**
- `folder` — Filter by folder
- `mimeType` — Filter by MIME type (image/jpeg, application/pdf, etc.)
- `limit` — Pagination limit

### Delete File

```
DELETE /api/files/:id
```

---

## Code Examples

### JavaScript (Node.js)

**Install Axios:**
```bash
npm install axios
```

**Login and Get Contacts:**
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.lume.dev/api'
});

async function getContacts() {
  try {
    // Login
    const loginRes = await api.post('/auth/login', {
      email: 'user@example.com',
      password: 'password123'
    });

    const token = loginRes.data.data.accessToken;

    // Set token in headers
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Get contacts
    const contactsRes = await api.get('/contacts?limit=50');
    console.log('Contacts:', contactsRes.data.data.items);

    return contactsRes.data.data.items;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Create contact
async function createContact(contact) {
  try {
    const res = await api.post('/contacts', contact);
    console.log('Created:', res.data.data);
    return res.data.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Update contact
async function updateContact(id, updates) {
  try {
    const res = await api.put(`/contacts/${id}`, updates);
    console.log('Updated:', res.data.data);
    return res.data.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage
getContacts();
createContact({
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com'
});
```

### JavaScript (Browser/Fetch API)

```javascript
const API_URL = 'https://api.lume.dev/api';
let token = null;

async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  token = data.data.accessToken;
  console.log('Logged in');
}

async function fetchContacts() {
  const res = await fetch(`${API_URL}/contacts?limit=50`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await res.json();
  return data.data.items;
}

async function createContact(contact) {
  const res = await fetch(`${API_URL}/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(contact)
  });

  const data = await res.json();
  return data.data;
}
```

### Python

**Install Requests:**
```bash
pip install requests
```

**Example Script:**
```python
import requests
import json

API_URL = 'https://api.lume.dev/api'
token = None

def login(email, password):
    global token
    response = requests.post(
        f'{API_URL}/auth/login',
        json={'email': email, 'password': password}
    )
    data = response.json()
    token = data['data']['accessToken']
    print('Logged in successfully')

def get_contacts(limit=50, offset=0):
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(
        f'{API_URL}/contacts',
        params={'limit': limit, 'offset': offset},
        headers=headers
    )
    return response.json()['data']['items']

def create_contact(first_name, last_name, email):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    response = requests.post(
        f'{API_URL}/contacts',
        json={
            'firstName': first_name,
            'lastName': last_name,
            'email': email
        },
        headers=headers
    )
    return response.json()['data']

def update_contact(contact_id, **kwargs):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    response = requests.put(
        f'{API_URL}/contacts/{contact_id}',
        json=kwargs,
        headers=headers
    )
    return response.json()['data']

def delete_contact(contact_id):
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.delete(
        f'{API_URL}/contacts/{contact_id}',
        headers=headers
    )
    return response.json()

# Usage
login('user@example.com', 'password123')
contacts = get_contacts()
print(f'Found {len(contacts)} contacts')

new_contact = create_contact('John', 'Smith', 'john@example.com')
print(f'Created contact {new_contact["id"]}')

update_contact(new_contact['id'], status='customer')
print('Updated contact status')
```

### cURL

**Login:**
```bash
curl -X POST https://api.lume.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Save token to variable:**
```bash
TOKEN=$(curl -s -X POST https://api.lume.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  | jq -r '.data.accessToken')

echo $TOKEN
```

**Get Contacts:**
```bash
curl -X GET https://api.lume.dev/api/contacts \
  -H "Authorization: Bearer $TOKEN"
```

**Create Contact:**
```bash
curl -X POST https://api.lume.dev/api/contacts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "status": "lead"
  }'
```

**Update Contact:**
```bash
curl -X PUT https://api.lume.dev/api/contacts/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "customer"}'
```

**Delete Contact:**
```bash
curl -X DELETE https://api.lume.dev/api/contacts/1 \
  -H "Authorization: Bearer $TOKEN"
```

### GraphQL (Future)

GraphQL support is planned for v2.1. Current release uses REST API only.

---

## Rate Limiting

API requests are rate-limited:

**Default Limits:**
- **Public endpoints:** 100 requests per 15 minutes per IP
- **Auth endpoints:** 5 requests per 5 minutes per IP
- **Authenticated endpoints:** 1000 requests per hour per user

**Response Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1682793600
```

**Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 300
  }
}
```

---

## WebSocket (Real-Time)

Connect to real-time updates via WebSocket:

```javascript
const ws = new WebSocket('wss://api.lume.dev/ws');

ws.onopen = () => {
  console.log('Connected');
  
  // Subscribe to channel
  ws.send(JSON.stringify({
    type: 'SUBSCRIBE',
    channel: 'contacts'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Update:', message);
  
  // Handle update
  if (message.type === 'record.created') {
    console.log('New contact:', message.data);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

**Available Channels:**
- `contacts` — All contact changes
- `automations` — Automation execution events
- `webhooks` — Webhook delivery status
- `activity` — User activity feed

---

## Security Best Practices

1. **Use HTTPS in production** — Never send tokens over HTTP
2. **Rotate tokens regularly** — Refresh access tokens before expiry
3. **Store tokens securely** — Use httpOnly cookies or secure localStorage
4. **Validate all input** — Sanitize and validate on client and server
5. **Use rate limiting** — Implement backoff for rate-limited responses
6. **Monitor API usage** — Set up alerts for unusual activity
7. **Log security events** — Audit all API calls for compliance
8. **Use strong passwords** — Enforce 12+ character passwords

---

## SDK Documentation

For easier development, use the official Lume SDKs:

- **JavaScript/TypeScript:** https://github.com/lume/sdk-js
- **Python:** https://github.com/lume/sdk-python
- **Ruby:** https://github.com/lume/sdk-ruby (community)

---

## Support & Feedback

- **Issues:** https://github.com/lume/lume/issues
- **Discussions:** https://github.com/lume/lume/discussions
- **Email:** api-support@lume.dev

---

**Need help?** Check [PUBLIC_USER_GUIDE.md](PUBLIC_USER_GUIDE.md) for UI usage or [PUBLIC_GETTING_STARTED.md](PUBLIC_GETTING_STARTED.md) for setup.

