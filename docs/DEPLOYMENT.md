# Lume Framework — Deployment Guide

Deploy Lume to production using Docker, Docker Compose, or cloud platforms.

---

## 🐳 Docker & Docker Compose (Local/VPS)

### Quick Start with Docker Compose

```bash
# Clone the repo
git clone https://github.com/senthilnathang/Lume.git
cd Lume

# Create .env file
cat > .env << EOF
DB_ROOT_PASSWORD=secure-root-password
DB_NAME=lume
DB_USER=lume_user
DB_PASSWORD=secure-db-password
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=info
EOF

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Access the application:**
- Frontend: `http://localhost`
- Backend API: `http://localhost:3000/api`
- Credentials: `admin@lume.dev` / `admin123`

### Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DB_ROOT_PASSWORD` | Yes | - | MySQL root password |
| `DB_NAME` | Yes | `lume` | Database name |
| `DB_USER` | Yes | `root` | Database user |
| `DB_PASSWORD` | Yes | - | Database password |
| `JWT_SECRET` | Yes | - | 32+ char random string |
| `JWT_REFRESH_SECRET` | Yes | - | 32+ char random string |
| `JWT_EXPIRES_IN` | No | `7d` | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | No | `30d` | Refresh token expiry |
| `CORS_ORIGIN` | No | `http://localhost` | Frontend URL |
| `LOG_LEVEL` | No | `info` | debug, info, warn, error |
| `BACKEND_PORT` | No | `3000` | Backend port |
| `FRONTEND_PORT` | No | `80` | Frontend port |

### Scaling Notes

**Single Server:**
- Use docker-compose on a 2GB+ RAM VPS (DigitalOcean, Linode, Hetzner)
- MySQL data persisted to named volume
- Uploads and logs in separate volumes

**Multi-Server (Advanced):**
- Use Docker Swarm or Kubernetes
- Separate MySQL database on managed RDS
- Frontend/backend on separate nodes
- Shared uploads volume (NFS or S3)

---

## ☁️ Cloud Platforms

### Railway.app (Recommended for Demo)

**Advantages:**
- Free tier available
- Automatic deployments from GitHub
- Database included
- Custom domains

**Setup:**

1. **Connect GitHub:**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Authorize and select `senthilnathang/Lume`

2. **Configure Services:**

   **MySQL Service:**
   - Click "Add Service" → "MySQL"
   - Select version 8.0
   - Set env vars:
     - `MYSQL_ROOT_PASSWORD`: Generate strong password
     - `MYSQL_DATABASE`: `lume`

   **Backend Service:**
   - Click "Add Service" → "GitHub Repo"
   - Select Lume repo, specify `/backend` as root directory
   - Set env vars:
     ```
     NODE_ENV=production
     DATABASE_URL=${{ mysql.DATABASE_URL }}
     JWT_SECRET=<generate with: openssl rand -hex 32>
     JWT_REFRESH_SECRET=<generate with: openssl rand -hex 32>
     CORS_ORIGIN=${{ RAILWAY_PUBLIC_DOMAIN }}/frontend
     PORT=3000
     ```
   - Set start command: `npm run start`
   - Allocate 512MB+ memory

   **Frontend Service:**
   - Click "Add Service" → "GitHub Repo"
   - Select Lume repo, specify `/frontend` as root directory
   - Set env vars:
     ```
     VITE_API_URL=/api
     NODE_ENV=production
     ```
   - Set build command: `npm run build`
   - Set start command: `npm run preview` or use Nginx
   - Allocate 256MB memory

3. **Connect Services:**
   - In Railway dashboard, add service links
   - MySQL → Backend
   - Backend → Frontend

4. **Deploy:**
   - Click "Deploy" on each service
   - Monitor in Railway dashboard
   - Get public domain from Railway (e.g., `lume-demo.railway.app`)

5. **Test:**
   ```bash
   curl https://lume-demo.railway.app/api/health
   # Should return { status: "ok" }
   ```

---

### Render.com

Similar to Railway but with slightly different UI:

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repo
4. Set build command: `npm install && npx prisma generate && npm run build`
5. Set start command: `npm run start`
6. Add environment variables (same as Railway)
7. Deploy

---

### AWS (EC2 + RDS)

**For production at scale:**

