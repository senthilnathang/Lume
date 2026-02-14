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
  AlertTriangle,
  MoreVertical,
  Crown,
  Mail,
  Phone,
} from 'lucide-vue-next';

import {
  getTeamMembers,
  getTeamMember,
  getDepartments,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  type TeamMember,
  type CreateTeamMemberData,
} from '@/api/team';

defineOptions({ name: 'TeamView' });

// State
const loading = ref(false);
const members = ref<TeamMember[]>([]);
const departments = ref<string[]>([]);
const searchQuery = ref('');
const departmentFilter = ref<string | undefined>(undefined);
const roleFilter = ref<string | undefined>(undefined);

// Modal state
const showFormModal = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const formLoading = ref(false);
const editingMember = ref<TeamMember | null>(null);
const formState = reactive<CreateTeamMemberData>({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  position: '',
  department: '',
  bio: '',
  is_active: true,
  is_leader: false,
});

// View drawer
const showDrawer = ref(false);
const selectedMember = ref<TeamMember | null>(null);
const drawerLoading = ref(false);

// Computed
const filteredMembers = computed(() => {
  let result = members.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (m) =>
        m.first_name?.toLowerCase().includes(q) ||
        m.last_name?.toLowerCase().includes(q) ||
        m.position?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q),
    );
  }
  if (departmentFilter.value) {
    result = result.filter((m) => m.department === departmentFilter.value);
  }
  if (roleFilter.value === 'leaders') {
    result = result.filter((m) => m.is_leader);
  } else if (roleFilter.value === 'members') {
    result = result.filter((m) => !m.is_leader);
  }
  return result;
});

const totalMembers = computed(() => members.value.length);
const activeMembers = computed(() => members.value.filter((m) => m.is_active).length);
const leaderCount = computed(() => members.value.filter((m) => m.is_leader).length);
const departmentCount = computed(() => new Set(members.value.map((m) => m.department).filter(Boolean)).size);

