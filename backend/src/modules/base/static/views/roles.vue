<template>
  <div class="roles-page">
    <div class="page-header">
      <div>
        <h1>Roles</h1>
        <p class="subtitle">Manage system roles and permissions</p>
      </div>
      <a-button type="primary" @click="showCreateModal = true">
        Create Role
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <a-table
        :columns="columns"
        :data-source="roles"
        :pagination="{ pageSize: 10 }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'permissions'">
            <a-tag v-for="perm in (record.permissions || []).slice(0, 3)" :key="perm">
              {{ perm }}
            </a-tag>
            <a-tag v-if="(record.permissions || []).length > 3">
              +{{ (record.permissions || []).length - 3 }} more
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="editRole(record)">
                Edit
              </a-button>
              <a-button type="link" danger size="small" @click="deleteRole(record)">
                Delete
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-spin>

    <a-modal
      v-model:visible="showCreateModal"
      :title="editingId ? 'Edit Role' : 'Create Role'"
      @ok="handleSave"
      :ok-loading="saving"
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="Name" required>
          <a-input v-model:value="form.name" placeholder="Role name" />
        </a-form-item>

        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Role description" />
        </a-form-item>

        <a-form-item label="Permissions">
          <a-select
            v-model:value="form.permissions"
            mode="multiple"
            placeholder="Select permissions"
            :options="availablePermissions.map(p => ({ label: p, value: p }))"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { get, post, put, del } from '#/api/request'

const roles = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const showCreateModal = ref(false)
const editingId = ref<number | null>(null)
const availablePermissions = ref<string[]>([])

const form = ref({
  name: '',
  description: '',
  permissions: []
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
    title: 'Permissions',
    key: 'permissions'
  },
  {
    title: 'Actions',
    key: 'action',
    width: 150
  }
]

const fetchRoles = async () => {
  loading.value = true
  try {
    const data = await get('/roles')
    roles.value = data || []
  } catch (err) {
    message.error('Failed to load roles')
  } finally {
    loading.value = false
  }
}

const fetchPermissions = async () => {
  try {
    const data = await get('/permissions')
    availablePermissions.value = (data || []).map((p: any) => p.code)
  } catch (err) {
    console.error('Failed to load permissions:', err)
  }
}

const editRole = (role: any) => {
  editingId.value = role.id
  form.value = {
    name: role.name,
    description: role.description || '',
    permissions: (role.permissions || []).map((p: any) => p.code || p)
  }
  showCreateModal.value = true
}

const deleteRole = async (role: any) => {
  try {
    await del(`/roles/${role.id}`)
    message.success('Role deleted')
    fetchRoles()
  } catch (err) {
    message.error('Failed to delete role')
  }
}

const handleSave = async () => {
  if (!form.value.name) {
    message.error('Role name is required')
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await put(`/roles/${editingId.value}`, form.value)
      message.success('Role updated')
    } else {
      await post('/roles', form.value)
      message.success('Role created')
    }
    showCreateModal.value = false
    form.value = { name: '', description: '', permissions: [] }
    editingId.value = null
    fetchRoles()
  } catch (err) {
    message.error('Failed to save role')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchRoles()
  fetchPermissions()
})
</script>

<style scoped>
.roles-page {
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
