<template>
  <div class="page">
    <div class="header">
      <h1>System Settings</h1>
      <p class="subtitle">Configure system-wide settings</p>
    </div>
    <a-spin :spinning="loading">
      <div class="settings-grid">
        <a-card v-for="setting in settings" :key="setting.key" class="setting-card">
          <template #title>{{ setting.label }}</template>
          <p class="desc">{{ setting.description }}</p>
          <div class="value">
            <strong>{{ setting.value }}</strong>
          </div>
        </a-card>
      </div>
    </a-spin>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { get } from '#/api/request'
const loading = ref(false)
const settings = ref([])
const fetch = async () => {
  loading.value = true
  try {
    settings.value = await get('/settings')
  } catch (err) {
    message.error('Failed to load')
  } finally {
    loading.value = false
  }
}
onMounted(() => fetch())
</script>
<style scoped>
.page { padding: 24px; }
.header { margin-bottom: 24px; }
.header h1 { margin: 0 0 8px 0; font-size: 24px; }
.subtitle { margin: 0; color: #666; font-size: 14px; }
.settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.desc { margin: 8px 0; color: #666; font-size: 12px; }
.value { margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
</style>
