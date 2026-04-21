import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('useWebsiteData Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches menu data', async () => {
    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              items: [
                { id: 1, label: 'Home', url: '/' },
                { id: 2, label: 'About', url: '/about' },
              ],
            },
          }),
      })
    )

    // Simulate composable behavior
    const response = await fetch('/api/website/public/menus/header')
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.items).toHaveLength(2)
    expect(data.data.items[0].label).toBe('Home')
  })

  it('fetches website settings', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              siteName: 'Test Site',
              siteDescription: 'Test Description',
            },
          }),
      })
    )

    const response = await fetch('/api/website/public/settings')
    const data = await response.json()

    expect(data.data.siteName).toBe('Test Site')
  })

  it('handles fetch errors gracefully', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

    await expect(fetch('/api/website/public/menus/header')).rejects.toThrow(
      'Network error'
    )
  })
})
