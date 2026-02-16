/**
 * Composables for fetching website data from the backend CMS API.
 * All use Nuxt's useFetch for SSR-compatible data fetching.
 */

interface PageContent {
  id: number
  title: string
  slug: string
  content: string // JSON string — parse with JSON.parse()
  contentHtml: string | null
  excerpt: string | null
  template: string
  pageType: string
  featuredImage: string | null
  metaTitle: string | null
  metaDescription: string | null
  metaKeywords: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  isPublished: boolean
  publishedAt: string | null
}

interface MenuItem {
  id: number
  label: string
  url: string | null
  pageId: number | null
  target: string
  icon: string | null
  sequence: number
  isActive: boolean
}

interface MenuData {
  id: number
  name: string
  location: string
  isActive: boolean
  items: MenuItem[]
}

type SettingsMap = Record<string, any>

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

/**
 * Fetch a single page by slug with parsed content JSON.
 * Returns the page data with `content` already parsed from JSON string.
 */
export function usePageContent<T = Record<string, any>>(slug: string) {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string

  const { data, pending, error } = useFetch<ApiResponse<PageContent>>(`${baseURL}/pages/${slug}`, {
    key: `page-${slug}`,
    server: true,
    lazy: false,
  })

  const page = computed(() => data.value?.data || null)

  const content = computed<T | null>(() => {
    const raw = page.value?.content
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  })

  const seo = computed(() => ({
    title: page.value?.metaTitle || page.value?.title || '',
    description: page.value?.metaDescription || page.value?.excerpt || '',
    ogTitle: page.value?.ogTitle || page.value?.metaTitle || page.value?.title || '',
    ogDescription: page.value?.ogDescription || page.value?.metaDescription || '',
    ogImage: page.value?.ogImage || page.value?.featuredImage || '',
  }))

  return { page, content, seo, pending, error }
}

/**
 * Fetch all website settings as a key-value map.
 * JSON-type settings are auto-parsed.
 */
export function useSettings() {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string

  const { data, pending, error } = useFetch<ApiResponse<SettingsMap>>(`${baseURL}/settings`, {
    key: 'website-settings',
    server: true,
    lazy: false,
  })

  const settings = computed<SettingsMap>(() => data.value?.data || {})

  return { settings, pending, error }
}

/**
 * Fetch a navigation menu by location (header, footer, sidebar).
 * Returns the menu items sorted by sequence.
 */
export function useMenu(location: string) {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string

  const { data, pending, error } = useFetch<ApiResponse<MenuData>>(`${baseURL}/menus/${location}`, {
    key: `menu-${location}`,
    server: true,
    lazy: false,
  })

  const menu = computed(() => data.value?.data || null)
  const items = computed<MenuItem[]>(() => menu.value?.items?.filter(i => i.isActive) || [])

  return { menu, items, pending, error }
}
