<script lang="ts" setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  UsersRound,
  Plus,
  RefreshCw,
  Search,
  Edit3,
  Trash2,
  AlertTriangle,
  MoreVertical,
} from 'lucide-vue-next';

import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  type Group,
  type CreateGroupData,
} from '@/api/groups';

defineOptions({ name: 'GroupsView' });

// State
const loading = ref(false);
const groups = ref<Group[]>([]);
const searchQuery = ref('');

// Modal state
const showFormModal = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const formLoading = ref(false);
const editingGroup = ref<Group | null>(null);
const formState = reactive<CreateGroupData>({
  name: '',
  description: '',
  is_active: true,
});

// Computed
const filteredGroups = computed(() => {
  if (!searchQuery.value) return groups.value;
  const q = searchQuery.value.toLowerCase();
  return groups.value.filter(
    (g) =>
      g.name?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q),
  );
});

const totalGroups = computed(() => groups.value.length);
const activeGroups = computed(() => groups.value.filter((g) => g.is_active).length);
const inactiveGroups = computed(() => groups.value.filter((g) => !g.is_active).length);

// Table columns
const columns: ColumnsType = [
  { title: 'Group', key: 'group', width: 300 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Created', key: 'created', width: 150 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

// Methods
async function loadData() {
  loading.value = true;
  try {
    const res = await getGroups();
    groups.value = Array.isArray(res) ? res : [];
  } catch (error) {
    message.error('Failed to load groups');
    console.error('Failed to load groups:', error);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  formMode.value = 'create';
  editingGroup.value = null;
  Object.assign(formState, { name: '', description: '', is_active: true });
  showFormModal.value = true;
}

function openEdit(group: Group) {
  formMode.value = 'edit';
  editingGroup.value = group;
  Object.assign(formState, {
    name: group.name,
    description: group.description || '',
    is_active: group.is_active,
  });
  showFormModal.value = true;
}

async function handleSubmit() {
  if (!formState.name) {
    message.warning('Group name is required');
    return;
  }

  formLoading.value = true;
  try {
    if (formMode.value === 'create') {
      await createGroup({
        name: formState.name,
        description: formState.description,
        is_active: formState.is_active,
      });
      message.success('Group created successfully');
    } else if (editingGroup.value) {
      await updateGroup(editingGroup.value.id, {
        name: formState.name,
        description: formState.description,
        is_active: formState.is_active,
      });
      message.success('Group updated successfully');
    }
    showFormModal.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Operation failed');
  } finally {
    formLoading.value = false;
  }
}

function handleDelete(group: Group) {
  Modal.confirm({
    title: 'Delete Group',
    content: `Are you sure you want to delete "${group.name}"?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteGroup(group.id);
        message.success('Group deleted successfully');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete group');
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
  <div class="groups-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <UsersRound :size="24" />
          Group Management
        </h1>
        <p class="text-gray-500 m-0">Organize users into groups</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Group
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalGroups }}</div>
            <div class="text-gray-500 text-sm">Total Groups</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ activeGroups }}</div>
            <div class="text-gray-500 text-sm">Active</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-400">{{ inactiveGroups }}</div>
            <div class="text-gray-500 text-sm">Inactive</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-input v-model:value="searchQuery" placeholder="Search groups..." allow-clear>
        <template #prefix><Search :size="14" class="text-gray-400" /></template>
      </a-input>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredGroups"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <!-- Group -->
          <template v-if="column.key === 'group'">
            <div>
              <div class="font-medium">{{ (record as Group).name }}</div>
              <div v-if="(record as Group).description" class="text-xs text-gray-400 truncate max-w-[280px]">
                {{ (record as Group).description }}
              </div>
            </div>
          </template>

          <!-- Status -->
          <template v-else-if="column.key === 'status'">
            <a-badge
              :status="(record as Group).is_active ? 'success' : 'error'"
              :text="(record as Group).is_active ? 'Active' : 'Inactive'"
            />
          </template>

          <!-- Created -->
          <template v-else-if="column.key === 'created'">
            <span class="text-sm text-gray-500">
              {{ formatDate((record as Group).created_at) }}
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
                  <a-menu-item key="edit" @click="openEdit(record as Group)">
                    <Edit3 :size="14" class="mr-2" /> Edit
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger @click="handleDelete(record as Group)">
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
      :title="formMode === 'create' ? 'Create Group' : 'Edit Group'"
      :confirm-loading="formLoading"
      @ok="handleSubmit"
      width="480px"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Group Name" required>
          <a-input v-model:value="formState.name" placeholder="e.g., Engineering Team" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea
            v-model:value="formState.description"
            placeholder="Brief description of this group"
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
  </div>
</template>

<style scoped>
.groups-page {
  min-height: 100%;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
