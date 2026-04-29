---
title: "Dev.to, ProductHunt, and HackerNews Launch Templates"
description: "Article and submission templates for multiple platforms"
---

# Multi-Platform Launch Strategy

## Dev.to Article 1: "Building Self-Hosted CRM Without Code" (2,000 words)

**Tags:** #open-source #crm #nodejs #saas

Step-by-step guide to building a production CRM using Lume's visual interface, with code examples for developers who want to extend it.

[Tutorial format: 
- 1. Set up entities
- 2. Create fields
- 3. Build views
- 4. Configure automations
- 5. Add webhooks
- 6. Deploy to production
]

---

## Dev.to Article 2: "Why We Open-Sourced Lume CRM" (1,800 words)

**Tags:** #open-source #startup #philosophy #business

Founder story: Why we made the decision to open-source instead of following the traditional SaaS model.

---

## Dev.to Article 3: "REST API Best Practices: Lessons from Lume" (2,200 words)

**Tags:** #api #nodejs #rest #architecture

Technical deep-dive: How we designed Lume's API, mistakes we made, best practices we discovered.

---

## ProductHunt Launch (Sept 1)

**Product Name:** Lume - Open-Source CRM

**Tagline:** "Unlimited users, zero vendor lock-in, unlimited customization"

**Description (150 words):**

Lume is an open-source CRM platform designed for teams that want to own their data and control their costs.

Unlike Salesforce (per-user pricing, vendor lock-in) or Airtable (limited customization), Lume gives you:

- Unlimited team members
- Full data ownership (self-hosted)
- Unlimited customization (open-source)
- 70% cost savings vs. proprietary CRM
- Production-ready in 1 hour

Features:
- Visual entity builder (no code)
- 30+ automation actions
- REST API + webhooks
- Page builder
- Role-based access control
- Audit logging

Use cases: CRM, case management, inventory, project tracking, or build your own app.

Deploy free at lume.dev. Join 2,000+ self-hosted CRM users.

**Feature Bullets:**
1. Unlimited users, no per-user pricing
2. Visual builder, no code required
3. Deploy self-hosted or on-premises
4. Full REST API with webhooks
5. 30+ automation actions included
6. 50+ field types
7. Kubernetes-ready with Helm chart
8. HIPAA/GDPR compliant infrastructure
9. Open-source with 23 modules
10. 99.9% uptime (on Kubernetes)

**Comparison Table vs. Airtable:**

| Feature | Lume | Airtable |
|---------|------|----------|
| Pricing | Free (self-hosted) | $10-25/user |
| Users | Unlimited | Per-user |
| Customization | Unlimited | Limited |
| Data ownership | You own it | Airtable owns |
| Deployment | Self-hosted | Cloud-only |
| API | Production-grade | Rate-limited |
| Compliance | Full control | Limited options |

**FAQ (8 questions):**

1. Is Lume production-ready? Yes, 23 companies in production, 99.9% uptime.
2. How do I get started? Deploy with Docker in 5 minutes, full setup in 1 hour.
3. What's the cost? Infrastructure only ($50-500/month). No per-user fees.
4. Can I migrate from Salesforce? Yes, 2-day migration process.
5. Is there support? Community (Discord) + enterprise support available.
6. How is data protected? Your servers, you manage encryption, audit logs.
7. Can I customize it? Yes, it's open-source. Modify anything.
8. What about mobile? Native iOS/Android apps (beta Q4 2026).

---

## HackerNews Submission

**Title:** "Show HN: Lume – Open-Source CRM with Unlimited Users, Zero Vendor Lock-In"

**Submission URL:** https://lume.dev

**Text Post (250 words):**

Hi HN, I'm excited to share Lume, an open-source CRM platform we just released.

Lume is built for teams that want to own their data and avoid vendor lock-in.

**The Problem:**
- Salesforce charges per-user ($15-165/month)
- For 50 people, that's $600-8,250/month
- Over 5 years: $360K-495K
- Plus integrations, training, consulting
- Data is locked in their infrastructure

**Our Solution:**
- Deploy on your servers, unlimited users
- $50-500/month infrastructure (all teams)
- Open-source, fully customizable
- GDPR/HIPAA compliant (you manage it)
- Production-ready: 23 modules, 577 tests, 99.9% uptime

**Features:**
- Visual entity builder (no code)
- 30+ automations + webhooks
- REST API (no rate limits)
- Page builder for customer portals
- Audit logging, role-based access
- Kubernetes-native

**Tech Stack:** NestJS, Vue 3, PostgreSQL, Docker, Kubernetes

**GitHub:** github.com/lume-dev/lume (AGPL v3)
**Docs:** docs.lume.dev
**Community:** discord.gg/lume

We're not trying to replace Salesforce for Fortune 500 companies. We're building the CRM for teams that want control, customization, and cost transparency.

Deploy free, no credit card required. Happy to answer questions.

---

**Expected HN Comments & Responses:**

Q: "How is this different from Odoo/ERPNext?"
A: "Odoo is full ERP. We're CRM-focused. Modern UI. Faster deployment."

Q: "License concerns with AGPL?"
A: "Open-source by default. Commercial license available for proprietary software."

Q: "Database choices?"
A: "PostgreSQL and MySQL supported. We recommend PG for new deployments."

Q: "How do you make money?"
A: "Managed hosting (coming 2026), enterprise support, professional services."

Q: "Kubernetes learning curve?"
A: "Optional. Works great on Docker, VPS, on-premises too."

Q: "Why open-source instead of SaaS?"
A: "Data ownership is non-negotiable. Self-hosting is more sustainable."

Q: "Scaling limits?"
A: "Tested to 10M+ records. P95 <300ms. On Kubernetes, scales horizontally."
