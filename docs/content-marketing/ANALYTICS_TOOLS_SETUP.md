# Analytics Tools Setup & Configuration Guide
## Step-by-Step Implementation for GA4, Semrush, Search Console, and Dashboards

**Timeline**: May 1 - July 14, 2026  
**Owner**: Analytics Setup Lead  
**Effort**: 40-60 hours (team of 2)

---

## Part 1: Google Analytics 4 (GA4) Complete Setup

### Step 1: Create GA4 Property (30 minutes)

**Prerequisites**:
- Google account with admin access to website
- Access to Google Analytics

**Instructions**:
```
1. Go to analytics.google.com
2. Click "Admin" (bottom left)
3. Click "Create" (Property column)
4. Property name: "Lume"
5. Reporting time zone: UTC
6. Currency: USD
7. Industry category: "Software"
8. Business size: 10-50 employees
9. Click "Create"
```

**Result**: GA4 Measurement ID (G-XXXXXXXXXX)

### Step 2: Install GA4 Measurement Tag (1 hour)

**Option A: Using Google Tag Manager** (Recommended)
```
1. Go to tagmanager.google.com
2. Create GTM account
3. Create container for "lume.dev"
4. Install GTM code snippet in <head>
5. Create GA4 configuration tag
6. Add Measurement ID (G-XXXXXXXXXX)
7. Trigger: All pages
8. Submit container
```

**Option B: Direct Installation**
```html
<!-- Add to <head> of website (before </head>) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Verification**:
- [ ] Open website in browser
- [ ] Open Chrome DevTools (F12)
- [ ] Network tab: Search for "google-analytics"
- [ ] Should see requests to google-analytics.com
- [ ] Go to GA4 → Real-time → See yourself as active user

### Step 3: Configure Data Retention (15 minutes)

```
GA4 Admin Settings:
├─ Data retention: 14 months (maximum)
├─ Events data retention: 14 months
├─ User-ID feature: Enable (if applicable)
└─ Reset user data: Disable
```

### Step 4: Setup Conversion Events (2-3 hours)

**Event 1: Newsletter Signup**
```
Event name: newsletter_signup
Trigger: Newsletter form submission
Parameters:
├─ source: "homepage" or "blog_post" or "sidebar"
├─ content: [blog_post_slug if applicable]
└─ value: 1

GTM Setup:
1. Create trigger: "Form submission" on #newsletter-form
2. Create event tag: newsletter_signup
3. Add parameters using dataLayer
4. Test with Google Analytics Debugger
```

**Event 2: Blog Post Engagement (75% Scroll)**
```
Event name: blog_engaged
Trigger: Page scroll ≥ 75%
Parameters:
├─ page_title: [auto]
├─ page_path: [auto]
├─ scroll_depth: 75
└─ time_on_page: [auto]

GTM Setup:
1. Create custom event for scroll depth
2. Add scroll tracking trigger
3. Fire event at 75% threshold
4. Test on blog post
```

**Event 3: CTA Clicks (Demo, Try Free, etc.)**
```
Event name: cta_click
Trigger: Click on CTA buttons
Parameters:
├─ button_text: "Start Free" | "View Demo" | etc.
├─ button_location: "hero" | "sidebar" | "footer"
├─ page: [page_path]
└─ timestamp: [auto]

GTM Setup:
1. Create click trigger on [class^="cta-"]
2. Create event tag: cta_click
3. Map button attributes to parameters
4. Test with DebugView
```

**Event 4: Outbound Link Clicks**
```
Event name: outbound_link
Trigger: Click on external links
Parameters:
├─ link_url: [href]
├─ link_text: [text]
├─ source_page: [page_path]
└─ link_category: "github" | "docs" | "api" | etc.

GTM Setup:
1. Create click trigger: Not (page_path = window.location.hostname)
2. Extract domain from href
3. Create outbound_link event
4. Exclude internal links
```

**Event 5: File Downloads**
```
Event name: file_download
Trigger: Download button or link
Parameters:
├─ file_name: [filename]
├─ file_type: "pdf" | "docx" | "zip"
├─ file_category: "case_study" | "guide" | "whitepaper"
└─ download_source: [page_title]

GTM Setup:
1. Create download link triggers (target file types)
2. Extract filename from href
3. Determine category from URL pattern
4. Fire file_download event
```

**Event 6: Video Engagement**
```
Event name: video_play
Trigger: Video play (for embedded videos)
Parameters:
├─ video_title: [title]
├─ video_id: [video_id]
├─ video_source: "youtube" | "self-hosted"
└─ page: [page_path]

