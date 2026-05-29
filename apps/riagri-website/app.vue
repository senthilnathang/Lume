<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// Site-wide SEO defaults applied on every route (pages may override per-page
// title/description/og via their own useSeoMeta/useHead):
//  - titleTemplate: consistent "<page> · <site>" suffix
//  - canonical + og:url: absolute URL for the current path (dedup signal)
//  - WebSite + Organization JSON-LD: emitted on all pages incl. "/"
const config = useRuntimeConfig()
const route = useRoute()

const siteUrl = String(config.public.siteUrl || 'http://localhost:3100').replace(/\/+$/, '')
const siteName = String(config.public.siteName || 'My Website')

// Canonical strips query/hash and trailing slash (except root).
const canonical = computed(() => {
  const path = (route.path || '/').replace(/\/+$/, '') || '/'
  return siteUrl + (path === '/' ? '' : path)
})

// JSON-LD: WebSite + Organization on every page; SoftwareApplication on home.
const jsonLd = computed(() => {
  const blocks: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteName,
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
    },
  ]
  if ((route.path || '/') === '/') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: siteName,
      description: String(config.public.siteDescription || ''),
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Linux, macOS, Windows',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      url: siteUrl,
      image: `${siteUrl}/og-image.png`,
    })
  }
  return blocks
})

useHead(() => ({
  titleTemplate: (title?: string) =>
    title && title !== siteName ? `${title} · ${siteName}` : siteName,
  link: [{ rel: 'canonical', href: canonical.value }],
  meta: [{ property: 'og:url', content: canonical.value }],
  script: jsonLd.value.map((b) => ({
    type: 'application/ld+json',
    innerHTML: JSON.stringify(b),
  })),
}))
</script>
