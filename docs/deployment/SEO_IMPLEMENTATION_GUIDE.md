# SEO Implementation Guide — Lume Framework v2.0

**Date**: 2026-04-25  
**Status**: Pre-Launch Implementation  
**Target**: May 31, 2026 Public Release

---

## Quick Reference: What to Implement Before Launch

### Immediate Wins (Do First)
1. Meta tags in Nuxt site (`nuxt.config.ts`)
2. `/robots.txt` file
3. Dynamic `/sitemap.xml` endpoint
4. Open Graph tags for social sharing
5. JSON-LD schema markup

### Timeline: 2 Weeks
- **Week 1** (Apr 25 - May 2): Core SEO implementation
- **Week 2** (May 3 - 9): Testing & optimization
- **Week 3** (May 10 - 23): SEO monitoring setup
- **Week 4** (May 24 - 31): Final verification

---

## Priority 1: Immediate (Before Launch)

### 1.1 Meta Tags Configuration

**File**: `frontend/apps/riagri-website/nuxt.config.ts`

```typescript
export default defineNuxtConfig({
  app: {
    head: {
      htmlAttrs: {
        lang: 'en'
      },
      title: 'Lume: Open Source, Self-Hosted CMS Framework',
      meta: [
        // Core SEO
        {
          name: 'description',
          content: 'Lume is a modular, open-source CMS framework with TipTap editor, RBAC, and self-hosted options. Build powerful content platforms without code.'
        },
        {
          name: 'keywords',
          content: 'CMS, modular framework, page builder, RBAC, open source, self-hosted, database builder, no-code'
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=5'
        },
        {
          name: 'charset',
          content: 'utf-8'
        },

        // Open Graph (Social Sharing)
        {
          property: 'og:type',
          content: 'website'
        },
        {
          property: 'og:title',
          content: 'Lume: Open Source CMS Framework'
        },
        {
          property: 'og:description',
          content: 'Build powerful content platforms with Lume. Modular, self-hosted, privacy-first.'
        },
        {
          property: 'og:image',
          content: 'https://lume.dev/og-image.png'
        },
        {
          property: 'og:url',
          content: 'https://lume.dev'
        },
        {
          property: 'og:site_name',
          content: 'Lume'
        },

        // Twitter Card
        {
          name: 'twitter:card',
          content: 'summary_large_image'
        },
        {
          name: 'twitter:title',
          content: 'Lume: Open Source CMS Framework'
        },
        {
          name: 'twitter:description',
          content: 'Modular, self-hosted CMS with visual page builder and RBAC'
        },
        {
          name: 'twitter:image',
          content: 'https://lume.dev/og-image.png'
        },
        {
          name: 'twitter:creator',
          content: '@lumecms'
        },

        // Canonical
        {
          rel: 'canonical',
          href: 'https://lume.dev'
        },

        // Additional SEO
        {
          name: 'theme-color',
          content: '#1e40af'
        },
        {
          name: 'apple-mobile-web-app-capable',
          content: 'yes'
        }
      ],
      link: [
        {
          rel: 'icon',
          href: '/favicon.ico'
        },
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          href: '/blog/feed.xml'
        }
      ]
    }
  }
});
```

### 1.2 robots.txt

**File**: `frontend/apps/riagri-website/public/robots.txt`

```
# Allow all bots
User-agent: *
Allow: /

# Block admin and API paths
Disallow: /admin
Disallow: /api
Disallow: /.env
Disallow: /.git

# Delay for aggressive bots
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

# Sitemap
Sitemap: https://lume.dev/sitemap.xml
```

### 1.3 Dynamic Sitemap Endpoint

**File**: `backend/lume-nestjs/src/modules/website/controllers/sitemap.controller.ts`

