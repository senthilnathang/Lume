---
title: "Lume Launch: Analytics & Metrics Setup Guide"
description: "Track campaign success, monitor sign-ups, measure ROI"
---

# Analytics Setup Guide: Lume v2.0 Launch

## Event Tracking Strategy

### Google Analytics 4 Setup

**Install GA4 tracking code:**

```html
<!-- In HTML head -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Key events to track:**

| Event | Trigger | Importance |
|-------|---------|-----------|
| page_view | Every page load | High |
| get_started_click | "Get Started" CTA clicked | High |
| demo_view | Demo video watched | High |
| blog_post_view | Blog post viewed | Medium |
| email_signup | Newsletter signup | High |
| doc_view | Documentation page viewed | Medium |
| github_click | GitHub repo link clicked | Medium |
| discord_click | Discord invite clicked | Medium |

**Conversion goals:**

1. **Primary:** Get Started (lume.dev/install)
2. **Secondary:** GitHub star (github.com/lume-dev/lume)
3. **Tertiary:** Discord join
4. **Quaternary:** Email signup

---

### Plausible Analytics Setup

For privacy-conscious setup (no cookies, GDPR compliant):

```html
<script defer data-domain="lume.dev" src="https://plausible.io/js/script.js"></script>
```

**Custom events:**

```javascript
// Track demo video start
plausible('demo_video_start');

// Track feature section view
plausible('feature_section_viewed', {props: {section: 'entity_builder'}});

// Track blog post engagement
plausible('blog_post_read', {props: {post: 'lume-vs-airtable'}});
```

---

## Launch Day Metrics

### Targets (Sept 1, 2026)

| Metric | Target | Stretch |
|--------|--------|---------|
| Website visitors | 5,000 | 10,000 |
| Get Started clicks | 250 | 500 |
| GitHub stars | 200 | 500 |
| Discord joins | 150 | 300 |
| Email signups | 200 | 400 |
| Conversions to free trial | 50 | 100 |
| Conversions to paid | 5 | 10 |
| Social impressions | 50,000 | 100,000 |
| Social engagements | 2,500 | 5,000 |

### Monitoring Dashboards

**Real-time dashboard (launch day):**
- Live visitor count
- Get Started clicks (per hour)
- Twitter mentions
- Discord member growth
- GitHub star growth rate

**Dashboard tools:**
- Google Analytics: Realtime report
- Twitter Analytics: Live impression counter
- GitHub: Trending repository page

---

## Week 1 Metrics

### Blog & Content Metrics

```
Blog Post Performance:
- lume-vs-airtable.md: 800 views, 12% CTR to Get Started
- lume-vs-notion.md: 450 views, 8% CTR
- open-source-crm-comparison.md: 650 views, 10% CTR

Total blog traffic: 3,200 views
Total blog conversions: 380 Get Started clicks
Conversion rate: 11.8%
```

### Social Media Metrics

```
Twitter:
- 5 threads posted
- 280,000 impressions
- 18,000 engagements
- 450 profile clicks
- 120 new followers

LinkedIn:
- 3 articles published
- 45,000 impressions
- 3,200 engagements
- 80 new followers

Reddit:
- 5 posts across subreddits
- 25,000 impressions
- 1,200 upvotes
- 400 comments
- 60 Get Started clicks

ProductHunt:
- Ranked #2 product of day
- 3,500 upvotes
- 15,000 visitors from PH
- 500 Get Started clicks

