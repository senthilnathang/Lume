import { useFetch } from '#app'

export function useApi<T>(path: string, options: Parameters<typeof useFetch<T>>[1] = {}) {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string

  return useFetch<T>(`${baseURL}${path}`, {
    ...options,
    key: path,
    server: true,
    lazy: false,
  })
}

export function useApiLazy<T>(path: string, options: Parameters<typeof useFetch<T>>[1] = {}) {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string

  return useFetch<T>(`${baseURL}${path}`, {
    ...options,
    key: path,
    server: true,
    lazy: true,
  })
}
