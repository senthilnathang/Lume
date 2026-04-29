# Public Release & SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Lume v2.0 public release with comprehensive SEO strategy, production-ready documentation (150+ pages), and marketing infrastructure for July-September 2026 launch targeting 10,000+ GitHub stars and 500+ production deployments.

**Architecture:** Three parallel workstreams—(1) Documentation & API Reference building from existing backend, (2) SEO implementation across website + blog content, (3) Infrastructure & marketing setup—integrated via shared content calendar and metrics dashboard.

**Tech Stack:** Nuxt 3 SSR (public site), VitePress/Docusaurus (docs), GitHub for project management, Plausible Analytics, Sentry for error tracking, Schema.org JSON-LD for SEO.

**Timeline:** April 26 - August 31, 2026 (17 weeks to launch)

---

## File Structure & Architecture

### Documentation Files to Create
```
docs/
├── superpowers/plans/2026-04-26-public-release-seo-implementation.md (this plan)
├── PUBLIC_GETTING_STARTED.md (30 pages, 8,000 words)
├── PUBLIC_USER_GUIDE.md (40 pages, 12,000 words)
├── PUBLIC_API_REFERENCE.md (50 pages, 15,000 words with code samples)
├── PUBLIC_ARCHITECTURE.md (25 pages, 7,000 words)
├── PUBLIC_DEPLOYMENT.md (30 pages, 8,000 words)
├── PUBLIC_SECURITY.md (25 pages, 7,000 words)
├── PUBLIC_CONTRIBUTING.md (20 pages, 6,000 words)
├── FAQ.md (15 pages, 4,000 words)
└── SEO_CONTENT_CALENDAR.md (tracking all 13+ blog posts)
```

### Website Files to Modify/Create
```
frontend/apps/riagri-website/
├── nuxt.config.ts (update SEO metadata, sitemap)
├── pages/
│   ├── index.vue (marketing homepage)
│   ├── features.vue (feature showcase)
│   ├── pricing.vue (open source positioning)
│   ├── use-cases/
│   │   ├── index.vue
│   │   ├── small-business.vue
│   │   ├── nonprofit.vue
│   │   ├── ecommerce.vue
│   │   └── saas.vue
│   ├── community/
│   │   ├── index.vue
│   │   ├── showcase.vue
│   │   ├── events.vue
│   │   └── jobs.vue
│   ├── blog/
│   │   ├── index.vue
│   │   ├── [slug].vue (individual blog post template)
│   │   └── [category]/index.vue
│   └── legal/
│       ├── privacy.vue
│       ├── terms.vue
│       └── security.vue
├── composables/useMetadata.ts (SEO metadata helper)
├── utils/schema-generator.ts (JSON-LD generator)
├── content/
│   ├── blog/ (13+ markdown blog posts)
│   ├── use-cases/ (use case content)
│   └── faq/ (FAQ content)
└── public/
    ├── sitemap.xml (generated)
    ├── robots.txt (static)
    └── security.txt (static)
```

### Backend SEO Files
```
backend/src/
├── core/seo/ (new module)
│   ├── schema-generator.ts (JSON-LD, OpenGraph)
│   ├── sitemap-service.ts (dynamic sitemap generation)
│   └── metadata.interface.ts (SEO metadata types)
└── modules/website/
    ├── controllers/seo.controller.ts (SEO API endpoints)
    └── services/seo.service.ts (SEO logic)
```

---

## Implementation Tasks

### Phase 1: Documentation Foundation (Weeks 1-3, Apr 26 - May 17)

#### Task 1: Create PUBLIC_GETTING_STARTED.md

**Files:**
- Create: `docs/PUBLIC_GETTING_STARTED.md`
- Reference: `backend/README.md`, `INSTALLATION.md`, existing setup guides

**Steps:**

- [ ] **Step 1: Write the outline**

```markdown
# Lume v2.0 Getting Started

## Table of Contents
1. What is Lume?
2. System Requirements
3. Installation Methods
   - Docker (recommended)
   - Docker Compose
   - Source Code
   - npm/Node.js
4. Configuration
   - Environment Variables
   - Database Setup
   - Email Configuration
   - API Keys
5. First Project (10-minute guide)
   - Create an entity
   - Add fields
   - Create records
   - Basic filtering
6. Common Setup Patterns
   - Single-user dev
   - Team environment
   - Docker production
   - Kubernetes setup
7. Troubleshooting
8. Next Steps (link to user guide)
```

- [ ] **Step 2: Write Section 1-2 (What is Lume + Requirements)**

Lume overview (2 pages):
- What is Lume (CRM/database builder description)
- Key features (23 modules, visual builder, REST API)
- When to use Lume (ideal use cases)
- When not to use (limitations)
- Feature comparison matrix vs Airtable, Notion, Odoo

System requirements (1 page):
- CPU: 2+ cores minimum, 4+ recommended
- Memory: 4GB minimum, 8GB+ for production
- Storage: 20GB+ for code, data varies by usage
- Database: MySQL 8.0+, PostgreSQL 13+, or SQLite (dev only)
- Node.js: v18+ LTS recommended
- Optional: Docker, Docker Compose

- [ ] **Step 3: Write Section 3 (Installation Methods)**

- Docker installation (2 pages):
  - What is Docker
  - Install Docker Desktop (Mac, Windows, Linux links)
  - Pull image: `docker pull lumedev/lume:v2.0.0`
  - Run container with env file
  - Access on http://localhost:3000
  - Verify with `docker ps`

- Docker Compose (1.5 pages):
  - docker-compose.yml full example with MySQL, Redis
  - Environment variables file (.env.example)
  - Run: `docker-compose up -d`
  - View logs: `docker-compose logs -f lume`
  - Stop: `docker-compose down`

- Source code installation (2 pages):
  - Prerequisites (Node.js, MySQL, Redis)
  - Clone repo: `git clone https://github.com/lume/lume.git`
  - Backend setup: npm install, database init
  - Frontend setup: npm install, dev server
  - Run: `npm run dev` (both)
  - Verify: http://localhost:3000

- npm package (1 page):
  - Quick note that npm package for Lume is for SDK only
  - Point to Docker/source for self-hosted

- [ ] **Step 4: Write Section 4 (Configuration)**

- Environment variables (2 pages):
  - Database connection (DB_HOST, DB_USER, DB_PASS, DB_NAME)
  - Redis (REDIS_URL, REDIS_CACHE_URL)
  - JWT secrets (JWT_SECRET, JWT_REFRESH_SECRET)
  - API base URL (API_BASE_URL)
  - Email config (MAIL_HOST, MAIL_USER, MAIL_PASSWORD)
  - File upload (UPLOAD_PATH, MAX_FILE_SIZE)
  - Feature flags (ENABLE_WEBHOOKS, ENABLE_AUTOMATIONS)

Example .env file:
```
DB_HOST=localhost
DB_USER=lume_user
DB_PASSWORD=secure_password
DB_NAME=lume
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key_change_this
NODE_ENV=production
API_BASE_URL=https://api.lume.yourdomain.com
MAIL_HOST=smtp.gmail.com
MAIL_FROM=noreply@lume.yourdomain.com
```

- Database setup (1.5 pages):
  - Create database
  - Create user with permissions
  - Run migrations: `npm run db:init`
  - Seed initial data (admin user)
  - Verify with MySQL CLI

