<script lang="ts" setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  Shield,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Edit3,
  Trash2,
  AlertTriangle,
  MoreVertical,
  Lock,
} from 'lucide-vue-next';

import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  type Role,
  type CreateRoleData,
} from '@/api/roles';

defineOptions({ name: 'RolesView' });

// State
const loading = ref(false);
const roles = ref<Role[]>([]);
const searchQuery = ref('');
const typeFilter = ref<string | undefined>(undefined);

// Modal state
const showFormModal = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const formLoading = ref(false);
const editingRole = ref<Role | null>(null);
const formState = reactive<CreateRoleData>({
  name: '',
  display_name: '',
  description: '',
  is_active: true,
});

// View drawer
const showDrawer = ref(false);
const selectedRole = ref<Role | null>(null);
const drawerLoading = ref(false);

// Computed
const filteredRoles = computed(() => {
  let result = roles.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.display_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q),
    );
  }
  if (typeFilter.value === 'system') {
    result = result.filter((r) => r.is_system);
  } else if (typeFilter.value === 'custom') {
    result = result.filter((r) => !r.is_system);
  }
  return result;
});

const totalRoles = computed(() => roles.value.length);
const activeRoles = computed(() => roles.value.filter((r) => r.is_active).length);
const systemRoles = computed(() => roles.value.filter((r) => r.is_system).length);

