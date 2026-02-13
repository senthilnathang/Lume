# Gawdesy Backend API Documentation

## Base URL
```
http://localhost:3000/api
```

---

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Login
```
POST /users/login
Content-Type: application/json

{
  "email": "admin@gawdesy.org",
  "password": "Admin@123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## Public Endpoints

### Health Check
```
GET /health
```
Response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-02-12T04:52:04.344Z",
  "version": "2.0.0"
}
```

### Dashboard Stats
```
GET /dashboard/stats
```
Response:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 2,
      "activeUsers": 2,
      "totalActivities": 5,
      "publishedActivities": 4,
      "totalDonations": 0,
      "totalDonationAmount": 0,
      "totalDonors": 0,
      "totalMessages": 3,
      "unreadMessages": 2,
      "totalDocuments": 0
    },
    "recentActivities": [...],
    "recentDonations": [...]
  }
}
```

### Activities
```
GET /activities
GET /activities?status=published&category=Fundraiser&page=1&limit=10
GET /activities/upcoming
GET /activities/upcoming?limit=5
GET /activities/stats (requires auth)
GET /activities/:id
GET /activities/slug/:slug
```

### Team
```
GET /team/active
GET /team/departments
GET /team/department/:department
GET /team (requires auth)
```

### Settings
```
GET /settings/public
GET /settings (requires auth)
GET /settings/:key (requires auth)
```

---

## Authentication Endpoints

### Register
```
POST /users/register
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "first_name": "John",
  "last_name": "Doe"
}
```

### Login
```
POST /users/login
{
  "email": "admin@gawdesy.org",
  "password": "Admin@123"
}
```

### Refresh Token
```
POST /auth/refresh-token
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Logout
```
POST /users/logout (requires auth)
```

---

## Protected Endpoints

### Users Management
```
GET /users (requires user_management.read)
GET /users/:id
PUT /users/:id (requires user_management.write)
DELETE /users/:id (requires user_management.delete)
POST /users/:id/change-password
GET /users/stats (requires user_management.read)
```

### Roles Management
```
GET /auth/roles
POST /auth/roles (requires role_management.write)
GET /auth/roles/:id
PUT /auth/roles/:id (requires role_management.write)
DELETE /auth/roles/:id (requires role_management.delete)
GET /auth/permissions
```

### Activities Management
```
GET /activities (public)
GET /activities/upcoming (public)
GET /activities/stats (requires auth)
POST /activities (requires activities.write)
PUT /activities/:id (requires activities.write)
DELETE /activities/:id (requires activities.delete)
POST /activities/:id/publish (requires activities.write)
POST /activities/:id/cancel (requires activities.write)
```

### Donations Management
```
GET /donations/stats (requires auth)
GET /donations (requires auth)
GET /donations/:id (requires auth)
POST /donations (requires donations.write)
PUT /donations/:id (requires donations.write)
PATCH /donations/:id/status (requires donations.write)
GET /donations/donors (requires auth)
GET /donations/donors/:id (requires auth)
POST /donations/donors (requires donations.write)
GET /donations/campaigns
POST /donations/campaigns (requires donations.write)
```

### Documents Management
```
GET /documents
GET /documents/:id
POST /documents (requires documents.write)
PUT /documents/:id (requires documents.write)
DELETE /documents/:id (requires documents.delete)
POST /documents/:id/download
GET /documents/stats (requires documents.read)
```

### Media Library
```
GET /media
GET /media/stats (requires auth)
GET /media/featured
GET /media/category/:category
GET /media/:id
POST /media (requires documents.write)
PUT /media/:id (requires documents.write)
DELETE /media/:id (requires documents.delete)
POST /media/:id/download
```

### Team Management
```
GET /team/active (public)
GET /team/departments (public)
GET /team/department/:department (public)
GET /team (requires auth)
GET /team/:id (requires auth)
POST /team (requires team.write)
PUT /team/:id (requires team.write)
DELETE /team/:id (requires team.delete)
POST /team/reorder (requires team.write)
```

### Messages Management
```
GET /messages (requires auth)
GET /messages/:id (requires auth)
POST /messages (public)
PUT /messages/:id (requires auth)
POST /messages/:id/read (requires auth)
POST /messages/:id/reply (requires auth)
DELETE /messages/:id (requires messages.delete)
GET /messages/stats (requires auth)
```

### Settings Management
```
GET /settings (requires auth)
GET /settings/category/:category (requires auth)
POST /settings (requires settings.write)
PUT /settings/:key (requires settings.write)
DELETE /settings/:key (requires settings.write)
POST /settings/bulk (requires settings.write)
POST /settings/initialize (requires settings.write)
```

### Audit Logs
```
GET /audit (requires audit.read)
GET /audit/:id (requires audit.read)
POST /audit/cleanup (requires audit.delete)
```

---

## Rate Limiting
- **General API:** 100 requests per 15 minutes
- **Auth endpoints:** 10 requests per 15 minutes

---

## User Roles
| Role | Description |
|------|-------------|
| super_admin | Full system access |
| admin | Administrative access |
| manager | Management access |
| staff | Staff access |
| user | Regular user |
| guest | Guest access |

---

## Database Tables
| Table | Description |
|-------|-------------|
| users | User accounts |
| roles | User roles |
| permissions | System permissions |
| role_permissions | Role-permission mappings |
| activities | Events/activities |
| donations | Donation records |
| donors | Donor information |
| campaigns | Donation campaigns |
| documents | File documents |
| media_library | Media files |
| team_members | Team members |
| messages | Contact messages |
| settings | Application settings |
| audit_logs | Audit trail |

---

## Quick Start

```bash
# Start server
cd /opt/gawdesy.com/backend
npm run dev

# Login as admin
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gawdesy.org","password":"Admin@123"}'

# Use token in requests
export TOKEN="your-jwt-token"
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

---

## Admin Credentials
- **Email:** admin@gawdesy.org
- **Password:** Admin@123