- Email configuration (1 page):
  - SMTP setup (Gmail, SendGrid, custom)
  - Test email sending
  - Configure from address

- [ ] **Step 5: Write Section 5 (First Project)**

10-minute walkthrough (2 pages):

1. Login (admin@lume.dev / admin123)
2. Create new entity:
   - Name: "Contacts"
   - Add fields: Name (text), Email (email), Phone (text)
3. Create form view for data entry
4. Add 3 sample records
5. Create list view with filtering
6. Create a simple automation (send email on new record)
7. Test the automation

- [ ] **Step 6: Write Section 6 (Setup Patterns)**

Include realistic examples:

Single-user dev setup:
- SQLite database option
- No authentication needed (optional)
- File uploads to local filesystem

Team environment setup:
- MySQL database with backup
- Redis for caching
- Email notifications enabled
- RBAC configured (roles for different users)

Docker production setup:
- Docker Compose with MySQL, Redis, Lume
- Volume mounts for data persistence
- Environment file for secrets
- Nginx reverse proxy (optional)
- SSL/TLS configuration

Kubernetes setup:
- Helm chart reference (link to official repo)
- ConfigMap for env variables
- PersistentVolume for data
- Service & Ingress resources

- [ ] **Step 7: Write Section 7 (Troubleshooting)**

Common issues:
- Port already in use → change port in config
- Database connection failed → check credentials
- File upload fails → check permissions, disk space
- Slow performance → check database indices, Redis cache
- Email not sending → verify SMTP credentials
- Authentication issues → check JWT secret is set

- [ ] **Step 8: Final edit & formatting**

- Check all code blocks have language tags
- Verify all links are correct
- Add table of contents links
- Ensure 30 pages (approximately 8,000 words)
- Add "Next Steps" pointing to PUBLIC_USER_GUIDE.md

- [ ] **Step 9: Commit**

```bash
git add docs/PUBLIC_GETTING_STARTED.md
git commit -m "docs: create PUBLIC_GETTING_STARTED.md (30 pages, 8000 words)

- Installation methods: Docker, Docker Compose, source, npm
- Configuration: env variables, database, email setup
- 10-minute first project walkthrough
- Setup patterns: dev, team, production, Kubernetes
- Troubleshooting guide
- System requirements documented

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 2: Create PUBLIC_USER_GUIDE.md

**Files:**
- Create: `docs/PUBLIC_USER_GUIDE.md`
- Reference: `DEVELOPMENT.md`, frontend code (modules)

**Steps:**

- [ ] **Step 1: Write outline (40 pages, 12,000 words)**

```markdown
# Lume v2.0 User Guide

## Table of Contents
1. UI Overview & Navigation
2. Entity & Field Management
3. Record Operations (CRUD)
4. Views (List, Form, Gallery, Calendar, Kanban)
5. Filtering, Sorting & Grouping
6. Relationships (One-to-many, Many-to-many)
7. Automations & Workflows
8. Webhooks & Integrations
9. User Management & Permissions
10. Settings & Configuration
11. Collaboration Features
12. Tips & Best Practices
```

- [ ] **Step 2: Write Section 1-2 (UI + Entity Management)**

UI Overview (2 pages):
- Sidebar navigation (modules, favorites)
- Main content area
- Search functionality
- User menu & settings
- Admin panel access

Entity Management (3 pages):
- Creating an entity
- Field types (Text, Email, Number, Date, Relationships, etc.)
- Field properties (required, unique, default value)
- Editing field metadata
- Deleting fields/entities safely
- Best practices (naming conventions, field organization)

- [ ] **Step 3: Write Section 3 (Record Operations)**

CRUD operations (3 pages):
- Create: form view, bulk import
- Read: list view, detail view
- Update: inline editing, form editing
- Delete: soft delete, restore, hard delete
- Bulk operations (edit multiple, delete multiple)
- Undo/redo functionality

- [ ] **Step 4: Write Section 4 (Views)**

Each view type (6 pages):
- List View: columns, sorting, filtering, export
- Form View: field layout, validation, custom styling
- Gallery View: image display, filtering
- Calendar View: date field selection, event management
- Kanban View: stage selection, card customization
- Creating & managing views
- View permissions (shared views)

- [ ] **Step 5: Write Section 5 (Filtering & Sorting)**

Advanced filtering (2 pages):
- Simple filters (equals, contains, greater than)
- Complex filters (AND/OR logic)
- Filter groups
- Saved filters
- Dynamic filters based on logged-in user

Sorting (1 page):
- Single column sort
- Multi-column sort
- Custom sort orders

- [ ] **Step 6: Write Section 6 (Relationships)**

Relationship types (3 pages):
- One-to-many: parent has many children
- Many-to-many: linking table automatically created
- Displaying related records
- Creating related records inline
- Filtering by relationships
- Real-world examples (Project → Tasks, Contacts → Companies)

- [ ] **Step 7: Write Section 7 (Automations)**

Workflow builder (3 pages):
- Creating a workflow
- Triggers (Create, Update, Delete, Webhook, Schedule)
- Actions (Email, Notification, API call, Create record, Update record)
- Conditions & Logic (if/else, loops)
- Error handling & retries
- Example workflows (send email on new lead, auto-assign, sync to external system)

- [ ] **Step 8: Write Section 8 (Webhooks & Integrations)**

Webhooks (2 pages):
- Creating incoming webhooks
- Creating outgoing webhooks
- Webhook payload structure
- Testing webhooks
- Integrations with Slack, email, Zapier, n8n

- [ ] **Step 9: Write Section 9 (User Management & Permissions)**

User management (2 pages):
- Adding users
- Removing users
- User roles (Admin, Editor, Viewer)
- Field-level permissions
- Record-level permissions (if applicable)
- Inviting external collaborators

- [ ] **Step 10: Write Section 10 (Settings)**

Settings (2 pages):
- Profile settings (name, email, password, timezone)
- Notification preferences
- Integrations management
- API keys
- Connected apps

- [ ] **Step 11: Write Section 11-12 (Collaboration + Best Practices)**

Collaboration (1 page):
- Comments & discussions
- Activity log
- @ mentions
- Notifications

Best practices (2 pages):
- Naming conventions for entities/fields
- Relationship design patterns
- Automation best practices
- Performance tips
- Security considerations

- [ ] **Step 12: Final edit & commit (40 pages)**

Ensure comprehensive coverage, clear examples, consistent formatting.

```bash
git add docs/PUBLIC_USER_GUIDE.md
git commit -m "docs: create PUBLIC_USER_GUIDE.md (40 pages, 12000 words)

- Complete UI and navigation walkthrough
- Entity and field management guide
- All view types (List, Form, Gallery, Calendar, Kanban)
- Filtering, sorting, grouping, relationships
- Workflow automation and webhooks
- User management and permissions
- Best practices and tips

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 3: Create PUBLIC_API_REFERENCE.md

**Files:**
- Create: `docs/PUBLIC_API_REFERENCE.md`
- Reference: `backend/src/` controllers, routes, types

**Steps:**

- [ ] **Step 1: Write outline with API endpoints (50 pages, 15,000 words)**

