<script lang="ts" setup>
/**
 * ModuleView - Dynamic Vue SFC loader for backend module views
 *
 * ARCHITECTURE:
 * - Views are loaded from: /modules/{moduleName}/static/views/{viewName}.vue
 * - Module-specific imports (#/api/...) are resolved from backend module folders
 * - Common imports are resolved from /modules/common/static/
 * - NPM packages (vue, ant-design-vue, etc.) are provided via moduleCache
 *
 * IMPORTANT FOR AI AGENTS:
 * - DO NOT add static imports from frontend src/ folder
 * - All #/ imports must be resolved dynamically from backend
 * - Each module should be self-contained in backend/modules/{name}/static/
 */
import { computed, ref, shallowRef, watch, markRaw, getCurrentInstance } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Spin, Result, Button } from 'ant-design-vue';
import * as Vue from 'vue';
// @ts-ignore - no type declarations for vue3-sfc-loader
import { loadModule } from 'vue3-sfc-loader';

// View inheritance transformer - applies module view extensions before SFC compilation
import { applyViewExtensions } from '#/utils/sfc-transformer';
import type { ViewExtensionSpec } from '#/utils/sfc-transformer';

// NPM packages only - these are the only static imports allowed
import Antd from 'ant-design-vue'; // Plugin installer for global A-prefixed components
import * as AntDesignVue from 'ant-design-vue';
import * as AntDesignIcons from '@ant-design/icons-vue';
import * as VbenCommonUI from '@vben/common-ui';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import * as echarts from 'echarts';
import VueEcharts from 'vue-echarts';

// Extend dayjs with plugins
dayjs.extend(relativeTime);
dayjs.extend(duration);

defineOptions({
  name: 'ModuleView',
});

// Register ant-design-vue globally so dynamic module views can use
// A-prefixed component names (AButton, ASelectOption, AFormItem, etc.)
// without explicit imports. The main app does NOT call app.use(Antd),
// so dynamic modules need this global registration.
const _instance = getCurrentInstance();
if (_instance) {
  const _app = _instance.appContext.app;
  if (!(_app as any)._antdGloballyRegistered) {
    _app.use(Antd as any);
    (_app as any)._antdGloballyRegistered = true;
  }
}

const props = defineProps<{
  moduleName: string;
  viewName: string;
}>();

// route/router instances are provided to dynamic modules via npmPackageCache
const loading = ref(true);
const error = ref<string | null>(null);
const loadedComponent = shallowRef<any>(null);

// Build the URL for the module view
const viewUrl = computed(() => {
  return `/modules/${props.moduleName}/static/views/${props.viewName}.vue`;
});

// Build the URL for the companion CSS file
const cssUrl = computed(() => {
  return `/modules/${props.moduleName}/static/views/${props.viewName}.css`;
});

// Track injected style elements for cleanup
const injectedStyles: HTMLStyleElement[] = [];

// Module cache to avoid re-fetching
// NOTE: Cache is scoped per session - clear entries as needed for fresh loads
const moduleCache: Record<string, any> = {};

// clearCacheForPath - clears cache for a specific path and its imports
// Available for external use if needed:
// function clearCacheForPath(basePath: string) {
//   const keysToDelete = Object.keys(moduleCache).filter(key =>
//     key.startsWith(basePath.replace(/\/[^/]+\.vue$/, '/'))
//   );
//   keysToDelete.forEach(key => delete moduleCache[key]);
// }

/**
 * Resolve #/ imports dynamically from backend
 *
 * Import path mapping:
 * - #/api/request -> /modules/common/static/api/request.js (SPECIAL: common request client)
 * - #/api/core/{name} -> /modules/{name}/static/api/index.js
 * - #/api/hrms/{name} -> /modules/{name}/static/api/index.js
 * - #/api/{name} -> /modules/{name}/static/api/index.js
 * - #/composables -> /modules/common/static/composables/index.js
 * - #/components/common -> /modules/common/static/components/index.js
 * - #/locales -> /modules/common/static/locales/index.js
 * - #/utils/* -> /modules/common/static/utils/*.js
 */