// Table columns
const columns: ColumnsType = [
  { title: 'Role', key: 'role', width: 240 },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Type', key: 'type', width: 110 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

// Methods
async function loadData() {
  loading.value = true;
  try {
    const res = await getRoles();
    roles.value = Array.isArray(res) ? res : [];
  } catch (error) {
    message.error('Failed to load roles');
    console.error('Failed to load roles:', error);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  formMode.value = 'create';
  editingRole.value = null;
  Object.assign(formState, {
    name: '', display_name: '', description: '', is_active: true,
  });
  showFormModal.value = true;
}

function openEdit(role: Role) {
  if (role.is_system) {
    message.warning('System roles cannot be edited');
    return;
  }
  formMode.value = 'edit';
  editingRole.value = role;
  Object.assign(formState, {
    name: role.name,
    display_name: role.display_name,
    description: role.description || '',
    is_active: role.is_active,
  });
  showFormModal.value = true;
}

async function openView(role: Role) {
  drawerLoading.value = true;
  showDrawer.value = true;
  try {
    const detail = await getRole(role.id);
    selectedRole.value = detail;
  } catch {
    selectedRole.value = role;
  } finally {
    drawerLoading.value = false;
  }
}

async function handleSubmit() {
  if (!formState.name || !formState.display_name) {
    message.warning('Please fill in all required fields');
    return;
  }

  formLoading.value = true;
  try {
    if (formMode.value === 'create') {
      await createRole({
        name: formState.name,
        display_name: formState.display_name,
        description: formState.description,
        is_active: formState.is_active,
      });
      message.success('Role created successfully');
    } else if (editingRole.value) {
      await updateRole(editingRole.value.id, {
        display_name: formState.display_name,
        description: formState.description,
        is_active: formState.is_active,
      });
      message.success('Role updated successfully');
    }
    showFormModal.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Operation failed');
  } finally {
    formLoading.value = false;
  }
}

function handleDelete(role: Role) {
  if (role.is_system) {
    message.warning('System roles cannot be deleted');
    return;
  }

  Modal.confirm({
    title: 'Delete Role',
    content: `Are you sure you want to delete "${role.display_name}"? Users assigned to this role may lose their permissions.`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteRole(role.id);
        message.success('Role deleted successfully');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete role');
      }
    },
  });
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="roles-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Shield :size="24" />
          Role Management
        </h1>
        <p class="text-gray-500 m-0">Define roles and manage access levels</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Role
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalRoles }}</div>
            <div class="text-gray-500 text-sm">Total Roles</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ activeRoles }}</div>
            <div class="text-gray-500 text-sm">Active</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-500">{{ systemRoles }}</div>
            <div class="text-gray-500 text-sm">System Roles</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12">
          <a-input v-model:value="searchQuery" placeholder="Search roles..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="12">
          <a-select
            v-model:value="typeFilter"
            placeholder="Filter by type"
            allow-clear
            style="width: 100%"
          >
            <a-select-option value="system">System Roles</a-select-option>
            <a-select-option value="custom">Custom Roles</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredRoles"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <!-- Role -->
          <template v-if="column.key === 'role'">
            <div>
              <div class="font-medium flex items-center gap-1.5">
                <Lock v-if="(record as Role).is_system" :size="14" class="text-purple-400" />
                {{ (record as Role).display_name }}
              </div>
              <div class="text-xs text-gray-400">
                <code class="bg-gray-100 px-1 py-0.5 rounded">{{ (record as Role).name }}</code>
              </div>
            </div>
          </template>

          <!-- Type -->
          <template v-else-if="column.key === 'type'">
            <a-tag :color="(record as Role).is_system ? 'blue' : 'default'">
              {{ (record as Role).is_system ? 'System' : 'Custom' }}
            </a-tag>
          </template>

          <!-- Status -->
          <template v-else-if="column.key === 'status'">
            <a-badge
              :status="(record as Role).is_active ? 'success' : 'error'"
              :text="(record as Role).is_active ? 'Active' : 'Inactive'"
            />
          </template>

          <!-- Actions -->
          <template v-else-if="column.key === 'actions'">
            <a-dropdown>
              <a-button type="text" size="small">
                <MoreVertical :size="16" />
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="view" @click="openView(record as Role)">
                    <Eye :size="14" class="mr-2" /> View
                  </a-menu-item>
                  <a-menu-item
                    key="edit"
                    :disabled="(record as Role).is_system"
                    @click="openEdit(record as Role)"
                  >
                    <Edit3 :size="14" class="mr-2" /> Edit
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item
                    key="delete"
                    danger
                    :disabled="(record as Role).is_system"
                    @click="handleDelete(record as Role)"
                  >
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
      :title="formMode === 'create' ? 'Create Role' : 'Edit Role'"
      :confirm-loading="formLoading"
      @ok="handleSubmit"
      width="480px"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Technical Name" required>
          <a-input
            v-model:value="formState.name"
            placeholder="e.g., content_editor"
            :disabled="formMode === 'edit'"
          />
          <div class="text-xs text-gray-400 mt-1">
            Lowercase with underscores, cannot be changed later
          </div>
        </a-form-item>
        <a-form-item label="Display Name" required>
          <a-input v-model:value="formState.display_name" placeholder="e.g., Content Editor" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea
            v-model:value="formState.description"
            placeholder="Brief description of this role"
            :rows="3"
          />
        </a-form-item>
        <a-form-item label="Status">
          <a-switch
            v-model:checked="formState.is_active"
            checked-children="Active"
            un-checked-children="Inactive"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- View Drawer -->
    <a-drawer
      v-model:open="showDrawer"
      :title="selectedRole?.display_name || 'Role Details'"
      width="500"
      placement="right"
    >
      <a-spin :spinning="drawerLoading">
        <template v-if="selectedRole">
          <div class="mb-6">
            <div class="flex items-center gap-3 mb-4">
              <div
                class="w-14 h-14 rounded-xl flex items-center justify-center"
                :class="selectedRole.is_system ? 'bg-purple-100' : 'bg-blue-100'"
              >
                <Shield :size="24" :class="selectedRole.is_system ? 'text-purple-500' : 'text-blue-500'" />
              </div>
              <div>
                <h2 class="text-xl font-semibold m-0">{{ selectedRole.display_name }}</h2>
                <div class="flex items-center gap-2 mt-1">
                  <a-tag :color="selectedRole.is_system ? 'blue' : 'default'">
                    {{ selectedRole.is_system ? 'System' : 'Custom' }}
                  </a-tag>
                  <a-badge
                    :status="selectedRole.is_active ? 'success' : 'error'"
                    :text="selectedRole.is_active ? 'Active' : 'Inactive'"
                  />
                </div>
              </div>
            </div>

            <a-alert
              v-if="selectedRole.is_system"
              type="info"
              show-icon
              message="System Role"
              description="This is a built-in system role and cannot be modified or deleted."
              class="mb-4"
            />
          </div>

          <a-descriptions :column="1" bordered size="small" class="mb-6">
            <a-descriptions-item label="Technical Name">
              <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{{ selectedRole.name }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="Display Name">
              {{ selectedRole.display_name }}
            </a-descriptions-item>
            <a-descriptions-item label="Description">
              {{ selectedRole.description || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="Created">
              {{ formatDate(selectedRole.created_at) }}
            </a-descriptions-item>
          </a-descriptions>

          <!-- Permissions -->
          <div v-if="selectedRole.permissions && selectedRole.permissions.length > 0">
            <h3 class="text-sm font-semibold text-gray-500 mb-2">
              Assigned Permissions ({{ selectedRole.permissions.length }})
            </h3>
            <div class="flex flex-wrap gap-2">
              <a-tag v-for="perm in selectedRole.permissions" :key="perm.id" color="blue">
                {{ perm.action || 'read' }}
              </a-tag>
            </div>
          </div>

          <div v-if="!selectedRole.is_system" class="mt-6 flex gap-2">
            <a-button block @click="openEdit(selectedRole)">
              <template #icon><Edit3 :size="14" /></template>
              Edit Role
            </a-button>
            <a-button block danger @click="handleDelete(selectedRole)">
              <template #icon><Trash2 :size="14" /></template>
              Delete
            </a-button>
          </div>
        </template>
      </a-spin>
    </a-drawer>
  </div>
</template>

<style scoped>
.roles-page {
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
