<template>
  <div class="menus-page">
    <div class="page-header">
      <h1>Menus</h1>
      <p class="subtitle">Manage navigation menus</p>
    </div>

    <a-spin :spinning="loading">
      <a-table
        :columns="columns"
        :data-source="menus"
        :pagination="{ pageSize: 10 }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'items'">
            <a-tag color="blue">{{ record.items?.length || 0 }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="editMenu(record)">
                Edit
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-spin>

    <a-modal
      v-model:visible="showEditModal"
      title="Edit Menu"
      @ok="handleSave"
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="Name">
          <a-input v-model:value="form.name" :disabled="true" />
        </a-form-item>
        <a-form-item label="Items Count">
          <span>{{ form.items?.length || 0 }}</span>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { get } from '#/api/request'

const menus = ref<any[]>([])
const loading = ref(false)
const showEditModal = ref(false)

const form = ref({
  name: '',
  items: []
})

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Items', key: 'items' },
  { title: 'Actions', key: 'action', width: 120 }
]

const fetchMenus = async () => {
  loading.value = true
  try {
    const data = await get('/menus')
    menus.value = data || []
  } catch (err) {
    message.error('Failed to load menus')
  } finally {
    loading.value = false
  }
}

const editMenu = (menu: any) => {
  form.value = { ...menu }
  showEditModal.value = true
}

const handleSave = () => {
  showEditModal.value = false
  message.success('Menu updated')
}

onMounted(() => {
  fetchMenus()
})
</script>

<style scoped>
.menus-page { padding: 24px; }
.page-header h1 { margin: 0 0 8px 0; font-size: 24px; }
.subtitle { margin: 0; color: #666; font-size: 14px; }
</style>
