import axios from 'axios'
import { useAccessStore } from '@/stores'

// Create axios instance
export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor: add auth token
api.interceptors.request.use(
  (config) => {
    const accessStore = useAccessStore()
    if (accessStore.token) {
      config.headers.Authorization = `Bearer ${accessStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: unwrap data + handle errors
api.interceptors.response.use(
  (response) => {
    // If response has { success, data }, return data; otherwise return response.data
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data
    }
    return response.data
  },
  (error) => {
    // 401: Unauthorized - clear token and redirect
    if (error.response?.status === 401) {
      const accessStore = useAccessStore()
      accessStore.reset()
      window.location.href = '/login'
      return
    }

    // 403: Forbidden
    if (error.response?.status === 403) {
      console.error('Access denied')
    }

    // Reject with error data
    return Promise.reject(error.response?.data || error.message)
  }
)

// Convenience methods
export const get = (url: string, config = {}) => api.get(url, config)
export const post = (url: string, data: any, config = {}) => api.post(url, data, config)
export const put = (url: string, data: any, config = {}) => api.put(url, data, config)
export const del = (url: string, config = {}) => api.delete(url, config)

export default api
