# Lume Framework v2.0 - API Documentation

**Version:** 2.0.0 (Updated: 2026-04-28)  
**API Base URL:** `http://localhost:3000/api` (development)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users API](#users-api)
3. [Settings API](#settings-api)
4. [Audit Logs API](#audit-logs-api)
5. [Security Audit API](#security-audit-api)
6. [Website/CMS API](#websitecms-api)
7. [Editor API](#editor-api)
8. [Media Library API](#media-library-api)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

---

## Authentication

### Login Endpoint
```
POST /api/users/login
```

**Request:**
```json
{
  "email": "admin@lume.dev",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "admin@lume.dev",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin"
    }
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

**Headers Required:**
```
Authorization: Bearer <accessToken>
```

---

## Users API

### List Users
```
GET /api/users
```

**Query Parameters:**
- `limit` (optional, default: 20) - Number of records to return
- `offset` (optional, default: 0) - Number of records to skip
- `search` (optional) - Search by email or name
- `role` (optional) - Filter by role

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
        "roleId": 1,
        "status": "active",
        "createdAt": "2026-04-28T...",
        "updatedAt": "2026-04-28T..."
      }
    ],
    "total": 5,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### Get User by ID
```
GET /api/users/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "admin@lume.dev",
    "firstName": "Admin",
    "lastName": "User",
    "roleId": 1,
    "status": "active",
    "createdAt": "2026-04-28T...",
    "updatedAt": "2026-04-28T..."
  }
}
```

### Create User
```
POST /api/users
```

**Request:**
```json
{
  "email": "newuser@lume.dev",
  "password": "SecurePass123!",
  "firstName": "New",
  "lastName": "User",
  "roleId": 2
}
```

### Update User
```
PUT /api/users/:id
```

**Request:**
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "roleId": 3
}
```

### Delete User
```
DELETE /api/users/:id
```

---

## Settings API

### List Settings
```
GET /api/settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "key": "app_name",
        "value": "Lume Framework",
        "type": "string",
        "description": "Application name"
      }
    ],
    "total": 42
  }
}
```

### Get Setting by Key
```
GET /api/settings/:key
```

**Example:**
```
GET /api/settings/app_name
```

### Update Setting
```
PUT /api/settings/:key
```

**Request:**
```json
{
  "value": "New App Name"
}
```

---

## Audit Logs API

### List Audit Logs
```
GET /api/audit
```

**Query Parameters:**
- `action` (optional) - Filter by action type
- `userId` (optional) - Filter by user who performed action
- `startDate` (optional) - ISO 8601 date
- `endDate` (optional) - ISO 8601 date
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "action": "USER_LOGIN",
        "userId": 1,
        "targetId": 1,
        "targetType": "user",
        "changes": {},
        "ipAddress": "::1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2026-04-28T..."
      }
    ],
    "total": 1250
  }
}
```

---

## Security Audit API

### NEW: Full Security Audit Report
```
GET /api/security/audit
```

**Description:** Generates comprehensive security audit report with OWASP Top 10 findings and recommendations

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2026-04-28T...",
    "riskScore": 42,
    "summary": {
      "total": 15,
      "critical": 2,
      "high": 5,
      "medium": 8
    },
    "findings": [
      {
        "type": "BROKEN_ACCESS_CONTROL",
        "severity": "CRITICAL",
        "title": "Users without role assignment",
        "description": "Some users lack role assignment...",
        "cwe": "CWE-639",
        "remediation": "Ensure all users have appropriate roles"
      }
    ],
    "recommendation": "⚠️ Address HIGH and MEDIUM issues..."
  }
}
```

### NEW: OWASP Top 10 Scan
```
GET /api/security/owasp
```

**Description:** Scans for OWASP Top 10 vulnerabilities

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "findings": [
      {
        "type": "A1_BROKEN_ACCESS_CONTROL",
        "severity": "CRITICAL",
        "title": "Access Control Issues",
        "cwe": "CWE-639"
      }
    ]
  }
}
```

### NEW: API Security Scan
```
GET /api/security/api-scan
```

**Description:** Scans API endpoints for security issues

**Response:**
```json
{
  "success": true,
  "data": {
    "findings": [
      {
        "type": "API_AUTHENTICATION",
        "title": "Verify API endpoints require authentication",
        "severity": "CRITICAL"
      }
    ],
    "checklist": [
      "API Authentication",
      "Input Validation",
      "Output Encoding",
      "Rate Limiting",
      "CORS Configuration"
    ]
  }
}
```

### NEW: Dependency Audit
```
GET /api/security/dependencies
```

**Description:** Check for vulnerable dependencies

**Response:**
```json
{
  "success": true,
  "data": {
    "findings": [
      {
        "type": "VULNERABLE_DEPENDENCIES",
        "severity": "HIGH",
        "title": "Dependency vulnerability audit required",
        "command": "npm audit --audit-level=moderate"
      }
    ]
  }
}
```

### NEW: Risk Score
```
GET /api/security/risk-score
```

**Description:** Quick security posture assessment

**Response:**
```json
{
  "success": true,
  "data": {
    "riskScore": 42,
    "riskLevel": "MEDIUM",
    "color": "#f59e0b",
    "summary": {
      "total": 15,
      "critical": 2,
      "high": 5,
      "medium": 8
    },
    "recommendation": "⚠️ Address HIGH and MEDIUM issues before production"
  }
}
```

---

## Website/CMS API

### List Pages
```
GET /api/website/pages
```

### Get Page by Slug
```
GET /api/website/public/pages/:slug
```

**Description:** Get published page content (no auth required)

### List Menus
```
GET /api/website/menus
```

### Get Menu by Location
```
GET /api/website/public/menus/:location
```

**Example Locations:**
- `header`
- `footer`
- `sidebar`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Header Menu",
    "location": "header",
    "items": [
      {
        "id": 1,
        "label": "Home",
        "url": "/",
        "sequence": 1,
        "children": []
      }
    ]
  }
}
```

