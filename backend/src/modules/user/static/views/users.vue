<script lang="ts" setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  Users,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Edit3,
  Trash2,
  Key,
  AlertTriangle,
  MoreVertical,
} from 'lucide-vue-next';

import {
  getUsers,
  getUserStats,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  type User,
  type UserStats,
  type CreateUserData,
  type UpdateUserData,
} from '@modules/user/static/api/index';
import { getRoles, type Role } from '@modules/rbac/static/api/roles';

defineOptions({ name: 'UsersView' });

// State
const loading = ref(false);
const users = ref<User[]>([]);
const stats = ref<UserStats>({ total: 0, active: 0, inactive: 0, newThisMonth: 0 });
const roles = ref<Role[]>([]);
const searchQuery = ref('');
const roleFilter = ref<number | undefined>(undefined);
const statusFilter = ref<string | undefined>(undefined);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });

// Modal state
const showFormModal = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const formLoading = ref(false);
const editingUser = ref<User | null>(null);
const formState = reactive<CreateUserData & { confirm_password?: string }>({
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone: '',
  role_id: 5,
  is_active: true,
  confirm_password: '',
});

// View drawer
const showDrawer = ref(false);
const selectedUser = ref<User | null>(null);

// Change password modal
const showPasswordModal = ref(false);
const passwordUser = ref<User | null>(null);
const passwordForm = reactive({ new_password: '', confirm_password: '' });
const passwordLoading = ref(false);

// Computed
const filteredUsers = computed(() => {
  let result = users.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (u) =>
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q),
    );
  }
  if (roleFilter.value !== undefined) {
    result = result.filter((u) => u.role_id === roleFilter.value);
  }
  if (statusFilter.value === 'active') {
    result = result.filter((u) => u.is_active);
  } else if (statusFilter.value === 'inactive') {
    result = result.filter((u) => !u.is_active);
  }
  return result;
});

const roleMap = computed(() => {
  const map: Record<number, Role> = {};
  for (const r of roles.value) map[r.id] = r;
  return map;
});

const roleColors: Record<string, string> = {
  super_admin: 'red',
  admin: 'volcano',
  manager: 'orange',
  staff: 'blue',
  user: 'green',
  guest: 'default',
};

// Table columns
const columns: ColumnsType = [
  { title: 'User', key: 'user', width: 280 },
  { title: 'Role', key: 'role', width: 140 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 140 },
  { title: 'Last Login', key: 'last_login', width: 160 },
  { title: 'Created', key: 'created', width: 140 },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' },
];

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [usersRes, statsRes, rolesRes] = await Promise.all([
      getUsers({ page: pagination.current, limit: pagination.pageSize }),
      getUserStats(),
      getRoles(),
    ]);
    // Handle paginated response — usersRes may be array or have nested structure
    if (Array.isArray(usersRes)) {
      users.value = usersRes;
    } else if (usersRes?.data) {
      users.value = usersRes.data;
    } else {
      users.value = usersRes || [];
    }
    stats.value = statsRes || { total: 0, active: 0, inactive: 0, newThisMonth: 0 };
    roles.value = Array.isArray(rolesRes) ? rolesRes : [];
  } catch (error) {
    message.error('Failed to load users');
    console.error('Failed to load users:', error);
  } finally {
    loading.value = false;
  }
}

