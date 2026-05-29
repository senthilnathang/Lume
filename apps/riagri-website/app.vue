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

useHead({
  titleTemplate: (title?: string) =>
    title && title !== siteName ? `${title} · ${siteName}` : siteName,
  link: [{ rel: 'canonical', href: canonical }],
  meta: [{ property: 'og:url', content: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        url: siteUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteName,
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
      }),
    },
  ],
})
</script>
