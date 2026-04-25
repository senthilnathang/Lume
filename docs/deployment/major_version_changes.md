# Lume v2.0: Major Version Changes & Migration Guide

**Date**: 2026-04-22  
**Version**: 2.0.0 (Major Release)  
**Release Date**: September 1, 2026  
**Migration Guide**: For v1.x → v2.0 upgrades

---

## Overview: Why v2.0?

Lume v2.0 represents a **major architectural upgrade** from Express.js to NestJS backend, with significant improvements to security, performance, and developer experience. While maintaining **API compatibility** where possible, some **breaking changes** are necessary for long-term sustainability and scalability.

### Key Improvements

| Aspect | v1.x | v2.0 | Benefit |
|--------|------|------|---------|
| Backend | Express.js | NestJS | Better structure, DI, built-in validation |
| Performance | P95 < 500ms | P95 < 300ms | 40% faster response times |
| Database | Prisma + Drizzle | Enhanced Prisma + Drizzle | Better optimization |
| API Docs | Manual | Swagger/OpenAPI auto-generated | Developer-friendly |
| Testing | Jest | Jest (enhanced) | Better coverage |
| Security | Good | Excellent | Additional hardening |
| Scalability | Single node | Horizontal scaling ready | Easy clustering |

---

## Breaking Changes

### 1. API Changes

#### 1.1 Webhook Payload Structure (⚠️ BREAKING)

**v1.x Webhook Payload:**
```json
{
  "event": "entity.created",
  "data": {
    "id": "123",
    "name": "Test Entity"
  }
}
```

**v2.0 Webhook Payload:**
```json
{
  "id": "webhook-event-uuid",
  "event": "entity.created",
  "timestamp": "2026-09-01T10:00:00Z",
  "version": "2.0",
  "data": {
    "id": "123",
    "name": "Test Entity"
  },
  "metadata": {
    "userId": "user-uuid",
    "companyId": "company-uuid",
    "environment": "production"
  }
}
```

**Migration:**
- Update webhook handlers to expect new structure
- Use `timestamp` and `metadata` for better logging/auditing
- Old v1.x payloads no longer sent after cutover

**Action Required:** Update all external webhook consumers

---

#### 1.2 Authentication: JWT Refresh Tokens (⚠️ BREAKING)

**v1.x Authentication:**
```bash
# POST /api/users/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Response
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",  # Long-lived JWT (7 days)
    "user": { ... }
  }
}
```

**v2.0 Authentication:**
```bash
# POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",     # Short-lived (15 min)
    "refreshToken": "xyz...",         # Long-lived (7 days)
    "expiresIn": 900,                 # Seconds
    "user": { ... }
  }
}
```

**New Refresh Endpoint:**
```bash
# POST /api/auth/refresh
{
  "refreshToken": "xyz..."
}

# Response
{
  "accessToken": "eyJhbGc...",
  "expiresIn": 900
}
```

**Migration:**
- Update login handlers to use `accessToken` and `refreshToken`
- Implement refresh token rotation
- Store `refreshToken` securely (HTTP-only cookies recommended)
- Handle token expiration gracefully

**Action Required:** Update all authentication implementations

---

#### 1.3 API Response Format Standardization (Minor)

**v1.x Mixed Formats:**
```javascript
// Success
{ success: true, data: {...} }

// Error (inconsistent)
{ error: "message" }
// or
{ errors: [...] }
// or
{ message: "error" }
```

**v2.0 Standardized Format:**
```javascript
// Success (2xx status)
{
  "success": true,
  "data": {...},
  "meta": {
    "timestamp": "2026-09-01T10:00:00Z",
    "version": "2.0"
  }
}

// Error (4xx/5xx status)
{
  "success": false,
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Entity with ID 123 not found",
    "details": {...}
  },
  "meta": {
    "timestamp": "2026-09-01T10:00:00Z",
    "version": "2.0"
  }
}
```

**Action Required:** Update error handling in API clients

---

#### 1.4 Endpoint Route Changes (⚠️ BREAKING)

**v1.x Routes:**
```
POST   /api/users/login                    (login)
POST   /api/entities                       (create)
GET    /api/entities/:id/records           (list)
GET    /api/entities/:id/records/:recordId (get)
```

**v2.0 Routes (RESTful, standardized):**
```
POST   /api/auth/login                    (login - moved)
POST   /api/auth/logout                   (new)
POST   /api/auth/refresh                  (new)
GET    /api/entities                      (list)
POST   /api/entities                      (create)
GET    /api/entities/:id                  (get)
PUT    /api/entities/:id                  (update)
DELETE /api/entities/:id                  (delete)
```

**Action Required:** Update all API client URLs

---

### 2. Database Schema Changes

#### 2.1 User Authentication Table

**v1.x:**
```sql
users:
  - id
  - email
  - password (hashed with salt)
  - role_id
  - created_at
```

