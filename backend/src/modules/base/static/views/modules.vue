<template>
  <div class="modules-page">
    <div class="page-header">
      <div>
        <h1>Modules</h1>
        <p class="subtitle">View and manage installed modules</p>
      </div>
    </div>

    <a-spin :spinning="loading">
      <div class="modules-grid">
        <a-card
          v-for="module in modules"
          :key="module.technicalName"
          class="module-card"
        >
          <template #title>
            <div class="module-title">
              {{ module.name }}
              <a-tag
                :color="module.installed ? 'green' : 'default'"
                class="ml-8"
              >
                {{ module.installed ? 'Installed' : 'Available' }}
              </a-tag>
            </div>
          </template>

          <p class="module-desc">{{ module.description || module.summary }}</p>

          <div class="module-meta">
            <div class="meta-item">
              <span class="label">Version:</span>
              <span>{{ module.version }}</span>
            </div>
            <div class="meta-item">
              <span class="label">Category:</span>
              <span>{{ module.category || 'General' }}</span>
            </div>
          </div>

          <template #actions>
            <a-button
              v-if="module.installed"
              type="link"
              danger
              @click="uninstallModule(module)"
            >
              Uninstall
            </a-button>
            <a-button
              v-else
              type="link"
              @click="installModule(module)"
            >
              Install
            </a-button>
          </template>
        </a-card>
      </div>

      <a-empty v-if="modules.length === 0" description="No modules found" />
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { get, post } from '#/api/request'

const modules = ref<any[]>([])
const loading = ref(false)

const fetchModules = async () => {
  loading.value = true
  try {
    const data = await get('/modules')
    modules.value = data || []
  } catch (err) {
    message.error('Failed to load modules')
  } finally {
    loading.value = false
  }
}

const installModule = async (module: any) => {
  loading.value = true
  try {
    await post(`/modules/${module.technicalName}/install`, {})
    message.success(`Module ${module.name} installed`)
    fetchModules()
  } catch (err) {
    message.error(`Failed to install ${module.name}`)
  } finally {
    loading.value = false
  }
}

const uninstallModule = async (module: any) => {
  if (module.technicalName === 'base') {
    message.error('Cannot uninstall base module')
    return
  }

  loading.value = true
  try {
    await post(`/modules/${module.technicalName}/uninstall`, {})
    message.success(`Module ${module.name} uninstalled`)
    fetchModules()
  } catch (err) {
    message.error(`Failed to uninstall ${module.name}`)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchModules()
})
</script>

<style scoped>
.modules-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.module-card {
  cursor: default;
}

.module-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ml-8 {
  margin-left: 8px;
}

.module-desc {
  color: #666;
  font-size: 13px;
  margin: 12px 0;
  line-height: 1.5;
}

.module-meta {
  margin: 12px 0;
  padding: 12px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  margin: 6px 0;
  font-size: 12px;
}

.label {
  color: #999;
  margin-right: 8px;
}
</style>
