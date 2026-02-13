import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
  RouteRecordStringComponent,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';

import { message } from 'ant-design-vue';

import { requestClient } from '#/api/request';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';

import { generateModuleRoutes } from './generate-module-routes';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      message.loading({
        content: `${$t('common.loadingMenu')}...`,
        duration: 1.5,
      });

      // Fetch menus from installed modules API
      const menus = await requestClient.get<any[]>('/modules/installed/menus');

      // Convert to routes using ModuleView for dynamic loading
      // Cast to expected type - actual components will work at runtime
      // even though the type system expects string references
      return generateModuleRoutes(menus as any[]) as unknown as RouteRecordStringComponent[];
    },
    forbiddenComponent,
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
