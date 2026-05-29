# Lume v2.0 — SEO Audit

**Date**: 2026-05-29
**Scope**: Live SEO output of the public Nuxt 3 site (`apps/riagri-website/`) and the
backend `website` module that feeds it (`backend/src/modules/website/`).
**Method**: Code-grounded audit of the SEO-generating code, cross-checked against
`SEO_IMPLEMENTATION_GUIDE.md`. Runtime HTTP capture pending a live boot (see §Live
verification).

> **Headline**: the building blocks exist (sitemap/robots endpoints, rich per-page
> SEO columns, per-page meta on most pages, some JSON-LD), but several launch-blocking
> gaps remain. The "production-ready SEO" framing in `CLAUDE.md` overstates the current
> state. The widely-referenced `SEO_IMPLEMENTATION_GUIDE.md` points at a **NestJS**
> backend that does not exist — the real backend is Express.

## What works today

- `GET /api/website/public/sitemap.xml` + `/robots.txt` (`website.routes.js:205,227`),
  proxied by the Nuxt site (`nuxt.config.ts` routeRules + `server/routes/{sitemap.xml,robots.txt}.ts`).
- Sitemap respects `noIndex` and uses real `updatedAt` lastmod (`page.service.js:218-228`),
  `Cache-Control: public, max-age=3600`.
- Per-page SEO columns in DB: `meta_title/description/keywords`, `focus_keyword`,
  `og_title/description/image`, `canonical_url`, `no_index/no_follow`
  (`modules/website/models/schema.js:24-33`); all returned by `/public/pages/:slug`.
- Per-page meta (title/desc/og:title/og:desc) on 6/8 page types; JSON-LD
  (Article/WebPage/FAQPage/BreadcrumbList) on the CMS catch-all (`pages/[...slug].vue:169-270`).
- Admin SEO analysis panel: title/desc length, focus-keyword presence, word count, H1
  count, image alt, slug length (`page-editor.vue:504-576`).

## Findings (prioritized)

### 🔴 Critical
| # | Issue | Location |
|---|---|---|
| C1 | **Soft 404s** — catch-all/category/tag render "Not Found" but return HTTP 200 (no `setResponseStatus`/`createError`) | `pages/[...slug].vue`, `pages/category/[slug].vue`, `pages/tag/[slug].vue` |
| C2 | **No `<html lang>`** anywhere (no `htmlAttrs.lang`) | `nuxt.config.ts` app.head; layouts |
| C3 | **Homepage has no structured data**; the `Organization` JSON-LD only fires when `slug==='home'` — a branch `/` never reaches (dead code). No `WebSite`/`SoftwareApplication` schema anywhere | `pages/index.vue`, `pages/[...slug].vue:191` |
| C4 | **No canonical URL emitted** on any page (`canonical_url` stored but unused) | all `pages/*.vue` |
| C5 | **No SEO Nuxt modules** (`@nuxtjs/seo`/sitemap/robots/schema-org, `@nuxt/image`) — all hand-rolled & partial | `nuxt.config.ts` |

### 🟠 High
| # | Issue | Location |
|---|---|---|
| H1 | **og:image missing on 5/8 pages** + no site-wide default; **no `og:url`, no Twitter Card** anywhere | `pages/index|products|services|about|contact.vue` |
| H2 | **`noindex` not applied** to preview/password-gated/unpublished pages | `pages/[...slug].vue` |
| H3 | **localhost/placeholder defaults** for site URL (`http://localhost:3100`) in both frontend & backend; inconsistent with real ports | `nuxt.config.ts:39`, `website.routes.js:208` |
| H4 | **Sitemap omits** category/tag + static routes; **no XML escaping**; `changefreq` hardcoded `weekly` | `website.routes.js:205-225`, `page.service.js:218` |
| H5 | **robots fallback bare** (no `Disallow: /admin|/api`; error path drops `Sitemap:`); SEO settings (`robots_txt`, `default_meta_description`, og defaults) never seeded | `website.routes.js:227-241`, `seed-content.js:39-67` |

### 🟡 Medium
| # | Issue | Location |
|---|---|---|
| M1 | Stale `<head>` on SPA nav between dynamic routes (static `useFetch` key + non-ref slug) | `composables/useWebsiteData.ts:66`, dynamic pages |
| M2 | `dateModified` dropped — schema reads `updatedAt` but `PageContent` type lacks it | `useWebsiteData.ts:6-24`, `[...slug].vue:186` |
| M3 | No `titleTemplate`; homepage uses non-reactive `useHead` | `nuxt.config.ts`, `index.vue:200` |
| M4 | No `Product` schema (product catalog) / `CollectionPage` (archives); archives lack og/canonical/pagination | `products.vue`, `category|tag/[slug].vue` |
| M5 | Redundant + divergent robots/sitemap handling (routeRules vs server routes, different env vars/fallbacks) | `nuxt.config.ts:11-15`, `server/routes/*` |
| M6 | `public/` has only `favicon.svg` — no `og-image.png`, `apple-touch-icon`, web manifest | `apps/riagri-website/public/` |
| M7 | List endpoint `getPublishedPages()` drops OG/canonical/noindex fields | `page.service.js:200-216` |

