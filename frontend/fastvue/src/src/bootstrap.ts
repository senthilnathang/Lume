import { createApp, watchEffect } from 'vue';

import { registerAccessDirective } from '@vben/access';
import { registerLoadingDirective } from '@vben/common-ui/es/loading';
import { preferences } from '@vben/preferences';
import { initStores, useAccessStore } from '@vben/stores';
import '@vben/styles';
import '@vben/styles/antd';
import './styles/global.css';

import { useTitle } from '@vueuse/core';

import { $t, setupI18n } from '#/locales';
import { initializeRequestProvider } from '#/api/request-provider';
import { initializeCsrfToken } from '#/utils/csrf';

import { initComponentAdapter } from './adapter/component';
import { initSetupVbenForm } from './adapter/form';
import App from './app.vue';
import { router } from './router';

async function bootstrap(namespace: string) {
  // Initialize component adapter
  await initComponentAdapter();

  // Initialize form components
  await initSetupVbenForm();

  const app = createApp(App);

  // Register v-loading directive
  registerLoadingDirective(app, {
    loading: 'loading',
    spinning: 'spinning',
  });

  // Setup i18n
  await setupI18n(app);

  // Configure pinia store
  await initStores(app, { namespace });

  // Initialize request provider with store implementations
  // This decouples the API layer from direct store imports
  const { useAuthStore, useCompanyStore } = await import('#/store');
  const { useTrustStore } = await import('#/store/trust');

  const accessStore = useAccessStore();
  const authStore = useAuthStore();
  const companyStore = useCompanyStore();
  const trustStore = useTrustStore();

  initializeRequestProvider({
    auth: {
      getAccessToken: () => accessStore.accessToken,
      setAccessToken: (token) => accessStore.setAccessToken(token),
      isAccessChecked: () => accessStore.isAccessChecked,
      setLoginExpired: (expired) => accessStore.setLoginExpired(expired),
      isLoginExpired: () => accessStore.loginExpired,
      logout: () => authStore.logout(),
    },
    company: {
      getSelectedCompanyId: () => companyStore.selectedCompanyId,
    },
    trust: {
      updateTrustFromHeaders: (headers) =>
        trustStore.updateTrustFromHeaders(headers as any),
      setStepUpRequired: (required, reason, method, sessionId) =>
        trustStore.setStepUpRequired(required, reason, method, sessionId),
    },
  });

  // Register access directive
  registerAccessDirective(app);

  // Register custom permission directives
  const { setupPermissionDirectives } = await import('#/directives/permission');
  setupPermissionDirectives(app);

  // Initialize tippy
  const { initTippy } = await import('@vben/common-ui/es/tippy');
  initTippy(app);

  // Initialize CSRF token by making a GET request to backend
  // This ensures the csrf_token cookie is set before any POST requests
  await initializeCsrfToken();

  // Configure router
  app.use(router);

  // Configure Motion plugin
  const { MotionPlugin } = await import('@vben/plugins/motion');
  app.use(MotionPlugin);

  // Dynamic title update
  watchEffect(() => {
    if (preferences.app.dynamicTitle) {
      const routeTitle = router.currentRoute.value.meta?.title;
      const pageTitle =
        (routeTitle ? `${$t(routeTitle)} - ` : '') + preferences.app.name;
      useTitle(pageTitle);
    }
  });

  app.mount('#app');
}

export { bootstrap };