function getInitials(user: User) {
  return `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase();
}

function getAvatarColor(user: User) {
  const colors = ['#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2'];
  const idx = (user.id || 0) % colors.length;
  return colors[idx];
}

function getRoleName(roleId: number) {
  return roleMap.value[roleId]?.display_name || 'Unknown';
}

function getRoleColor(roleId: number) {
  const role = roleMap.value[roleId];
  return roleColors[role?.name || ''] || 'default';
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function openCreate() {
  formMode.value = 'create';
  editingUser.value = null;
  Object.assign(formState, {
    email: '', password: '', first_name: '', last_name: '',
    phone: '', role_id: 5, is_active: true, confirm_password: '',
  });
  showFormModal.value = true;
}

function openEdit(user: User) {
  formMode.value = 'edit';
  editingUser.value = user;
  Object.assign(formState, {
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone || '',
    role_id: user.role_id,
    is_active: user.is_active,
    password: '',
    confirm_password: '',
  });
  showFormModal.value = true;
}

function openView(user: User) {
  selectedUser.value = user;
  showDrawer.value = true;
}

function openChangePassword(user: User) {
  passwordUser.value = user;
  passwordForm.new_password = '';
  passwordForm.confirm_password = '';
  showPasswordModal.value = true;
}

async function handleSubmit() {
  if (!formState.first_name || !formState.last_name || !formState.email) {
    message.warning('Please fill in all required fields');
    return;
  }

  if (formMode.value === 'create') {
    if (!formState.password || formState.password.length < 8) {
      message.warning('Password must be at least 8 characters');
      return;
    }
    if (formState.password !== formState.confirm_password) {
      message.warning('Passwords do not match');
      return;
    }
  }

  formLoading.value = true;
  try {
    if (formMode.value === 'create') {
      await createUser({
        email: formState.email,
        password: formState.password,
        first_name: formState.first_name,
        last_name: formState.last_name,
        phone: formState.phone,
        role_id: formState.role_id,
        is_active: formState.is_active,
      });
      message.success('User created successfully');
    } else if (editingUser.value) {
      const data: UpdateUserData = {
        first_name: formState.first_name,
        last_name: formState.last_name,
        phone: formState.phone,
        role_id: formState.role_id,
        is_active: formState.is_active,
      };
      await updateUser(editingUser.value.id, data);
      message.success('User updated successfully');
    }
    showFormModal.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Operation failed');
  } finally {
    formLoading.value = false;
  }
}

async function handleChangePassword() {
  if (!passwordForm.new_password || passwordForm.new_password.length < 8) {
    message.warning('Password must be at least 8 characters');
    return;
  }
  if (passwordForm.new_password !== passwordForm.confirm_password) {
    message.warning('Passwords do not match');
    return;
  }
  if (!passwordUser.value) return;

  passwordLoading.value = true;
  try {
    await changePassword(passwordUser.value.id, {
      new_password: passwordForm.new_password,
    });
    message.success('Password changed successfully');
    showPasswordModal.value = false;
  } catch (error: any) {
    message.error(error?.message || 'Failed to change password');
  } finally {
    passwordLoading.value = false;
  }
}

function handleDelete(user: User) {
  Modal.confirm({
    title: 'Delete User',
    content: `Are you sure you want to delete "${user.first_name} ${user.last_name}"? This action cannot be undone.`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteUser(user.id);
        message.success('User deleted successfully');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete user');
      }
    },
  });
}

function handleTableChange(pag: any) {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  loadData();
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="users-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Users :size="24" />
          User Management
        </h1>
        <p class="text-gray-500 m-0">Manage system users and their access</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add User
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ stats.total }}</div>
            <div class="text-gray-500 text-sm">Total Users</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ stats.active }}</div>
            <div class="text-gray-500 text-sm">Active</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-red-500">{{ stats.inactive }}</div>
            <div class="text-gray-500 text-sm">Inactive</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-500">{{ stats.newThisMonth }}</div>
            <div class="text-gray-500 text-sm">New This Month</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="8">
          <a-input v-model:value="searchQuery" placeholder="Search users..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="12" :sm="8">
          <a-select
            v-model:value="roleFilter"
            placeholder="Filter by role"
            allow-clear
            style="width: 100%"
          >
            <a-select-option v-for="role in roles" :key="role.id" :value="role.id">
              {{ role.display_name }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="12" :sm="8">
          <a-select
            v-model:value="statusFilter"
            placeholder="Filter by status"
            allow-clear
            style="width: 100%"
          >
            <a-select-option value="active">Active</a-select-option>
            <a-select-option value="inactive">Inactive</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredUsers"
        :loading="loading"
        :pagination="{ current: pagination.current, pageSize: pagination.pageSize, total: filteredUsers.length, showSizeChanger: true, showTotal: (total: number) => `${total} users` }"
        :scroll="{ x: 1000 }"
        row-key="id"
        size="middle"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- User -->
          <template v-if="column.key === 'user'">
            <div class="flex items-center gap-3">
              <div
                v-if="(record as User).avatar"
                class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
              >
                <img :src="(record as User).avatar" class="w-full h-full object-cover" />
              </div>
              <div
                v-else
                class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                :style="{ backgroundColor: getAvatarColor(record as User) }"
              >
                {{ getInitials(record as User) }}
              </div>
              <div>
                <div class="font-medium">
                  {{ (record as User).first_name }} {{ (record as User).last_name }}
                </div>
                <div class="text-xs text-gray-400">{{ (record as User).email }}</div>
              </div>
            </div>
          </template>

          <!-- Role -->
          <template v-else-if="column.key === 'role'">
            <a-tag :color="getRoleColor((record as User).role_id)">
              {{ getRoleName((record as User).role_id) }}
            </a-tag>
          </template>

          <!-- Status -->
          <template v-else-if="column.key === 'status'">
            <a-badge
              :status="(record as User).is_active ? 'success' : 'error'"
              :text="(record as User).is_active ? 'Active' : 'Inactive'"
            />
          </template>

          <!-- Last Login -->
          <template v-else-if="column.key === 'last_login'">
            <span class="text-sm text-gray-500">
              {{ formatDateTime((record as User).last_login) }}
            </span>
          </template>

          <!-- Created -->
          <template v-else-if="column.key === 'created'">
            <span class="text-sm text-gray-500">
              {{ formatDate((record as User).created_at) }}
            </span>
          </template>

          <!-- Actions -->
          <template v-else-if="column.key === 'actions'">
            <a-dropdown>
              <a-button type="text" size="small">
                <MoreVertical :size="16" />
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="view" @click="openView(record as User)">
                    <Eye :size="14" class="mr-2" /> View
                  </a-menu-item>
                  <a-menu-item key="edit" @click="openEdit(record as User)">
                    <Edit3 :size="14" class="mr-2" /> Edit
                  </a-menu-item>
                  <a-menu-item key="password" @click="openChangePassword(record as User)">
                    <Key :size="14" class="mr-2" /> Change Password
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger @click="handleDelete(record as User)">
                    <Trash2 :size="14" class="mr-2" /> Delete
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="showFormModal"
      :title="formMode === 'create' ? 'Create User' : 'Edit User'"
      :confirm-loading="formLoading"
      @ok="handleSubmit"
      width="520px"
    >
      <a-form layout="vertical" class="mt-4">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="First Name" required>
              <a-input v-model:value="formState.first_name" placeholder="First name" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Last Name" required>
              <a-input v-model:value="formState.last_name" placeholder="Last name" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Email" required>
          <a-input
            v-model:value="formState.email"
            placeholder="email@example.com"
            type="email"
            :disabled="formMode === 'edit'"
          />
        </a-form-item>
        <a-form-item label="Phone">
          <a-input v-model:value="formState.phone" placeholder="+1 (555) 000-0000" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Role">
              <a-select v-model:value="formState.role_id" style="width: 100%">
                <a-select-option v-for="role in roles" :key="role.id" :value="role.id">
                  {{ role.display_name }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Status">
              <a-switch v-model:checked="formState.is_active" checked-children="Active" un-checked-children="Inactive" />
            </a-form-item>
          </a-col>
        </a-row>
        <template v-if="formMode === 'create'">
          <a-form-item label="Password" required>
            <a-input-password v-model:value="formState.password" placeholder="Min 8 characters" />
          </a-form-item>
          <a-form-item label="Confirm Password" required>
            <a-input-password v-model:value="formState.confirm_password" placeholder="Confirm password" />
          </a-form-item>
        </template>
      </a-form>
    </a-modal>

    <!-- View Drawer -->
    <a-drawer
      v-model:open="showDrawer"
      :title="`${selectedUser?.first_name || ''} ${selectedUser?.last_name || ''}`"
      width="500"
      placement="right"
    >
      <template v-if="selectedUser">
        <div class="flex items-center gap-4 mb-6">
          <div
            v-if="selectedUser.avatar"
            class="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
          >
            <img :src="selectedUser.avatar" class="w-full h-full object-cover" />
          </div>
          <div
            v-else
            class="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-medium flex-shrink-0"
            :style="{ backgroundColor: getAvatarColor(selectedUser) }"
          >
            {{ getInitials(selectedUser) }}
          </div>
          <div>
            <h2 class="text-xl font-semibold m-0">
              {{ selectedUser.first_name }} {{ selectedUser.last_name }}
            </h2>
            <div class="text-gray-500">{{ selectedUser.email }}</div>
            <div class="mt-1 flex items-center gap-2">
              <a-tag :color="getRoleColor(selectedUser.role_id)">
                {{ getRoleName(selectedUser.role_id) }}
              </a-tag>
              <a-badge
                :status="selectedUser.is_active ? 'success' : 'error'"
                :text="selectedUser.is_active ? 'Active' : 'Inactive'"
              />
            </div>
          </div>
        </div>

        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="Email">{{ selectedUser.email }}</a-descriptions-item>
          <a-descriptions-item label="Phone">{{ selectedUser.phone || '-' }}</a-descriptions-item>
          <a-descriptions-item label="Role">
            <a-tag :color="getRoleColor(selectedUser.role_id)">
              {{ getRoleName(selectedUser.role_id) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="Status">
            <a-badge
              :status="selectedUser.is_active ? 'success' : 'error'"
              :text="selectedUser.is_active ? 'Active' : 'Inactive'"
            />
          </a-descriptions-item>
          <a-descriptions-item label="Email Verified">
            {{ selectedUser.is_email_verified ? 'Yes' : 'No' }}
          </a-descriptions-item>
          <a-descriptions-item label="Last Login">
            {{ formatDateTime(selectedUser.last_login) }}
          </a-descriptions-item>
          <a-descriptions-item label="Created">
            {{ formatDateTime(selectedUser.created_at) }}
          </a-descriptions-item>
          <a-descriptions-item label="Updated">
            {{ formatDateTime(selectedUser.updated_at) }}
          </a-descriptions-item>
        </a-descriptions>

        <div class="mt-6 flex gap-2">
          <a-button block @click="openEdit(selectedUser)">
            <template #icon><Edit3 :size="14" /></template>
            Edit User
          </a-button>
          <a-button block @click="openChangePassword(selectedUser)">
            <template #icon><Key :size="14" /></template>
            Change Password
          </a-button>
        </div>
      </template>
    </a-drawer>

    <!-- Change Password Modal -->
    <a-modal
      v-model:open="showPasswordModal"
      title="Change Password"
      :confirm-loading="passwordLoading"
      @ok="handleChangePassword"
      width="400px"
    >
      <p class="text-gray-500 mb-4">
        Change password for <strong>{{ passwordUser?.first_name }} {{ passwordUser?.last_name }}</strong>
      </p>
      <a-form layout="vertical">
        <a-form-item label="New Password" required>
          <a-input-password v-model:value="passwordForm.new_password" placeholder="Min 8 characters" />
        </a-form-item>
        <a-form-item label="Confirm Password" required>
          <a-input-password v-model:value="passwordForm.confirm_password" placeholder="Confirm password" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.users-page {
  min-height: 100%;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.ant-descriptions-item-label) {
  font-weight: 500;
  color: #6b7280;
}
</style>
