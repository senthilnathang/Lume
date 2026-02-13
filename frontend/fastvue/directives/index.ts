import type { App } from 'vue';

import { setupPermissionDirectives } from './permission';
import { setupClickOutsideDirective } from './clickOutside';
import { setupLoadingDirective } from './loading';
import { vLazy, vLazyBg } from './lazyLoad';

export * from './permission';
export * from './clickOutside';
export * from './loading';
export * from './lazyLoad';

/**
 * Register all custom directives
 */
export function setupDirectives(app: App) {
  setupPermissionDirectives(app);
  setupClickOutsideDirective(app);
  setupLoadingDirective(app);

  // Lazy loading directives
  app.directive('lazy', vLazy);
  app.directive('lazy-bg', vLazyBg);
}