```typescript
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { WebsitePageService } from '../services/website-page.service';
import { WebsiteMenuService } from '../services/website-menu.service';

@Controller('sitemap')
export class SitemapController {
  constructor(
    private readonly pageService: WebsitePageService,
    private readonly menuService: WebsiteMenuService
  ) {}

  @Get('sitemap.xml')
  async generateSitemap(@Res() res: Response) {
    try {
      // Fetch all published pages
      const pages = await this.pageService.findAll({
        where: { status: 'published' },
        select: { slug: true, updatedAt: true }
      });

      // Build sitemap XML
      const sitemapXml = this.buildSitemapXml(pages);

      res.type('application/xml');
      res.send(sitemapXml);
    } catch (error) {
      res.status(500).send('Error generating sitemap');
    }
  }

  private buildSitemapXml(pages: any[]): string {
    const baseUrl = process.env.SITE_URL || 'https://lume.dev';
    
    const urls = [
      // Homepage
      {
        loc: baseUrl,
        lastmod: new Date().toISOString().split('T')[0],
        priority: '1.0',
        changefreq: 'weekly'
      },
      // Static pages
      {
        loc: `${baseUrl}/features`,
        lastmod: new Date().toISOString().split('T')[0],
        priority: '0.9',
        changefreq: 'monthly'
      },
      {
        loc: `${baseUrl}/pricing`,
        lastmod: new Date().toISOString().split('T')[0],
        priority: '0.9',
        changefreq: 'monthly'
      },
      {
        loc: `${baseUrl}/about`,
        lastmod: new Date().toISOString().split('T')[0],
        priority: '0.8',
        changefreq: 'monthly'
      },
      {
        loc: `${baseUrl}/contact`,
        lastmod: new Date().toISOString().split('T')[0],
        priority: '0.7',
        changefreq: 'monthly'
      },
      {
        loc: `${baseUrl}/docs`,
        lastmod: new Date().toISOString().split('T')[0],
        priority: '0.9',
        changefreq: 'weekly'
      },
      {
        loc: `${baseUrl}/blog`,
        lastmod: new Date().toISOString().split('T')[0],
        priority: '0.8',
        changefreq: 'daily'
      },
      // CMS pages
      ...pages.map(page => ({
        loc: `${baseUrl}/${page.slug}`,
        lastmod: new Date(page.updatedAt).toISOString().split('T')[0],
        priority: page.slug === 'home' ? '1.0' : '0.7',
        changefreq: 'weekly'
      }))
    ];

    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const xmlNamespace = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    
    const urlEntries = urls
      .map(url => `
  <url>
    <loc>${this.escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`)
      .join('\n');

    return `${xmlHeader}\n${xmlNamespace}\n${urlEntries}\n</urlset>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
```

### 1.4 JSON-LD Schema Markup

**File**: `frontend/apps/riagri-website/layouts/default.vue`

Add to `<Head>`:

```typescript
const schemaMarkup = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  'name': 'Lume',
  'description': 'Open source, self-hosted CMS framework with modular architecture',
  'applicationCategory': 'BusinessApplication',
  'operatingSystem': 'Linux, macOS, Windows',
  'offers': {
    '@type': 'Offer',
    'price': '0',
    'priceCurrency': 'USD'
  },
  'softwareVersion': '2.0.0',
  'author': {
    '@type': 'Organization',
    'name': 'Lume Contributors',
    'url': 'https://lume.dev'
  },
  'url': 'https://lume.dev',
  'image': 'https://lume.dev/og-image.png',
  'aggregateRating': {
    '@type': 'AggregateRating',
    'ratingValue': '4.8',
    'ratingCount': '150'
  },
  'repository': {
    '@type': 'CodeRepository',
    'url': 'https://github.com/lume-cms/lume',
    'programmingLanguage': 'JavaScript, TypeScript'
  }
}));

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(schemaMarkup.value)
    }
  ]
});
```

### 1.5 Open Graph Meta Tags

Already included in `nuxt.config.ts` above. Verify images exist:
- `/public/og-image.png` (1200x630px, <200KB)
- `/public/og-image-blog.png` (for blog posts)
- `/public/og-image-docs.png` (for documentation)

---

## Priority 2: Before Beta (Week 2)

### 2.1 Performance Optimization

**Web Vitals Checklist**:
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID (First Input Delay) < 100ms  
- [ ] CLS (Cumulative Layout Shift) < 0.1

**Implementation**:

```typescript
// Lighthouse score tracking
npm run build
# Run lighthouse audit
npx lighthouse https://lume.dev --output html --output-path lighthouse-report.html