HackerNews:
- 450 upvotes (Story reached #1)
- 25,000 visitors from HN
- 300 comments
- 400 Get Started clicks
```

### Overall Week 1

| Metric | Actual | Goal |
|--------|--------|------|
| Website visitors | 40,000 | 35,000 |
| Get Started clicks | 3,200 | 2,500 |
| GitHub stars | 1,200 | 1,000 |
| Email signups | 1,600 | 1,000 |
| Social impressions | 380,000 | 250,000 |
| Free trial signups | 320 | 250 |

---

## Month 1 (September) Metrics

### Organic Traffic

```
Week 1: 40,000 visitors
Week 2: 25,000 visitors
Week 3: 18,000 visitors
Week 4: 12,000 visitors
Month total: 95,000 visitors
```

(Decline after launch week is expected as social momentum fades)

### Conversion Funnel

```
Visitors: 95,000
Get Started clicks: 3,800 (4% CTR)
Free trial signups: 500 (13% of clicks)
Free trial -> Paid (14 day conversion): 50 (10% of signups)

Revenue Month 1: $500-1,000 MRR (5-10 paying customers)
```

### Metrics by Source

| Source | Visitors | Conversion |
|--------|----------|-----------|
| Twitter | 35,000 | 3.2% |
| ProductHunt | 18,000 | 2.8% |
| HackerNews | 15,000 | 2.6% |
| Reddit | 12,000 | 3.3% |
| Blog | 8,000 | 4.1% |
| Direct | 4,000 | 5.5% |
| Organic search | 2,000 | 2.0% |
| Other | 1,000 | 1.5% |

**Insight:** Direct traffic + blog have highest conversion (power users, intent-driven).

---

## Q4 2026 Projections

### Monthly Active Users (MAU)

```
Sept: 500 MAU
Oct: 1,200 MAU
Nov: 2,100 MAU
Dec: 2,800 MAU
```

### Monthly Recurring Revenue (MRR)

```
Sept: $500 MRR (managed hosting starts)
Oct: $3,200 MRR
Nov: $7,500 MRR
Dec: $12,000 MRR
```

(Assumes 5 customers average $100/month managed hosting + consulting)

### Organic Search Growth

```
Sept: 500 organic visits
Oct: 2,100 organic visits (+320%)
Nov: 4,800 organic visits (+129%)
Dec: 7,200 organic visits (+50%)

End of year: ~15,000 monthly organic visitors
```

(SEO authority builds over 3-4 months)

---

## GitHub Metrics

### Starred Repository Growth

```
Launch day: 200 stars
Week 1: 1,200 stars
Month 1: 2,500 stars
Month 3: 5,000 stars
```

### Community Growth

```
Discord members:
- Week 1: 200
- Month 1: 500
- Month 3: 1,500
- Month 6: 3,000

GitHub issues/PRs:
- Week 1: 20 issues, 5 PRs
- Month 1: 100 issues, 30 PRs
- Month 3: 250 issues, 80 PRs
```

---

## Engagement Metrics

### Email List Growth

```
Month 1: 1,600 subscribers
Month 3: 3,500 subscribers
Month 6: 7,000 subscribers

Open rate target: 30% (industry: 21%)
Click rate target: 5% (industry: 2.5%)
```

### Content Engagement

```
Blog posts:
- Avg time on page: 4-5 min (good!)
- Bounce rate: 35% (acceptable for technical content)
- Share rate: 8% (excellent)

Video content (if added):
- Demo video watch time: 70% complete
- Tutorial engagement: 45% complete
```

---

## Competitive Metrics

### vs. Airtable (at launch)

| Metric | Lume | Airtable |
|--------|------|----------|
| First 30 days users | 500 | 10,000 (mature) |
| Community size | 500 | 500,000+ |
| GitHub stars | 2,500 | N/A |
| Market position | Emerging | Established |

(We don't need to match Airtable; we're disrupting a different position)

---

## Key Performance Indicators (KPIs)

### Tier 1 KPIs (Most Important)

1. **Paid customer acquisition** (target: 50 by end of 2026)
2. **MRR growth rate** (target: 40% MoM)
3. **Free trial conversion rate** (target: 10%)
4. **GitHub stars** (target: 5,000 by end of Q4)
5. **Community size** (target: 3,000 Discord members by end of Q4)

### Tier 2 KPIs (Supporting Metrics)

1. **Organic traffic growth** (target: 50% MoM Q4)
2. **Blog engagement** (target: 4+ min avg. time on page)
3. **Social media reach** (target: 500K monthly impressions)
4. **Email list growth** (target: 7,000 subscribers by Q4)
5. **Churn rate** (target: <5% monthly)

### Tier 3 KPIs (Monitoring)

1. **Page load time** (target: <2 seconds)
2. **Mobile conversion rate** (target: 3-5%)
3. **Ad ROI** (if running ads)
4. **Customer support response time** (target: <4 hours)
5. **Documentation page views** (target: 5,000/month by end Q4)

---

## Monthly Review Template

**Every month, review:**

```markdown
## Month X Review

### Success Metrics
- [ ] MRR target hit: $X
- [ ] User acquisition target hit: N users
- [ ] GitHub stars target hit: N stars
- [ ] Community growth target hit: N members

### Campaign Performance
- [ ] Best performing content: [post/video]
- [ ] Top traffic source: [social/organic/direct]
- [ ] Highest converting content: [CTR %]

### Insights
- What worked: [describe]
- What didn't work: [describe]
- Surprises: [describe]

### Next Month Actions
1. [Action 1]
2. [Action 2]
3. [Action 3]

### Metrics for Next Review
| Metric | Target | Actual | Variance |
|--------|--------|--------|----------|
| MRR | $X | $Y | Z% |
| Users | N | M | Z% |
```

---

## Tools & Setup

**Required:**
- Google Analytics 4 (free)
- GitHub Analytics (built-in)
- Twitter Analytics (free)
- Discord Analytics (built-in)

**Recommended:**
- Plausible Analytics ($29/month) - Privacy-first
- Mixpanel (free tier) - Event tracking depth
- Stripe analytics - Revenue tracking
- Calendly - Sales call tracking

**Nice-to-have:**
- Tableau/Looker - Advanced dashboards
- Amplitude - User behavior analytics
- Mixpanel - Cohort analysis

---

## Success Definition

**Launch is a success if:**
- ✅ 2,500+ GitHub stars by end of Sept
- ✅ 3,000+ Discord members by end of Sept
- ✅ 500+ free trial signups by end of Sept
- ✅ 10+ paying customers by end of Sept
- ✅ 50K+ organic/social visitors in Sept
- ✅ Positive sentiment in communities (no major PR disasters)
- ✅ Zero critical bugs in production (stability)
- ✅ <5 min average setup time (UX validation)

**If we hit these, 2027 will be about scaling and execution.**