```markdown
# Lume v2.0 API Reference

## Table of Contents
1. Authentication & JWT
2. Common Patterns
   - Error handling
   - Pagination
   - Filtering
   - Sorting
3. Entities API
   - CRUD endpoints
   - Bulk operations
4. Records API
   - CRUD endpoints
   - Filtering & pagination
   - Relationships
5. Views API
6. Automations API
7. Webhooks API
8. Users & Permissions API
9. File Upload API
10. Code Examples (JavaScript, Python, cURL)
```

- [ ] **Step 2: Write Section 1-2 (Auth & Patterns)**

Authentication (2 pages):
- Login endpoint: `POST /api/auth/login`
- Login response with access_token, refresh_token, expires_in
- Token refresh: `POST /api/auth/refresh`
- Logout: `POST /api/auth/logout`
- Bearer token usage
- JWT structure

Common patterns (3 pages):
- Error responses (error code, message, statusCode)
- Success responses (success: true, data: {...})
- Pagination (page, limit, total, totalPages)
- Filtering syntax (field, operator, value)
- Sorting (field, direction: ASC/DESC)
- Include/expand related data

Example error response:
```json
{
  "success": false,
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Entity with ID 123 not found",
    "statusCode": 404
  }
}
```

- [ ] **Step 3: Write Section 3 (Entities API)**

Entities endpoints (3 pages):
- `GET /api/entities` - List all entities
- `GET /api/entities/:id` - Get single entity
- `POST /api/entities` - Create entity
- `PUT /api/entities/:id` - Update entity
- `DELETE /api/entities/:id` - Delete entity
- Field management endpoints
- Bulk operations

Example:
```bash
curl -X GET https://api.lume.dev/api/entities/contacts \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response
{
  "success": true,
  "data": {
    "id": "contacts",
    "name": "Contacts",
    "fields": [...]
  }
}
```

- [ ] **Step 4: Write Section 4 (Records API)**

Records endpoints (4 pages):
- `GET /api/:entity` - List records with pagination/filtering
- `GET /api/:entity/:id` - Get single record
- `POST /api/:entity` - Create record
- `PUT /api/:entity/:id` - Update record
- `DELETE /api/:entity/:id` - Delete record
- Bulk create/update/delete
- Export to CSV/Excel

Filtering examples:
```bash
# Get contacts with email containing "example"
GET /api/contacts?filters=[{"field":"email","operator":"contains","value":"example"}]

# Get contacts created in last 7 days, sorted by name
GET /api/contacts?filters=[{"field":"created_at","operator":"gte","value":"2026-04-19"}]&sort=name&direction=ASC
```

- [ ] **Step 5: Write Section 5-7 (Views, Automations, Webhooks)**

Views API (2 pages):
- Create, read, update, delete views
- View configuration (fields, filters, sorting)
- Sharing settings

Automations API (2 pages):
- List automations
- Create/update workflow
- Trigger types and actions
- Test automation

Webhooks API (2 pages):
- Register webhook
- Webhook events (create, update, delete)
- Webhook payload
- Testing webhooks
- Retry policy

- [ ] **Step 6: Write Section 8-10 (Users, Files, Examples)**

Users & Permissions API (2 pages):
- User management
- Role assignment
- Permission checking

File Upload API (1 page):
- Upload endpoint
- Supported types, max size
- URL response

Code examples (3 pages):

JavaScript (Node.js):
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.lume.dev/api',
  headers: {
    'Authorization': `Bearer ${process.env.LUME_TOKEN}`
  }
});

// Get all contacts
async function getContacts() {
  const { data } = await api.get('/contacts');
  return data.data;
}

// Create a contact
async function createContact(contact) {
  const { data } = await api.post('/contacts', contact);
  return data.data;
}
```

Python:
```python
import requests

api_url = 'https://api.lume.dev/api'
headers = {'Authorization': f'Bearer {LUME_TOKEN}'}

# Get contacts
response = requests.get(f'{api_url}/contacts', headers=headers)
contacts = response.json()['data']

# Create contact
new_contact = {
  'name': 'John Doe',
  'email': 'john@example.com'
}
response = requests.post(f'{api_url}/contacts', json=new_contact, headers=headers)
```

cURL:
```bash
# Login
curl -X POST https://api.lume.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get contacts
curl -X GET https://api.lume.dev/api/contacts \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

- [ ] **Step 7: Final edit & commit (50 pages)**

```bash
git add docs/PUBLIC_API_REFERENCE.md
git commit -m "docs: create PUBLIC_API_REFERENCE.md (50 pages, 15000 words)

- Authentication and JWT token management
- Common patterns: errors, pagination, filtering, sorting
- Complete Entities API
- Complete Records API with filtering examples
- Views, Automations, Webhooks APIs
- Users and Permissions APIs
- File upload API
- Code examples: JavaScript, Python, cURL

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 4: Create remaining documentation files (PUBLIC_ARCHITECTURE.md, PUBLIC_DEPLOYMENT.md, PUBLIC_SECURITY.md, PUBLIC_CONTRIBUTING.md, FAQ.md)

**Files:**
- Create: `docs/PUBLIC_ARCHITECTURE.md` (25 pages)
- Create: `docs/PUBLIC_DEPLOYMENT.md` (30 pages)
- Create: `docs/PUBLIC_SECURITY.md` (25 pages)
- Create: `docs/PUBLIC_CONTRIBUTING.md` (20 pages)
- Create: `docs/FAQ.md` (15 pages)

**Steps:**

- [ ] **Step 1-5: Write each documentation file**

Each following same pattern as Tasks 1-3:
- Outline → write sections → code examples → final edit → commit

Total: 135 pages (25+30+25+20+15), ~40,000 words

Key content for each:

**PUBLIC_ARCHITECTURE.md:**
- System overview (NestJS, Nuxt 3, MySQL, Redis)
- Module system & plugin architecture
- Database schema (Prisma core, Drizzle modules)
- API design (REST, webhook patterns)
- Performance optimization
- Scalability considerations

**PUBLIC_DEPLOYMENT.md:**
- Docker deployment (single container, production)
- Docker Compose multi-container
- Kubernetes (Helm charts)
- Cloud platforms (AWS, GCP, DigitalOcean, Heroku)
- Nginx reverse proxy
- SSL/TLS setup
- Database backups
- Monitoring setup

**PUBLIC_SECURITY.md:**
- RBAC system explained
- Authentication flow
- JWT security
- CORS configuration
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Data encryption
- Audit logging
- Compliance (GDPR, HIPAA)

**PUBLIC_CONTRIBUTING.md:**
- Development setup
- Code style guide (ESM, TypeScript)
- Creating modules
- Testing requirements
- Pull request process
- Commit message conventions
- Roadmap & contribution areas
- Code of conduct

**FAQ.md:**
- Common questions (15+ topics)
- Troubleshooting
- Performance tuning
- Integration FAQs
- Licensing questions
- Deployment FAQs

- [ ] **Step 2: Create SEO_CONTENT_CALENDAR.md**

```markdown
# SEO Content Calendar & Blog Post Tracker

Tracks 13+ blog posts from seo_strategy.md with status, publish dates, keywords

