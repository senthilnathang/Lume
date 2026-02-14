<template>
  <div class="dynamic-view-loader">
    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
      <p>Loading view...</p>
    </div>
    <div v-else-if="error" class="error-container">
      <a-result status="error" :title="errorTitle" :sub-title="error">
        <template #extra>
          <a-button type="primary" @click="retry">Retry</a-button>
        </template>
      </a-result>
    </div>
    <component v-else :is="dynamicComponent" v-bind="componentProps" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, shallowRef, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';
import { message } from 'ant-design-vue';

const props = defineProps<{
  moduleName?: string;
  viewName?: string;
}>();

const route = useRoute();
const loading = ref(true);
const error = ref<string | null>(null);
const errorTitle = ref('Failed to load view');
const dynamicComponent = shallowRef(null);
const componentProps = ref({});

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const loadView = async () => {
  loading.value = true;
  error.value = null;

  try {
    const module = props.moduleName || route.params.module || route.path.split('/')[1];
    const view = props.viewName || route.params.view || 'list';
    
    // Try multiple possible view paths
    const possiblePaths = [
      `/modules/${module}/static/views/${view}.vue`,
      `/modules/${module}/static/views/index.vue`,
      `/modules/${module}/static/views/${view}.js`,
    ];

    let loadedComponent = null;
    let loadedPath = '';

    for (const viewPath of possiblePaths) {
      try {
        const response = await fetch(viewPath);
        if (response.ok) {
          loadedPath = viewPath;
          const vueContent = await response.text();
          
          // Use vue3-sfc-loader to compile the component
          const options = {
            moduleCache: {
              vue: Vue,
            },
            async getFile(url: string) {
              const res = await fetch(url);
              if (!res.ok) throw new Error(`Failed to load ${url}`);
              return {
                getContentData: (asBinary: boolean) => asBinary ? res.arrayBuffer() : res.text(),
              };
            },
            handleModule: (mod: any, node) => {
              // Handle common imports
              if (node.src?.includes('@vben/common-ui')) {
                // Skip or provide mock
              }
              if (node.src?.includes('ant-design-vue')) {
                // Skip or provide mock
              }
              if (node.src?.includes('@ant-design/icons-vue')) {
                // Skip or provide mock
              }
            },
          };
          
          // Try to parse and register the component
          const { parse, register } = await import('vue3-sfc-loader');
          const compiled = parse(vueContent, loadedPath);
          
          loadedComponent = defineAsyncComponent({
            loader: async () => {
              const { _resolveTemplate } = await import('vue3-sfc-loader');
              // Simple fallback - just return a basic component
              return Promise.resolve({
                name: 'DynamicView',
                template: vueContent,
              });
            },
            loadingComponent: { template: '<div>Loading...</div>' },
            errorComponent: { template: '<div>Error loading component</div>' },
          });
          
          break;
        }
      } catch (e) {
        console.warn(`Failed to load ${viewPath}:`, e);
        continue;
      }
    }

    if (!loadedComponent) {
      // Fallback: try to load from API-based ModuleView
      throw new Error(`View not found for ${module}/${view}`);
    }

    dynamicComponent.value = loadedComponent;
    loading.value = false;
  } catch (e: any) {
    console.error('Failed to load dynamic view:', e);
    error.value = e.message || 'Failed to load view. Please check if the view exists.';
    errorTitle.value = 'View Not Found';
    loading.value = false;
  }
};

const retry = () => {
  loadView();
};

onMounted(() => {
  loadView();
});

// Watch for route changes
import { watch } from 'vue';
watch(() => route.path, () => {
  loadView();
});
</script>

<style scoped>
.dynamic-view-loader {
  min-height: 100%;
  padding: 24px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.loading-container p {
  margin-top: 16px;
  color: #666;
}
</style>
