/**
 * Common API request client for module views
 * Imported by module views as: import { get, post, put, del } from '#/api/request'
 */

// Create axios instance dynamically since this runs in browser
const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor: add auth token
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('lume_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// Response interceptor: unwrap data + handle errors
axiosInstance.interceptors.response.use(
  response => {
    // If response has { success, data }, return data; otherwise return response.data
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data
    }
    return response.data
  },
  error => {
    // 401: Unauthorized - clear token and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('lume_token')
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
export const get = (url, config = {}) => axiosInstance.get(url, config)
export const post = (url, data, config = {}) => axiosInstance.post(url, data, config)
export const put = (url, data, config = {}) => axiosInstance.put(url, data, config)
export const del = (url, config = {}) => axiosInstance.delete(url, config)
export const request = axiosInstance

export default axiosInstance