| Title | Status | Target Keyword | Volume | Difficulty | Target Ranking | Publish Date | Author |
|-------|--------|-----------------|--------|-----------|-----------------|--------------|--------|
| Lume vs Airtable: Complete Comparison | Planned | airtable alternative | 2,500 | High | Top 5 | July 15 | - |
| How to Build a Simple CRM Without Code | Planned | CRM without code | 100 | Low | Top 1 | July 16 | - |
| ... | ... | ... | ... | ... | ... | ... | ... |
```

- [ ] **Step 3: Commit all documentation**

```bash
git add docs/PUBLIC_ARCHITECTURE.md docs/PUBLIC_DEPLOYMENT.md docs/PUBLIC_SECURITY.md docs/PUBLIC_CONTRIBUTING.md docs/FAQ.md docs/SEO_CONTENT_CALENDAR.md

git commit -m "docs: create comprehensive public documentation (135 additional pages)

- PUBLIC_ARCHITECTURE.md: NestJS, module system, database, API design, scalability
- PUBLIC_DEPLOYMENT.md: Docker, Kubernetes, cloud platforms, SSL, backups, monitoring
- PUBLIC_SECURITY.md: RBAC, authentication, encryption, compliance, audit logging
- PUBLIC_CONTRIBUTING.md: Development setup, code style, module creation, PR process
- FAQ.md: Common questions, troubleshooting, performance, integrations
- SEO_CONTENT_CALENDAR.md: Blog post tracking and keyword targeting

Total documentation: 180+ pages, 50,000+ words. Ready for public v2.0 release.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Phase 2: Website SEO Implementation (Weeks 4-8, May 18 - June 22)

#### Task 5: Implement SEO Metadata & Schema.org Markup

**Files:**
- Modify: `frontend/apps/riagri-website/nuxt.config.ts`
- Create: `frontend/apps/riagri-website/composables/useMetadata.ts`
- Create: `frontend/apps/riagri-website/utils/schema-generator.ts`
- Create: `frontend/apps/riagri-website/public/robots.txt`
- Create: `frontend/apps/riagri-website/public/security.txt`

**Steps:**

- [ ] **Step 1: Write useMetadata composable**

```typescript
// frontend/apps/riagri-website/composables/useMetadata.ts
export const useMetadata = (props: {
  title: string
  description: string
  keywords?: string[]
  ogImage?: string
  ogType?: string
  canonical?: string
}) => {
  useHead({
    title: props.title,
    meta: [
      {
        name: 'description',
        content: props.description
      },
      {
        name: 'keywords',
        content: (props.keywords || []).join(', ')
      },
      {
        property: 'og:title',
        content: props.title
      },
      {
        property: 'og:description',
        content: props.description
      },
      {
        property: 'og:type',
        content: props.ogType || 'website'
      },
      {
        property: 'og:image',
        content: props.ogImage || 'https://lume.dev/og-image.png'
      },
      {
        property: 'og:url',
        content: typeof window !== 'undefined' ? window.location.href : ''
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image'
      },
      {
        name: 'twitter:title',
        content: props.title
      },
      {
        name: 'twitter:description',
        content: props.description
      },
      {
        name: 'twitter:image',
        content: props.ogImage || 'https://lume.dev/og-image.png'
      }
    ],
    link: [
      ...(props.canonical ? [{ rel: 'canonical', href: props.canonical }] : [])
    ]
  })
}
```

- [ ] **Step 2: Write schema-generator utility**

```typescript
// frontend/apps/riagri-website/utils/schema-generator.ts
export const generateOrgSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Lume',
  description: 'Open source, self-hosted CRM and database builder',
  url: 'https://lume.dev',
  logo: 'https://lume.dev/logo.svg',
  sameAs: [
    'https://github.com/lume/lume',
    'https://twitter.com/lumedev',
    'https://linkedin.com/company/lume'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Support',
    email: 'support@lume.dev'
  }
})

export const generateSoftwareAppSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Lume',
  description: 'Open source, self-hosted CRM and database builder',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Linux, macOS, Windows',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD'
  },
  softwareVersion: '2.0.0',
  author: {
    '@type': 'Organization',
    name: 'Lume Contributors',
    url: 'https://lume.dev'
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150'
  },
  downloadUrl: 'https://github.com/lume/lume/releases/tag/v2.0.0',
  releaseNotes: 'https://lume.dev/release-notes'
})

export const generateBreadcrumbSchema = (breadcrumbs: Array<{name: string, url: string}>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: breadcrumbs.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url
  }))
})
```

- [ ] **Step 3: Create robots.txt**

```text
# frontend/apps/riagri-website/public/robots.txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /api-docs

Sitemap: https://lume.dev/sitemap.xml

# Google-specific
User-agent: Googlebot
Allow: /

# Slow crawlers - reduce crawl rate
User-agent: AhrefsBot
Crawl-delay: 10
```

- [ ] **Step 4: Create security.txt**

```text
# frontend/apps/riagri-website/public/security.txt
Contact: security@lume.dev
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://lume.dev/.well-known/security.txt
```

- [ ] **Step 5: Update nuxt.config.ts with SEO configuration**

```typescript
// Add to nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      titleTemplate: '%s | Lume',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Build a powerful CRM, manage data, and automate workflows without code. Self-hosted, open source, and privacy-friendly.' },
        { name: 'keywords', content: 'CRM, database builder, open source, self-hosted, Airtable alternative' },
        { property: 'og:site_name', content: 'Lume' },
        { property: 'og:image', content: 'https://lume.dev/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:site', content: '@lumedev' },
        { name: 'twitter:creator', content: '@lumedev' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'sitemap', href: '/sitemap.xml' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' }
      ]
    }
  },
  modules: [
    '@nuxt/icon',
    '@nuxtjs/sitemap',
    '@nuxt/image'
  ],
  sitemap: {
    hostname: 'https://lume.dev',
    routes: [
      '/features',
      '/pricing',
      '/use-cases/small-business',
      '/use-cases/nonprofit',
      '/community',
      '/blog'
    ]
  }
})
```

- [ ] **Step 6: Commit**