function resolveImportPath(importPath: string): string | null {
  // Handle common imports FIRST - resolve to common module
  // This must be checked before generic API patterns
  const commonMappings: Record<string, string> = {
    '#/api/request': '/modules/common/static/api/request.js',
    '#/composables': '/modules/common/static/composables/index.js',
    '#/components/common': '/modules/common/static/components/index.js',
    '#/locales': '/modules/common/static/locales/index.js',
    '#/utils/chart-export': '/modules/common/static/utils/chart-export.js',
    '#/utils/formatters': '/modules/common/static/utils/formatters.js',
    '#/store': '/modules/common/static/store/index.js',
    '#/store/permission': '/modules/common/static/store/permission.js',
    '#/css/common': '/modules/common/static/css/common.css',
  };

  if (commonMappings[importPath]) {
    return commonMappings[importPath];
  }

  // Handle API imports - resolve to module's own api folder
  const apiPatterns = [
    /^#\/api\/core\/(.+)$/,
    /^#\/api\/hrms\/(.+)$/,
    /^#\/api\/(.+)$/,
  ];

  for (const pattern of apiPatterns) {
    const match = importPath.match(pattern);
    if (match) {
      const moduleName = match[1];
      return `/modules/${moduleName}/static/api/index.js`;
    }
  }

  // Handle relative common imports
  if (importPath.startsWith('#/composables/')) {
    const name = importPath.replace('#/composables/', '');
    return `/modules/common/static/composables/${name}.js`;
  }

  if (importPath.startsWith('#/components/common/')) {
    const name = importPath.replace('#/components/common/', '');
    return `/modules/common/static/components/${name}.js`;
  }

  // Handle #/utils/* imports
  if (importPath.startsWith('#/utils/')) {
    const name = importPath.replace('#/utils/', '');
    return `/modules/common/static/utils/${name}.js`;
  }

  // Handle #/css/* imports
  if (importPath.startsWith('#/css/')) {
    const parts = importPath.replace('#/css/', '').split('/');
    if (parts.length === 1) {
      return `/modules/${parts[0]}/static/css/index.css`;
    }
    return `/modules/${parts[0]}/static/css/${parts.slice(1).join('/')}.css`;
  }

  return null;
}

// Base NPM package cache - these should never be cleared
const npmPackageCache = {
  vue: Vue,
  'vue-router': { useRoute, useRouter },
  'ant-design-vue': AntDesignVue,
  '@ant-design/icons-vue': AntDesignIcons,
  '@vben/common-ui': VbenCommonUI,
  dayjs: dayjs,
  'dayjs/plugin/relativeTime': relativeTime,
  'dayjs/plugin/duration': duration,
  echarts: echarts,
  'vue-echarts': VueEcharts,
};

// Function to create a fresh moduleCache for vue3-sfc-loader
function createFreshModuleCache() {
  return { ...npmPackageCache };
}