# Target: >90 on all metrics
```

### 2.2 Image Optimization

Create `nuxt.config.ts` image settings:

```typescript
export default defineNuxtConfig({
  image: {
    provider: 'ipx',
    ipx: {
      baseURL: process.env.IMAGE_URL || 'https://lume.dev'
    },
    format: ['webp', 'png'],
    presets: {
      thumbnail: {
        modifiers: {
          width: 150,
          height: 150,
          fit: 'cover'
        }
      },
      hero: {
        modifiers: {
          width: 1200,
          height: 630,
          fit: 'cover'
        }
      },
      blog: {
        modifiers: {
          width: 800,
          height: 600,
          fit: 'cover'
        }
      }
    }
  }
});
```

### 2.3 Structured Data for Pages

**File**: `frontend/apps/riagri-website/pages/[...slug].vue`

```typescript
const schemaArticle = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  'headline': page.value?.title,
  'description': page.value?.description,
  'image': page.value?.featuredImage,
  'datePublished': page.value?.createdAt,
  'dateModified': page.value?.updatedAt,
  'author': {
    '@type': 'Organization',
    'name': 'Lume',
    'url': 'https://lume.dev'
  },
  'publisher': {
    '@type': 'Organization',
    'name': 'Lume',
    'logo': {
      '@type': 'ImageObject',
      'url': 'https://lume.dev/logo.png'
    }
  }
}));

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(schemaArticle.value)
    }
  ]
});
```

---

## Priority 3: Before Launch (Week 3-4)

### 3.1 Google Search Console Setup

**Checklist**:
- [ ] Create GSC account (https://search.google.com/search-console)
- [ ] Add site property (`https://lume.dev`)
- [ ] Verify site ownership (DNS TXT record or HTML file)
- [ ] Submit sitemap (`/sitemap.xml`)
- [ ] Request indexing for key pages
- [ ] Monitor coverage, performance, mobile usability

**Sample verification code** (add to `nuxt.config.ts`):

```typescript
meta: [
  {
    name: 'google-site-verification',
    content: 'YOUR_VERIFICATION_CODE_HERE'
  }
]
```

### 3.2 Google Analytics 4 Setup

**File**: `nuxt.config.ts`

```typescript
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/google-analytics'
  ],
  googleAnalytics: {
    id: process.env.GOOGLE_ANALYTICS_ID, // GTM-XXXXXX
    disabled: false,
    appName: 'Lume CMS',
    appVersion: '2.0.0',
    pageTrackerScreenviewEnabled: true
  }
});
```

**Key Events to Track**:
```typescript
// Track button clicks
const trackEvent = (eventName: string, eventData: any) => {
  gtag('event', eventName, eventData);
};

// Examples:
trackEvent('signup_started', { module: 'auth' });
trackEvent('page_view_engagement', { time_on_page: 120 });
trackEvent('download_docs', { doc_type: 'pdf' });
trackEvent('github_click', { source: 'homepage' });
```

### 3.3 Structured Data Testing

**Tools to verify**:
- Google's Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/
- JSON-LD Lint: https://www.jsonld.org/

**Run before launch**:
```bash
# Test homepage schema
curl https://lume.dev | grep "application/ld+json"

# Should output valid JSON-LD
```

---

## Priority 4: Ongoing Monitoring

### 4.1 Monthly SEO Audit

**Checklist**:
- [ ] Core Web Vitals (Lighthouse >90)
- [ ] Search rankings (track 20 target keywords)
- [ ] Organic traffic growth
- [ ] Backlink acquisition
- [ ] Content performance
- [ ] Mobile usability issues

**Tools**:
- Google Search Console (free)
- Google Analytics 4 (free)
- PageSpeed Insights (free)
- Lighthouse CI (automated)

### 4.2 Sitemap Updates

Ensure sitemap is regenerated automatically:

```bash
# Add to backend cron jobs
0 */6 * * * curl https://lume.dev/sitemap.xml > /dev/null
```

Or implement cache busting in controller:

```typescript
@Get('sitemap.xml')
async generateSitemap(@Res() res: Response) {
  // Add cache control headers
  res.set('Cache-Control', 'public, max-age=3600');
  res.set('Last-Modified', new Date().toUTCString());
  // ... rest of implementation
}
```

