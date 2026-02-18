/**
 * Sticky positioning composable.
 *
 * Queries elements with [data-sticky-position] and applies the appropriate
 * CSS sticky classes and custom property offsets.
 *
 * Data attributes read from DOM:
 *   data-sticky-position: "top" | "bottom" | "none"
 *   data-sticky-offset: number (px)
 *   data-sticky-z: number (z-index)
 */

export function useSticky() {
  function init() {
    const nodes = document.querySelectorAll<HTMLElement>('[data-sticky-position]')

    nodes.forEach((el) => {
      const position = el.getAttribute('data-sticky-position')
      if (!position || position === 'none') return

      const offset = parseInt(el.getAttribute('data-sticky-offset') || '0', 10)
      const zIndex = parseInt(el.getAttribute('data-sticky-z') || '100', 10)

      // Remove any previous sticky classes
      el.classList.remove('lume-sticky-top', 'lume-sticky-bottom')

      // Apply CSS custom properties
      el.style.setProperty('--sticky-offset', `${offset}px`)
      el.style.setProperty('--sticky-z', String(zIndex))

      // Apply the correct class
      if (position === 'top') {
        el.classList.add('lume-sticky-top')
      } else if (position === 'bottom') {
        el.classList.add('lume-sticky-bottom')
      }
    })
  }

  function destroy() {
    const nodes = document.querySelectorAll<HTMLElement>('.lume-sticky-top, .lume-sticky-bottom')
    nodes.forEach((el) => {
      el.classList.remove('lume-sticky-top', 'lume-sticky-bottom')
      el.style.removeProperty('--sticky-offset')
      el.style.removeProperty('--sticky-z')
    })
  }

  onMounted(() => {
    nextTick(() => init())
  })

  onUnmounted(() => {
    destroy()
  })

  return { init, destroy }
}
