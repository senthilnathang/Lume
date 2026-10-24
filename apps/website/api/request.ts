/** Authenticated requests used by shared editor widgets in website edit mode. */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const config = useRuntimeConfig()
  const apiBase = String(config.public.apiBase).replace(/\/website\/public\/?$/, '')
  const token = typeof window === 'undefined' ? null : localStorage.getItem('lume_admin_token')
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const relative = path.replace(/^\/api(?:\/v2)?(?=\/|$)/, '')
  return fetch(`${apiBase.replace(/\/$/, '')}/${relative.replace(/^\//, '')}`, { ...options, headers })
}

export async function get<T = Record<string, unknown>>(path: string): Promise<T> {
  const response = await apiFetch(path)
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  const payload = await response.json()
  if (payload.success === false) throw new Error('Request failed')
  return (payload.success === true ? payload.data : payload) as T
}