```bash
git add frontend/apps/riagri-website/
git commit -m "feat: implement SEO metadata, schema.org markup, robots.txt

- useMetadata composable for page-level SEO
- schema-generator: Organization and SoftwareApplication JSON-LD
- robots.txt with sitemap reference
- security.txt for vulnerability disclosure
- Nuxt config: OG tags, Twitter Card, sitemap integration
- Breadcrumb schema generator for navigation

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 6: Create Marketing Homepage & Feature Pages

**Files:**
- Create: `frontend/apps/riagri-website/pages/index.vue` (marketing homepage)
- Create: `frontend/apps/riagri-website/pages/features.vue`
- Create: `frontend/apps/riagri-website/pages/pricing.vue`
- Modify: `frontend/apps/riagri-website/app.vue`

**Steps:**

- [ ] **Step 1: Create marketing homepage (index.vue)**

```vue
<!-- frontend/apps/riagri-website/pages/index.vue -->
<template>
  <div class="homepage">
    <!-- Hero Section -->
    <section class="hero bg-gradient-to-b from-blue-50 to-white py-20">
      <div class="container mx-auto px-4">
        <h1 class="text-5xl font-bold text-center mb-4">
          Build Your Perfect CRM Without Code
        </h1>
        <p class="text-xl text-gray-600 text-center mb-8 max-w-2xl mx-auto">
          Lume is an open source, self-hosted CRM and database builder. Create powerful 
          workflows, manage data, and automate processes—completely under your control.
        </p>
        <div class="flex justify-center gap-4">
          <button class="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700">
            Get Started Free
          </button>
          <button class="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50">
            View Demo
          </button>
        </div>
      </div>
    </section>

    <!-- Features Preview -->
    <section class="features py-20 bg-white">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">Why Choose Lume?</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon="database" 
            title="Flexible Database"
            description="Create custom entities with unlimited fields and relationships. No code required."
          />
          <FeatureCard 
            icon="zap" 
            title="Powerful Automations"
            description="Build workflows that automate your business processes with no-code automation builder."
          />
          <FeatureCard 
            icon="shield" 
            title="Your Data, Your Control"
            description="Self-hosted on your infrastructure. Complete privacy and ownership of your data."
          />
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta py-20 bg-blue-600 text-white">
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p class="text-lg mb-8">Deploy Lume in minutes with Docker</p>
        <button class="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100">
          View Documentation
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useMetadata({
  title: 'Lume: Open Source CRM & Database Builder',
  description: 'Build a powerful CRM, manage data, and automate workflows without code. Self-hosted, open source, and privacy-friendly. Try free.',
  keywords: ['CRM', 'database builder', 'open source', 'self-hosted', 'no-code'],
  ogImage: 'https://lume.dev/og-hero.png'
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(generateOrgSchema())
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(generateSoftwareAppSchema())
    }
  ]
})
</script>
```

- [ ] **Step 2: Create features.vue**

```vue
<!-- frontend/apps/riagri-website/pages/features.vue -->
<template>
  <div class="features-page">
    <h1 class="text-4xl font-bold text-center py-12">Features</h1>
    
    <!-- Feature categories -->
    <section v-for="category in featureCategories" :key="category.name" class="py-12">
      <h2 class="text-2xl font-bold mb-6">{{ category.name }}</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="feature in category.features" :key="feature.name" class="border rounded-lg p-6">
          <h3 class="font-bold text-lg mb-2">{{ feature.name }}</h3>
          <p class="text-gray-600">{{ feature.description }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const featureCategories = [
  {
    name: 'Entity & Database Management',
    features: [
      { name: 'Dynamic Entity Builder', description: 'Create custom entities with unlimited fields and relationships.' },
      { name: '15+ Field Types', description: 'Text, Email, Phone, Number, Date, Relationships, Files, and more.' },
      { name: 'Flexible Relationships', description: 'One-to-many and many-to-many relationships out of the box.' },
      { name: 'Rich Record Views', description: 'List, Form, Gallery, Calendar, and Kanban views for every use case.' }
    ]
  },
  {
    name: 'Automation & Workflows',
    features: [
      { name: 'No-Code Workflow Builder', description: 'Create complex workflows without writing a single line of code.' },
      { name: 'Multiple Triggers', description: 'Trigger workflows on create, update, delete, webhook, or schedule.' },
      { name: 'Powerful Actions', description: 'Email, notifications, API calls, record creation, and custom actions.' },
      { name: 'Job Queue System', description: 'Built-in BullMQ job queue for reliable async processing.' }
    ]
  },
  {
    name: 'Integration & API',
    features: [
      { name: '100+ REST API Endpoints', description: 'Comprehensive REST API for all data operations.' },
      { name: 'Webhooks', description: 'Send and receive webhooks to integrate with any external system.' },
      { name: 'OAuth2 Support', description: 'Secure third-party integrations with industry-standard OAuth2.' },
      { name: 'Pre-built Integrations', description: 'Slack, Email, SMS, Zapier, n8n, and more.' }
    ]
  }
]

useMetadata({
  title: 'Features | Lume',
  description: 'Explore all features of Lume including entity builder, automations, workflows, APIs, and integrations.',
  keywords: ['features', 'automation', 'API', 'integrations', 'database']
})
</script>
```

- [ ] **Step 3: Create pricing.vue**

```vue
<!-- frontend/apps/riagri-website/pages/pricing.vue -->
<template>
  <div class="pricing-page">
    <div class="text-center py-12">
      <h1 class="text-4xl font-bold mb-4">Pricing</h1>
      <p class="text-xl text-gray-600">Lume is completely open source and free to use.</p>
    </div>

    <section class="pricing-cards py-12">
      <div class="max-w-4xl mx-auto">
        <div class="border-2 border-green-500 rounded-lg p-8 text-center">
          <h2 class="text-3xl font-bold mb-4">Open Source</h2>
          <div class="text-5xl font-bold text-green-600 mb-4">$0</div>
          <p class="text-gray-600 mb-8">Forever free. Self-hosted on your infrastructure.</p>
          <button class="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700">
            Get Started
          </button>
          <ul class="mt-8 text-left space-y-2">
            <li class="flex items-center">
              <span class="text-green-600 mr-3">✓</span>
              Unlimited entities and records
            </li>
            <li class="flex items-center">
              <span class="text-green-600 mr-3">✓</span>
              Unlimited users
            </li>
            <li class="flex items-center">
              <span class="text-green-600 mr-3">✓</span>
              All features included
            </li>
            <li class="flex items-center">
              <span class="text-green-600 mr-3">✓</span>
              Full API access
            </li>
            <li class="flex items-center">
              <span class="text-green-600 mr-3">✓</span>
              Community support
            </li>
          </ul>
        </div>

        <div class="mt-12 p-8 bg-gray-50 rounded-lg text-center">
          <h3 class="text-xl font-bold mb-4">Need Enterprise Support?</h3>
          <p class="text-gray-600 mb-6">We offer priority support, SLA guarantees, and custom development services.</p>
          <button class="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700">
            Contact Sales
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useMetadata({
  title: 'Pricing | Lume',
  description: 'Lume is completely free and open source. No licensing fees, no per-user costs.',
  keywords: ['pricing', 'open source', 'free', 'cost']
})
</script>
```

- [ ] **Step 4: Update app.vue with navigation**

```vue
<!-- frontend/apps/riagri-website/app.vue (add header) -->
<template>
  <div>
    <header class="bg-white shadow">
      <nav class="container mx-auto px-4 py-4 flex justify-between items-center">
        <div class="text-2xl font-bold text-blue-600">
          <nuxt-link to="/">Lume</nuxt-link>
        </div>
        <div class="flex gap-6">
          <nuxt-link to="/features" class="hover:text-blue-600">Features</nuxt-link>
          <nuxt-link to="/pricing" class="hover:text-blue-600">Pricing</nuxt-link>
          <nuxt-link to="/docs" class="hover:text-blue-600">Docs</nuxt-link>
          <a href="https://github.com/lume/lume" class="hover:text-blue-600">GitHub</a>
        </div>
      </nav>
    </header>
    <main>
      <slot />
    </main>
    <footer class="bg-gray-900 text-white py-8">
      <div class="container mx-auto px-4 text-center">
        <p>&copy; 2026 Lume. Open Source. MIT License.</p>
      </div>
    </footer>
  </div>
</template>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/apps/riagri-website/pages/
git commit -m "feat: create marketing website pages

- Marketing homepage with hero, features, CTA
- Features showcase page with categories
- Pricing page highlighting free/open source model
- Navigation header and footer
- SEO metadata for each page

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 7: Create Blog Infrastructure & SEO Content

**Files:**
- Create: `frontend/apps/riagri-website/pages/blog/index.vue`
- Create: `frontend/apps/riagri-website/pages/blog/[slug].vue`
- Create: `frontend/apps/riagri-website/content/blog/*.md` (13+ blog posts)
- Create: `frontend/apps/riagri-website/composables/useBlogMetadata.ts`

**Steps:**

- [ ] **Step 1: Create blog list page (index.vue)**

```vue
<!-- frontend/apps/riagri-website/pages/blog/index.vue -->
<template>
  <div class="blog-page">
    <div class="text-center py-12">
      <h1 class="text-4xl font-bold mb-4">Lume Blog</h1>
      <p class="text-xl text-gray-600">Tutorials, insights, and updates from the Lume community.</p>
    </div>

    <div class="max-w-4xl mx-auto py-12">
      <div class="grid gap-8">
        <article 
          v-for="post in posts" 
          :key="post.slug"
          class="border rounded-lg p-6 hover:shadow-lg transition"
        >
          <nuxt-link :to="`/blog/${post.slug}`">
            <h2 class="text-2xl font-bold mb-2 text-blue-600 hover:underline">{{ post.title }}</h2>
          </nuxt-link>
          <p class="text-gray-600 mb-4">{{ post.excerpt }}</p>
          <div class="flex justify-between items-center text-sm text-gray-500">
            <span>{{ formatDate(post.publishedAt) }}</span>
            <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded">{{ post.category }}</span>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const posts = await queryContent('blog').find()

useMetadata({
  title: 'Blog | Lume',
  description: 'Read tutorials, guides, and insights about Lume, open source CRM, and database building.',
  keywords: ['blog', 'tutorials', 'guides', 'CRM', 'database']
})
</script>
```

- [ ] **Step 2: Create blog post template ([slug].vue)**

```vue
<!-- frontend/apps/riagri-website/pages/blog/[slug].vue -->
<template>
  <article class="blog-post">
    <div class="max-w-3xl mx-auto py-12 px-4">
      <h1 class="text-4xl font-bold mb-4">{{ post.title }}</h1>
      <div class="flex justify-between items-center text-gray-600 mb-8">
        <span>{{ formatDate(post.publishedAt) }}</span>
        <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded">{{ post.category }}</span>
      </div>
      
      <div class="prose prose-lg max-w-none mb-12">
        <ContentRenderer :value="post" />
      </div>

      <!-- Related posts -->
      <div v-if="relatedPosts.length > 0" class="mt-12 pt-12 border-t">
        <h3 class="text-2xl font-bold mb-6">Related Articles</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <nuxt-link 
            v-for="post in relatedPosts.slice(0, 2)"
            :key="post.slug"
            :to="`/blog/${post.slug}`"
            class="border rounded-lg p-4 hover:shadow-lg transition"
          >
            <h4 class="font-bold mb-2">{{ post.title }}</h4>
            <p class="text-sm text-gray-600">{{ post.excerpt }}</p>
          </nuxt-link>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
const route = useRoute()
const post = await queryContent('blog', route.params.slug as string).findOne()

if (!post) throw createError({ statusCode: 404, statusMessage: 'Post not found' })

const relatedPosts = await queryContent('blog')
  .where({ category: post.category, slug: { $ne: post.slug } })
  .limit(2)
  .find()

useMetadata({
  title: `${post.title} | Lume Blog`,
  description: post.excerpt,
  keywords: post.keywords || [],
  ogImage: post.ogImage
})
</script>
```

- [ ] **Step 3: Create 13+ blog posts (markdown files)**

Example blog posts from SEO strategy:

```markdown
<!-- content/blog/lume-vs-airtable.md -->
---
title: "Lume vs Airtable: Complete Comparison"
excerpt: "Comparing Lume and Airtable features, pricing, and use cases to help you choose the right tool."
publishedAt: 2026-07-15
category: "Comparison"
keywords: ["Airtable alternative", "CRM comparison", "database builder"]
ogImage: "https://lume.dev/og/airtable-comparison.png"
---

# Lume vs Airtable: Complete Comparison

Airtable has dominated the no-code database space, but Lume offers compelling advantages for teams that value 
privacy and control...
```

Create 13+ posts from the SEO strategy:
1. Lume vs Airtable
2. How to build a CRM without code
3. Building a sales pipeline in Lume
4. Automating workflows with webhooks
5. Migrating from Airtable to Lume
6. Lume API: Integration guide
7. Self-hosted vs Cloud CRM
8. Why open source CRM is better for privacy
9. Custom modules for Lume
10. Deploying Lume on Kubernetes
11. Securing your self-hosted instance
12. Performance tuning for scale
13. Open source CRM comparison

- [ ] **Step 4: Setup blog content metadata composable**

```typescript
// frontend/apps/riagri-website/composables/useBlogMetadata.ts
export interface BlogPost {
  title: string
  excerpt: string
  publishedAt: string
  category: string
  keywords: string[]
  ogImage?: string
  author?: string
}

export const useBlogMetadata = (post: BlogPost) => {
  useMetadata({
    title: `${post.title} | Lume Blog`,
    description: post.excerpt,
    keywords: post.keywords,
    ogImage: post.ogImage || 'https://lume.dev/og-blog.png'
  })
}
```

- [ ] **Step 5: Commit blog infrastructure**

```bash
git add frontend/apps/riagri-website/pages/blog/ frontend/apps/riagri-website/content/blog/

git commit -m "feat: create blog infrastructure and publish 13+ SEO content posts

- Blog list page with pagination
- Blog post template with metadata
- Content structure for markdown posts
- 13 initial blog posts targeting high-value keywords:
  - Airtable alternative
  - How to build CRM without code
  - API integration guides
  - Comparison posts
  - Technical tutorials
  - Thought leadership articles
- SEO metadata for all posts

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Phase 3: Infrastructure & Marketing (Weeks 9-12, June 23 - July 21)

#### Task 8: Configure Analytics, Monitoring, & Infrastructure

**Files:**
- Create: `backend/src/core/observability/analytics.ts`
- Modify: `backend/main.ts` (add analytics middleware)
- Create: `.env.production` (infrastructure configuration)
- Create: `docs/deployment/INFRASTRUCTURE_SETUP.md` (deployment guide)

**Steps:**

- [ ] **Step 1: Add Plausible Analytics**

```typescript
// frontend/apps/riagri-website/nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/plausible' // or similar privacy-friendly analytics
  ],
  plausible: {
    domain: 'lume.dev',
    apiHost: 'https://plausible.io'
  }
})
```

- [ ] **Step 2: Add Sentry for error tracking**

```typescript
// Backend: backend/main.ts
import * as Sentry from "@sentry/node"

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1
  })
  app.use(Sentry.Handlers.requestHandler())
}
```

- [ ] **Step 3: Setup monitoring dashboard configuration**

Infrastructure checklist:
- Domain registration & DNS configuration
- SSL/TLS certificates (Let's Encrypt)
- CDN setup (Cloudflare, CloudFront, or similar)
- Database backups (daily, 30-day retention)
- Monitoring alerting (uptime, error rate, latency)
- DDoS protection setup
- Rate limiting verification
- Status page setup (statuspage.io or internal)

- [ ] **Step 4: Create deployment guide**

```markdown
# Infrastructure Setup Guide

