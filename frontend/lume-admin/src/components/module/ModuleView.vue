<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { defineAsyncComponent } from 'vue'
import { loadModule } from 'vue3-sfc-loader'
import axios from 'axios'
import * as Vue from 'vue'
import * as VueRouter from 'vue-router'
import Antd from 'ant-design-vue'
import * as LucideVueNext from 'lucide-vue-next'
import dayjs from 'dayjs'

interface Props {
  moduleName: string
  viewName: string
}

const props = defineProps<Props>()

const loading = ref(true)
const error = ref<string | null>(null)
const DynamicComponent = ref<any>(null)

const fileCache = new Map<string, string>()

const sfcLoaderOptions = {
  moduleCache: {
    vue: Vue,
    'vue-router': VueRouter,
    'ant-design-vue': Antd,
    'lucide-vue-next': LucideVueNext,
    axios,
    dayjs
  },
  getFile: async (url: string) => {
    if (fileCache.has(url)) {
      return fileCache.get(url) || ''
    }
    try {
      const response = await axios.get(url)
      fileCache.set(url, response.data)
      return response.data
    } catch (err) {
      throw new Error(`Failed to load ${url}: ${err}`)
    }
  },
  addStyle: (css: string) => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
  },
  pathResolve: (id: string, parent?: string): string => {
    // Map #/api/request to the backend static module request file
    if (id === '#/api/request') {
      return `/modules/common/static/api/request.js`
    }
    // Handle relative imports within the same module
    if (id.startsWith('./') || id.startsWith('../')) {
      const basePath = parent?.split('?')[0] || ''
      const baseDir = basePath.substring(0, basePath.lastIndexOf('/'))
      return new URL(id, baseDir + '/').href
    }
    // Return as-is for npm packages and absolute paths
    return id
  }
}

onMounted(async () => {
  try {
    const viewUrl = `/modules/${props.moduleName}/static/views/${props.viewName}.vue`
    const moduleSource = await sfcLoaderOptions.getFile(viewUrl)
    const module = await loadModule(
      viewUrl,
      { ...sfcLoaderOptions },
      moduleSource
    )
    DynamicComponent.value = module.default
  } catch (err: any) {
    error.value = err.message || 'Failed to load module view'
    console.error('ModuleView error:', error.value, err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="module-view">
    <a-spin v-if="loading" size="large" />
    <a-result
      v-else-if="error"
      status="error"
      title="Failed to Load View"
      :sub-title="error"
    >
      <template #extra>
        <a-button type="primary" @click="$router.back">Go Back</a-button>
      </template>
    </a-result>
    <component v-else :is="DynamicComponent" />
  </div>
</template>

<style scoped>
.module-view {
  width: 100%;
  height: 100%;
}
</style>
