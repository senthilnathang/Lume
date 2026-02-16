import type { UseFetchOptions } from 'nuxt/app'

export function useApi<T>(path: string, options: UseFetchOptions<T> = {}) {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string

  return useFetch<T>(`${baseURL}${path}`, {
    ...options,
    key: path,
    server: true,
    lazy: false,
  })
}

export function useApiLazy<T>(path: string, options: UseFetchOptions<T> = {}) {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string

  return useFetch<T>(`${baseURL}${path}`, {
    ...options,
    key: path,
    server: true,
    lazy: true,
  })
}
