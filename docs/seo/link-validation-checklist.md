---
title: "Lume Launch: Link Validation & QA Checklist"
description: "All links to test before launch day"
---

# Link Validation & QA Checklist

## Website Links (lume.dev)

### Navigation Links

- [ ] Home / Logo click
- [ ] Features link → /features
- [ ] Pricing link → /pricing
- [ ] Blog link → /blog
- [ ] Docs link → docs.lume.dev (external)
- [ ] GitHub link → github.com/lume-dev/lume (external)
- [ ] Discord link → discord.gg/lume (external)
- [ ] Contact link → /contact

### Homepage CTA Buttons

- [ ] Primary CTA "Get Started Free" → /install
- [ ] Secondary CTA "View Demo" → #demo (smooth scroll)
- [ ] "Explore Field Types" → /docs/fields
- [ ] "View Automation Examples" → /docs/automations
- [ ] "View API Documentation" → /docs/api
- [ ] "Read Compliance Guide" → /docs/compliance
- [ ] GitHub stars section → github.com/lume-dev/lume
- [ ] Discord footer → discord.gg/lume

### Social Links (Footer)

- [ ] Twitter → twitter.com/lumedev
- [ ] GitHub → github.com/lume-dev/lume
- [ ] LinkedIn → linkedin.com/company/lume-dev
- [ ] Email signup form → submits without errors

### Blog Links

**Each blog post should have:**
- [ ] Internal links to related posts (at least 2 per post)
- [ ] Link to main docs (docs.lume.dev)
- [ ] Link to GitHub (github.com/lume-dev/lume)
- [ ] Link to Discord (discord.gg/lume)
- [ ] All external links open in new tab (_target blank)
- [ ] No broken image links

**Blog post internal links:**

| Post | Links to |
|------|----------|
| lume-vs-airtable.md | lume-vs-notion, open-source-crm-comparison, migrate-airtable-to-lume |
| lume-vs-notion.md | lume-vs-airtable, open-source-crm-comparison, build-crm-without-code |
| open-source-crm-comparison.md | why-open-source-crm, deploy-lume-kubernetes, secure-self-hosted-lume |
| self-hosted-vs-cloud-crm.md | privacy-first-crm, secure-self-hosted-lume, deploy-lume-kubernetes |
| build-crm-without-code.md | lume-vs-notion, automate-workflows-webhooks, sales-pipeline-lume |
| sales-pipeline-lume.md | build-crm-without-code, open-source-crm-comparison |
| automate-workflows-webhooks.md | lume-api-integration-guide, deploy-lume-kubernetes |
| migrate-airtable-to-lume.md | lume-vs-airtable, build-crm-without-code |
| lume-api-integration-guide.md | automate-workflows-webhooks, deploy-lume-kubernetes |
| deploy-lume-kubernetes.md | secure-self-hosted-lume, lume-api-integration-guide |
| secure-self-hosted-lume.md | self-hosted-vs-cloud-crm, deploy-lume-kubernetes, privacy-first-crm |
| why-open-source-crm.md | open-source-crm-comparison, self-hosted-vs-cloud-crm |
| privacy-first-crm.md | secure-self-hosted-lume, self-hosted-vs-cloud-crm |

---

### Documentation Links (docs.lume.dev)

- [ ] Installation guide link works
- [ ] API reference link works
- [ ] Getting started guide link works
- [ ] Field types reference link works
- [ ] Automation documentation link works
- [ ] Deployment guides (Docker, K8s, VPS) link works
- [ ] Compliance guide link works
- [ ] Security documentation link works
- [ ] All code examples have working syntax highlighting

---

## External Links

### GitHub

- [ ] Repository URL: github.com/lume-dev/lume
- [ ] README is up-to-date
- [ ] Installation instructions are clear
- [ ] Link to docs in README
- [ ] Link to Discord in README
- [ ] Issues are enabled
- [ ] Discussion forum is set up
- [ ] GitHub Pages are deployed (if using for docs)

### Discord

- [ ] Invite link: discord.gg/lume (permanent, not expiring)
- [ ] Welcome message configured
- [ ] Channels created and described:
  - [ ] #announcements
  - [ ] #general
  - [ ] #introductions
  - [ ] #support
  - [ ] #feature-requests
  - [ ] #show-and-tell
  - [ ] #jobs

### Social Media

**Twitter:**
- [ ] Profile complete (bio, header image, profile pic)
- [ ] Pinned tweet is launch announcement
- [ ] Link to lume.dev in bio
- [ ] Link to GitHub in bio section

**LinkedIn:**
- [ ] Company page created
- [ ] Profile complete
- [ ] Announcement post scheduled for launch day
- [ ] Link to lume.dev in bio

**ProductHunt:**
- [ ] Product listing live
- [ ] Description complete
- [ ] Demo video embedded
- [ ] Comparison table visible
- [ ] FAQ populated
- [ ] Link to GitHub in listing

**HackerNews:**
- [ ] Link to GitHub or lume.dev
- [ ] Title accurate and compelling
- [ ] Submission prepared (scheduled for 14:30 UTC Sept 1)

---

## Installation & Setup Links

### "Get Started" Page (/install)

- [ ] Links to Docker setup
- [ ] Links to Kubernetes setup
- [ ] Links to VPS deployment guide
- [ ] Links to cloud hosting options
- [ ] Step-by-step instructions are clear
- [ ] Code blocks are properly formatted
- [ ] All commands are copy-paste ready