### 📄 Doc accuracy
- `SEO_IMPLEMENTATION_GUIDE.md` references `backend/lume-nestjs/.../sitemap.controller.ts` — **does not exist**; real impl is Express (`backend/src/modules/website/`).
- `CLAUDE.md` lists SEO as production-ready; several Priority-1 guide items (lang, canonical, Twitter, JSON-LD breadth, og-image assets) are unimplemented.

## Remediation checklist

**Fixed 2026-05-29** (backend live-verified; frontend typechecks clean, runtime re-verify pending a live Nuxt run):
- [x] C1 soft-404s → `setResponseStatus(event, 404)` on not-found in `[...slug]`, `category/[slug]`, `tag/[slug]`
- [x] C2 `htmlAttrs.lang` in `nuxt.config.ts`
- [x] C3 site-wide `WebSite` + `Organization` JSON-LD on every page incl. `/` (`app.vue`)
- [x] C4 canonical + og:url computed for every route (`app.vue`)
- [x] H1 default og:image + og:type + Twitter Card (`nuxt.config.ts`); og:url everywhere (`app.vue`)
- [x] H2 `noindex` for preview/password-gated/`noIndex` pages (`[...slug].vue`)
- [x] H3 single `resolveSiteUrl()` (`site_url` setting → env → fallback), no trailing slash (`website.routes.js`)
- [x] H4 sitemap XML-escaped + changefreq derived (`website.routes.js`) — **live-verified valid XML**
- [x] H5 robots hardened (Disallow /admin /api /.env /.git + Sitemap line; fixed object-iteration bug) — **live-verified**
- [x] M3 `titleTemplate` (`app.vue`); M7 list endpoint now returns OG/canonical/noindex (`page.service.js`)
- [x] Doc: corrected `SEO_IMPLEMENTATION_GUIDE.md` (NestJS→Express) + `CLAUDE.md` SEO section

**Outstanding (follow-ups):**
- [ ] C5 adopt `@nuxtjs/seo` module suite to replace hand-rolled head/sitemap/robots (architectural)
- [ ] H4 include category/tag + static marketing routes in the sitemap (currently CMS pages only)
- [ ] H1 per-page custom og:image on the 5 static marketing pages (default now applies)
- [ ] H3 set a real production `site_url` (still localhost in dev/unconfigured)
- [ ] M1 stale `<head>` on SPA nav (reactive `useFetch` key); M2 `dateModified` (add `updatedAt` to `PageContent`)
- [ ] M4 `Product`/`CollectionPage` JSON-LD; M5 dedupe routeRules vs server routes; M6 add `og-image.png`/`logo.png`/manifest/apple-touch-icon to `public/`
- [ ] Seed default `robots_txt` / `default_meta_description` / `site_url` website settings

## Live verification

Backend booted on `:3000` (MariaDB up, 25 modules). Captured live SEO output:

**`GET /api/website/public/robots.txt`** (no `robots_txt` setting seeded):
```
User-agent: *
Allow: /
```
→ confirms **H5**: no `Disallow: /admin|/api`, and this fallback path emits **no `Sitemap:` line**.

**`GET /api/website/public/sitemap.xml`** with 0 published pages → empty `<urlset>` (confirms H4 empty-state).

**Same endpoint after seeding one published page with `&` in the slug:**
```xml
<url>
  <loc>http://localhost:3100/r&d-services</loc>
  <lastmod>2026-05-29</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
```
→ confirms **H4** (raw `&` unescaped — `xml.dom.minidom` reports **"not well-formed (invalid token)"**, i.e. the sitemap is INVALID) and **H3** (emits `http://localhost:3100` because `SITE_URL` is unset; hardcoded `changefreq=weekly`).

**`GET /api/website/public/settings`** → `{}` (confirms H5: no SEO defaults seeded).

_Frontend `<head>`/JSON-LD live capture deferred — `apps/riagri-website/node_modules` not installed; those findings (C1–C4, H1–H2, M1–M6) are code-verified with file:line above and will be re-confirmed once Nuxt deps are installed._ (Test page removed after capture; DB restored to 0 published pages.)