GTM Setup:
1. Install YouTube IFrame API
2. Track: play, pause, ended
3. Calculate watch time (ended - play)
4. Send video metrics to GA4
```

### Step 5: Create Conversion Goals (1 hour)

```
GA4 → Admin → Conversions → Create New Conversion Event

Conversion Events to Create:
✓ newsletter_signup (primary)
✓ demo_started (primary)
✓ blog_engaged (secondary)
✓ cta_click (secondary)
✓ file_download (secondary)
✓ outbound_link_github (secondary)
✓ video_play (secondary)

Mark as "primary" (appear in top of reports)
```

### Step 6: Setup Custom Dashboards (1-2 hours)

**Dashboard 1: Content Performance**
```
Layout: 4x3 grid
- Metric: Total Users (last 7 days)
- Metric: Engagement Rate (%)
- Metric: Average Session Duration
- Dimension Table: Top 10 Pages (by users)
- Trend: Organic Users (last 30 days)
- Metric: Blog Engaged Events
```

**Dashboard 2: Conversion Funnel**
```
Layout: 4x2 grid
- Metric: Users (all)
- Metric: Newsletter Signup Events
- Metric: Demo Started Events
- Metric: Conversion Rate (% funnel)
- Funnel: Newsletter → Demo → Signup
- Table: Top referrers for each step
```

**Dashboard 3: Traffic Sources**
```
Layout: 3x2 grid
- Pie Chart: Users by channel (organic, direct, referral, social)
- Table: Top referring domains
- Metric: Organic users (vs last period)
- Trend: Organic traffic (last 30 days)
- Metric: Paid search (if applicable)
- Table: Keyword performance (from Search Console integration)
```

---

## Part 2: Google Search Console Setup

### Step 1: Verify Website (30 minutes)

**Prerequisites**:
- Domain ownership or access to DNS

**Instructions**:
```
1. Go to search.google.com/search-console
2. Click "URL prefix" (right option)
3. Enter: https://lume.dev
4. Choose verification method:
   ├─ DNS TXT record (fastest)
   ├─ HTML file upload
   ├─ HTML tag (if using GTM)
   └─ Google Analytics
5. Complete verification
6. Property created successfully
```

### Step 2: Submit Sitemap (15 minutes)

**Instructions**:
```
1. Navigate to Sitemaps section
2. Click "New Sitemap"
3. Enter: https://lume.dev/sitemap.xml
4. Click Submit
5. Wait for processing (24-48 hours)
6. Check status: Processed Successfully
```

**Ensure your website generates sitemap.xml**:
```
Technologies:
├─ Next.js/Nuxt: use next-sitemap or nuxt-sitemap
├─ Static: use static-site-generator-middleware
├─ CMS: auto-generated by most CMS platforms
└─ Custom: create manually and auto-update weekly
```

### Step 3: Configure Robots.txt (15 minutes)

**Create /robots.txt**:
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /internal
Crawl-delay: 5

Sitemap: https://lume.dev/sitemap.xml
```

**Verify in Search Console**:
```
1. Tools & Settings → Robots.txt Tester
2. Paste robots.txt content
3. Test key URLs:
   ├─ /blog/airtable-alternative (allow)
   ├─ /admin (disallow)
   ├─ /api (disallow)
   └─ /index.html (allow)
```

### Step 4: Review Coverage Report (30 minutes)

**Identify Issues**:
```
Coverage tab:
├─ Error: X pages with errors (fix immediately)
├─ Valid with warnings: X pages (review)
├─ Valid: X pages (target: >95% valid)
└─ Excluded: X pages (OK if intentional)

Common Issues to Fix:
- [ ] Server errors (5xx) - Fix hosting
- [ ] Not found (404) - Remove broken links
- [ ] Redirect chains - Limit to 1 redirect
- [ ] Duplicate content - Set canonical URLs
```

### Step 5: Monitor Performance Data (Weekly)

**Performance Tab Reports**:
```
1. Total Clicks (last 28 days): _________
   Target: +50% monthly growth

2. Total Impressions (last 28 days): _________
   Target: +100-200% by Aug 31

3. Average CTR: _________ %
   Target: 3-5% baseline, 8%+ after content

4. Average Position: _________
   Target: <5 average (top 5 pages)

5. Top Queries (document baseline):
   - Query 1: _________
   - Query 2: _________
   - Query 3: _________
```

### Step 6: Setup URL Inspections for New Content

**When Publishing New Blog Posts**:
```
1. Search Console → URL Inspection
2. Paste blog post URL
3. Click "Request Indexing"
4. Wait for response (usually 24-48 hours)
5. Monitor: URL is not on Google
   └─ Common causes: robots.txt, noindex, errors
```