### Database Setup

- [ ] MySQL installation link works
- [ ] PostgreSQL installation link works
- [ ] Guide to configure database connection
- [ ] Seed script is documented

---

## Video Links

### Demo Video

- [ ] Video hosted (YouTube or vimeo)
- [ ] Embedded on homepage
- [ ] Embedded on /features page
- [ ] Captions are accurate
- [ ] Duration is accurate (2-3 min)
- [ ] Description has link to Get Started page

---

## Email & Communication

### Email Templates

- [ ] Welcome email has link to docs
- [ ] Welcome email has link to Discord
- [ ] Welcome email has link to GitHub
- [ ] Confirmation email links work
- [ ] Password reset link format is correct

### Newsletter Signup

- [ ] Form submits without errors
- [ ] Confirmation email is sent
- [ ] Unsubscribe link works
- [ ] Newsletter archive link works (if applicable)

---

## SEO Links

### Sitemaps

- [ ] XML sitemap is valid (sitemap.xml)
- [ ] sitemap.xml includes all blog posts
- [ ] sitemap.xml includes all documentation pages
- [ ] Sitemap submitted to Google Search Console
- [ ] Sitemap submitted to Bing Webmaster Tools

### robots.txt

- [ ] robots.txt is accessible at /robots.txt
- [ ] robots.txt doesn't block important pages
- [ ] robots.txt allows Googlebot, Bingbot, etc.

### Internal Cross-Links

- [ ] Homepage links to 3-5 blog posts
- [ ] Blog archive page links to all posts
- [ ] Related posts section at bottom of each post
- [ ] Navigation breadcrumbs work
- [ ] Pagination links work (if paginating blog)

---

## Error Page Links

- [ ] 404 page has link to homepage
- [ ] 404 page has link to documentation
- [ ] 404 page has search box (if applicable)
- [ ] Error pages don't break site structure

---

## Analytics & Tracking Links

- [ ] Google Analytics script is loading
- [ ] Event tracking is working:
  - [ ] "Get Started" button clicks
  - [ ] Demo video plays
  - [ ] GitHub clicks
  - [ ] Discord joins
  - [ ] Blog post views
- [ ] Conversion goals are set up
- [ ] Internal links properly tagged with UTM parameters

---

## Mobile & Device Testing

**Test all links on:**
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] iPad (Safari)
- [ ] Desktop (Chrome, Firefox, Safari, Edge)

**Specific mobile checks:**
- [ ] CTA buttons are tap-friendly (48px minimum)
- [ ] Nav menu is collapsible/hamburger on mobile
- [ ] Video embeds are responsive
- [ ] Images scale properly
- [ ] Forms are mobile-optimized

---

## Link Speed & Performance

- [ ] Homepage loads in <2 seconds
- [ ] Blog posts load in <3 seconds
- [ ] Images are optimized (no oversized images)
- [ ] CSS/JS are minified
- [ ] External links don't slow page load (use async where possible)

---

## Accessibility Links

- [ ] All links have descriptive text (not "click here")
- [ ] Links are visually distinct (color + underline)
- [ ] Keyboard navigation works (Tab through all links)
- [ ] Screen reader announces links correctly
- [ ] Focus indicators are visible

---

## Pre-Launch Testing (48 hours before)

**Final check:**

- [ ] All links work (automated link checker tool)
- [ ] No broken images
- [ ] Forms submit successfully
- [ ] Email notifications are sent
- [ ] Analytics are tracking
- [ ] Videos play properly
- [ ] Load time is acceptable (<3 seconds)
- [ ] Mobile version is responsive
- [ ] No console errors (open Developer Tools)

**Tools to use:**
- Google Search Console (check for crawl errors)
- Screaming Frog SEO Spider (check all links)
- WebAIM Contrast Checker (check accessibility)
- GTmetrix (check performance)
- BrowserStack (check cross-browser compatibility)

---

## Launch Day Checks (2 hours before)

- [ ] Run final link validation
- [ ] Verify all social links are live
- [ ] Confirm ProductHunt listing is live
- [ ] Verify HackerNews submission is ready
- [ ] Test email notifications
- [ ] Clear browser cache and test fresh
- [ ] Test on incognito/private browsing
- [ ] Verify analytics tracking (can see live traffic)

---

## Post-Launch Monitoring (First week)

Daily check:
- [ ] No new broken links
- [ ] Analytics showing traffic
- [ ] Social links have high engagement
- [ ] No 404 errors in Google Search Console
- [ ] Email notifications working
- [ ] All CTA buttons converting

**Use tools:**
- Google Search Console (errors, impressions, clicks)
- Google Analytics (traffic, conversions, user flow)
- Sentry (error tracking, if set up)
- Discord (monitor channel activity)

---

## Link Broken Detection

**If you find a broken link:**

1. **Identify:** Which link is broken? Where does it appear?
2. **Find replacement:** What should it link to instead?
3. **Fix:** Update the link in code/CMS
4. **Test:** Verify it works
5. **Monitor:** Check if other pages have same link
6. **Submit:** If external link, notify owner (external site may have moved)

**Tools:**
- Google Search Console (shows crawl errors)
- Screaming Frog SEO Spider (run weekly)
- Dead Link Checker online tools
- Custom script to test all links monthly