// Options for vue3-sfc-loader
const sfcLoaderOptions = {
  moduleCache: createFreshModuleCache(),

  // Handle Babel parser plugins for ES module support
  // TypeScript support for .vue files with lang="ts"
  additionalBabelParserPlugins: ['typescript', 'importMeta', 'topLevelAwait'],

  // Resolve module paths
  pathResolve({ refPath, relPath }: { refPath: string; relPath: string }) {
    // Handle #/ imports
    if (relPath.startsWith('#/')) {
      return relPath;
    }
    // Handle relative paths
    if (relPath.startsWith('./') || relPath.startsWith('../')) {
      // If refPath is a #/ import, resolve relative to the actual backend path
      if (refPath.startsWith('#/')) {
        const backendPath = resolveImportPath(refPath);
        if (backendPath) {
          const base = backendPath.substring(0, backendPath.lastIndexOf('/'));
          return `${base}/${relPath}`.replace(/\/\.\//g, '/');
        }
      }
      const base = refPath.substring(0, refPath.lastIndexOf('/'));
      return `${base}/${relPath}`;
    }
    // NPM packages - return as-is for moduleCache lookup
    return relPath;
  },

  async getFile(url: string) {
    // Check cache first
    if (moduleCache[url]) {
      return moduleCache[url];
    }

    // Handle #/ imports - resolve to backend paths
    if (url.startsWith('#/')) {
      const backendPath = resolveImportPath(url);
      if (backendPath) {
        try {
          // Always bypass browser cache for module JS files
          // These are served from backend and can change on deployment
          const response = await fetch(backendPath, { cache: 'no-store' });
          if (response.ok) {
            const content = await response.text();
            // Return proper format for ES modules (.mjs)
            const result = {
              type: '.mjs',
              getContentData: (asBinary: boolean) => asBinary ? new TextEncoder().encode(content) : content,
            };
            // Cache the resolved content but it can be cleared via clearCacheForPath
            moduleCache[url] = result;
            return result;
          }
        } catch (e) {
          console.warn(`Failed to fetch ${backendPath} for ${url}`);
        }
      }
      throw new Error(`Unable to resolve: ${url}. Ensure the module exports are available at the backend.`);
    }

    // Always bypass browser cache for module files (served from backend, can change on deploy)
    const fetchOptions: RequestInit = (url.endsWith('.vue') || url.endsWith('.js') || url.endsWith('.mjs'))
      ? { cache: 'no-store' }
      : {};

    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const content = await response.text();

    // Determine file type from URL - use .mjs for ES modules
    if (url.endsWith('.js') || url.endsWith('.mjs')) {
      const result = {
        type: '.mjs',
        getContentData: (asBinary: boolean) => asBinary ? new TextEncoder().encode(content) : content,
      };
      moduleCache[url] = result;
      return result;
    }

    // Default: return content as-is (for .vue files)
    // Don't cache .vue files to allow hot reloading during development
    if (!url.endsWith('.vue')) {
      moduleCache[url] = content;
    }
    return content;
  },

  addStyle(textContent: string) {
    const style = Object.assign(document.createElement('style'), { textContent });
    const ref = document.head.getElementsByTagName('style')[0] || null;
    document.head.insertBefore(style, ref);
  },

  log(type: string, ...args: any[]) {
    console[type as 'log' | 'warn' | 'error']?.(...args);
  },
};

// Load companion CSS file for a view (silently skips if not found)
async function loadCompanionCSS(url: string) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) {
      const cssText = await response.text();
      if (cssText.trim()) {
        const style = document.createElement('style');
        style.setAttribute('data-module-css', url);
        style.textContent = cssText;
        document.head.appendChild(style);
        injectedStyles.push(style);
      }
    }
  } catch {
    // CSS file is optional - silently ignore failures
  }
}

// Load the common module CSS (shared utilities)
let commonCSSLoaded = false;
async function loadCommonCSS() {
  if (commonCSSLoaded) return;
  try {
    const response = await fetch('/modules/common/static/css/common.css', { cache: 'no-store' });
    if (response.ok) {
      const cssText = await response.text();
      if (cssText.trim()) {
        const existing = document.querySelector('style[data-module-css="common"]');
        if (!existing) {
          const style = document.createElement('style');
          style.setAttribute('data-module-css', 'common');
          style.textContent = cssText;
          document.head.appendChild(style);
        }
      }
    }
  } catch {
    // Common CSS is optional
  }
  commonCSSLoaded = true;
}

// Remove previously injected view-specific styles
function cleanupInjectedStyles() {
  injectedStyles.forEach(style => {
    if (style.parentNode) {
      style.parentNode.removeChild(style);
    }
  });
  injectedStyles.length = 0;
}

// View extensions map cache (fetched once from backend)
let viewExtensionsMap: Record<string, Array<{module: string, path: string}>> | null = null;

async function fetchViewExtensionsMap(): Promise<Record<string, Array<{module: string, path: string}>>> {
  if (viewExtensionsMap !== null) return viewExtensionsMap;
  try {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const resp = await fetch('/api/v1/modules/views/extensions', { headers });
    viewExtensionsMap = resp.ok ? await resp.json() : {};
  } catch {
    viewExtensionsMap = {};
  }
  return viewExtensionsMap!;
}