```bash
# 1. Launch EC2 instance (t3.medium+ with Amazon Linux 2)
# 2. Install Docker
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# 3. Create RDS MySQL instance
# In AWS Console:
# - Engine: MySQL 8.0
# - Instance: db.t3.micro (free tier)
# - Storage: 20 GB gp2
# - Public accessibility: No (use EC2 in same VPC)

# 4. On EC2, create .env with RDS endpoint
cat > .env << EOF
DATABASE_URL=mysql://admin:password@lume-rds.c5q7d4k3.us-east-1.rds.amazonaws.com:3306/lume
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=https://lume.example.com
EOF

# 5. Deploy with docker-compose
docker-compose -f docker-compose.prod.yml up -d

# 6. Setup CloudFront CDN for frontend
# 7. Use Route 53 for DNS
```

---

## 🔒 Security Best Practices

### Pre-Deployment Checklist

- [ ] Generate strong JWT secrets: `openssl rand -hex 32`
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/TLS (automatic on Railway/Render, use CloudFront on AWS)
- [ ] Set secure `CORS_ORIGIN` (not `*`)
- [ ] Configure database password (no defaults)
- [ ] Enable database backups (automatic on managed services)
- [ ] Set up log aggregation (CloudWatch, LogDNA)
- [ ] Configure health checks (already in docker-compose.prod.yml)
- [ ] Use secrets manager for sensitive env vars (not in .env files)
- [ ] Enable rate limiting (configured in backend)
- [ ] Run `npm audit` before deploying

### Firewall Rules

- Backend: Only accessible from frontend or VPN
- MySQL: Only accessible from backend service
- Frontend: Public (port 80/443)

### Database Backups

**Automated:**
- Railway/Render: Automatic daily backups included
- AWS RDS: Enable automated backups (default 7 days)
- Manual: `docker-compose exec mysql mysqldump -u root -p $DATABASE lume > backup-$(date +%Y%m%d).sql`

---

## 📊 Monitoring & Logs

### View Logs

```bash
# Docker Compose
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql

# Railway
# View in Railway dashboard or: railway logs
```

### Health Checks

All services include health check endpoints:

```bash
# Backend
curl http://your-domain/api/health

# Frontend
curl http://your-domain/health
```

### Performance Monitoring

Use the built-in audit logging to monitor:
- User login/logout events
- Entity CRUD operations
- Permission changes
- Workflow executions

See `backend/docs/API.md` for audit log endpoints.

---

## 🚀 Zero-Downtime Deployments

### With Docker Compose

```bash
# 1. Pull latest changes
git pull origin main

# 2. Rebuild images
docker-compose -f docker-compose.prod.yml build

# 3. Start new containers (old ones continue serving)
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify health
curl http://localhost/api/health

# 5. Old containers automatically stop after health check passes
```

### With Railway/Render

- Automatic deployments on git push to `main` branch
- Zero downtime via automatic health checks
- Rollback available via dashboard (select previous deployment)

---

## 🆘 Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Database not ready: Wait 30 seconds, manually run db:init
docker-compose exec backend npm run db:init

# 2. Prisma client not generated
docker-compose exec backend npx prisma generate

# 3. Port already in use
docker-compose down && docker-compose -f docker-compose.prod.yml up -d
```

### Frontend shows blank page

```bash
# Check browser console for errors
# Check nginx logs
docker-compose logs frontend

# Common issues:
# 1. API endpoint wrong: Check VITE_API_URL in env
# 2. CORS error: Check CORS_ORIGIN matches frontend URL
# 3. Build failed: Check build logs in Railway/Render dashboard
```

### Database connection failed

```bash
# Verify MySQL is running
docker-compose ps mysql

# Check connection string
# Should be: mysql://user:password@mysql:3306/lume (for docker-compose)
# Or: mysql://user:password@rds-endpoint:3306/lume (for RDS)

# Test connection
docker-compose exec mysql mysql -h mysql -u root -p$DB_ROOT_PASSWORD -e "SELECT 1"
```

---

## 📝 Maintenance

### Database Maintenance

```bash
# Monthly: Optimize tables
docker-compose exec mysql mysql -u root -p$DB_ROOT_PASSWORD lume \
  -e "OPTIMIZE TABLE users, roles, permissions, audit_logs;"

# Quarterly: Check for missing indexes
docker-compose exec mysql mysql -u root -p$DB_ROOT_PASSWORD lume \
  -e "SHOW INDEXES FROM users;" 
```

### Update Lume

```bash
# 1. Pull changes
git pull origin main

# 2. Update dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Run migrations if needed
docker-compose exec backend npx prisma migrate deploy

# 4. Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 📞 Support

For deployment issues:
- Check logs with `docker-compose logs -f`
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
- File an issue: https://github.com/senthilnathang/Lume/issues

For security vulnerabilities: security@lume-framework.dev