**v2.0:**
```sql
users:
  - id
  - email
  - password (hashed with bcrypt)
  - role_id
  - status (active/inactive/suspended)
  - last_login_at          # NEW
  - password_changed_at    # NEW
  - mfa_enabled           # NEW
  - created_at
  - updated_at

sessions:                  # NEW TABLE
  - id
  - user_id (FK)
  - refresh_token_hash
  - expires_at
  - created_at
```

**Migration Action:** Database migration script provided

---

#### 2.2 Audit Log Enhancements

**v1.x:**
```sql
audit_logs:
  - id
  - user_id
  - entity
  - action (CREATE/READ/UPDATE/DELETE)
  - changes (JSON)
  - timestamp
```

**v2.0:**
```sql
audit_logs:
  - id
  - user_id
  - company_id (for filtering)
  - entity
  - entity_id (for specific records)
  - action
  - changes
  - ip_address              # NEW - for security
  - user_agent             # NEW - for audit trail
  - status (success/error) # NEW
  - error_message          # NEW (if error)
  - timestamp
  - created_at
```

**Migration Action:** Automatic migration (backward compatible)

---

### 3. Frontend Changes

#### 3.1 Navigation Redesign

**v1.x:** Flat menu structure
```
├─ Home
├─ CRM
├─ Inventory
├─ Reports
├─ Settings
└─ About
```

**v2.0:** Collapsible sidebar with categories
```
├─ 📊 Dashboards
│  ├─ Overview
│  └─ Analytics
├─ 💼 CRM
│  ├─ Leads
│  ├─ Contacts
│  ├─ Deals
│  └─ Pipeline
├─ 📦 Inventory
│  ├─ Products
│  ├─ Warehouses
│  └─ Stock Levels
├─ 📈 Reports
└─ ⚙️ Administration
   ├─ Users
   ├─ Roles & Permissions
   ├─ Settings
   └─ Audit Logs
```

**Impact:** Users need to re-learn navigation (one-time training)

---

#### 3.2 Dark Mode Support (Non-breaking, Optional)

**v2.0 adds dark mode** (opt-in per user)
- CSS variables for themes
- System preference detection
- Per-user preference in settings

**Action Required:** None (backward compatible)

---

#### 3.3 Responsive Design Improvements (Non-breaking)

**v2.0 improvements:**
- Better mobile responsiveness
- Touch-friendly controls (48px minimum)
- Adaptive UI for various screen sizes
- Better accessibility (WCAG 2.1 AA)

**Action Required:** None (backward compatible)

---

### 4. Module Updates & Enhancements

#### 4.1 CRM Module: Pipeline Visualization

**v1.x:** Simple list view of deals
**v2.0:** Kanban-style pipeline visualization (new feature, non-breaking)

---

#### 4.2 Inventory Module: Multi-Warehouse Support

**v1.x:** Single warehouse
**v2.0:** Multiple warehouses per organization

**Migration:** 
- Existing single warehouse → "Default Warehouse"
- Can add multiple warehouses after upgrade

---

#### 4.3 Projects Module: Gantt Chart View

**v1.x:** List, form, and grid views only
**v2.0:** New Gantt chart view for project timeline visualization

---

#### 4.4 Reports Module: Custom Metrics Builder

**v1.x:** Pre-defined reports only
**v2.0:** Custom metrics builder (new feature)

---

### 5. Dependency Updates

#### 5.1 Node.js Version Requirement

**v1.x:** Node.js 16.x, 18.x
**v2.0:** Node.js 18.x, 20.x, 22.x (LTS versions only)

**Action Required:** Upgrade Node.js if using < 18.x

---

#### 5.2 Database Requirements

**v1.x:** MySQL 5.7+, PostgreSQL 10+
**v2.0:** MySQL 8.0+, PostgreSQL 12+

**Why:** Better performance, JSON support, security features

**Action Required:** Upgrade if using older versions

---

#### 5.3 Redis Version

**v1.x:** Redis 5.0+
**v2.0:** Redis 6.0+ (required for Streams support)

**Action Required:** Upgrade if using Redis 5.x

---

## Non-Breaking Changes (New Features)

### Performance Improvements

- **40% faster response times** (P95 < 300ms)
- Optimized database queries
- Better caching strategy
- Connection pooling improvements

---

### Security Enhancements

- JWT refresh tokens (short-lived access)
- Multi-factor authentication support
- Enhanced rate limiting
- Improved audit logging
- Security headers (CSP, HSTS, etc.)

---

### Developer Experience

- Auto-generated Swagger/OpenAPI documentation
- Better error messages with actionable advice
- Enhanced logging for debugging
- Better performance monitoring

---

### New Features

- Dark mode toggle
- Advanced filtering UI improvements
- Export to additional formats (Excel, PDF)
- Scheduled reports
- Custom dashboard widgets

---

## Migration Path: v1.x → v2.0

### Pre-Migration Checklist

- [ ] **Backup current database**
  ```bash
  mysqldump -u root -p lume > lume_v1_backup.sql
  ```

- [ ] **Review API integrations**
  - List all external API consumers
  - Update URLs (if changed)
  - Update webhook handlers
  - Update authentication code

- [ ] **Test in staging**
  - Restore backup to staging
  - Run migration script
  - Test all critical workflows
  - Verify API integrations