// Load the component
async function loadView() {
  loading.value = true;
  error.value = null;

  try {
    // Cleanup previously injected view-specific CSS
    cleanupInjectedStyles();

    // Clear ALL cached files to ensure fresh code on every load
    // This is critical for development - ensures latest backend code is used
    Object.keys(moduleCache).forEach(key => delete moduleCache[key]);

    // CRITICAL: Reset the sfcLoaderOptions.moduleCache to a fresh state
    // This forces vue3-sfc-loader to re-compile everything
    // We preserve NPM packages but clear all dynamically loaded modules
    sfcLoaderOptions.moduleCache = createFreshModuleCache();

    // Check if this view has any extensions from other modules
    const viewKey = `${props.moduleName}.${props.viewName}`;
    const extMap = await fetchViewExtensionsMap();
    const extensions = extMap[viewKey];
    const hasExtensions = extensions && extensions.length > 0;

    let loaderOptions = sfcLoaderOptions;

    if (hasExtensions) {
      // Fetch the base SFC text first
      const sfcResponse = await fetch(viewUrl.value, { cache: 'no-store' });
      if (!sfcResponse.ok) {
        throw new Error(`Failed to fetch view: ${sfcResponse.status} ${sfcResponse.statusText}`);
      }
      let sfcText = await sfcResponse.text();

      // Fetch all extension spec JSON files in parallel
      const extSpecs = await Promise.all(
        extensions.map(async (ext: {module: string, path: string}) => {
          try {
            const resp = await fetch(ext.path, fetchOpts);
            if (!resp.ok) {
              console.warn(`[ModuleView] Extension not found: ${ext.path} (${resp.status})`);
              return null;
            }
            return await resp.json() as ViewExtensionSpec;
          } catch (e) {
            console.warn(`[ModuleView] Failed to load view extension from ${ext.path}:`, e);
            return null;
          }
        })
      );

      // Apply non-null extension specs (pure string transformation)
      const validSpecs = extSpecs.filter((s): s is ViewExtensionSpec => s !== null);
      if (validSpecs.length > 0) {
        sfcText = applyViewExtensions(sfcText, validSpecs);
      }

      // Override getFile to return transformed SFC text for the main view URL
      loaderOptions = {
        ...sfcLoaderOptions,
        async getFile(url: string) {
          if (url === viewUrl.value) {
            return sfcText;
          }
          return sfcLoaderOptions.getFile(url);
        },
      };
    }

    // Load common CSS utilities and companion CSS in parallel with the component
    const [component] = await Promise.all([
      loadModule(viewUrl.value, loaderOptions),
      loadCommonCSS(),
      loadCompanionCSS(cssUrl.value),
    ]);
    loadedComponent.value = markRaw(component);
  } catch (err: any) {
    console.error('Failed to load module view:', err);
    error.value = err.message || 'Failed to load view';
    loadedComponent.value = null;
  } finally {
    loading.value = false;
  }
}

// Watch for prop changes and reload
watch(
  () => [props.moduleName, props.viewName],
  () => {
    loadView();
  },
  { immediate: true }
);

// Create the dynamic component
const DynamicComponent = computed(() => {
  if (loadedComponent.value) {
    return loadedComponent.value;
  }
  return null;
});
</script>

<template>
  <div class="module-view-container">
    <!-- Loading state -->
    <div v-if="loading" class="module-view-loading">
      <Spin size="large" tip="Loading module view..." />
    </div>

    <!-- Error state -->
    <Result
      v-else-if="error"
      status="error"
      title="Failed to Load View"
      :sub-title="error"
    >
      <template #extra>
        <Button type="primary" @click="loadView">Retry</Button>
      </template>
    </Result>

    <!-- Loaded component -->
    <component
      v-else-if="DynamicComponent"
      :is="DynamicComponent"
      v-bind="$attrs"
    />
  </div>
</template>

<style scoped>
.module-view-container {
  min-height: 200px;
}

.module-view-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}
</style>
