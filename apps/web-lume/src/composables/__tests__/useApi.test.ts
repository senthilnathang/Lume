import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useApi } from '../useApi'

describe('useApi Composable', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('initializes with empty token', () => {
    const api = useApi()
    expect(api.token.value).toBeNull()
  })

  it('sets auth tokens correctly', () => {
    const api = useApi()
    api.setAuth('test-token', 'test-refresh')

    expect(api.token.value).toBe('test-token')
    expect(api.refreshToken.value).toBe('test-refresh')
    expect(localStorage.getItem('gawdesy_token')).toBe('test-token')
  })

  it('clears auth tokens', () => {
    const api = useApi()
    api.setAuth('test-token', 'test-refresh')
    api.clearAuth()

    expect(api.token.value).toBeNull()
    expect(api.refreshToken.value).toBeNull()
    expect(localStorage.getItem('gawdesy_token')).toBeNull()
  })

  it('includes auth header when token exists', () => {
    const api = useApi()
    api.setAuth('test-token', 'test-refresh')

    const headers = api.getAuthHeaders()
    expect(headers['Authorization']).toBe('Bearer test-token')
  })

  it('excludes auth header when token is null', () => {
    const api = useApi()
    const headers = api.getAuthHeaders()

    expect(headers['Authorization']).toBeUndefined()
  })
})