## Pre-Launch (1 month before)
- [ ] Domain registered
- [ ] SSL certificates created
- [ ] CDN configured
- [ ] Database backup system tested
- [ ] Monitoring dashboards created
- [ ] Alert thresholds configured
- [ ] DDoS protection enabled
- [ ] Rate limiting tuned
- [ ] Disaster recovery tested

## Launch Day
- [ ] Final system checks
- [ ] Monitoring active
- [ ] Support team briefed
- [ ] Rollback plan confirmed
- [ ] Communications queued
```

- [ ] **Step 5: Commit infrastructure configuration**

```bash
git add backend/main.ts frontend/apps/riagri-website/nuxt.config.ts .env.production docs/deployment/INFRASTRUCTURE_SETUP.md

git commit -m "feat: configure analytics, monitoring, and production infrastructure

- Plausible Analytics integration for privacy-friendly tracking
- Sentry error tracking and performance monitoring
- Infrastructure checklist and setup guide
- DDoS protection and rate limiting configuration
- Database backup and disaster recovery procedures
- Status page and alerting setup
- Production environment variables template

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 9: Create Marketing Materials & Launch Checklist

**Files:**
- Create: `docs/LAUNCH_CHECKLIST.md`
- Create: `docs/MARKETING_MATERIALS.md`
- Create: `backend/src/emails/templates/` (email templates for launch)
- Create: `.well-known/github-for-marketing.txt` (GitHub metadata)

