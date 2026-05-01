<template>
  <div class="workflow-list-page">
    <div class="page-header">
      <div>
        <h1>Workflows</h1>
        <p class="subtitle">Visual workflow designer and execution</p>
      </div>
      <a-button type="primary" @click="showCreateModal = true">
        New Workflow
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <a-table
        :columns="columns"
        :data-source="workflows"
        :pagination="{ pageSize: 10 }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'active' ? 'green' : 'default'">
              {{ record.status }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="editWorkflow(record)">
                Edit
              </a-button>
              <a-button type="link" danger size="small" @click="deleteWorkflow(record)">
                Delete
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-spin>

    <a-modal
      v-model:visible="showCreateModal"
      title="Create Workflow"
      @ok="handleCreate"
      :ok-loading="creating"
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="Name" required>
          <a-input v-model:value="form.name" placeholder="Workflow name" />
        </a-form-item>

        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Workflow description" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { get, post, put, del } from '#/api/request'

const workflows = ref<any[]>([])
const loading = ref(false)
const creating = ref(false)
const showCreateModal = ref(false)

const form = ref({
  name: '',
  description: ''
})

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Description', dataIndex: 'description', key: 'description' },
  { title: 'Status', key: 'status' },
  { title: 'Created', dataIndex: 'createdAt', key: 'createdAt' },
  { title: 'Actions', key: 'action', width: 150 }
]

const fetchWorkflows = async () => {
  loading.value = true
  try {
    const data = await get('/flowgrid/workflows')
    workflows.value = data || []
  } catch (err) {
    message.error('Failed to load workflows')
  } finally {
    loading.value = false
  }
}

const editWorkflow = (workflow: any) => {
  form.value = { name: workflow.name, description: workflow.description }
  showCreateModal.value = true
}

const deleteWorkflow = async (workflow: any) => {
  try {
    await del(`/flowgrid/workflows/${workflow.id}`)
    message.success('Workflow deleted')
    fetchWorkflows()
  } catch (err) {
    message.error('Failed to delete workflow')
  }
}

const handleCreate = async () => {
  if (!form.value.name) {
    message.error('Workflow name is required')
    return
  }

  creating.value = true
  try {
    await post('/flowgrid/workflows', form.value)
    message.success('Workflow created')
    showCreateModal.value = false
    form.value = { name: '', description: '' }
    fetchWorkflows()
  } catch (err) {
    message.error('Failed to create workflow')
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  fetchWorkflows()
})
</script>

<style scoped>
.workflow-list-page {
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
</style>
