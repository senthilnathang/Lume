# Lume v2.0 FAQ

**Last Updated:** April 28, 2026

Frequently asked questions about Lume covering installation, usage, deployment, integrations, and common issues.

---

## Installation & Setup

### Q: What are the minimum system requirements?
A: 2 CPU cores, 4GB RAM, 20GB storage, MySQL 8.0+, Node.js v18+. For production: 4+ cores, 8GB+ RAM, 100GB storage recommended.

### Q: Can I run Lume on macOS/Windows?
A: Yes! Use Docker for easiest setup. Native installation also works with MySQL/Redis installed locally.

### Q: Do I need to be a programmer to use Lume?
A: No. The UI is no-code. To extend Lume with custom modules, basic JavaScript knowledge helps.

### Q: How do I migrate from Airtable/Notion to Lume?
A: Export from Airtable as CSV, import into Lume. See [PUBLIC_USER_GUIDE.md](PUBLIC_USER_GUIDE.md#importing-records) for step-by-step instructions.

### Q: Can I use Lume with PostgreSQL instead of MySQL?
A: Yes. Set `DB_HOST`, `DB_PORT=5432` in environment. Prisma supports both.

---

## Usage & Features

### Q: How many records can Lume handle?
A: Millions of records. Performance depends on server specs. Indexed queries return results in <100ms even with 10M+ records.

### Q: Can I have relationships between entities?
A: Yes. One-to-many and many-to-many relationships fully supported with automatic reverse relationships.

### Q: What are the field type limits?
A: Text: 255 chars, Long Text: unlimited, Files: 50MB each, Relationships: unlimited.

### Q: Can I use formulas/calculated fields?
A: Not in v2.0. Planned for v2.1. Workaround: use automations to update derived fields.

### Q: How do I bulk import large CSV files?
A: Use import dialog with column mapping. Or use API: POST /api/:entity/bulk with up to 10,000 records.

### Q: Can multiple users edit the same record simultaneously?
A: Not in real-time collaboration mode. Last writer wins (no conflict resolution in v2.0).

---

## Permissions & Security

### Q: What's the difference between roles and permissions?
A: Roles are groups of permissions (e.g., "Editor" role has multiple permissions). Permissions are specific actions (e.g., "contacts.edit").

### Q: How do I prevent users from seeing certain fields?
A: Use field permissions in entity settings. Set read/edit access per role.

### Q: Can I restrict records to specific users?
A: In v2.0, no record-level ownership. Planned for v2.1.

### Q: How long are passwords valid?
A: No expiration by default. Configure in settings to require password reset every N days.

### Q: Is there multi-factor authentication?
A: Not in v2.0. Planned for v2.1 (TOTP, WebAuthn support).

---

## Automation & Webhooks

### Q: How many automations can I have?
A: Unlimited. Each runs independently with no conflicts.

### Q: Can automations trigger other automations?
A: Not directly. Record updates won't re-trigger automations (prevents loops).

### Q: What if my webhook endpoint is down?
A: Lume retries failed webhooks 3 times with exponential backoff.

### Q: Can I test automations before deploying?
A: Yes. Edit automation > Test button sends test data to actions.

### Q: How often can I schedule automations?
A: Every minute (minimum). For frequent tasks, use webhooks with external cron.

---

## Performance & Scaling

### Q: How do I improve slow queries?
A: (1) Add database indices on filtered fields, (2) Use Redis caching, (3) Optimize field selection (don't fetch all fields).

### Q: Can I scale to multiple servers?
A: Yes. Deploy multiple instances behind a load balancer with shared MySQL/Redis.

### Q: What's the maximum concurrent users?
A: Depends on server size. With 4-core, 8GB RAM: ~1000 concurrent users. Scale horizontally for more.

### Q: How do I reduce database size?
A: Archive old records (soft delete), export to cold storage, or drop non-critical audit logs.

---

## API & Integrations

### Q: How do I authenticate API requests?
A: POST /api/auth/login with email/password, get access token, include in Authorization header.

### Q: What's the API rate limit?
A: 1000 requests/hour per user. Increase with higher plan (planned v2.1).

### Q: Can I use Lume without the UI?
A: Yes. Full REST API access allows programmatic-only usage.

### Q: Does Lume have a GraphQL API?
A: Not yet. Planned for v2.1. Currently REST only.

### Q: How do I integrate with Zapier/Make?
A: Use webhook triggers in Lume, create Zapier integration with Lume connector.

### Q: Can I sync data to external systems?
A: Yes. Use webhooks to POST record changes to your system, or use third-party integrations.

---

## Deployment

### Q: What's the easiest deployment method?
A: Docker Compose. One config file, all dependencies included.

### Q: Can I deploy to Heroku/DigitalOcean/AWS?
A: Yes. See [PUBLIC_DEPLOYMENT.md](PUBLIC_DEPLOYMENT.md) for platform-specific guides.

### Q: Do I need Kubernetes for production?
A: No. Docker + Nginx works fine for up to 10,000 users. Use Kubernetes for larger scale.

### Q: How do I set up SSL/TLS?
A: Use Let's Encrypt for free certificates, renew automatically via Certbot.

### Q: What's the difference between self-hosted and managed hosting?
A: Self-hosted: You manage everything (servers, database, backups). Managed: We handle infrastructure (coming v2.1).

### Q: How do I backup my data?
A: Automated daily backups recommended. Manual: mysqldump to file, upload to S3. Restore: import SQL file.

---

## Support & Community

### Q: Where can I get help?
A: GitHub Discussions (questions), Discord (community chat), support@lume.dev (urgent issues).

### Q: Is there professional support?
A: Enterprise support planned for v2.1. Currently community-supported.

### Q: How do I report a bug?
A: Create GitHub issue with reproduction steps, expected vs actual behavior.

### Q: How do I request features?
A: Create discussion in GitHub Discussions, vote on existing requests.

### Q: Is there commercial support available?
A: Not yet. Custom development available - contact team@lume.dev

---

## Licensing & Legal

### Q: What's the license?
A: MIT. Open source, free for commercial use. Must include license in distributions.

### Q: Can I use Lume commercially?
A: Yes. MIT license permits commercial use.

### Q: Do I own my data?
A: Yes. All your data is yours. No licensing fees or vendor lock-in.

### Q: What about data privacy/compliance?
A: Self-hosted = full control. GDPR/HIPAA/CCPA compliance depends on deployment.

### Q: Is there a terms of service?
A: Not for self-hosted. For managed hosting (future): standard ToS will apply.

---

## Troubleshooting

### Q: Why can't I login?
A: Check: (1) Email/password correct, (2) User account exists, (3) Account not deactivated, (4) Browser cookies enabled.

### Q: Records not appearing in list view?
A: Check: (1) Filters applied (clear them), (2) Deleted records hidden (show deleted), (3) Permissions restricting access.

### Q: Automations not triggering?
A: Check: (1) Automation enabled, (2) Conditions match, (3) Look in automation logs for errors.

### Q: API returning 403 Forbidden?
A: Check: (1) Token still valid (not expired), (2) User has permission for action, (3) Correct Authorization header.

### Q: Database connection failed?
A: Check: (1) Database running, (2) Credentials correct in .env, (3) Host/port correct, (4) Firewall allows connection.

### Q: File uploads failing?
A: Check: (1) Upload directory writable, (2) File size under limit (50MB default), (3) Disk space available.

---

## Advanced Questions

### Q: Can I extend Lume with custom code?
A: Yes. Create custom modules with your own business logic, routes, and UI components.

### Q: How do I add custom field types?
A: Create module with custom field type extension. See [PUBLIC_CONTRIBUTING.md](PUBLIC_CONTRIBUTING.md#creating-modules).

### Q: Can I use Lume as a backend for my mobile app?
A: Yes. REST API works from mobile apps. Official SDK (iOS/Android) planned for v2.1.

### Q: How do I integrate with existing systems?
A: Use webhooks to bidirectionally sync data, or bulk import/export.

### Q: What's the difference between Prisma and Drizzle in Lume?
A: Prisma handles core models (type-safe), Drizzle handles module-specific schemas (flexibility).

---

## Getting Started

**New to Lume?** Start with:
1. [PUBLIC_GETTING_STARTED.md](PUBLIC_GETTING_STARTED.md) — Installation & setup
2. [PUBLIC_USER_GUIDE.md](PUBLIC_USER_GUIDE.md) — How to use features
3. [PUBLIC_API_REFERENCE.md](PUBLIC_API_REFERENCE.md) — API integration

**Have a question not answered here?**
- GitHub Discussions: https://github.com/lume/lume/discussions
- Discord: https://discord.gg/lume
- Email: support@lume.dev

---