---

## Part 3: Semrush Rank Tracking Setup

### Step 1: Create Semrush Account (30 minutes)

**Account Setup**:
```
1. Go to semrush.com
2. Sign up (free 7-day trial or $200/month pro)
3. Verify email
4. Create workspace: "Lume"
5. Add domain: lume.dev
```

### Step 2: Setup Keyword Tracking (2-3 hours)

**Add Primary Keywords**:
```
1. Rank Tracker → Add Keywords
2. Domain: lume.dev
3. Location: United States (or Global)
4. Google Database: Desktop + Mobile

Keywords to Add:
✓ open source crm (1,200/mo)
✓ airtable alternative (2,500/mo)
✓ no-code database builder (800/mo)
✓ self-hosted crm (600/mo)
✓ rest api database (400/mo)
✓ open source workflow automation (500/mo)

Plus 12 long-tail keywords:
✓ how to build a crm without code
✓ best open source crm for small business
✓ self-hosted alternative to airtable
... (12 total long-tail)
```

**Result**: Baseline rankings captured

### Step 3: Add Competitors (1 hour)

```
Competitors to Track:
1. airtable.com
2. notion.so
3. monday.com
4. activepieces.com
5. nocodb.com

Setup:
1. Rank Tracker → Competitors
2. Add each competitor domain
3. Track same keywords
4. Compare rankings
5. Identify gap opportunities
```

### Step 4: Configure Tracking Schedule (15 minutes)

```
Tracking Settings:
├─ Frequency: Daily (pro plan) or Weekly (free)
├─ Time zone: UTC
├─ Email reports: Weekly (Friday)
├─ Recipients: [email]
└─ Include: Rankings, changes, opportunities
```

### Step 5: Review Baseline Rankings (1 hour)

**Document Current State**:
```
Keyword | Current Rank | Target | Status
---------|-------------|--------|--------
airtable alternative | __ | #2-5 | [baseline]
open source crm | __ | #1-3 | [baseline]
no-code database | __ | #1-3 | [baseline]
... (all 18 keywords)

Baseline captured by: _________
```

### Step 6: Analyze Opportunities (1-2 hours)

```
Opportunities Tab:
1. Easy wins (Quick rank improvements)
   ├─ Keywords ranking 11-20 (move to 1-10)
   ├─ Keywords with high click potential
   └─ Low competition targets

2. New keyword opportunities
   ├─ Keywords competitors rank for (we don't)
   ├─ Keywords on upward trend
   └─ Long-tail variants of primary keywords

3. Gap analysis
   ├─ Airtable ranks for: [list]
   ├─ Notion ranks for: [list]
   └─ We should target: [list]

Action: Prioritize top 5 opportunities for content creation
```

---

## Part 4: Dashboard Creation (Google Data Studio)

### Step 1: Create New Dashboard (30 minutes)

```
1. Go to datastudio.google.com
2. Click "Create" → "Report"
3. Name: "Lume - Master Analytics"
4. Add data sources:
   ├─ Google Analytics 4 (property: Lume)
   ├─ Google Search Console (property: lume.dev)
   └─ Google Sheets (custom data)
```

### Step 2: Build Traffic Dashboard (2-3 hours)

**Layout**: 4 pages (one per week of reports)

**Page 1: Executive Summary**
```
Top Row (4 cards):
├─ Total Users (last 30 days)
├─ New Users (last 30 days)
├─ Sessions (last 30 days)
└─ Engagement Rate (%)

Middle Section:
├─ Trend: Users (last 90 days)
├─ Channel Breakdown (pie chart)
├─ Top Pages (table)
└─ Goal Conversions (metric)

Bottom Section:
└─ Conversion Funnel (visualization)
```

**Page 2: Traffic Sources**
```
├─ Organic Search: Users over time
├─ Direct: Users over time
├─ Social Referrals: Top sources
├─ Referral Traffic: Top domains
├─ Paid Search: Performance (if applicable)
└─ Campaign Performance: UTM breakdown
```

**Page 3: Content Performance**
```
├─ Top Blog Posts: Users, bounce rate, avg session duration
├─ Blog Engagement Rate: % scrolling 75%+
├─ Video Performance: View count, watch time
├─ Landing Pages: Conversion rate by page
└─ Content by Channel: Organic vs paid vs direct
```

**Page 4: Conversions & Goals**
```
├─ Newsletter Signups: Daily trend
├─ Demo Starts: Daily trend
├─ File Downloads: By type
├─ Conversion Funnel: Drop-off analysis
├─ Goal Completion Rate: % of users
└─ Conversion by Traffic Source
```