// Table columns
const columns: ColumnsType = [
  { title: 'Member', key: 'member', width: 260 },
  { title: 'Department', key: 'department', width: 140 },
  { title: 'Role', key: 'role', width: 110 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Contact', key: 'contact', width: 200 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

const avatarColors = ['#1890ff', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16', '#13c2c2', '#2f54eb', '#fa541c'];

function getInitials(member: TeamMember) {
  return `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase();
}

function getAvatarColor(id: number) {
  return avatarColors[id % avatarColors.length];
}

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [membersRes, deptsRes] = await Promise.allSettled([
      getTeamMembers(),
      getDepartments(),
    ]);
    if (membersRes.status === 'fulfilled') {
      const res = membersRes.value;
      members.value = Array.isArray(res) ? res : res?.data || [];
    }
    if (deptsRes.status === 'fulfilled') {
      departments.value = Array.isArray(deptsRes.value) ? deptsRes.value : [];
    }
  } catch (error) {
    message.error('Failed to load team members');
    console.error('Failed to load team:', error);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  formMode.value = 'create';
  editingMember.value = null;
  Object.assign(formState, {
    first_name: '', last_name: '', email: '', phone: '',
    position: '', department: '', bio: '', is_active: true, is_leader: false,
  });
  showFormModal.value = true;
}

function openEdit(member: TeamMember) {
  formMode.value = 'edit';
  editingMember.value = member;
  Object.assign(formState, {
    first_name: member.first_name,
    last_name: member.last_name,
    email: member.email,
    phone: member.phone || '',
    position: member.position || '',
    department: member.department || '',
    bio: member.bio || '',
    is_active: member.is_active,
    is_leader: member.is_leader,
  });
  showFormModal.value = true;
}

async function openView(member: TeamMember) {
  drawerLoading.value = true;
  showDrawer.value = true;
  try {
    const detail = await getTeamMember(member.id);
    selectedMember.value = detail;
  } catch {
    selectedMember.value = member;
  } finally {
    drawerLoading.value = false;
  }
}

async function handleSubmit() {
  if (!formState.first_name || !formState.last_name || !formState.email) {
    message.warning('Please fill in all required fields');
    return;
  }

  formLoading.value = true;
  try {
    if (formMode.value === 'create') {
      await createTeamMember({ ...formState });
      message.success('Team member added successfully');
    } else if (editingMember.value) {
      await updateTeamMember(editingMember.value.id, { ...formState });
      message.success('Team member updated successfully');
    }
    showFormModal.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Operation failed');
  } finally {
    formLoading.value = false;
  }
}

function handleDelete(member: TeamMember) {
  Modal.confirm({
    title: 'Remove Team Member',
    content: `Are you sure you want to remove "${member.first_name} ${member.last_name}"?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Remove',
    okType: 'danger',
    async onOk() {
      try {
        await deleteTeamMember(member.id);
        message.success('Team member removed');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to remove');
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
  <div class="team-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Users :size="24" />
          Team Management
        </h1>
        <p class="text-gray-500 m-0">Manage team members, departments, and leadership</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Member
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalMembers }}</div>
            <div class="text-gray-500 text-sm">Total Members</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ activeMembers }}</div>
            <div class="text-gray-500 text-sm">Active</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-500">{{ leaderCount }}</div>
            <div class="text-gray-500 text-sm">Leaders</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-500">{{ departmentCount }}</div>
            <div class="text-gray-500 text-sm">Departments</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="8">
          <a-input v-model:value="searchQuery" placeholder="Search team..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-select v-model:value="departmentFilter" placeholder="Filter by department" allow-clear style="width: 100%">
            <a-select-option v-for="dept in departments" :key="dept" :value="dept">
              {{ dept }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-select v-model:value="roleFilter" placeholder="Filter by role" allow-clear style="width: 100%">
            <a-select-option value="leaders">Leaders</a-select-option>
            <a-select-option value="members">Members</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredMembers"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <!-- Member -->
          <template v-if="column.key === 'member'">
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                :style="{ backgroundColor: getAvatarColor((record as TeamMember).id) }"
              >
                {{ getInitials(record as TeamMember) }}
              </div>
              <div class="min-w-0">
                <div class="font-medium flex items-center gap-1.5">
                  <Crown v-if="(record as TeamMember).is_leader" :size="14" class="text-yellow-500" />
                  {{ (record as TeamMember).first_name }} {{ (record as TeamMember).last_name }}
                </div>
                <div v-if="(record as TeamMember).position" class="text-xs text-gray-400">
                  {{ (record as TeamMember).position }}
                </div>
              </div>
            </div>
          </template>

          <!-- Department -->
          <template v-else-if="column.key === 'department'">
            <a-tag v-if="(record as TeamMember).department" color="blue">
              {{ (record as TeamMember).department }}
            </a-tag>
            <span v-else class="text-gray-300">-</span>
          </template>

          <!-- Role -->
          <template v-else-if="column.key === 'role'">
            <a-tag :color="(record as TeamMember).is_leader ? 'gold' : 'default'">
              {{ (record as TeamMember).is_leader ? 'Leader' : 'Member' }}
            </a-tag>
          </template>

          <!-- Status -->
          <template v-else-if="column.key === 'status'">
            <a-badge
              :status="(record as TeamMember).is_active ? 'success' : 'error'"
              :text="(record as TeamMember).is_active ? 'Active' : 'Inactive'"
            />
          </template>

          <!-- Contact -->
          <template v-else-if="column.key === 'contact'">
            <div class="text-sm">
              <div class="flex items-center gap-1 text-gray-600">
                <Mail :size="12" /> {{ (record as TeamMember).email }}
              </div>
              <div v-if="(record as TeamMember).phone" class="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                <Phone :size="10" /> {{ (record as TeamMember).phone }}
              </div>
            </div>
          </template>

          <!-- Actions -->
          <template v-else-if="column.key === 'actions'">
            <a-dropdown>
              <a-button type="text" size="small">
                <MoreVertical :size="16" />
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="view" @click="openView(record as TeamMember)">
                    <Eye :size="14" class="mr-2" /> View
                  </a-menu-item>
                  <a-menu-item key="edit" @click="openEdit(record as TeamMember)">
                    <Edit3 :size="14" class="mr-2" /> Edit
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger @click="handleDelete(record as TeamMember)">
                    <Trash2 :size="14" class="mr-2" /> Remove
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
      :title="formMode === 'create' ? 'Add Team Member' : 'Edit Team Member'"
      :confirm-loading="formLoading"
      @ok="handleSubmit"
      width="560px"
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
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Email" required>
              <a-input v-model:value="formState.email" placeholder="Email address" type="email" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Phone">
              <a-input v-model:value="formState.phone" placeholder="Phone number" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Position">
              <a-input v-model:value="formState.position" placeholder="e.g., Project Manager" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Department">
              <a-input v-model:value="formState.department" placeholder="e.g., Operations" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Bio">
          <a-textarea v-model:value="formState.bio" placeholder="Brief biography" :rows="3" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Leadership">
              <a-switch v-model:checked="formState.is_leader" checked-children="Leader" un-checked-children="Member" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Status">
              <a-switch v-model:checked="formState.is_active" checked-children="Active" un-checked-children="Inactive" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- View Drawer -->
    <a-drawer
      v-model:open="showDrawer"
      :title="selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : 'Member Details'"
      width="500"
      placement="right"
    >
      <a-spin :spinning="drawerLoading">
        <template v-if="selectedMember">
          <div class="mb-6">
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                :style="{ backgroundColor: getAvatarColor(selectedMember.id) }"
              >
                {{ getInitials(selectedMember) }}
              </div>
              <div>
                <h2 class="text-xl font-semibold m-0 flex items-center gap-2">
                  {{ selectedMember.first_name }} {{ selectedMember.last_name }}
                  <Crown v-if="selectedMember.is_leader" :size="18" class="text-yellow-500" />
                </h2>
                <div class="text-gray-500">{{ selectedMember.position || 'No position' }}</div>
                <div class="flex items-center gap-2 mt-1">
                  <a-tag v-if="selectedMember.department" color="blue">{{ selectedMember.department }}</a-tag>
                  <a-badge
                    :status="selectedMember.is_active ? 'success' : 'error'"
                    :text="selectedMember.is_active ? 'Active' : 'Inactive'"
                  />
                </div>
              </div>
            </div>
          </div>

          <a-descriptions :column="1" bordered size="small" class="mb-6">
            <a-descriptions-item label="Email">
              <a :href="`mailto:${selectedMember.email}`" class="text-blue-500">{{ selectedMember.email }}</a>
            </a-descriptions-item>
            <a-descriptions-item label="Phone">
              {{ selectedMember.phone || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="Department">
              {{ selectedMember.department || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="Position">
              {{ selectedMember.position || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="Joined">
              {{ formatDate(selectedMember.created_at) }}
            </a-descriptions-item>
          </a-descriptions>

          <div v-if="selectedMember.bio" class="mb-6">
            <h3 class="text-sm font-semibold text-gray-500 mb-2">Biography</h3>
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedMember.bio }}</p>
          </div>

          <div class="flex gap-2">
            <a-button block @click="openEdit(selectedMember)">
              <template #icon><Edit3 :size="14" /></template>
              Edit
            </a-button>
            <a-button block danger @click="handleDelete(selectedMember)">
              <template #icon><Trash2 :size="14" /></template>
              Remove
            </a-button>
          </div>
        </template>
      </a-spin>
    </a-drawer>
  </div>
</template>

<style scoped>
.team-page {
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
