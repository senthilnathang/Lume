/**
 * Motion Effects composable — scroll-based and mouse-based motion effects.
 *
 * Queries all elements with [data-motion-fx] on mount, then:
 * - Scroll handler (rAF): calculates translateY, translateX, opacity, blur, rotate, scale
 *   based on element's scroll position within the viewport range.
 * - Mouse handler: calculates mouseTrack (element follows cursor) and tilt (perspective tilt).
 *
 * Each scroll effect config:
 *   { enabled: boolean, speed: number (1-10), direction: 'positive'|'negative', range: { start: number, end: number } }
 *
 * Each mouse effect config:
 *   { enabled: boolean, speed: number (1-10), direction: 'positive'|'negative' }
 */

interface ScrollEffect {
  enabled: boolean
  speed: number
  direction: 'positive' | 'negative'
  range: { start: number; end: number }
}

interface MouseEffect {
  enabled: boolean
  speed: number
  direction?: 'positive' | 'negative'
}

interface MotionFxConfig {
  scrollEffects?: {
    translateY?: ScrollEffect
    translateX?: ScrollEffect
    opacity?: ScrollEffect
    blur?: ScrollEffect
    rotate?: ScrollEffect
    scale?: ScrollEffect
  }
  mouseEffects?: {
    mouseTrack?: MouseEffect
    tilt?: MouseEffect
  }
}

export function useMotionFx() {
  const elements = ref<{ el: HTMLElement; config: MotionFxConfig }[]>([])
  let rafId: number | null = null
  let mouseRafId: number | null = null
  let mouseX = 0
  let mouseY = 0

  function parseConfig(el: HTMLElement): MotionFxConfig {
    const raw = el.getAttribute('data-motion-fx')
    if (!raw || raw === '{}') return {}
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }

  function getScrollProgress(el: HTMLElement, range: { start: number; end: number }): number {
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight
    const rangeStart = vh * (range.start / 100)
    const rangeEnd = vh * (range.end / 100)
    const elCenter = rect.top + rect.height / 2
    // 0 when element center is at rangeEnd, 1 when at rangeStart
    const progress = 1 - (elCenter - rangeStart) / (rangeEnd - rangeStart)
    return Math.max(0, Math.min(1, progress))
  }

  function applyScrollEffects() {
    for (const { el, config } of elements.value) {
      if (!config.scrollEffects) continue

      const transforms: string[] = []
      const filters: string[] = []
      let opacity: number | null = null

      const effects = config.scrollEffects

      for (const [key, effect] of Object.entries(effects)) {
        if (!effect?.enabled) continue
        const range = effect.range || { start: 0, end: 100 }
        const progress = getScrollProgress(el, range)
        const dir = effect.direction === 'negative' ? -1 : 1
        const intensity = (effect.speed || 5) / 5 // normalize: speed 5 = 1x

        switch (key) {
          case 'translateY': {
            const px = (progress - 0.5) * 100 * intensity * dir
            transforms.push(`translateY(${px}px)`)
            break
          }
          case 'translateX': {
            const px = (progress - 0.5) * 100 * intensity * dir
            transforms.push(`translateX(${px}px)`)
            break
          }
          case 'opacity': {
            // At progress 0 -> opacity based on direction; at progress 1 -> opposite
            opacity = dir > 0
              ? progress * intensity
              : 1 - progress * intensity
            opacity = Math.max(0, Math.min(1, opacity))
            break
          }
          case 'blur': {
            const blurPx = (1 - progress) * 10 * intensity * Math.abs(dir)
            filters.push(`blur(${Math.max(0, blurPx)}px)`)
            break
          }
          case 'rotate': {
            const deg = (progress - 0.5) * 360 * (intensity / 5) * dir
            transforms.push(`rotate(${deg}deg)`)
            break
          }
          case 'scale': {
            const s = 1 + (progress - 0.5) * 0.5 * intensity * dir
            transforms.push(`scale(${Math.max(0.1, s)})`)
            break
          }
        }
      }

      el.style.transform = transforms.length ? transforms.join(' ') : ''
      el.style.filter = filters.length ? filters.join(' ') : ''
      if (opacity !== null) {
        el.style.opacity = String(opacity)
      }
    }

    rafId = requestAnimationFrame(applyScrollEffects)
  }

  function applyMouseEffects() {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const normX = (mouseX / vw - 0.5) * 2 // -1 to 1
    const normY = (mouseY / vh - 0.5) * 2 // -1 to 1

    for (const { el, config } of elements.value) {
      if (!config.mouseEffects) continue

      const transforms: string[] = []

      const track = config.mouseEffects.mouseTrack
      if (track?.enabled) {
        const intensity = (track.speed || 5) / 5
        const dir = track.direction === 'negative' ? -1 : 1
        const moveX = normX * 30 * intensity * dir
        const moveY = normY * 30 * intensity * dir
        transforms.push(`translate(${moveX}px, ${moveY}px)`)
      }

      const tilt = config.mouseEffects.tilt
      if (tilt?.enabled) {
        const intensity = (tilt.speed || 5) / 5
        const rotateX = -normY * 15 * intensity
        const rotateY = normX * 15 * intensity
        transforms.push(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`)
      }

      if (transforms.length) {
        // Merge with any scroll transforms already applied
        const existing = el.style.transform || ''
        const scrollPart = existing.replace(/translate\([^)]+\)|perspective\([^)]+\)\s*rotateX\([^)]+\)\s*rotateY\([^)]+\)/g, '').trim()
        el.style.transform = [scrollPart, ...transforms].filter(Boolean).join(' ')
      }
    }
  }

  function onMouseMove(e: MouseEvent) {
    mouseX = e.clientX
    mouseY = e.clientY
    if (mouseRafId) cancelAnimationFrame(mouseRafId)
    mouseRafId = requestAnimationFrame(applyMouseEffects)
  }

  function init() {
    const nodes = document.querySelectorAll<HTMLElement>('[data-motion-fx]')
    elements.value = []
    nodes.forEach((el) => {
      const config = parseConfig(el)
      if (config.scrollEffects || config.mouseEffects) {
        elements.value.push({ el, config })
      }
    })

    if (elements.value.length === 0) return

    // Start scroll loop
    const hasScroll = elements.value.some((e) => e.config.scrollEffects)
    if (hasScroll) {
      rafId = requestAnimationFrame(applyScrollEffects)
    }

    // Start mouse listener
    const hasMouse = elements.value.some((e) => e.config.mouseEffects)
    if (hasMouse) {
      window.addEventListener('mousemove', onMouseMove, { passive: true })
    }
  }

  function destroy() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (mouseRafId) {
      cancelAnimationFrame(mouseRafId)
      mouseRafId = null
    }
    window.removeEventListener('mousemove', onMouseMove)
    elements.value = []
  }

  onMounted(() => {
    nextTick(() => init())
  })

  onUnmounted(() => {
    destroy()
  })

  return { init, destroy }
}