- [ ] **Communication**
  - Notify users of downtime window
  - Prepare support documentation
  - Brief support team
  - Have rollback plan ready

---

### Migration Steps

**1. Backup Production Data (1-2 hours before)**
```bash
mysqldump -u root -p lume > lume_v1_final_backup.sql
```

**2. Enable Maintenance Mode**
```bash
# Show maintenance page to users
docker-compose exec api npm run maintenance:enable
```

**3. Run Migration Script**
```bash
# Provided as part of v2.0 release
docker-compose exec api npm run migrate:v1-to-v2

# Expected output:
# ✓ Migrating users table
# ✓ Migrating entities table
# ✓ Migrating records table
# ✓ Migrating audit logs
# ✓ Schema validation successful
# ✓ Data integrity check passed
```

**4. Update Environment Variables**
```bash
# .env changes:
# - JWT_ALGORITHM=HS256 → HS256 (same)
# - JWT_EXPIRY=7d → 15m (access token)
# - ADD: JWT_REFRESH_EXPIRY=7d
# - ADD: MFA_ENABLED=false (opt-in later)
```

**5. Restart Services**
```bash
docker-compose down
docker-compose pull
docker-compose up -d
```

**6. Verify Migration**
```bash
# Run health checks
curl http://localhost:3000/api/health

# Expected: { "status": "ok", "version": "2.0.0" }
```

**7. Update External Integrations**
- Update API client URLs
- Update webhook handlers
- Update authentication code
- Test integrations

**8. Disable Maintenance Mode**
```bash
docker-compose exec api npm run maintenance:disable
```

**9. Announce to Users**
- Send email notification
- Update status page
- Post in chat/Discord
- Blog post about release

---

### Rollback Procedure (If Needed)

**If critical issue occurs:**

```bash
# 1. Stop v2.0 services
docker-compose down

# 2. Restore database from backup
mysql -u root -p lume < lume_v1_final_backup.sql

# 3. Revert to v1.x images
docker-compose down
git checkout v1-latest
docker-compose pull
docker-compose up -d

# 4. Verify rollback
curl http://localhost:3000/api/health
```

**Expected Recovery Time:** 15-30 minutes

---

## Support & Troubleshooting

### Common Migration Issues

**Issue: "Database migration failed"**
```
Solution:
1. Check database space (need 2x current size)
2. Run: mysql -u root -p lume < lume_v1_final_backup.sql
3. Retry migration
4. Contact support if persists
```

**Issue: "API authentication not working"**
```
Solution:
1. Verify JWT_REFRESH_EXPIRY is set in .env
2. Clear browser cookies
3. Log in again
4. Contact support if persists
```

**Issue: "Old API URLs return 404"**
```
Solution:
1. Review breaking changes (section above)
2. Update API client URLs
3. Consult API Reference for v2.0 endpoints
4. Contact support for migration help
```

---

## Testing Before & After Upgrade

### Pre-Upgrade Testing (in staging)

- [ ] Database backup works
- [ ] Migration script runs successfully
- [ ] All entities load correctly
- [ ] All records present (count matches)
- [ ] RBAC still works
- [ ] Audit logs intact
- [ ] External APIs call correctly
- [ ] Reports generate
- [ ] Automations trigger

### Post-Upgrade Verification

- [ ] Users can log in
- [ ] API health check passes
- [ ] All entities accessible
- [ ] Record count matches pre-migration
- [ ] Webhooks firing with new format
- [ ] External integrations working
- [ ] Performance acceptable (P95 < 300ms)
- [ ] No errors in logs

---

## Timeline & Support

### Support Periods

```
v1.x:
├─ Latest patch: v1.10.0 (Sept 1, 2026)
├─ Critical fixes: 6 months (until March 1, 2027)
└─ End of life: 12 months (until Sept 1, 2027)

v2.0:
├─ Initial release: Sept 1, 2026
├─ Patch releases: Ongoing
├─ Major version (v3.0): ~18-24 months
└─ LTS expected: 3+ years support
```

---

## FAQ: Migration Questions

**Q: Can I stay on v1.x?**
A: Yes, but no new features or critical updates after Sept 1, 2027. We recommend upgrading.

**Q: How long will migration take?**
A: 30-60 minutes including pre/post-verification steps.

**Q: Will my data be lost?**
A: No. We provide backups and a tested rollback procedure. Data is never at risk.

**Q: Do I need to update my code?**
A: Only if you use the API or webhooks. UI-only users need no code changes.

**Q: What if migration fails?**
A: We have a rollback procedure to restore v1.x quickly (< 30 min). Support team will help.

**Q: Is there a cost to upgrade?**
A: No. v2.0 is a free upgrade for all existing users.

---

## Conclusion

Lume v2.0 is a **major improvement in performance, security, and features**. While there are breaking changes, they are **well-documented, tested, and easily mitigated** with the provided migration guide.

**Migration Confidence**: 95%+ success rate expected with this guide.

For questions or issues during migration, the support team is available 24/7 at support@lume.dev.

**Let's ship v2.0! 🚀**