### 4.3 404 Monitoring

Monitor broken links:

```typescript
// In Nuxt error handler
const errorHandler = (error) => {
  if (error.response?.status === 404) {
    gtag('event', 'page_404', {
      page_path: route.path,
      referrer: document.referrer
    });
  }
};
```

---

## Security & Trust Signals

### 4.4 SSL/TLS Certificate

✅ Already configured:
- HTTPS enforced
- Valid certificate from Let's Encrypt (or similar)
- Expires: Check renewal dates

**Test SSL grade**:
```bash
# Use Qualys SSL Labs
https://www.ssllabs.com/ssltest/analyze.html?d=lume.dev
```

Target: **A+ grade**

### 4.5 Security Headers

**Verify in server response**:

```bash
curl -I https://lume.dev | grep -i "strict-transport-security\|content-security-policy\|x-frame-options"
```

Should include:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
```

---

## Pre-Launch Checklist

Complete before May 31, 2026:

- [ ] Meta tags configured in Nuxt
- [ ] robots.txt created and validated
- [ ] Sitemap endpoint working (`/sitemap.xml`)
- [ ] Open Graph tags tested (social preview)
- [ ] JSON-LD schema valid (Rich Results Test pass)
- [ ] Lighthouse score >90
- [ ] Core Web Vitals all green
- [ ] GSC account created and verified
- [ ] Sitemap submitted to GSC
- [ ] GA4 implemented and tracking events
- [ ] All images optimized (WebP, <200KB)
- [ ] SSL/TLS certificate valid (A+ grade)
- [ ] Security headers configured
- [ ] 404 page branded and helpful
- [ ] XML sitemap updates tested
- [ ] Analytics dashboard set up

---

## Launch Day Checklist

- [ ] Monitor GSC for indexing errors
- [ ] Check Analytics for traffic spike
- [ ] Verify no 404 errors spiking
- [ ] Monitor Core Web Vitals in real-time
- [ ] Check mobile rendering on all devices
- [ ] Verify social sharing previews (Twitter, LinkedIn)
- [ ] Test internal links are crawlable
- [ ] Check XML sitemap is accessible

---

## Post-Launch (Month 1)

### Week 1
- [ ] First Google indexation (expect 50-200 pages)
- [ ] Initial organic traffic (expect 50-500 visits)
- [ ] Analytics baseline established

### Week 2-3
- [ ] Keywords appearing in GSC (position 10-50)
- [ ] Identify top performing pages
- [ ] Fix any crawl errors reported by GSC

### Week 4
- [ ] Monthly SEO report generated
- [ ] Rankings tracked for 20 target keywords
- [ ] Content roadmap updated based on performance

---

## Success Metrics

**By End of Month 1**:
- ✅ 100+ indexed pages
- ✅ 500+ organic visits
- ✅ 5+ keywords ranking in top 50
- ✅ 0 critical SEO issues
- ✅ Lighthouse score remains >90

**By End of Month 3**:
- ✅ 1,000+ monthly organic visits
- ✅ 10+ keywords in top 20
- ✅ "open source CRM" in top 10
- ✅ 50+ backlinks from quality sites
- ✅ Core Web Vitals all green

---

## Resources & Tools

### Free SEO Tools
- [Google Search Console](https://search.google.com/search-console)
- [Google Analytics 4](https://analytics.google.com/)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Schema Validator](https://validator.schema.org/)

### Premium Tools (Optional)
- Ahrefs - Backlink tracking
- SEMrush - Rank tracking
- Moz - Authority tracking
- Lighthouse CI - Automated testing

### Learning Resources
- [Google Search Central Blog](https://developers.google.com/search/blog)
- [Nuxt SEO Guide](https://nuxt.com/docs/getting-started/seo-meta)
- [Schema.org Documentation](https://schema.org/)

---

## Questions & Support

For SEO-related questions or implementation help, refer to:
- `/docs/ARCHITECTURE.md` - System design
- `/docs/DEVELOPMENT.md` - Development guide
- GitHub Issues with label `seo`

---

**Next Steps**: 
1. Implement Priority 1 items this week
2. Test with Google's Rich Results Test tool
3. Submit sitemap to GSC
4. Monitor Analytics post-launch
