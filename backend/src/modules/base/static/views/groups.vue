<template>
  <div class="groups-page">
    <div class="page-header">
      <div>
        <h1>Groups</h1>
        <p class="subtitle">Manage user groups for bulk permission assignment</p>
      </div>
      <a-button type="primary" @click="showCreateModal = true">
        Create Group
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <a-table
        :columns="columns"
        :data-source="groups"
        :pagination="{ pageSize: 10 }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'member_count'">
            <a-tag color="blue">{{ record.member_count || 0 }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="editGroup(record)">
                Edit
              </a-button>
              <a-button type="link" danger size="small" @click="deleteGroup(record)">
                Delete
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-spin>

    <a-modal
      v-model:visible="showCreateModal"
      :title="editingId ? 'Edit Group' : 'Create Group'"
      @ok="handleSave"
      :ok-loading="saving"
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="Name" required>
          <a-input v-model:value="form.name" placeholder="Group name" />
        </a-form-item>

        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Group description" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { get, post, put, del } from '#/api/request'

const groups = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
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
    title: 'Members',
    key: 'member_count'
  },
  {
    title: 'Actions',
    key: 'action',
    width: 150
  }
]

const fetchGroups = async () => {
  loading.value = true
  try {
    const data = await get('/groups')
    groups.value = data || []
  } catch (err) {
    message.error('Failed to load groups')
  } finally {
    loading.value = false
  }
}

const editGroup = (group: any) => {
  editingId.value = group.id
  form.value = {
    name: group.name,
    description: group.description || ''
  }
  showCreateModal.value = true
}

const deleteGroup = async (group: any) => {
  try {
    await del(`/groups/${group.id}`)
    message.success('Group deleted')
    fetchGroups()
  } catch (err) {
    message.error('Failed to delete group')
  }
}

const handleSave = async () => {
  if (!form.value.name) {
    message.error('Group name is required')
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await put(`/groups/${editingId.value}`, form.value)
      message.success('Group updated')
    } else {
      await post('/groups', form.value)
      message.success('Group created')
    }
    showCreateModal.value = false
    form.value = { name: '', description: '' }
    editingId.value = null
    fetchGroups()
  } catch (err) {
    message.error('Failed to save group')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchGroups()
})
</script>

<style scoped>
.groups-page {
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
