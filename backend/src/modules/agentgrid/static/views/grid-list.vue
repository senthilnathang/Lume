<template>
  <div class="grid-list">
    <div class="list-header">
      <h2>Agent Grids</h2>
      <a-button type="primary" @click="showCreateModal = true">
        Create Grid
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <a-table
        v-if="grids.length > 0"
        :columns="columns"
        :data-source="grids"
        :pagination="{ pageSize: 10 }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="editGrid(record)">
                Edit
              </a-button>
              <a-button type="link" danger size="small" @click="deleteGrid(record)">
                Delete
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>

      <a-empty v-else description="No grids found" />
    </a-spin>

    <a-modal
      v-model:visible="showCreateModal"
      title="Create Grid"
      @ok="handleSave"
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="Name" name="name">
          <a-input v-model:value="form.name" placeholder="Grid name" />
        </a-form-item>

        <a-form-item label="Description" name="description">
          <a-textarea v-model:value="form.description" placeholder="Grid description" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { get, post, put, del } from '#/api/request'

const grids = ref<any[]>([])
const loading = ref(false)
const showCreateModal = ref(false)
const editingId = ref<number | null>(null)

const form = ref({
  name: '',
  description: ''
})

const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description'
  },
  {
    title: 'Actions',
    key: 'action',
    width: 120
  }
]

const fetchGrids = async () => {
  loading.value = true
  try {
    const data = await get('/agentgrid/grids')
    grids.value = data || []
  } catch (err) {
    console.error('Failed to load grids:', err)
    message.error('Failed to load grids')
  } finally {
    loading.value = false
  }
}

const editGrid = (grid: any) => {
  editingId.value = grid.id
  form.value = { ...grid }
  showCreateModal.value = true
}

const deleteGrid = async (grid: any) => {
  try {
    await del(`/agentgrid/grids/${grid.id}`)
    message.success('Grid deleted')
    fetchGrids()
  } catch (err) {
    message.error('Failed to delete grid')
  }
}

const handleSave = async () => {
  try {
    if (editingId.value) {
      await put(`/agentgrid/grids/${editingId.value}`, form.value)
      message.success('Grid updated')
    } else {
      await post('/agentgrid/grids', form.value)
      message.success('Grid created')
    }
    showCreateModal.value = false
    form.value = { name: '', description: '' }
    editingId.value = null
    fetchGrids()
  } catch (err) {
    message.error('Failed to save grid')
  }
}

onMounted(() => {
  fetchGrids()
})
</script>

<style scoped>
.grid-list {
  padding: 24px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.list-header h2 {
  margin: 0;
}
</style>
