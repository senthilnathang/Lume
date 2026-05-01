<template>
  <div class="page">
    <div class="header">
      <h1>Sequences</h1>
    </div>
    <a-spin :spinning="loading">
      <a-table :columns="columns" :data-source="data" size="small">
        <template #bodyCell="{ column, record }">
          <span v-if="column.key === 'next'">{{ record.prefix }}{{ String(record.nextNumber).padStart(record.padding, '0') }}{{ record.suffix }}</span>
        </template>
      </a-table>
    </a-spin>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { get } from '#/api/request'
const loading = ref(false)
const data = ref([])
const columns = [
  { title: 'Code', dataIndex: 'code', key: 'code' },
  { title: 'Prefix', dataIndex: 'prefix', key: 'prefix' },
  { title: 'Padding', dataIndex: 'padding', key: 'padding' },
  { title: 'Next Value', key: 'next' }
]
const fetch = async () => {
  loading.value = true
  try {
    data.value = await get('/sequences')
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
.header h1 { margin: 0; }
</style>
