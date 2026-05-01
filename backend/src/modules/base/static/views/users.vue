<template>
  <div class="users-page">
    <div class="page-header">
      <div>
        <h1>Users</h1>
        <p class="subtitle">Manage system users and their permissions</p>
      </div>
      <a-button type="primary" @click="showCreateModal = true">
        Create User
      </a-button>
    </div>

    <div class="filters">
      <a-input-search
        v-model:value="searchText"
        placeholder="Search users by email or name..."
        @search="fetchUsers"
        style="width: 300px"
      />
    </div>

    <a-spin :spinning="loading">
      <a-table
        :columns="columns"
        :data-source="users"
        :pagination="{ pageSize: 10, total: total }"
        :loading="loading"
        @change="handleTableChange"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'role'">
            <a-tag :color="getRoleColor(record.role)">{{ record.role }}</a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.active ? 'green' : 'red'">
              {{ record.active ? 'Active' : 'Inactive' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="editUser(record)">
                Edit
              </a-button>
              <a-button type="link" danger size="small" @click="deleteUser(record)">
                Delete
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-spin>

    <a-modal
      v-model:visible="showCreateModal"
      :title="editingId ? 'Edit User' : 'Create User'"
      @ok="handleSave"
      :ok-loading="saving"
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="Email" required>
          <a-input v-model:value="form.email" placeholder="user@example.com" />
        </a-form-item>

        <a-form-item label="First Name">
          <a-input v-model:value="form.first_name" placeholder="John" />
        </a-form-item>

        <a-form-item label="Last Name">
          <a-input v-model:value="form.last_name" placeholder="Doe" />
        </a-form-item>

        <a-form-item label="Role" required>
          <a-select v-model:value="form.role" placeholder="Select role">
            <a-select-option value="admin">Admin</a-select-option>
            <a-select-option value="user">User</a-select-option>
            <a-select-option value="guest">Guest</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Active">
          <a-checkbox v-model:checked="form.active">User is active</a-checkbox>
        </a-form-item>

        <a-form-item v-if="!editingId" label="Password" required>
          <a-input-password v-model:value="form.password" placeholder="Enter password" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { get, post, put, del } from '#/api/request'

const users = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const showCreateModal = ref(false)
const editingId = ref<number | null>(null)
const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const form = ref({
  email: '',
  first_name: '',
  last_name: '',
  role: 'user',
  active: true,
  password: ''
})

const columns = [
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    width: 200
  },
  {
    title: 'Name',
    key: 'name',
    render: (_, record: any) => `${record.first_name || ''} ${record.last_name || ''}`.trim()
  },
  {
    title: 'Role',
    dataIndex: 'role',
    key: 'role',
    width: 100
  },
  {
    title: 'Status',
    dataIndex: 'active',
    key: 'status',
    width: 100
  },
  {
    title: 'Actions',
    key: 'action',
    width: 150
  }
]

const getRoleColor = (role: string) => {
  const colors: any = {
    admin: 'red',
    user: 'blue',
    guest: 'default'
  }
  return colors[role] || 'default'
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchText.value
    }
    const response = await get('/users', { params })
    users.value = response.data || []
    total.value = response.total || 0
  } catch (err) {
    console.error('Failed to load users:', err)
    message.error('Failed to load users')
  } finally {
    loading.value = false
  }
}

const editUser = (user: any) => {
  editingId.value = user.id
  form.value = {
    email: user.email,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    role: user.role || 'user',
    active: user.active !== false,
    password: ''
  }
  showCreateModal.value = true
}

const deleteUser = async (user: any) => {
  if (user.id === 1) {
    message.error('Cannot delete admin user')
    return
  }

  const confirmed = await new Promise(resolve => {
    const modal = message.loading('Confirm delete?')
  })

  try {
    await del(`/users/${user.id}`)
    message.success('User deleted')
    fetchUsers()
  } catch (err) {
    message.error('Failed to delete user')
  }
}

const handleSave = async () => {
  if (!form.value.email) {
    message.error('Email is required')
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await put(`/users/${editingId.value}`, form.value)
      message.success('User updated')
    } else {
      if (!form.value.password) {
        message.error('Password is required for new users')
        saving.value = false
        return
      }
      await post('/users', form.value)
      message.success('User created')
    }
    showCreateModal.value = false
    form.value = {
      email: '',
      first_name: '',
      last_name: '',
      role: 'user',
      active: true,
      password: ''
    }
    editingId.value = null
    fetchUsers()
  } catch (err: any) {
    message.error(err?.message || 'Failed to save user')
  } finally {
    saving.value = false
  }
}

const handleTableChange = (pagination: any) => {
  currentPage.value = pagination.current
  pageSize.value = pagination.pageSize
  fetchUsers()
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.users-page {
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

.filters {
  margin-bottom: 24px;
}
</style>
