import { initPreferences } from '@vben/preferences';
import { unmountGlobalLoading } from '@vben/utils';

import { overridesPreferences } from './preferences';

/**
 * Application initialization
 */
async function initApplication() {
  // Namespace for data isolation between environments
  const env = import.meta.env.PROD ? 'prod' : 'dev';
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const namespace = `${import.meta.env.VITE_APP_NAMESPACE}-${appVersion}-${env}`;

  // Initialize app preferences
  await initPreferences({
    namespace,
    overrides: overridesPreferences,
  });

  // Bootstrap Vue application
  const { bootstrap } = await import('./bootstrap');
  await bootstrap(namespace);

  // Remove and destroy loading screen
  unmountGlobalLoading();
}

initApplication();