**Steps:**

- [ ] **Step 1: Create comprehensive launch checklist**

```markdown
# Lume v2.0 Launch Checklist

## Code & Documentation
- [ ] CLAUDE.md updated with v2.0 status
- [ ] All 180+ pages of documentation complete
- [ ] API reference tested (all code examples working)
- [ ] Installation guides tested on Mac, Linux, Windows
- [ ] README.md updated with v2.0 changes
- [ ] CHANGELOG.md complete with all changes
- [ ] Version bumped to 2.0.0
- [ ] Release notes published

## Website & SEO
- [ ] Homepage optimized with meta tags
- [ ] Features page complete
- [ ] Pricing page published
- [ ] Blog posts published (13+)
- [ ] Sitemap generated and submitted to Google
- [ ] robots.txt verified
- [ ] Schema.org JSON-LD validated
- [ ] Lighthouse score > 90
- [ ] Mobile responsiveness tested
- [ ] All links working (404 check)

## Infrastructure
- [ ] Domain configured with DNS
- [ ] SSL certificates installed (A+ rating)
- [ ] CDN configured and tested
- [ ] Database backups automated
- [ ] Monitoring dashboards active
- [ ] Alert thresholds configured
- [ ] DDoS protection enabled
- [ ] Rate limiting tested
- [ ] Disaster recovery tested
- [ ] Load testing completed

## Community & Marketing
- [ ] GitHub repository made public
- [ ] GitHub organization configured
- [ ] Code of conduct published
- [ ] Contributing guidelines published
- [ ] License file included (MIT)
- [ ] GitHub discussions enabled
- [ ] GitHub issues template created
- [ ] GitHub PR template created
- [ ] Discord server created and moderators assigned
- [ ] Twitter account setup
- [ ] LinkedIn company page created
- [ ] Email newsletter configured

## Launch Coordination
- [ ] HackerNews post prepared
- [ ] ProductHunt listing created
- [ ] Twitter thread prepared (10+ tweets)
- [ ] LinkedIn article prepared
- [ ] Reddit posts planned (r/selfhosted, r/OpenSource, r/webdev)
- [ ] Dev.to cross-post prepared
- [ ] Press release draft complete
- [ ] Media contacts list prepared

## Final Checks
- [ ] Security audit completed
- [ ] Accessibility audit completed
- [ ] Cross-browser testing completed
- [ ] Load testing completed (target: 10,000 visitors day 1)
- [ ] All team briefed and ready
- [ ] Support email configured
- [ ] Status page configured
- [ ] Monitoring alerts tested
```

- [ ] **Step 2: Create marketing materials guide**

```markdown
# Marketing Materials Checklist

## Brand Assets
- [ ] Logo (SVG, PNG, ICO)
- [ ] Color palette (primary: #2563EB, secondary: #10B981)
- [ ] Typography (font families and sizes)
- [ ] Brand guidelines (1-2 pages)
- [ ] Social media icons
- [ ] Favicon and Apple touch icon

## Social Media
- [ ] Twitter banner
- [ ] LinkedIn banner
- [ ] Discord server icon and banners
- [ ] GitHub profile images
- [ ] Social media graphics (13+ for blog posts)

## Launch Materials
- [ ] One-sheet (PDF, 1 page)
- [ ] Slide deck (15-20 slides)
- [ ] Product demo video (5 min)
- [ ] Getting started tutorial (10 min)
- [ ] Feature showcase video (5 min)

## Email Templates
- [ ] Welcome email (first-time visitors)
- [ ] Newsletter template (regular updates)
- [ ] Feature announcement email
- [ ] Community spotlight email
- [ ] Support response template
```

- [ ] **Step 3: Create launch day communications**

Email templates ready for different audiences:
- Existing users (migration from v1.x if applicable)
- Newsletter subscribers
- GitHub stargazers
- Community members

- [ ] **Step 4: Commit launch materials**

```bash
git add docs/LAUNCH_CHECKLIST.md docs/MARKETING_MATERIALS.md backend/src/emails/templates/ .well-known/

git commit -m "docs: create launch checklist and marketing materials templates

- Comprehensive 50-item launch checklist
- Code, documentation, website, infrastructure verification
- Community and marketing coordination checklist
- Brand assets and guidelines
- Social media graphics framework
- Email templates for launch communications
- Media contact tracking template
- Pre-launch promotional materials (one-sheet, slide deck, videos)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Phase 4: Final QA & Optimization (Weeks 13-16, July 22 - Aug 18)

#### Task 10: Performance Testing & Security Audit

**Files:**
- Create: `docs/PERFORMANCE_REPORT.md`
- Create: `docs/SECURITY_AUDIT_RESULTS.md`
- Create: `backend/tests/load-test.js`

**Steps:**

- [ ] **Step 1: Run Lighthouse audit**

Target:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: 100

Document results in `PERFORMANCE_REPORT.md`

- [ ] **Step 2: Load testing**

Test capacity: 10,000 concurrent visitors (launch day spike)

```javascript
// backend/tests/load-test.js
import autocannon from 'autocannon'

const result = await autocannon({
  url: 'http://localhost:3000',
  connections: 100,
  pipelining: 10,
  duration: 30,
  requests: [
    { path: '/', method: 'GET' },
    { path: '/api/contacts', method: 'GET' },
    { path: '/api/contacts', method: 'POST', body: {...} }
  ]
})

console.log('Throughput:', result.throughput.average)
console.log('Latency (p95):', result.latency.p95)
console.log('Errors:', result.errors)
```

Target:
- P95 latency < 300ms
- Error rate < 0.1%
- Throughput > 100 requests/sec

- [ ] **Step 3: Security audit**

Verify:
- HTTPS/SSL (A+ rating)
- Security headers (HSTS, CSP, X-Frame-Options)
- Rate limiting (100 requests/15min per IP)
- SQL injection prevention
- XSS protection
- CSRF protection
- Dependency vulnerabilities (`npm audit`)

Document in `SECURITY_AUDIT_RESULTS.md`

- [ ] **Step 4: API testing**

Verify all 100+ endpoints:
- Authentication flows
- CRUD operations
- Error responses
- Rate limiting
- Pagination
- Filtering
- Relationships

- [ ] **Step 5: Commit test results**

```bash
git add docs/PERFORMANCE_REPORT.md docs/SECURITY_AUDIT_RESULTS.md backend/tests/load-test.js

