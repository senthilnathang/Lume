<template>
  <div class="page">
    <div class="header">
      <h1>Record Rules</h1>
      <a-button type="primary">Create Rule</a-button>
    </div>
    <a-spin :spinning="loading">
      <a-table :columns="columns" :data-source="data" size="small">
        <template #bodyCell="{ column }">
          <a-button v-if="column.key === 'action'" type="link" size="small">Edit</a-button>
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
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Model', dataIndex: 'model', key: 'model' },
  { title: 'Actions', key: 'action', width: 100 }
]
const fetch = async () => {
  loading.value = true
  try {
    data.value = await get('/record-rules')
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
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header h1 { margin: 0; }
</style>
