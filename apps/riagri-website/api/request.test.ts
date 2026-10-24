import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from './request'

describe('shared widget requests', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'https://example.test/api/v2/website/public/' } }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('uses the authenticated API root and unwraps the response', async () => {
    localStorage.setItem('lume_admin_token', 'test-token')
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, data: { content: 'widget' } }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await get('/editor/global-widgets/4')).toEqual({ content: 'widget' })
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/api/v2/editor/global-widgets/4', {
      headers: expect.any(Headers),
    })
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer test-token')
  })

  it('rejects HTTP failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })))
    await expect(get('/editor/global-widgets/4')).rejects.toThrow('403')
  })

  it('rejects unsuccessful API envelopes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: false })))
    await expect(get('/editor/global-widgets/4')).rejects.toThrow('Request failed')
  })
})
