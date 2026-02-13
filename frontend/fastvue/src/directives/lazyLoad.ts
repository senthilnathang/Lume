/**
 * Lazy Load Directive
 *
 * Provides image lazy loading with placeholder and error handling.
 *
 * Usage:
 * ```vue
 * <img v-lazy="imageUrl" />
 * <img v-lazy="{ src: imageUrl, placeholder: placeholderUrl, error: errorUrl }" />
 * ```
 */

import type { Directive, DirectiveBinding } from 'vue';

interface LazyLoadOptions {
  src: string;
  placeholder?: string;
  error?: string;
  threshold?: number;
  rootMargin?: string;
}

type LazyLoadValue = string | LazyLoadOptions;

// Default placeholder (1x1 transparent gif)
const DEFAULT_PLACEHOLDER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Default error image
const DEFAULT_ERROR =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ii8+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSIvPjwvc3ZnPg==';

// Observer instance (shared)
let observer: IntersectionObserver | null = null;

// Element to options map
const elementMap = new WeakMap<HTMLElement, LazyLoadOptions>();

/**
 * Get or create observer
 */
function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLImageElement;
            const options = elementMap.get(el);

            if (options) {
              loadImage(el, options);
              observer?.unobserve(el);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01,
      },
    );
  }
  return observer;
}

/**
 * Parse directive value
 */
function parseValue(value: LazyLoadValue): LazyLoadOptions {
  if (typeof value === 'string') {
    return {
      src: value,
      placeholder: DEFAULT_PLACEHOLDER,
      error: DEFAULT_ERROR,
    };
  }
  return {
    placeholder: DEFAULT_PLACEHOLDER,
    error: DEFAULT_ERROR,
    ...value,
  };
}

/**
 * Load image
 */
function loadImage(el: HTMLImageElement, options: LazyLoadOptions): void {
  const { src, error } = options;

  // Add loading class
  el.classList.add('lazy-loading');
  el.classList.remove('lazy-loaded', 'lazy-error');

  // Create image to preload
  const img = new Image();

  img.onload = () => {
    el.src = src;
    el.classList.remove('lazy-loading');
    el.classList.add('lazy-loaded');

    // Trigger fade-in animation
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.3s ease';
      el.style.opacity = '1';
    });
  };

  img.onerror = () => {
    if (error) {
      el.src = error;
    }
    el.classList.remove('lazy-loading');
    el.classList.add('lazy-error');
  };

  img.src = src;
}

/**
 * Lazy load directive
 */
export const vLazy: Directive<HTMLImageElement, LazyLoadValue> = {
  mounted(el: HTMLImageElement, binding: DirectiveBinding<LazyLoadValue>) {
    const options = parseValue(binding.value);

    // Set placeholder
    if (options.placeholder) {
      el.src = options.placeholder;
    }

    // Store options
    elementMap.set(el, options);

    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
      getObserver().observe(el);
    } else {
      // Fallback: load immediately
      loadImage(el, options);
    }
  },

  updated(el: HTMLImageElement, binding: DirectiveBinding<LazyLoadValue>) {
    const newOptions = parseValue(binding.value);
    const oldOptions = elementMap.get(el);

    // Only update if src changed
    if (oldOptions?.src !== newOptions.src) {
      elementMap.set(el, newOptions);

      // If already loaded, load new image
      if (el.classList.contains('lazy-loaded')) {
        loadImage(el, newOptions);
      }
    }
  },

  unmounted(el: HTMLImageElement) {
    observer?.unobserve(el);
    elementMap.delete(el);
  },
};

/**
 * Lazy background image directive
 */
export const vLazyBg: Directive<HTMLElement, LazyLoadValue> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<LazyLoadValue>) {
    const options = parseValue(binding.value);

    // Set placeholder background
    if (options.placeholder) {
      el.style.backgroundImage = `url(${options.placeholder})`;
    }

    // Store options
    elementMap.set(el, options);

    if ('IntersectionObserver' in window) {
      const bgObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const targetEl = entry.target as HTMLElement;
              const opts = elementMap.get(targetEl);

              if (opts) {
                const img = new Image();
                img.onload = () => {
                  targetEl.style.backgroundImage = `url(${opts.src})`;
                  targetEl.classList.add('lazy-bg-loaded');
                };
                img.onerror = () => {
                  if (opts.error) {
                    targetEl.style.backgroundImage = `url(${opts.error})`;
                  }
                };
                img.src = opts.src;
                bgObserver.unobserve(targetEl);
              }
            }
          });
        },
        { rootMargin: '50px 0px', threshold: 0.01 },
      );

      bgObserver.observe(el);
    } else {
      el.style.backgroundImage = `url(${options.src})`;
    }
  },

  unmounted(el: HTMLElement) {
    elementMap.delete(el);
  },
};

export default vLazy;