### Get Website Settings
```
GET /api/website/public/settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "siteName": "Lume CMS",
    "siteDescription": "Modern CMS Platform",
    "logo": "https://...",
    "favicon": "https://...",
    "socialLinks": {}
  }
}
```

---

## Editor API

### List Templates
```
GET /api/editor/templates
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Blog Post",
        "description": "Standard blog post template",
        "content": { "type": "doc", "content": [...] },
        "category": "blog",
        "createdAt": "2026-04-28T..."
      }
    ],
    "total": 6
  }
}
```

### Create Template
```
POST /api/editor/templates
```

**Request:**
```json
{
  "name": "Custom Template",
  "description": "My custom template",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "Start typing..."
          }
        ]
      }
    ]
  },
  "category": "custom"
}
```

### List Snippets
```
GET /api/editor/snippets
```

### Create Snippet
```
POST /api/editor/snippets
```

---

## Media Library API

### List Media
```
GET /api/media
```

**Query Parameters:**
- `folder` (optional) - Filter by folder
- `mimeType` (optional) - Filter by MIME type
- `limit` (default: 20)
- `offset` (default: 0)

### Upload Media
```
POST /api/media/upload
```

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <accessToken>
```

**Form Data:**
- `file` - File to upload
- `folder` (optional) - Target folder

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "filename": "image.jpg",
    "originalName": "My Image.jpg",
    "url": "/uploads/general/image.jpg",
    "mimeType": "image/jpeg",
    "size": 102400,
    "width": 1920,
    "height": 1080,
    "folder": "general"
  }
}
```

### Delete Media
```
DELETE /api/media/:id
```

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | User lacks required permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| CONFLICT | 409 | Resource already exists |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1682793600
```

### Default Limits
- **Public endpoints:** 100 requests per 15 minutes
- **Auth endpoints:** 5 requests per 5 minutes
- **API endpoints:** 1000 requests per hour

### Rate Limit Exceeded
```
HTTP/1.1 429 Too Many Requests

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "retryAfter": 300
  }
}
```

---

## Authentication Headers

All authenticated endpoints require:
```
Authorization: Bearer <accessToken>
```

**Token Format:** JWT (JSON Web Token)  
**Token Expiry:** 1 hour  
**Refresh Token Expiry:** 7 days

---

## Request/Response Formats

### Standard Request
```javascript
// HTTP Method: GET, POST, PUT, DELETE, PATCH
// Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}

// Body (for POST/PUT):
{
  "key": "value"
}
```

### Standard Response
```javascript
{
  "success": true,
  "data": {},
  "timestamp": "2026-04-28T10:30:00Z"
}
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `limit` - Number of records (default: 20, max: 100)
- `offset` - Number of records to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true,
    "pageCount": 8
  }
}
```

---

## Filtering & Sorting

### Filter by Field
```
GET /api/users?role=admin&status=active
```

### Sort Results
```
GET /api/users?sort=email&order=asc
```

---

## WebSocket (Real-Time)

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'SUBSCRIBE',
    channel: 'audit-logs'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('New audit log:', message);
};
```

### Available Channels
- `audit-logs` - Real-time audit log events
- `user-activity` - User login/logout events
- `system-health` - System health updates

---

## Security Best Practices

1. **Always use HTTPS in production**
2. **Store tokens securely** (httpOnly cookies or secure localStorage)
3. **Refresh tokens before expiry**
4. **Validate all input data**
5. **Check response status codes**
6. **Handle rate limiting gracefully**
7. **Log security-relevant API calls**
8. **Monitor for suspicious patterns**

---

## Testing Endpoints

### Health Check
```
GET /health
```

**Always available, no auth required**

### API Status
```
GET /api/status
```

**No auth required**

---

## Version History

- **v2.0.0** (2026-04-22) - Initial v2.0 release with modular architecture
- **v2.0.1** (2026-04-28) - Security hardening, bug fixes, security audit module

---

**Last Updated:** April 28, 2026  
**Lume Framework:** v2.0.0  
**Status:** Production Ready
