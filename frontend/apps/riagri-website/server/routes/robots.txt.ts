// Proxy /robots.txt → backend CMS endpoint
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const backendUrl = process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api/website/public'

  try {
    const text = await $fetch<string>(`${backendUrl}/robots.txt`, {
      responseType: 'text',
    })
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    setHeader(event, 'Cache-Control', 'public, max-age=3600')
    return text
  } catch {
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    return 'User-agent: *\nAllow: /\n'
  }
})
