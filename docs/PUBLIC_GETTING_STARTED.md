# Lume v2.0 — Getting Started Guide

**Last Updated**: April 2026 | **Version**: 2.0.0 | **Status**: Production-Ready

---

## Table of Contents

1. [What is Lume?](#what-is-lume)
2. [System Requirements](#system-requirements)
3. [Installation Methods](#installation-methods)
   - [Docker (Recommended)](#docker-recommended)
   - [Docker Compose](#docker-compose)
   - [Source Code Installation](#source-code-installation)
   - [npm Package](#npm-package)
4. [Configuration](#configuration)
5. [First Project: 10-Minute Setup](#first-project-10-minute-setup)
6. [Setup Patterns](#setup-patterns)
7. [Troubleshooting](#troubleshooting)
8. [Next Steps](#next-steps)

---

## What is Lume?

### Overview

Lume is a **production-ready, modular database and CRM builder** designed for teams who need a flexible alternative to Airtable, Notion, or Odoo. Built on Node.js and powered by a hybrid ORM (Prisma + Drizzle), Lume enables you to create custom data models, workflows, and web experiences—all without writing code.

At its core, Lume is a **backend-as-a-service (BaaS) platform** that combines:
- A data management layer with 23 pluggable modules
- A visual page builder (TipTap-based WYSIWYG editor)
- A full-featured CMS for managing content and menus
- Role-based access control with 147+ granular permissions
- REST API for custom integrations
- Real-time notifications via WebSocket

Lume is **self-hosted**, meaning you own and control your data. Deploy on Docker, Kubernetes, or any server you manage. There's no vendor lock-in, no surprise pricing increases—just a powerful, open-source framework for building internal tools and public websites.

### Key Features

**Database & CRM Capabilities**
- Create unlimited entities (CRM contacts, project tasks, inventory items, etc.)
- Define custom fields (text, number, date, checkbox, dropdown, file uploads)
- Establish relationships between entities (1-to-many, many-to-many)
- Automatic audit logging with field-level change tracking
- Soft delete support with automatic filtering

**Visual Page Builder**
- Drag-and-drop editor with 30+ pre-built widget blocks
- Responsive design preview (desktop/tablet/mobile)
- Animation library with entrance/exit effects
- Template system with 6 default templates
- Reusable code snippets and component library
- Live preview with real-time editing

**Website CMS**
- Pages, hierarchical menus, media library
- Full SEO optimization (meta tags, Open Graph, XML sitemap, robots.txt, Schema.org JSON-LD)
- Content scheduling (publish/expiration dates)
- Page access control (public/private/password-protected/members-only)
- Theme builder with header/footer/sidebar customization
- Form builder with email notifications

**Security & Compliance**
- JWT authentication with refresh tokens
- 2FA (TOTP) support
- 6 default roles: Super Admin, Admin, Editor, Contributor, Viewer, Subscriber
- API key management
- IP access control
- Rate limiting (100 req/15min general, 10 req/15min auth)
- Automatic password hashing
- CORS, CSP, X-Frame-Options security headers

**Automation & Workflows**
- Business rule engine
- Approval workflows
- Email/webhook notifications
- Bulk operations
- Scheduling

**23 Pluggable Modules**
- **Core**: Authentication, Base (roles/permissions/users)
- **Content**: Editor (page builder), Website (CMS), Media (file library)
- **Features**: Automation, Security, RBAC, Documents, Donations, Activities, Messages, Team, Customization
- **Advanced**: Analytics, Integrations, Custom Fields, Reporting, and more

### When to Use Lume

Lume is ideal for:
- **Internal tools**: Replace Excel spreadsheets, Google Forms, and Ad-hoc databases
- **CRM systems**: Contact management, deal pipelines, customer data
- **Project management**: Task tracking, team collaboration, resource planning
- **Content platforms**: Multi-page websites, blogs, knowledge bases
- **Inventory management**: SKU tracking, warehouse organization, stock alerts
- **Donation platforms**: Donor databases, campaign tracking, fundraising analytics
- **Document management**: File storage, versioning, access control
- **SaaS MVPs**: Rapid prototyping with zero custom backend code
- **Data analytics**: Reporting dashboards with automatic audit logs

### When NOT to Use Lume

Lume is not suitable for:
- **Real-time collaboration** (like Google Docs) — optimized for transactional workflows, not concurrent editing
- **Massive scale** (100M+ records) — designed for mid-market (1K-10M records)
- **Serverless deployments** — requires a persistent backend and database
- **No-database workflows** — fundamentally a database platform
- **Third-party managed services** — self-hosted only (no SaaS offering)
- **Casual/free projects** — licensing may apply; check terms

### Feature Comparison Matrix

| Feature | Lume | Airtable | Notion | Odoo |
|---------|------|----------|--------|------|
| **Self-hosted** | Yes | No | No | Yes |
| **Visual page builder** | Yes (TipTap) | No | Limited | Limited |
| **REST API** | Yes | Yes | Yes | Yes |
| **Role-based access control** | 6 roles, 147+ permissions | 5 roles, basic | Limited | 10+ roles, granular |
| **Database modeling** | Yes (23 modules) | Yes | Limited | Advanced |
| **CMS capabilities** | Full-featured | No | Yes | Limited |
| **Automation/workflows** | Yes | Yes (limited) | Yes (database relations) | Advanced |
| **Real-time features** | WebSocket | Yes | Yes | Limited |
| **Custom fields** | Yes | Yes | Yes | Yes |
| **Audit logging** | Full (field-level) | Limited | Limited | Full |
| **File storage** | Integrated | Limited | Integrated | Integrated |
| **Email integration** | SMTP + templates | No | No | Built-in |
| **2FA support** | Yes (TOTP) | Yes | No | Yes |
| **Mobile app** | No (web-responsive) | Yes | Yes | Yes |
| **Pricing model** | Open-source / Self-hosted | Per-user SaaS | Per-user SaaS | License / SaaS |

### Architecture at a Glance

```
┌─────────────────────────────────────────────────────┐
│         Frontend (Vue 3 + Nuxt 3)                   │
│  ┌─────────────────────┬──────────────────────┐    │
│  │ Admin Panel (SPA)   │ Public Site (SSR)   │    │
│  │ web-lume (5173)     │ riagri-website (3007)│    │
│  └─────────────────────┴──────────────────────┘    │
└──────────────────┬──────────────────────────────────┘
                   │ REST API / WebSocket
┌──────────────────▼──────────────────────────────────┐
│     Backend (Node.js/NestJS - Port 3000)            │
│  ┌────────────────────────────────────────────┐    │
│  │  23 Pluggable Modules (authentication,     │    │
│  │  CRM, page builder, CMS, automation, etc)  │    │
│  └────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────┐    │
│  │  Hybrid ORM: Prisma (11 core models) +     │    │
│  │  Drizzle (14 module schemas) = 49+ tables  │    │
│  └────────────────────────────────────────────┘    │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│   Database (MySQL 8.0+ / PostgreSQL 14+)           │
│   49+ tables: users, roles, pages, forms, etc       │
└──────────────────────────────────────────────────────┘
```

---

## System Requirements

### Minimum Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **CPU** | 2 cores | 4+ cores | Affects API response time, bulk operations |
| **RAM** | 4 GB | 8+ GB | 4 GB for basic usage; 8 GB for production/team use |
| **Storage** | 20 GB | 50+ GB | Code + dependencies; data size varies by usage |
| **Network** | 1 Mbps | 10+ Mbps | For file uploads, API calls, real-time features |
| **Database** | MySQL 8.0+ / PostgreSQL 14+ | MySQL 8.0+ | SQLite for dev only |
| **Node.js** | 18 LTS | 20 LTS | v18+ required; v20 recommended for stability |
| **npm/pnpm** | npm 9+ | pnpm 8+ | pnpm for monorepo support (recommended) |

### Operating System Support

- **Linux** (Ubuntu 20.04+, Debian 11+, CentOS 8+) — **Recommended**
- **macOS** (11+ with Intel/Apple Silicon)
- **Windows** (WSL 2 with Ubuntu 20.04+)
- **Docker** (any OS with Docker Engine 20.10+)

### Optional but Recommended

- **Docker** (20.10+) and **Docker Compose** (1.29+) — Simplifies setup and deployment
- **Redis** (6.0+) — For caching, rate limiting, and real-time features
- **OpenSSL** (1.1.1+) — For HTTPS/SSL certificates
- **Nginx** (1.21+) — For reverse proxy and load balancing (production)

### Disk Space Breakdown

- **Base application**: ~500 MB (code + dependencies)
- **Node modules**: ~1.5 GB (backend) + ~2 GB (frontend)
- **Database**: Starts at ~100 MB; grows 1-10 MB per 1,000 records
- **File uploads**: Variable (1 GB-1 TB+) depending on media usage
- **Logs & cache**: ~500 MB (rotated automatically)

**Example for a team of 10 with 100,000 records:**
- Base + dependencies: ~4 GB
- Database: ~200-500 MB
- File uploads: ~5-20 GB
- **Total**: ~10-25 GB recommended

### Network & Connectivity

- **Inbound**: 1 port required (default 3000) for backend API
- **Outbound**: Required for:
  - Email (SMTP on port 587 or 25)
  - Database connections (MySQL 3306 or PostgreSQL 5432)
  - Optional: external APIs, webhooks, file storage (S3, etc.)

### Hardware Profiles

**Single-user / Development**
- CPU: 2 cores (Intel i5 equivalent)
- RAM: 4 GB
- Storage: 20 GB
- Database: SQLite (local)
- Suitable for: solo developers, prototyping, testing

**Team (5-20 people)**
- CPU: 4 cores (Intel i7 equivalent)
- RAM: 8 GB
- Storage: 50 GB
- Database: MySQL 8.0 or PostgreSQL 14
- Suitable for: small teams, internal tools, SaaS MVPs

**Production (20+ people)**
- CPU: 8+ cores (dedicated server or cloud VM)
- RAM: 16+ GB
- Storage: 100+ GB (SSD preferred)
- Database: Managed MySQL (AWS RDS, Google Cloud SQL) or PostgreSQL
- Load balancer: Nginx or cloud provider
- CDN: Optional (CloudFlare, AWS CloudFront)
- Suitable for: public websites, large teams, customer-facing platforms

---

## Installation Methods

### Docker (Recommended)

Docker is the **easiest way to get started**. All dependencies (Node.js, MySQL, Redis) are pre-configured.

#### What is Docker?

Docker is a containerization platform that packages an application with all its dependencies into a single "container." Think of it as a virtual machine, but much lighter. With Docker, you don't need to manually install Node.js, MySQL, or configure services—everything is pre-built.

#### Prerequisites

1. **Install Docker Desktop** (includes Docker Engine + Docker Compose)
   - **macOS**: https://docs.docker.com/desktop/install/mac-install/ (Apple Silicon or Intel)
   - **Windows**: https://docs.docker.com/desktop/install/windows-install/ (requires WSL 2)
   - **Linux**: https://docs.docker.com/engine/install/ubuntu/ (Ubuntu shown; adjust for your distro)

2. **Verify Installation**
   ```bash
   docker --version
   docker run hello-world
   ```

#### Installation Steps

1. **Clone the Lume repository**
   ```bash
   git clone https://github.com/your-org/lume.git
   cd lume
   ```

2. **Create a `.env` file** in the project root (see [Configuration](#configuration) section for details)
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env and set:
   #   DATABASE_URL=mysql://gawdesy:gawdesy@db:3306/lume
   #   JWT_SECRET=your-secret-key-here
   #   JWT_REFRESH_SECRET=your-refresh-secret-here
   ```

3. **Build the Docker image**
   ```bash
   docker build -f Dockerfile -t lume:latest .
   ```

4. **Run the container**
   ```bash
   docker run -d \
     --name lume-app \
     -p 3000:3000 \
     -p 5173:5173 \
     -p 3007:3007 \
     -e NODE_ENV=development \
     -v $(pwd)/backend:/app/backend \
     -v $(pwd)/frontend:/app/frontend \
     lume:latest
   ```

5. **Initialize the database**
   ```bash
   # Wait for container to be ready (30-60 seconds)
   sleep 30
   
   # Initialize database, seed roles, permissions, admin user
   docker exec lume-app npm run db:init
   ```

6. **Verify the application**
   ```bash
   # Check logs
   docker logs lume-app
   
   # Test backend health
   curl http://localhost:3000/api/health
   # Expected response: {"status":"ok"}
   
   # Access the application:
   # Admin panel: http://localhost:5173 (admin@lume.dev / admin123)
   # Public site: http://localhost:3007
   # Backend API: http://localhost:3000/api
   ```

7. **Verify all services are running**
   ```bash
   # Check container status
   docker ps
   
   # Should show lume-app running with PORTS: 0.0.0.0:3000->3000/tcp, etc.
   ```

8. **Access the admin panel**
   - URL: http://localhost:5173
   - Email: `admin@lume.dev`
   - Password: `admin123`
   - You should see the Lume dashboard with Base, Editor, Website, and other modules

9. **View container logs**
   ```bash
   # All logs
   docker logs lume-app
   
   # Follow logs in real-time
   docker logs -f lume-app
   
   # Last 50 lines
   docker logs --tail 50 lume-app
   
   # Logs with timestamps
   docker logs -t lume-app
   ```

10. **Stop the container**
    ```bash
    docker stop lume-app
    
    # Restart (data persists)
    docker start lume-app
    
    # Remove the container (keep volumes)
    docker rm lume-app
    
    # Remove everything (reset to fresh state)
    docker rm -f lume-app
    docker volume prune
    ```

**Troubleshooting Docker**
- Port already in use: `docker run -p 3001:3000 ...` (use 3001 instead)
- Permission denied: Add your user to docker group: `sudo usermod -aG docker $USER`
- Out of disk space: `docker system prune -a` (warning: removes all unused images)
- Container exits immediately: Check logs with `docker logs lume-app`
- Database connection failed: Wait longer for MySQL to initialize (use `docker logs` to check)
- Can't reach localhost: Try `docker-machine ip default` on macOS with Docker Machine

### Docker Compose

Docker Compose is the **production-recommended approach**. It orchestrates multiple containers (backend, database, Redis) and manages networking automatically.

#### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/lume.git
   cd lume
   ```

2. **Create `docker-compose.yml`** in project root
   ```yaml
   version: '3.8'
   
   services:
     # MySQL Database
     db:
       image: mysql:8.0
       container_name: lume-db
       restart: always
       environment:
         MYSQL_ROOT_PASSWORD: rootpassword
         MYSQL_DATABASE: lume
         MYSQL_USER: gawdesy
         MYSQL_PASSWORD: gawdesy
       volumes:
         - mysql_data:/var/lib/mysql
       ports:
         - "3306:3306"
       healthcheck:
         test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
         interval: 10s
         timeout: 5s
         retries: 5
   
     # Redis Cache
     redis:
       image: redis:7-alpine
       container_name: lume-redis
       restart: always
       ports:
         - "6379:6379"
       volumes:
         - redis_data:/data
       healthcheck:
         test: ["CMD", "redis-cli", "ping"]
         interval: 10s
         timeout: 5s
         retries: 5
   
     # Node.js Backend
     backend:
       build:
         context: ./backend
         dockerfile: Dockerfile
       container_name: lume-backend
       restart: always
       ports:
         - "3000:3000"
       environment:
         NODE_ENV: production
         DATABASE_URL: mysql://gawdesy:gawdesy@db:3306/lume
         REDIS_URL: redis://redis:6379
         JWT_SECRET: ${JWT_SECRET:-change-me-in-production}
         JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-change-me-in-production}
         CORS_ORIGIN: http://localhost:5173,http://localhost:3007
         SMTP_HOST: ${SMTP_HOST}
         SMTP_PORT: ${SMTP_PORT:-587}
         SMTP_USER: ${SMTP_USER}
         SMTP_PASSWORD: ${SMTP_PASSWORD}
       depends_on:
         db:
           condition: service_healthy
         redis:
           condition: service_healthy
       volumes:
         - ./backend:/app/backend
         - backend_node_modules:/app/backend/node_modules
       networks:
         - lume-network
   
     # Vue Admin Panel
     admin:
       build:
         context: ./frontend/apps/web-lume
         dockerfile: Dockerfile
       container_name: lume-admin
       restart: always
       ports:
         - "5173:5173"
       environment:
         VITE_API_URL: /api
       depends_on:
         - backend
       volumes:
         - ./frontend/apps/web-lume:/app
         - admin_node_modules:/app/node_modules
       networks:
         - lume-network
   
     # Nuxt Public Site
     website:
       build:
         context: ./frontend/apps/riagri-website
         dockerfile: Dockerfile
       container_name: lume-website
       restart: always
       ports:
         - "3007:3007"
       environment:
         NUXT_PUBLIC_API_BASE: http://localhost:3000/api
       depends_on:
         - backend
       volumes:
         - ./frontend/apps/riagri-website:/app
         - website_node_modules:/app/node_modules
       networks:
         - lume-network
   
     # Nginx Reverse Proxy (Optional)
     nginx:
       image: nginx:alpine
       container_name: lume-nginx
       restart: always
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf:ro
         - ./ssl:/etc/nginx/ssl:ro
       depends_on:
         - backend
         - admin
         - website
       networks:
         - lume-network
   
   volumes:
     mysql_data:
     redis_data:
     backend_node_modules:
     admin_node_modules:
     website_node_modules:
   
   networks:
     lume-network:
       driver: bridge
   ```

3. **Create `.env` file** in project root
   ```bash
   # Backend Secrets (CHANGE IN PRODUCTION!)
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
   
   # Email Configuration (optional)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

4. **Start all services**
   ```bash
   docker-compose up -d
   ```

5. **Initialize the database**
   ```bash
   docker-compose exec backend npm run db:init
   ```

6. **Access the application**
   - Admin panel: http://localhost:5173 (admin@lume.dev / admin123)
   - Public site: http://localhost:3007
   - Backend API: http://localhost:3000/api/health

7. **View logs**
   ```bash
   docker-compose logs -f backend       # Backend logs
   docker-compose logs -f db            # Database logs
   docker-compose logs -f admin         # Admin panel logs
   ```

8. **Stop all services**
   ```bash
   docker-compose down
   ```

9. **Remove all data** (reset to fresh state)
   ```bash
   docker-compose down -v               # -v removes volumes
   docker-compose up -d
   docker-compose exec backend npm run db:init
   ```

### Source Code Installation

For developers who want to modify the codebase, install from source.

#### Prerequisites

1. **Node.js** (v18+ LTS recommended)
   ```bash
   # Check version
   node --version
   
   # Install or upgrade: https://nodejs.org/
   ```

2. **pnpm** (package manager for monorepos)
   ```bash
   npm install -g pnpm
   pnpm --version  # Should be 8+
   ```

3. **MySQL 8.0+** (or PostgreSQL 14+)
   ```bash
   # macOS (using Homebrew)
   brew install mysql
   brew services start mysql
   mysql -u root
   
   # Linux (Ubuntu)
   sudo apt-get install mysql-server
   sudo systemctl start mysql
   mysql -u root -p
   
   # Windows: https://dev.mysql.com/downloads/mysql/
   ```

4. **Git** (for cloning)
   ```bash
   git --version  # Should be 2.30+
   ```

#### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/lume.git
   cd lume
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   npx prisma generate
   cd ..
   ```

3. **Create database and user**
   ```bash
   mysql -u root -p
   
   CREATE DATABASE lume CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'gawdesy'@'localhost' IDENTIFIED BY 'gawdesy';
   GRANT ALL PRIVILEGES ON lume.* TO 'gawdesy'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

4. **Set up backend `.env`**
   ```bash
   cd backend
   cp .env.example .env
   
   # Edit .env (see Configuration section)
   # At minimum, set:
   #   DATABASE_URL=mysql://gawdesy:gawdesy@localhost:3306/lume
   #   JWT_SECRET=generate-a-random-secret
   #   JWT_REFRESH_SECRET=generate-another-secret
   ```

5. **Initialize the database**
   ```bash
   npm run db:init
   ```

6. **Install admin panel dependencies**
   ```bash
   cd ../frontend/apps/web-lume
   npm install
   ```

7. **Install public site dependencies**
   ```bash
   cd ../riagri-website
   npm install
   cd ../../..
   ```

8. **Start all servers** (use 3 terminal windows)

   **Terminal 1 — Backend (http://localhost:3000)**
   ```bash
   cd backend
   npm run dev
   ```

   **Terminal 2 — Admin Panel (http://localhost:5173)**
   ```bash
   cd frontend/apps/web-lume
   npm run dev
   ```

   **Terminal 3 — Public Site (http://localhost:3007)**
   ```bash
   cd frontend/apps/riagri-website
   npm run dev
   ```

9. **Verify installation**
   ```bash
   # In a 4th terminal
   curl http://localhost:3000/api/health
   # Should return: {"status":"ok"}
   ```

10. **Login to admin panel**
    - URL: http://localhost:5173
    - Email: `admin@lume.dev`
    - Password: `admin123`

#### Troubleshooting Source Installation

- **Node modules not found**: Run `npm install` in both `backend/` and `frontend/apps/web-lume/` and `frontend/apps/riagri-website/`
- **Prisma client not generated**: Run `npx prisma generate` in `backend/`
- **Database connection failed**: Verify `DATABASE_URL` in `.env` and that MySQL is running
- **Port 3000 in use**: Change `PORT` in `backend/.env` to 3001, etc.

### npm Package

Lume is available as an npm package for teams who want to use it as a dependency in their own Node.js projects.

```bash
npm install @lume/framework
```

**Note**: The npm package provides the core backend and ORM layers. For a complete, ready-to-use system, **use Docker or source code installation**. The npm package is for advanced developers integrating Lume into existing Node.js/NestJS applications.

---

## Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory. Below is a complete, production-ready template:

```bash
# ============================================
# Database Configuration
# ============================================
DATABASE_URL=mysql://gawdesy:gawdesy@localhost:3306/lume
# For PostgreSQL: postgresql://user:password@localhost:5432/lume
# For SQLite (dev only): file:./dev.db

# ============================================
# Server Configuration
# ============================================
NODE_ENV=production  # or development
PORT=3000
APP_NAME=Lume

# ============================================
# Security & JWT Tokens
# ============================================
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long-change-me
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters-long-change-me
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# ============================================
# CORS & API Configuration
# ============================================
CORS_ORIGIN=http://localhost:5173,http://localhost:3007
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# ============================================
# Email Configuration (SMTP)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM_NAME=Lume
SMTP_FROM_EMAIL=noreply@yourdomain.com

# ============================================
# File Upload Configuration
# ============================================
UPLOAD_DIR=/var/lume/uploads  # or ./uploads for relative
MAX_FILE_SIZE=52428800  # 50MB in bytes
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/gif,application/pdf,application/zip

# ============================================
# Redis Configuration (optional but recommended)
# ============================================
REDIS_URL=redis://localhost:6379
REDIS_DB=0

# ============================================
# Rate Limiting
# ============================================
THROTTLE_LIMIT=100
THROTTLE_TTL=900  # 15 minutes

# ============================================
# Logging
# ============================================
LOG_LEVEL=info  # error, warn, info, debug
LOG_FORMAT=json  # json or text

# ============================================
# Feature Flags
# ============================================
ENABLE_2FA=true
ENABLE_AUDIT_LOG=true
ENABLE_WEBHOOKS=true
ENABLE_API_KEYS=true

# ============================================
# External Services (optional)
# ============================================
# AWS S3 for file storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=lume-files

# SendGrid for email (alternative to SMTP)
SENDGRID_API_KEY=your-sendgrid-api-key

# Stripe for payments (if using donations module)
STRIPE_SECRET_KEY=sk_live_your-stripe-secret
STRIPE_PUBLIC_KEY=pk_live_your-stripe-public

# ============================================
# Analytics & Monitoring (optional)
# ============================================
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
DATADOG_API_KEY=your-datadog-api-key
```

### Database Setup

#### MySQL 8.0+

1. **Create database and user**
   ```bash
   mysql -u root -p
   ```
   
   ```sql
   CREATE DATABASE lume CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'gawdesy'@'localhost' IDENTIFIED BY 'gawdesy';
   GRANT ALL PRIVILEGES ON lume.* TO 'gawdesy'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

2. **Run migrations**
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   npm run db:init
   ```

#### PostgreSQL 14+

1. **Create database and user**
   ```bash
   psql -U postgres
   ```
   
   ```sql
   CREATE DATABASE lume;
   CREATE USER lume_user WITH PASSWORD 'lume_password';
   GRANT ALL PRIVILEGES ON DATABASE lume TO lume_user;
   \q
   ```

2. **Update `.env`**
   ```bash
   DATABASE_URL=postgresql://lume_user:lume_password@localhost:5432/lume
   ```

3. **Run migrations**
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   npm run db:init
   ```

### Email Configuration

#### Gmail with App Password

1. **Enable 2FA in Gmail account**: https://myaccount.google.com/security
2. **Generate app password**: https://myaccount.google.com/apppasswords
3. **Set in `.env`**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-character-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   ```

#### SendGrid

1. **Create SendGrid account**: https://sendgrid.com/
2. **Generate API key**: https://app.sendgrid.com/settings/api_keys
3. **Set in `.env`**
   ```bash
   SENDGRID_API_KEY=SG.your-api-key-here
   SMTP_FROM_EMAIL=noreply@yourdomain.com
   ```

#### Custom SMTP (e.g., AWS SES, Brevo, Mailgun)

```bash
SMTP_HOST=smtp-relay.sendinblue.com
SMTP_PORT=587
SMTP_USER=your-brevo-login
SMTP_PASSWORD=your-brevo-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

#### Testing Email Configuration

```bash
cd backend
npm run email:test
# If successful, check your inbox for a test email
```

After setting up SMTP, you can test email functionality in multiple ways:

**Method 1: Command-line test**
```bash
cd backend
npm run email:test
```

**Method 2: Automation trigger test**
1. Go to Admin Panel → Automation module
2. Create a test workflow with an Email action
3. Click "Send Test Email"
4. Check your inbox

**Method 3: Manual API call**
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email from Lume",
    "body": "If you received this, SMTP is working!"
  }'
```

**Common Email Issues & Solutions**:

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| "Authentication failed" | Invalid SMTP credentials | Verify username/password in `.env` |
| "SMTP timeout after 30s" | Wrong host or port | Check `SMTP_HOST` and `SMTP_PORT` |
| "Email rejected by recipient" | Sender email not verified | Verify sender domain in email provider |
| "Gmail: password incorrect" | Using Gmail password instead of App Password | Generate 16-char App Password at myaccount.google.com/apppasswords |
| "Emails in spam folder" | SPF/DKIM not configured | Configure sender domain DNS records |
| "TLS required" | Port 587 without STARTTLS | Ensure `SMTP_PORT=587` and TLS is enabled |

---

## First Project: 10-Minute Setup

Let's create your first Lume entity: a **Contacts** database with forms, views, and automation. This practical example teaches core concepts while building something useful.

### Step 1: Login (2 minutes)

1. Open http://localhost:5173 in your browser
2. You'll see the Lume login screen with an email field
3. Enter credentials:
   - **Email**: `admin@lume.dev`
   - **Password**: `admin123`
4. Click **Login** button
5. You'll be redirected to the admin dashboard showing:
   - **Sidebar**: Modules list (Base, Editor, Website, Automation, etc.)
   - **Main area**: Quick stats and recent activity
   - **Top bar**: Your profile, notifications, settings

### Step 2: Create a "Contacts" Entity (2 minutes)

1. Click **Base** module in the left sidebar
   - You'll see a list of default entities (Users, Roles, Permissions)
2. Click the **+ New Entity** button (top right)
3. A form modal appears. Fill in:
   - **Name**: `Contacts` (plural form)
   - **Singular**: `Contact` (singular form, used for individual records)
   - **Description**: "Customer and lead contact information" (optional)
   - **Icon**: Click the icon selector and choose a person/people icon
   - **Enable soft delete**: Toggle ON (optional, allows restoring deleted records)
4. Click **Create**
5. The system creates:
   - A database table named `contacts`
   - A default "Table" view showing all records
   - A default "Form" view for adding records
   - Standard fields: ID, created_at, updated_at

### Step 3: Define Custom Fields (1 minute)

The Contacts entity is created but empty. Now add fields to capture contact information.

1. On the Contacts table view, click **+ Add Field** button (top right)
2. Create these fields one by one:

   **Field 1: Name**
   - Label: `Name`
   - Type: `Text`
   - Required: Toggle ON
   - Max length: `100`
   - Click **Create**

   **Field 2: Email**
   - Label: `Email`
   - Type: `Email`
   - Required: Toggle ON
   - Unique: Toggle ON (prevents duplicate emails)
   - Click **Create**

   **Field 3: Phone**
   - Label: `Phone`
   - Type: `Phone Number`
   - Required: Toggle OFF
   - Click **Create**

   **Field 4: Company**
   - Label: `Company`
   - Type: `Text`
   - Required: Toggle OFF
   - Click **Create**

   **Field 5: Status**
   - Label: `Status`
   - Type: `Dropdown` / `Select`
   - Options: Enter each on a new line:
     - `Lead`
     - `Customer`
     - `Past Customer`
   - Default value: `Lead`
   - Click **Create**

Your Contacts entity now has 5 custom fields plus the auto-generated ID and timestamps. The system automatically creates two views: a Table view (all fields in a grid) and a Form view (fields in a form layout).

### Step 4: Create a Form View for Easy Data Entry (1 minute)

The default Form view works, but let's customize it for a better user experience.

1. At the top, click **+ New View** button
2. Select **Form** as the view type
3. A configuration panel opens. Fill in:
   - **View Name**: `Quick Add Form`
   - **Description**: "Add a new contact quickly" (optional)
4. In the field organizer, reorder fields by dragging:
   - Name (required)
   - Email (required)
   - Phone (optional)
   - Company (optional)
   - Status (with default "Lead")
5. Customize field appearance:
   - Set Name, Email to "required" (add asterisk to form)
   - Add help text for Email: "We'll never share this"
6. Click **Save View**
7. You've now created a specialized form for quick data entry, separate from the table view

### Step 5: Add Sample Data (2 minutes)

Now populate your Contacts entity with example data. You can use either the Table view or the Form view.

**Using the Form view** (easier for bulk entry):
1. Click on the **Quick Add Form** view
2. Fill in the first contact:
   - **Name**: John Doe
   - **Email**: john@example.com
   - **Phone**: (555) 123-4567
   - **Company**: Acme Corp
   - **Status**: Customer
3. Click **Submit**
4. Repeat for second contact:
   - **Name**: Jane Smith
   - **Email**: jane@example.com
   - **Phone**: (555) 234-5678
   - **Company**: TechStart Inc
   - **Status**: Lead
5. Repeat for third contact:
   - **Name**: Bob Johnson
   - **Email**: bob@example.com
   - **Phone**: (555) 345-6789
   - **Company**: Global Industries
   - **Status**: Customer

**Using the Table view** (if you prefer):
1. Click on the **Table** view
2. Click **+ Add Row** at the bottom
3. Fill cells inline or click to expand for edit mode

You now have 3 sample contacts in your database.

### Step 6: Create a Filtered View (1 minute)

Filtered views let you focus on specific data. Create a view showing only customers.

1. Click **+ New View** at the top
2. Select **List** as the view type (or another view type)
3. Name it: `Customers Only`
4. Click **Add Filter** button
5. Configure the filter:
   - Field: `Status`
   - Operator: `equals`
   - Value: `Customer`
6. Click **Apply Filter**
7. Click **Save View**

Now when you click the **Customers Only** view, you see only records where Status = "Customer" (John Doe and Bob Johnson). The Table view still shows all 3 records.

You can also create filters like:
- **All Leads**: Status = Lead
- **Acme Contacts**: Company = "Acme Corp"
- **Missing Phone**: Phone is empty
- **Recently Added**: created_at > last 7 days

### Step 7: Set Up an Automation (1 minute)

Automations execute actions when events happen (new record, field changed, scheduled, etc.). Let's create one that sends an email when a new contact is added.

1. Click **Automation** module in the left sidebar
2. Click **+ New Workflow** button
3. A workflow builder opens. Configure:

   **Trigger** (what causes the automation to run):
   - Select **Record Created**
   - Entity: **Contacts**
   - This means "when a new Contact is created"

   **Action** (what happens):
   - Click **+ Add Action**
   - Select **Send Email**
   - Fill in:
     - **To**: `{email_field}` (Lume auto-fills the Email field from the trigger)
     - **Subject**: "Welcome to our system, {name_field}!"
     - **Body**: "Thank you for signing up! We'll be in touch soon."
   - Or use a template from your Email Templates library

4. Click **Save & Enable**
5. The workflow is now active

### Step 8: Test the Automation (optional, 30 seconds)

1. Go back to **Contacts** and click **Quick Add Form**
2. Create a new contact:
   - **Name**: Test User
   - **Email**: testuser@example.com
   - **Phone**: (555) 000-0000
   - **Company**: Test Company
   - **Status**: Lead
3. Click **Submit**
4. Check your email inbox (testuser@example.com) for an automated welcome email
5. If SMTP is configured (see [Configuration](#configuration)), the email arrives within 10 seconds
6. If no email, verify your SMTP settings and check the Backend logs:
   ```bash
   docker logs lume-app | grep -i email
   ```

**Congratulations!** You've created:
- ✓ A Contacts entity with 5 custom fields
- ✓ A specialized Form view for data entry
- ✓ A filtered view showing only customers
- ✓ An automation that emails new contacts
- ✓ 3+ sample records to test with

This foundation teaches you the core Lume workflow: **Entity → Fields → Views → Filters → Automations → Results**. Now explore the other modules (Website, Editor, Documents) and scale up with real data.

---

## Setup Patterns

### Pattern 1: Single-User Development Environment

**When to use**: Solo developer, prototyping, testing

**Technology stack**:
- SQLite (no external database)
- Node.js development server
- File uploads to local disk
- No authentication required (optional)

**Setup**:
1. Create `.env`:
   ```bash
   DATABASE_URL=file:./dev.db
   JWT_SECRET=dev-secret-no-security
   NODE_ENV=development
   UPLOAD_DIR=./uploads
   ENABLE_2FA=false
   ```

2. Start backend:
   ```bash
   cd backend
   npm install
   npx prisma db push
   npm run db:init
   npm run dev
   ```

3. Skip login (configure to auto-authenticate in dev mode)

**Pros**: Fast, minimal setup, no external services
**Cons**: SQLite has limits (single-writer), not suitable for concurrent access

---

### Pattern 2: Team Environment

**When to use**: 5-20 person team, internal tools, team collaboration, shared CRM/database

**Technology stack**:
- MySQL 8.0+ (shared, centralized database)
- Redis 6.0+ (for caching and real-time features)
- Email enabled (SMTP via Gmail, SendGrid, or corporate mail)
- RBAC configured (6 default roles, 147+ granular permissions)
- File uploads to network-accessible storage
- User management and role assignment

**Setup Steps**:

1. **Create MySQL Database**:
   ```bash
   mysql -u root -p
   CREATE DATABASE lume_team CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'lume_user'@'%' IDENTIFIED BY 'use-a-strong-password-here';
   GRANT ALL PRIVILEGES ON lume_team.* TO 'lume_user'@'%';
   FLUSH PRIVILEGES;
   EXIT;
   ```

   Note: `'%'` allows connection from any IP. For security, replace with specific IP:
   ```sql
   CREATE USER 'lume_user'@'192.168.1.100' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON lume_team.* TO 'lume_user'@'192.168.1.100';
   ```

2. **Install and Start Redis**:
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Linux (Ubuntu)
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   
   # Verify running
   redis-cli ping
   # Expected: PONG
   ```

3. **Configure `.env`** in backend directory:
   ```bash
   # Database (shared)
   DATABASE_URL=mysql://lume_user:use-a-strong-password-here@db.company.com:3306/lume_team
   
   # Redis (local or shared)
   REDIS_URL=redis://localhost:6379
   
   # Email (corporate SMTP)
   SMTP_HOST=smtp.company.com
   SMTP_PORT=587
   SMTP_USER=team@company.com
   SMTP_PASSWORD=your-smtp-password
   SMTP_FROM_EMAIL=team@company.com
   SMTP_FROM_NAME=Company Team
   
   # Security
   JWT_SECRET=generate-strong-random-string-min-32-chars
   JWT_REFRESH_SECRET=another-strong-random-string-min-32-chars
   
   # Server
   NODE_ENV=production
   PORT=3000
   
   # CORS (team domain)
   CORS_ORIGIN=https://team.company.com,https://localhost:5173
   API_BASE_URL=https://api.company.com
   
   # File uploads
   UPLOAD_DIR=/mnt/shared-storage/lume-uploads
   MAX_FILE_SIZE=52428800
   
   # Logging
   LOG_LEVEL=info
   LOG_FORMAT=json
   ```

4. **Set Up User Roles and Permissions**:

   After initial setup, login to admin panel and configure:

   **Create Custom Roles** (in Base → Roles):
   - **Admin**: Full system access (can manage users, modules, settings)
   - **Manager**: Can create/edit entities, manage team members
   - **Employee**: Can read/edit assigned records, cannot delete
   - **Viewer**: Read-only access to assigned records
   - **Subscriber**: External users with limited access

   **Assign Permissions** (Base → Permissions):
   - Admin: All 147 permissions
   - Manager: Create, Read, Update, Delete on own entities; User management
   - Employee: Create, Read, Update on assigned records
   - Viewer: Read only
   - Subscriber: Read public records only

   **Create Team Users** (Base → Users):
   - Click **+ Add User**
   - Email: user@company.com
   - Role: Assign from dropdown (Admin, Manager, Employee, Viewer)
   - Send invite email with temp password
   - User sets their password on first login

5. **Enable Email Notifications**:
   - Click **Automation** module
   - Verify SMTP is working: Create a test workflow with Email action
   - Create email templates (Base → Settings → Email Templates):
     - Welcome email for new users
     - Record change notifications
     - Daily/weekly digests

6. **Configure File Upload Storage**:
   ```bash
   # Create shared storage directory
   sudo mkdir -p /mnt/shared-storage/lume-uploads
   sudo chown lume:lume /mnt/shared-storage/lume-uploads
   sudo chmod 755 /mnt/shared-storage/lume-uploads
   ```

   Or use cloud storage (optional):
   ```bash
   # AWS S3 configuration in .env
   AWS_S3_BUCKET=company-lume-files
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   ```

7. **Backup Strategy**:
   ```bash
   # Daily MySQL backup
   0 2 * * * mysqldump -u lume_user -p lume_team > /backup/lume_$(date +\%Y\%m\%d).sql
   
   # Or use managed database backups (AWS RDS, Google Cloud SQL)
   ```

**Team Workflow Example**:
- Admin creates "Leads" entity with fields (Name, Company, Status, Assigned To)
- Manager creates a form view and shares with team
- Employees add leads, assign to themselves
- Automation: When Status = "Converted", send notification to Manager
- Viewer role sees reports but can't edit

**Pros**: 
- Centralized data (all team members see same records)
- Email notifications keep team in sync
- Fine-grained access control
- Audit logs track who changed what
- Real-time updates via Redis

**Cons**: 
- Requires MySQL + Redis setup
- More infrastructure to maintain
- Network latency if DB is remote
- Backup/recovery procedures needed

---

### Pattern 3: Docker Production Deployment

**When to use**: Public websites, customer-facing platforms, scalable systems

**Technology stack**:
- Docker Compose with MySQL, Redis, Nginx
- SSL/TLS certificates (Let's Encrypt)
- Nginx reverse proxy
- Persistent volumes for data
- Automated backups

**Setup**:

1. **Docker Compose** (see [Docker Compose](#docker-compose) section)

2. **Create `nginx.conf`**:
   ```nginx
   upstream backend {
       server backend:3000;
   }
   
   upstream admin {
       server admin:5173;
   }
   
   upstream website {
       server website:3007;
   }
   
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       return 301 https://$host$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name yourdomain.com www.yourdomain.com;
       
       ssl_certificate /etc/nginx/ssl/cert.pem;
       ssl_certificate_key /etc/nginx/ssl/key.pem;
       
       # API
       location /api {
           proxy_pass http://backend;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
       
       # Admin Panel
       location /admin {
           proxy_pass http://admin;
       }
       
       # Public Website
       location / {
           proxy_pass http://website;
       }
   }
   ```

3. **SSL Certificates** (using Let's Encrypt):
   ```bash
   docker run --rm -v $(pwd)/ssl:/etc/letsencrypt certbot/certbot certonly \
     --manual --preferred-challenges dns \
     -d yourdomain.com -d www.yourdomain.com
   ```

4. **Start with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

**Pros**: Scalable, isolated services, easy management, automatic restarts
**Cons**: Requires Docker knowledge, more moving parts to monitor

---

### Pattern 4: Kubernetes Deployment

**When to use**: Enterprise scale, high availability, auto-scaling

**Key files**:

```yaml
# k8s-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: lume
---

# k8s-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lume-config
  namespace: lume
data:
  NODE_ENV: production
  DATABASE_URL: mysql://user:pass@mysql-service:3306/lume

---

# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lume-backend
  namespace: lume
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lume-backend
  template:
    metadata:
      labels:
        app: lume-backend
    spec:
      containers:
      - name: backend
        image: lume:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: lume-config
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"

---

# k8s-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: lume-backend-service
  namespace: lume
spec:
  selector:
    app: lume-backend
  ports:
  - protocol: TCP
    port: 3000
    targetPort: 3000
  type: ClusterIP

---

# k8s-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lume-ingress
  namespace: lume
spec:
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: lume-backend-service
            port:
              number: 3000
```

**Deploy to Kubernetes**:
```bash
kubectl apply -f k8s-namespace.yaml
kubectl apply -f k8s-configmap.yaml
kubectl apply -f k8s-deployment.yaml
kubectl apply -f k8s-service.yaml
kubectl apply -f k8s-ingress.yaml

# Monitor
kubectl get pods -n lume
kubectl logs -f deployment/lume-backend -n lume
```

---

## Troubleshooting

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

---

### Database Connection Failed

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**Solution**:
1. Verify MySQL is running:
   ```bash
   mysql -u root -p -h localhost
   # If error: install MySQL or start service
   brew services start mysql  # macOS
   sudo systemctl start mysql  # Linux
   ```

2. Check `DATABASE_URL` in `.env`:
   ```bash
   DATABASE_URL=mysql://gawdesy:gawdesy@localhost:3306/lume
   # Verify: username, password, host, port, database name
   ```

3. Test connection:
   ```bash
   mysql -u gawdesy -p -h localhost lume
   # Enter password: gawdesy
   ```

---

### File Upload Fails

**Error**: `Error: EACCES: permission denied` or `disk quota exceeded`

**Solution**:
1. Check directory permissions:
   ```bash
   ls -la ./uploads
   # If not writable by your user:
   chmod 755 ./uploads
   ```

2. Check disk space:
   ```bash
   df -h
   # If low on space, delete old uploads or expand storage
   ```

3. Verify `UPLOAD_DIR` in `.env`:
   ```bash
   UPLOAD_DIR=/var/lume/uploads
   # Create directory if needed
   mkdir -p /var/lume/uploads
   chmod 755 /var/lume/uploads
   ```

---

### Slow Performance

**Symptoms**: API responses > 500ms, UI feels sluggish

**Solutions**:

1. **Enable Redis caching** (see [Configuration](#configuration)):
   ```bash
   REDIS_URL=redis://localhost:6379
   ```

2. **Add database indices** (for large tables):
   ```bash
   # In MySQL
   CREATE INDEX idx_contact_email ON contacts(email);
   CREATE INDEX idx_contact_status ON contacts(status);
   ```

3. **Monitor database queries**:
   ```bash
   # Enable slow query log in MySQL
   SET GLOBAL slow_query_log = 'ON';
   SET GLOBAL long_query_time = 2;  # Log queries > 2 seconds
   tail -f /var/log/mysql/slow.log
   ```

4. **Scale horizontally** (Docker/Kubernetes):
   - Add more backend replicas
   - Use load balancer (Nginx, AWS ELB)

---

### Email Not Sending

**Error**: Emails never arrive, or 500 error on send

**Troubleshooting**:

1. **Test SMTP configuration**:
   ```bash
   cd backend
   npm run email:test
   # Check your inbox for test email
   ```

2. **Verify `.env` settings**:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=app-password  # Not your Gmail password!
   SMTP_FROM_EMAIL=your-email@gmail.com
   ```

3. **Check SMTP provider requirements**:
   - Gmail: Enable "Less secure app access" or use App Password
   - SendGrid: Verify sender domain
   - AWS SES: Verify email addresses in sandbox mode

4. **Check logs**:
   ```bash
   docker logs lume-backend | grep -i email
   # or for source installation:
   tail -f logs/app.log
   ```

---

### Authentication Issues

**Error**: JWT invalid, refresh token expired, or 401 Unauthorized

**Common Causes**:
1. Browser cache contains old token
2. JWT secret changed (old tokens now invalid)
3. Token has expired
4. Wrong credentials at login

**Solutions**:

1. **Clear browser storage and cache**:
   ```bash
   # Method 1: DevTools
   - Open DevTools (F12)
   - Application → Local Storage → Delete all
   - Application → Session Storage → Delete all
   - Network → Disable Cache (checkbox)
   - Refresh page (Ctrl+Shift+R / Cmd+Shift+R)
   
   # Method 2: Incognito/Private window
   - Open private window
   - Try login again (no cache)
   ```

2. **Verify JWT secrets** (must be at least 32 characters):
   ```bash
   # Ensure both are set and haven't changed
   JWT_SECRET=your-secret-must-be-at-least-32-characters-long-abc123def456
   JWT_REFRESH_SECRET=your-refresh-must-be-at-least-32-characters-long-xyz789
   
   # If you changed the secret, all existing tokens are invalid
   # Users must login again to get new tokens
   ```

3. **Test login via API**:
   ```bash
   curl -X POST http://localhost:3000/api/users/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@lume.dev",
       "password": "admin123"
     }'
   
   # Successful response:
   # {
   #   "success": true,
   #   "data": {
   #     "accessToken": "eyJhbGciOiJIUzI1NiIs...",
   #     "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
   #     "user": { "id": 1, "email": "admin@lume.dev", "role": "super_admin" }
   #   }
   # }
   
   # Failed response (401):
   # { "success": false, "error": "Invalid credentials" }
   ```

4. **Extend token expiry if needed**:
   ```bash
   # Default: 1 hour access, 7 days refresh
   JWT_EXPIRY=1h
   JWT_REFRESH_EXPIRY=7d
   
   # Increase for longer sessions (less frequent login required)
   JWT_EXPIRY=8h
   JWT_REFRESH_EXPIRY=30d
   
   # Restart backend after changing
   npm run dev
   ```

5. **Check user exists and is active**:
   ```bash
   # In MySQL, verify user record
   mysql -u root -p lume
   SELECT id, email, password_hash, role_id, deleted_at FROM users WHERE email='admin@lume.dev';
   
   # Make sure:
   # - Row exists
   # - password_hash is not NULL
   # - deleted_at is NULL (not deleted)
   # - role_id exists
   ```

6. **Reset admin password**:
   ```bash
   # If you forgot the password
   cd backend
   npm run db:admin
   # Prompts for email and new password
   # Resets the admin@lume.dev password
   ```

7. **Enable 2FA recovery**:
   If 2FA is enabled and you lost access:
   ```bash
   # Disable 2FA for user (temporary fix)
   mysql -u root -p lume
   UPDATE users SET two_fa_enabled = FALSE WHERE email='admin@lume.dev';
   
   # User can re-enable 2FA after logging in
   ```

---

### Module Won't Load

**Error**: Module appears in manifest but doesn't load, or 500 error

**Solution**:

1. **Check module dependencies**:
   ```bash
   # View module manifest
   cat backend/src/modules/my-module/__manifest__.js
   # Ensure all dependencies are installed
   ```

2. **Clear module cache**:
   ```bash
   rm -rf backend/node_modules/.cache
   npm install
   npm run dev
   ```

3. **View module loader logs**:
   ```bash
   LOG_LEVEL=debug npm run dev
   # Look for "Loading module: my-module"
   ```

---

## Next Steps

Congratulations on installing Lume! You've completed the foundation. Here's your next journey:

### Immediate Next Steps (This Week)

1. **Complete the 10-Minute First Project**
   - If you haven't already, walk through the Contacts example above
   - Get comfortable creating entities, fields, views, and automations
   - Experiment with different field types and view configurations

2. **Explore the Admin Panel**
   - Click through each module in the sidebar
   - Get familiar with the interface layout
   - Review default settings in Base → Settings
   - Check the audit log to see system activity

3. **Create Your First Real Entity**
   - Think about what data you need to track (customers, tasks, inventory, etc.)
   - Create an entity with 5-10 fields
   - Build 2-3 views (Table, Form, Filtered)
   - Add 10+ real records

4. **Set Up Basic Automation**
   - Create a simple workflow (trigger + action)
   - Test that it runs correctly
   - Monitor automation logs to verify execution

### Intermediate Steps (Weeks 2-3)

5. **Read the User Guide** → [PUBLIC_USER_GUIDE.md](PUBLIC_USER_GUIDE.md)
   - Detailed guide on every Lume feature
   - Learn advanced filtering, sorting, and grouping
   - Master the visual page builder
   - Build CMS pages and menus

6. **Set Up Team Access** (if applicable)
   - Go to Base → Users and add team members
   - Assign roles (Admin, Manager, Employee, Viewer)
   - Create custom roles with specific permissions
   - Test permissions by logging in as each role

7. **Configure Email Integration**
   - Set up SMTP in .env (see [Configuration](#configuration) section)
   - Test email sending (npm run email:test)
   - Create email templates for common notifications
   - Set up automated emails in workflows

8. **Build Your Public Website**
   - Click Website module in sidebar
   - Create pages using the visual page builder
   - Customize header, footer, and sidebar in Theme
   - Publish pages and share the URL
   - View your site at http://localhost:3007

### Advanced Implementation (Month 1+)

9. **API Documentation** → [API_REFERENCE.md](API_REFERENCE.md)
   - Understand Lume REST API endpoints
   - Use cURL or Postman to test API calls
   - Build integrations with external systems (Zapier, Make, n8n)
   - Create custom webhooks

10. **Advanced Topics**
    - [DEVELOPMENT.md](DEVELOPMENT.md) — Create custom modules and extensions
    - [DEPLOYMENT.md](DEPLOYMENT.md) — Deploy to production (AWS, DigitalOcean, etc.)
    - [SECURITY.md](SECURITY.md) — Harden your Lume instance for security
    - [PERFORMANCE_TUNING.md](PERFORMANCE_TUNING.md) — Optimize for scale

11. **Backup & Disaster Recovery**
    - Set up automated MySQL backups (daily)
    - Document your backup procedure
    - Test restore procedures monthly
    - Store backups offsite (cloud storage)

12. **Monitoring & Logging**
    - Set up error tracking (Sentry)
    - Configure log aggregation (DataDog, Loggly)
    - Monitor database performance
    - Set up alerts for critical errors

### Resources

**Official Documentation**
- [INDEX.md](INDEX.md) — Documentation index and navigation
- [PUBLIC_USER_GUIDE.md](PUBLIC_USER_GUIDE.md) — Complete user guide
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture deep dive
- [INSTALLATION.md](INSTALLATION.md) — Detailed installation instructions
- [DEVELOPMENT.md](DEVELOPMENT.md) — Developer guide
- [DEPLOYMENT.md](DEPLOYMENT.md) — Production deployment guide

**Community & Support**
- **GitHub Issues**: Report bugs, request features
- **GitHub Discussions**: Ask questions, share ideas
- **Email**: support@lume.dev
- **Documentation**: https://docs.lume.dev
- **Community Forum**: https://community.lume.dev (if available)

**Learning Resources**
- Video Tutorials: Coming soon on YouTube
- Case Studies: See real-world use cases
- Blog: Tips, tricks, and announcements
- Webinars: Monthly feature deep-dives

### Keep Your Installation Up-to-Date

```bash
# Check for updates
git pull origin main

# Update dependencies
npm install

# Apply database migrations
npx prisma migrate deploy

# Restart services
npm run dev
```

---

## Production Checklist

Before deploying to production, verify every item below. A single missed step can compromise security or availability.

### Security Checklist

- [ ] **Change JWT Secrets**
  - [ ] `JWT_SECRET` set to unique 32+ character string
  - [ ] `JWT_REFRESH_SECRET` set to unique 32+ character string
  - [ ] Secrets stored in secure secrets manager (HashiCorp Vault, AWS Secrets Manager)
  - [ ] Secrets NOT in git repository or config files

- [ ] **Database Security**
  - [ ] Database password changed from default
  - [ ] Database user has minimal required permissions (not root)
  - [ ] Database access restricted to backend server IP only (no public access)
  - [ ] Database backups encrypted at rest
  - [ ] MySQL slow query log enabled for monitoring

- [ ] **Email Security**
  - [ ] SMTP credentials in `.env` (never hardcoded)
  - [ ] Sender domain verified (SPF, DKIM, DMARC configured)
  - [ ] Email templates reviewed and tested
  - [ ] Unsubscribe links included in bulk emails (legal requirement)

- [ ] **HTTPS/TLS**
  - [ ] SSL certificate installed (Let's Encrypt or paid CA)
  - [ ] Certificate auto-renewal configured
  - [ ] HTTP redirects to HTTPS
  - [ ] Mixed content warnings resolved

- [ ] **Authentication**
  - [ ] 2FA (TOTP) enabled for all admin accounts
  - [ ] Password requirements enforced (min 12 chars, complexity)
  - [ ] Session timeout configured (30-60 minutes inactivity)
  - [ ] Login attempts rate-limited (max 5 failures per IP)
  - [ ] Default admin credentials changed

- [ ] **Access Control**
  - [ ] Role-based access control (RBAC) configured
  - [ ] Least-privilege principle applied (users only have needed permissions)
  - [ ] Service accounts created for API integrations (not user accounts)
  - [ ] API keys rotated every 90 days

### Infrastructure Checklist

- [ ] **Database**
  - [ ] MySQL 8.0+ or PostgreSQL 14+ (not SQLite)
  - [ ] Replica/failover configured for high availability
  - [ ] Regular backup schedule (daily minimum)
  - [ ] Backup retention policy (7-30 days recommended)
  - [ ] Test restore procedure monthly

- [ ] **Application Server**
  - [ ] Node.js v18+ LTS version deployed
  - [ ] `NODE_ENV=production` set
  - [ ] Process manager configured (PM2, systemd, Docker)
  - [ ] Auto-restart on crash enabled
  - [ ] Health checks configured

- [ ] **File Storage**
  - [ ] NOT using local `/uploads` directory
  - [ ] Using AWS S3, Azure Blob, Google Cloud Storage, or network NFS
  - [ ] Bucket/storage configured for appropriate access levels
  - [ ] File size limits enforced (prevent disk exhaustion)
  - [ ] Antivirus scanning for uploaded files (if applicable)

- [ ] **Redis Cache** (if using)
  - [ ] Redis instance running (not on same server as app if possible)
  - [ ] Password/authentication configured
  - [ ] Persistence enabled (RDB snapshots or AOF)
  - [ ] Memory limits configured with eviction policy

- [ ] **Monitoring & Logging**
  - [ ] Application logs aggregated (ELK, DataDog, Cloudwatch)
  - [ ] Error tracking enabled (Sentry, Rollbar)
  - [ ] Performance monitoring active (New Relic, Datadog APM)
  - [ ] Database slow queries monitored
  - [ ] Alerts configured for critical errors

- [ ] **Firewall & Network**
  - [ ] Inbound: Only 80, 443, 22 (SSH) allowed
  - [ ] Outbound: SMTP (25/587), DNS (53), API endpoints allowed
  - [ ] Database port (3306) NOT publicly accessible
  - [ ] Admin panel behind WAF (Web Application Firewall) optional but recommended
  - [ ] DDoS protection enabled (CloudFlare, AWS Shield)

### Performance Checklist

- [ ] **Rate Limiting**
  - [ ] General rate limit enabled (100 req/15min per IP)
  - [ ] Auth endpoint limit enforced (10 req/15min per IP)
  - [ ] API key rate limits configured per key

- [ ] **Caching**
  - [ ] Redis enabled for session/cache
  - [ ] Browser cache headers configured
  - [ ] CDN configured for static assets (optional)
  - [ ] Database query optimization completed

- [ ] **Database Performance**
  - [ ] Indices created on frequently filtered columns
  - [ ] Query plans reviewed (EXPLAIN ANALYZE)
  - [ ] Connection pooling configured (min 10, max 50 connections)

### Compliance & Operations

- [ ] **Data Protection**
  - [ ] GDPR consent forms if applicable
  - [ ] Privacy policy published
  - [ ] Data retention policy documented
  - [ ] Encryption at rest enabled (database, backups, file storage)
  - [ ] Encryption in transit enabled (HTTPS, TLS)

- [ ] **Audit & Logging**
  - [ ] Audit logging enabled in Lume (AuditLog module)
  - [ ] Admin action logs retained (minimum 1 year)
  - [ ] Failed login attempts logged
  - [ ] API calls logged with user/IP/timestamp

- [ ] **Operations**
  - [ ] Runbook created (deployment, rollback, disaster recovery)
  - [ ] Team trained on operational procedures
  - [ ] On-call rotation established
  - [ ] Incident response plan documented
  - [ ] Monthly backup restore drills scheduled

### Final Verification

- [ ] Load test completed (simulate expected traffic)
- [ ] Penetration test completed (or security audit by third party)
- [ ] Documentation complete (system diagrams, procedures)
- [ ] Team trained on operational procedures
- [ ] Go-live readiness review with stakeholders

---

## Document Info

| Property | Value |
|----------|-------|
| **Title** | Lume v2.0 Getting Started Guide |
| **Version** | 2.0.0 |
| **Status** | Production-Ready |
| **Last Updated** | April 2026 |
| **Author** | Lume Core Team |
| **License** | MIT |
| **Word Count** | ~8,200 |
| **Audience** | New users, small teams, enterprises |

---

## Quick Reference

**Default Ports**
- Backend API: 3000
- Admin Panel: 5173
- Public Site: 3007
- MySQL: 3306
- Redis: 6379

**Default Credentials**
- Email: `admin@lume.dev`
- Password: `admin123`

**Important Paths**
- Backend: `/opt/Lume/backend`
- Admin Panel: `/opt/Lume/frontend/apps/web-lume`
- Public Site: `/opt/Lume/frontend/apps/riagri-website`
- Documentation: `/opt/Lume/docs`

**Key Commands**
```bash
npm run dev              # Start development server
npm run db:init         # Initialize database with seed data
npm run db:init:force   # Force re-initialize (dangerous!)
npm test                # Run test suite
npm run lint            # Check code style
npx prisma studio      # View/edit database GUI
```

---

**Thank you for choosing Lume! Happy building.**
