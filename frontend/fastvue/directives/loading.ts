import type { App, Directive, DirectiveBinding } from 'vue';

interface LoadingElement extends HTMLElement {
  __loading__?: {
    overlay: HTMLElement;
  };
}

/**
 * Loading directive - shows a loading overlay on the element
 *
 * Usage:
 * <div v-loading="isLoading">Content</div>
 * <div v-loading="{ loading: isLoading, text: 'Custom text...' }">Content</div>
 */
const loadingDirective: Directive = {
  mounted(el: LoadingElement, binding: DirectiveBinding) {
    // Ensure element is positioned
    const position = getComputedStyle(el).position;
    if (position === 'static') {
      el.style.position = 'relative';
    }

    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'v-loading-overlay';
    overlay.innerHTML = `
      <div class="v-loading-spinner">
        <svg class="v-loading-icon" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round">
            <animate attributeName="stroke-dasharray" dur="1.5s" repeatCount="indefinite" values="1,200;90,200;90,200"/>
            <animate attributeName="stroke-dashoffset" dur="1.5s" repeatCount="indefinite" values="0;-35;-125"/>
          </circle>
        </svg>
        <span class="v-loading-text"></span>
      </div>
    `;

    // Add styles if not exists
    if (!document.getElementById('v-loading-styles')) {
      const style = document.createElement('style');
      style.id = 'v-loading-styles';
      style.textContent = `
        .v-loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }
        :root.dark .v-loading-overlay {
          background: rgba(0, 0, 0, 0.6);
        }
        .v-loading-overlay.is-loading {
          display: flex;
        }
        .v-loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .v-loading-icon {
          width: 32px;
          height: 32px;
          color: #1890ff;
          animation: v-loading-rotate 2s linear infinite;
        }
        .v-loading-text {
          font-size: 14px;
          color: #666;
        }
        :root.dark .v-loading-text {
          color: #bbb;
        }
        @keyframes v-loading-rotate {
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    el.__loading__ = { overlay };
    el.appendChild(overlay);

    updateLoading(el, binding);
  },

  updated(el: LoadingElement, binding: DirectiveBinding) {
    updateLoading(el, binding);
  },

  unmounted(el: LoadingElement) {
    if (el.__loading__?.overlay) {
      el.removeChild(el.__loading__.overlay);
      delete el.__loading__;
    }
  },
};

function updateLoading(el: LoadingElement, binding: DirectiveBinding) {
  if (!el.__loading__) return;

  const overlay = el.__loading__.overlay;
  const isLoading = typeof binding.value === 'boolean' ? binding.value : binding.value?.loading;
  const text = typeof binding.value === 'object' ? binding.value?.text : '';

  if (isLoading) {
    overlay.classList.add('is-loading');
  } else {
    overlay.classList.remove('is-loading');
  }

  const textEl = overlay.querySelector('.v-loading-text');
  if (textEl) {
    textEl.textContent = text || '';
  }
}

export function setupLoadingDirective(app: App) {
  app.directive('loading', loadingDirective);
}

export { loadingDirective };