### Step 3: Build Search Console Dashboard (1-2 hours)

```
Page 1: Search Performance
├─ Metric: Total Impressions (last 28 days)
├─ Metric: Total Clicks (last 28 days)
├─ Metric: Average CTR (%)
├─ Metric: Average Position
├─ Trend: Impressions (last 90 days)
└─ Table: Top 20 Queries
   ├─ Impressions
   ├─ Clicks
   ├─ CTR
   └─ Avg Position

Page 2: Pages Report
├─ Table: Top 25 Pages
   ├─ Impressions
   ├─ Clicks
   ├─ CTR
   ├─ Avg Position
   └─ Top Query per page

Page 3: Mobile Performance
├─ Mobile CTR vs Desktop
├─ Mobile Clicks (trend)
├─ Mobile Impressions (trend)
├─ Mobile vs Desktop (comparison)
```

### Step 4: Add Scorecard Cards (1 hour)

```
Top of Dashboard - Key Metrics:
┌─────────────────────────────────────────┐
│ Users    │ Sessions │ Conversions │ CTR  │
│ 2,534    │ 3,821    │ 156         │ 5.2% │
│ ↑15%     │ ↑22%     │ ↑45%        │ ↑3%  │
└─────────────────────────────────────────┘

Each card shows:
- Metric name
- Current value
- % change (vs last period)
- Color coding (green = up, red = down)
```

### Step 5: Configure Auto-Refresh (15 minutes)

```
Report Settings:
├─ Auto-refresh: Every 1 hour
├─ Default date range: Last 7 days
├─ Time zone: UTC
├─ Email schedule: Weekly Friday 9 AM
└─ Recipients: Team list
```

### Step 6: Share with Team (15 minutes)

```
1. Click Share (top right)
2. Add team members:
   ├─ Content team (view only)
   ├─ Marketing lead (can edit)
   ├─ Executives (view only)
   └─ DevOps (view only)
3. Set permissions (view/edit)
4. Send invitations
```

---

## Part 5: Weekly Reporting Setup

### Create Weekly Report Template (1 hour)

**Google Sheets Template**:
```
Sheet Name: "Weekly Analytics"

Columns:
├─ Week Ending: [date]
├─ Metric: [name]
├─ Value: [number]
├─ Last Week: [number]
├─ Change: [% change]
├─ Goal: [target]
├─ Status: [on-track/behind]
└─ Notes: [commentary]

Key Metrics to Track Weekly:
✓ Total Users
✓ New Users
✓ Sessions
✓ Organic Users
✓ Engagement Rate
✓ Newsletter Signups
✓ Blog Engaged (75% scroll)
✓ Demo Starts
✓ Total Conversions
✓ Organic Impressions (GSC)
✓ Organic Clicks (GSC)
✓ Avg Ranking
✓ GitHub Stars
✓ Twitter Followers
✓ Discord Members
```

### Setup Automated Report Generation (1-2 hours)

**Option 1: Google Sheets + Apps Script**
```javascript
// Auto-pull GA4 data into Sheets
function pullAnalytics() {
  const analyticsData = // GA4 API call
  sheet.getRange('A2').setValue(analyticsData);
}

// Schedule: Weekly Friday 8 AM
```

**Option 2: Data Studio + Email Export**
```
1. Data Studio → Set up email delivery
2. Time: Friday 8 AM UTC
3. Recipients: Analytics Team
4. Format: PDF report
```

**Option 3: Third-party Integration (Zapier)**
```
Trigger: Weekly (Friday 8 AM)
Action 1: Fetch GA4 data
Action 2: Fetch GSC data
Action 3: Compile into Google Sheets
Action 4: Email team
```

---

## Part 6: Baseline Documentation (By July 14)

### Create Baseline Spreadsheet

**File: SEO_BASELINE_JULY14.xlsx**

```
Sheet 1: Keywords
├─ Keyword
├─ Monthly Search Volume
├─ Current Rank (July 14)
├─ Domain Ranking
├─ URL Ranking
├─ Competition Level
├─ Content Target
└─ Notes

Sheet 2: Metrics Baseline
├─ Metric Name
├─ Baseline Value (May 1)
├─ Current Value (July 14)
├─ July 15+ Target
├─ Target by Aug 31
├─ Target by Sept 30
└─ Measurement Tool

Sheet 3: Competitive Analysis
├─ Competitor
├─ Organic Traffic Rank
├─ Domain Authority
├─ Backlinks Count
├─ Top Keywords
└─ Strength vs Us

Sheet 4: Dashboard URLs
├─ Dashboard Name
├─ Tool (GA4, GSC, Semrush)
├─ URL
├─ Update Frequency
└─ Responsible Person
```