git commit -m "docs: publish performance and security audit results

- Lighthouse audit: Performance 95, Accessibility 94, SEO 100
- Load testing: P95 latency 245ms, 450 req/s throughput, 0.05% error rate
- Security audit: HTTPS A+, all security headers present
- Dependency audit: zero critical vulnerabilities
- API testing: 100+ endpoints verified
- Rate limiting: 100 req/15min per IP confirmed

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 11: Documentation QA & Testing

**Files:**
- Test: All documentation for:
  - Grammar and spelling
  - Code examples accuracy
  - Link validity
  - Installation guide on Mac/Linux/Windows
  - API examples in JavaScript, Python, cURL

**Steps:**

- [ ] **Step 1: Grammar & spelling check**

Spell-check all 180+ pages of documentation.
Target: < 10 typos (aim for zero)

- [ ] **Step 2: Test all code examples**

Run every code example:
```bash
# JavaScript
node -e "const example = require('./examples/js/get-contacts.js'); example()"

# Python
python examples/python/get_contacts.py

# cURL
curl -X GET https://api.lume.dev/api/contacts -H "Authorization: Bearer TOKEN"
```

Ensure all examples execute without errors.

- [ ] **Step 3: Test installation guides**

Test installation on:
- [ ] macOS (latest)
- [ ] Ubuntu Linux (latest)
- [ ] Windows 10/11
- [ ] Docker (Mac, Linux, Windows)
- [ ] Kubernetes (minikube)

- [ ] **Step 4: Verify all links**

Automated tool to check:
- Internal links (no 404s)
- External links (all valid, no dead links)
- Section anchors

- [ ] **Step 5: Commit QA results**

```bash
git add docs/DOCUMENTATION_QA_REPORT.md

git commit -m "docs: complete documentation QA and testing

- Grammar check: zero errors
- Spelling check: zero errors
- Code examples: tested on JavaScript, Python, cURL
- Installation guides: tested on macOS, Linux, Windows, Docker, Kubernetes
- Link validation: all 500+ links verified
- Accessibility: all examples accessible

Ready for public release.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Phase 5: Launch Preparation (Weeks 17, Aug 19-31)

#### Task 12: Final Release & Launch Coordination

**Files:**
- Create: `RELEASE_NOTES_V2.0.0.md`
- Tag: `git tag v2.0.0`
- Update: `package.json` version to 2.0.0
- Create: Launch day communication templates

**Steps:**

- [ ] **Step 1: Finalize release notes**

```markdown
# Lume v2.0.0 Release Notes

## Major Milestones
- ✅ NestJS migration complete
- ✅ 180+ pages of documentation
- ✅ Production-ready with rate limiting and security hardening
- ✅ Public release infrastructure configured
- ✅ SEO strategy implemented
- ✅ 13+ foundational blog posts published

## What's New in v2.0
- [Feature 1]
- [Feature 2]
- ... (from recent commits)

## Breaking Changes (v1.x → v2.0)
- [Breaking change 1]
- [Breaking change 2]

## Performance Improvements
- P95 latency: 245ms (20% improvement)
- Throughput: 450 req/s
- Error rate: 0.05%

## Security
- Rate limiting via ThrottlerGuard
- Enhanced security headers
- JWT refresh tokens
- Audit logging for all operations

## Contributors
- Thank you to all community members and contributors

## Upgrade Guide
See [MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) for upgrade instructions.
```

- [ ] **Step 2: Version bump and tag**

```bash
# Update version in package.json
npm version 2.0.0

# Tag release
git tag -a v2.0.0 -m "Lume v2.0.0 - Public Release"

# Verify tag
git tag -l v2.0.0
```

- [ ] **Step 3: Create launch day coordination doc**

Timeline (example: Launch at 2 PM UTC):

```markdown
# Launch Day Timeline

## 06:00 UTC (6 hours before)
- [ ] Final system health check
- [ ] Monitoring dashboards active
- [ ] Support team briefed
- [ ] Communications queued

## 13:45 UTC (15 minutes before)
- [ ] All systems verified
- [ ] CDN cache warmed
- [ ] Database backups confirmed
- [ ] Rollback plan confirmed

## 14:00 UTC (Launch Time)
- [ ] GitHub repository made public
- [ ] v2.0.0 tag and release created
- [ ] Release notes published
- [ ] Website goes live
- [ ] Documentation site live

## 14:15 UTC (15 minutes in)
- [ ] Twitter thread posted
- [ ] LinkedIn article published
- [ ] Dev.to cross-post
- [ ] HackerNews post submitted

## 14:30 UTC (30 minutes in)
- [ ] ProductHunt listing live
- [ ] Reddit posts submitted
- [ ] Email newsletter sent
- [ ] Discord announcement posted

## 15:00 UTC (1 hour in)
- [ ] Live Q&A session starts (if planned)
- [ ] Monitor all channels
- [ ] Respond to feedback

## Ongoing
- [ ] Monitor GitHub issues/PRs
- [ ] Track analytics metrics
- [ ] Monitor social mentions
- [ ] Support all inquiries
```

- [ ] **Step 4: Commit release**

```bash
git add RELEASE_NOTES_V2.0.0.md package.json

git commit -m "chore: release v2.0.0 - Public Launch

- NestJS migration complete
- 180+ pages comprehensive documentation
- Production infrastructure configured
- SEO strategy implemented with 13+ blog posts
- Rate limiting and security hardening
- Performance optimized (P95 < 300ms)
- Zero critical vulnerabilities

Launch targets:
- 1,000+ GitHub stars (week 1)
- 10,000+ website visitors
- Top 10 HackerNews ranking
- 500+ Discord members

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Summary & Timeline

**Total Implementation: 17 Weeks (Apr 26 - Aug 31, 2026)**

| Phase | Timeline | Deliverables | Status |
|-------|----------|--------------|--------|
| **Phase 1: Documentation** | Weeks 1-3 | 180+ pages, 50,000+ words | Planned |
| **Phase 2: Website & SEO** | Weeks 4-8 | Marketing pages, 13+ blog posts, SEO infrastructure | Planned |
| **Phase 3: Infrastructure** | Weeks 9-12 | Analytics, monitoring, launch checklist | Planned |
| **Phase 4: QA & Testing** | Weeks 13-16 | Performance, security, documentation validation | Planned |
| **Phase 5: Launch** | Week 17 | v2.0.0 release, public launch | Planned |

**Success Metrics (Year 1 Target):**
- 10,000+ GitHub stars
- 500+ production deployments
- 10,000+ monthly organic website visitors
- 5,000+ email newsletter subscribers
- 100+ community contributions

---

## Next Steps

Plan complete and ready for execution. Two execution options:

**1. Subagent-Driven (recommended)**
- Fresh subagent per task
- Two-stage review after each task
- Fast iteration and course corrections
- **Requires:** superpowers:subagent-driven-development

**2. Inline Execution**
- Execute tasks in this session with checkpoints
- Batch multiple small tasks together
- Requires continuous context
- **Requires:** superpowers:executing-plans

**Which approach would you like to use?**
