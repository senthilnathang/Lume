import type { App, Directive, DirectiveBinding } from 'vue';

type ClickOutsideHandler = (event: MouseEvent) => void;

interface ClickOutsideElement extends HTMLElement {
  __clickOutside__?: {
    handler: ClickOutsideHandler;
    documentHandler: (event: MouseEvent) => void;
  };
}

/**
 * Click outside directive - triggers callback when clicking outside the element
 *
 * Usage:
 * <div v-click-outside="handleClickOutside">Dropdown content</div>
 *
 * With options:
 * <div v-click-outside="{ handler: handleClose, exclude: ['.exclude-class'] }">
 */
const clickOutsideDirective: Directive = {
  mounted(el: ClickOutsideElement, binding: DirectiveBinding) {
    const handler =
      typeof binding.value === 'function'
        ? binding.value
        : binding.value?.handler;

    const exclude = binding.value?.exclude || [];

    if (!handler) return;

    const documentHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if clicked inside the element
      if (el.contains(target)) return;

      // Check if clicked on excluded elements
      for (const selector of exclude) {
        if (target.closest(selector)) return;
      }

      handler(event);
    };

    el.__clickOutside__ = {
      handler,
      documentHandler,
    };

    document.addEventListener('click', documentHandler, true);
  },

  unmounted(el: ClickOutsideElement) {
    if (el.__clickOutside__) {
      document.removeEventListener('click', el.__clickOutside__.documentHandler, true);
      delete el.__clickOutside__;
    }
  },
};

export function setupClickOutsideDirective(app: App) {
  app.directive('click-outside', clickOutsideDirective);
}

export { clickOutsideDirective };