---

## Implementation Checklist

### Week 1 (May 1-5)
- [ ] GA4 account created
- [ ] GA4 measurement tag installed
- [ ] Conversion events configured (5 core events)
- [ ] Search Console property verified
- [ ] Sitemap submitted
- [ ] Semrush account created + keywords added
- [ ] Baseline spreadsheet started

### Week 2 (May 6-12)
- [ ] GA4 conversions marked (primary/secondary)
- [ ] GA4 custom dashboards created
- [ ] Search Console coverage issues fixed
- [ ] Search Console data indexed (48 hours)
- [ ] Semrush rankings documented
- [ ] Competitors added to Semrush
- [ ] Data Studio account created

### Week 3 (May 13-19)
- [ ] Data Studio master dashboard created
- [ ] Weekly reporting template finalized
- [ ] GA4 segments configured (mobile, desktop, organic)
- [ ] GSC performance data reviewed
- [ ] Plausible (optional) configured
- [ ] Video analytics configured
- [ ] Team trained on tools

### Week 4 (May 20-26)
- [ ] All dashboards tested and verified
- [ ] Automated reporting configured
- [ ] Baseline metrics documented
- [ ] Competitive analysis completed
- [ ] Team access granted
- [ ] Forecast models created
- [ ] Success criteria confirmed

### Week 5-6 (May 27 - June 9)
- [ ] Weekly reporting process established
- [ ] Stakeholder reports sent (2 weeks)
- [ ] Data quality verified
- [ ] Alerts/anomalies tested
- [ ] Team comfortable with tools
- [ ] Pre-launch dashboards ready

### Week 7-10 (June 10 - July 4)
- [ ] Continue weekly reporting
- [ ] Refine forecasts based on data
- [ ] Add any missing metrics
- [ ] Test alert configurations
- [ ] Document final baseline (July 1)

### Week 11-12 (July 5-14)
- [ ] Final baseline review
- [ ] All systems tested
- [ ] Team fully trained
- [ ] Dashboards frozen (baseline locked)
- [ ] Ready for Phase 6 measurement

---

## Success Criteria

**By July 14, 2026**:
- ✅ GA4 fully configured (10+ conversion events)
- ✅ Search Console monitoring active
- ✅ Semrush tracking 18 keywords + 5 competitors
- ✅ 3 Data Studio dashboards live
- ✅ Weekly reporting automated
- ✅ Baseline metrics documented
- ✅ Team trained and ready
- ✅ All data validated & verified

**July 15 - Aug 31**:
- 📊 Measure Phase 6 content marketing impact
- 📊 Track blog posts → traffic → conversions
- 📊 Monitor SEO ranking changes
- 📊 Report weekly to stakeholders
- 📊 Identify top-performing content

**Sept 1+**:
- 📊 Launch day metrics tracked in real-time
- 📊 Success targets verified
- 📊 Community growth measured
- 📊 Long-term sustainability assessed

---

## Team & Resources

**Setup Team**:
- Analytics Lead: 40-60 hours
- Marketing Manager: 20 hours (feedback/testing)
- DevOps/Engineering: 10 hours (tag implementation)

**Tools Budget**: ~$50-200/month
- Semrush: $200/month
- Optional tools: $0-50/month
- Free tools: GA4, GSC, Data Studio, YouTube Analytics

**Support Resources**:
- Google Analytics Academy (free training)
- Semrush Academy (free courses)
- Data Studio templates (free)

---

## Troubleshooting & Common Issues

### GA4 Not Tracking Events
```
Solutions:
1. Verify measurement tag installed (check Network tab)
2. Check GTM trigger conditions (not too restrictive)
3. Use GA DebugView to see events in real-time
4. Wait 24 hours for data to appear in reports
5. Check parameter names (case-sensitive)
```

### Search Console Shows No Data
```
Solutions:
1. Verify property ownership (DNS or HTML tag)
2. Ensure sitemap submitted & processed
3. Check robots.txt not blocking googlebot
4. Wait 48 hours for initial data
5. Review coverage report for errors
6. Fix any indexing issues
```

### Semrush Rankings Stuck
```
Solutions:
1. Check keyword list has proper domains
2. Verify location setting correct (US vs Global)
3. Wait 24-48 hours for rank update (weekly default)
4. Check if competitor website has moved
5. Re-add keyword if needed
```

---

**Owner**: Analytics & SEO Lead  
**Status**: Ready for implementation  
**Last Updated**: May 1, 2026
