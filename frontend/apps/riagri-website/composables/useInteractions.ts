/**
 * Interactions composable — event-driven element interactions.
 *
 * Parses interaction configs from [data-interactions] attributes and sets up
 * event listeners for various triggers and actions.
 *
 * Interaction config format (JSON array):
 *   [{
 *     trigger: 'hover' | 'click' | 'viewport',
 *     action: 'animate' | 'toggle-class' | 'show' | 'hide',
 *     target: 'self' | string (CSS selector),
 *     animationClass?: string,
 *     className?: string,
 *     viewportThreshold?: number (0-1)
 *   }]
 */

interface InteractionConfig {
  trigger: 'hover' | 'click' | 'viewport'
  action: 'animate' | 'toggle-class' | 'show' | 'hide'
  target: string
  animationClass?: string
  className?: string
  viewportThreshold?: number
}

export function useInteractions() {
  const observers: IntersectionObserver[] = []
  const cleanups: (() => void)[] = []

  function resolveTarget(el: HTMLElement, targetSelector: string): HTMLElement | null {
    if (!targetSelector || targetSelector === 'self') return el
    return document.querySelector<HTMLElement>(targetSelector)
  }

  function applyAction(targetEl: HTMLElement, config: InteractionConfig, activate: boolean) {
    switch (config.action) {
      case 'animate': {
        const cls = config.animationClass || 'lume-ix-fade-in'
        if (activate) {
          targetEl.classList.add(cls)
          // Remove class after animation ends to allow re-trigger
          const handler = () => {
            targetEl.classList.remove(cls)
            targetEl.removeEventListener('animationend', handler)
          }
          targetEl.addEventListener('animationend', handler)
        } else {
          targetEl.classList.remove(config.animationClass || 'lume-ix-fade-in')
        }
        break
      }
      case 'toggle-class': {
        const cls = config.className || ''
        if (!cls) return
        if (activate) {
          targetEl.classList.add(cls)
        } else {
          targetEl.classList.remove(cls)
        }
        break
      }
      case 'show': {
        if (activate) {
          targetEl.classList.remove('lume-ix-hidden')
          targetEl.classList.add('lume-ix-visible')
        }
        break
      }
      case 'hide': {
        if (activate) {
          targetEl.classList.add('lume-ix-hidden')
          targetEl.classList.remove('lume-ix-visible')
        }
        break
      }
    }
  }

  function setupInteraction(el: HTMLElement, config: InteractionConfig) {
    const targetEl = resolveTarget(el, config.target)
    if (!targetEl) return

    switch (config.trigger) {
      case 'hover': {
        const onEnter = () => applyAction(targetEl, config, true)
        const onLeave = () => applyAction(targetEl, config, false)
        el.addEventListener('mouseenter', onEnter)
        el.addEventListener('mouseleave', onLeave)
        cleanups.push(() => {
          el.removeEventListener('mouseenter', onEnter)
          el.removeEventListener('mouseleave', onLeave)
        })
        break
      }
      case 'click': {
        let active = false
        const onClick = () => {
          active = !active
          applyAction(targetEl, config, active)
        }
        el.addEventListener('click', onClick)
        cleanups.push(() => el.removeEventListener('click', onClick))
        break
      }
      case 'viewport': {
        const threshold = config.viewportThreshold ?? 0.3
        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              applyAction(targetEl, config, entry.isIntersecting)
            }
          },
          { threshold }
        )
        observer.observe(el)
        observers.push(observer)
        break
      }
    }
  }

  function init() {
    const nodes = document.querySelectorAll<HTMLElement>('[data-interactions]')

    nodes.forEach((el) => {
      const raw = el.getAttribute('data-interactions')
      if (!raw || raw === '[]') return

      try {
        const configs: InteractionConfig[] = JSON.parse(raw)
        if (!Array.isArray(configs)) return
        configs.forEach((cfg) => setupInteraction(el, cfg))
      } catch {
        // Invalid JSON, skip
      }
    })
  }

  function destroy() {
    observers.forEach((o) => o.disconnect())
    observers.length = 0
    cleanups.forEach((fn) => fn())
    cleanups.length = 0
  }

  onMounted(() => {
    nextTick(() => init())
  })

  onUnmounted(() => {
    destroy()
  })

  return { init, destroy }
}
