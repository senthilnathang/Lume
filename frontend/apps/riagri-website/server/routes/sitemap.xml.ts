// Proxy /sitemap.xml → backend CMS endpoint
export default defineEventHandler(async (event) => {
  const backendUrl = process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api/website/public'

  try {
    const xml = await $fetch<string>(`${backendUrl}/sitemap.xml`, {
      responseType: 'text',
    })
    setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
    setHeader(event, 'Cache-Control', 'public, max-age=3600')
    return xml
  } catch {
    setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
    return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
  }
})
