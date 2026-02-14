<script lang="ts" setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  Calendar,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Edit3,
  Trash2,
  AlertTriangle,
  MoreVertical,
  Star,
  Send,
  XCircle,
  MapPin,
  Users,
} from 'lucide-vue-next';

import {
  getActivities,
  getActivity,
  getActivityStats,
  createActivity,
  updateActivity,
  deleteActivity,
  publishActivity,
  cancelActivity,
  type Activity,
  type ActivityStats,
  type CreateActivityData,
} from '@/api/activities';

defineOptions({ name: 'ActivitiesView' });

// State
const loading = ref(false);
const activities = ref<Activity[]>([]);
const stats = ref<ActivityStats>({ total: 0, published: 0, upcoming: 0, featured: 0 });
const searchQuery = ref('');
const statusFilter = ref<string | undefined>(undefined);
const categoryFilter = ref<string | undefined>(undefined);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });

// Modal state
const showFormModal = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const formLoading = ref(false);
const editingActivity = ref<Activity | null>(null);
const formState = reactive<CreateActivityData>({
  title: '',
  short_description: '',
  description: '',
  category: '',
  location: '',
  start_date: '',
  end_date: '',
  capacity: undefined,
  is_featured: false,
});

// View drawer
const showDrawer = ref(false);
const selectedActivity = ref<Activity | null>(null);
const drawerLoading = ref(false);

// Computed
const categories = computed(() => {
  const cats = new Set(activities.value.map((a) => a.category).filter(Boolean));
  return Array.from(cats).sort();
});

const filteredActivities = computed(() => {
  let result = activities.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.short_description?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q),
    );
  }
  if (statusFilter.value) {
    result = result.filter((a) => a.status === statusFilter.value);
  }
  if (categoryFilter.value) {
    result = result.filter((a) => a.category === categoryFilter.value);
  }
  return result;
});

// Table columns
const columns: ColumnsType = [
  { title: 'Activity', key: 'activity', width: 300 },
  { title: 'Category', key: 'category', width: 120 },
  { title: 'Status', key: 'status', width: 110 },
  { title: 'Dates', key: 'dates', width: 180 },
  { title: 'Capacity', key: 'capacity', width: 120 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

const statusColors: Record<string, string> = {
  draft: 'default',
  published: 'green',
  completed: 'blue',
  cancelled: 'red',
};

const categoryColors: Record<string, string> = {
  workshop: 'blue',
  seminar: 'purple',
  training: 'cyan',
  event: 'green',
  meeting: 'orange',
  fundraiser: 'red',
  outreach: 'gold',
  volunteer: 'lime',
};

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [activitiesRes, statsRes] = await Promise.allSettled([
      getActivities({ page: pagination.value.current, limit: pagination.value.pageSize }),
      getActivityStats(),
    ]);
    if (activitiesRes.status === 'fulfilled') {
      const res = activitiesRes.value;
      activities.value = Array.isArray(res) ? res : res?.data || [];
      if (res?.meta) {
        pagination.value.total = res.meta.total || 0;
      }
    }
    if (statsRes.status === 'fulfilled') {
      stats.value = statsRes.value;
    }
  } catch (error) {
    message.error('Failed to load activities');
    console.error('Failed to load activities:', error);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  formMode.value = 'create';
  editingActivity.value = null;
  Object.assign(formState, {
    title: '', short_description: '', description: '', category: '',
    location: '', start_date: '', end_date: '', capacity: undefined, is_featured: false,
  });
  showFormModal.value = true;
}

function openEdit(activity: Activity) {
  formMode.value = 'edit';
  editingActivity.value = activity;
  Object.assign(formState, {
    title: activity.title,
    short_description: activity.short_description || '',
    description: activity.description || '',
    category: activity.category || '',
    location: activity.location || '',
    start_date: activity.start_date || '',
    end_date: activity.end_date || '',
    capacity: activity.capacity,
    is_featured: activity.is_featured,
  });
  showFormModal.value = true;
}

async function openView(activity: Activity) {
  drawerLoading.value = true;
  showDrawer.value = true;
  try {
    const detail = await getActivity(activity.id);
    selectedActivity.value = detail;
  } catch {
    selectedActivity.value = activity;
  } finally {
    drawerLoading.value = false;
  }
}

async function handleSubmit() {
  if (!formState.title) {
    message.warning('Activity title is required');
    return;
  }

  formLoading.value = true;
  try {
    const data: any = { ...formState };
    if (!data.capacity) delete data.capacity;
    if (!data.start_date) delete data.start_date;
    if (!data.end_date) delete data.end_date;

    if (formMode.value === 'create') {
      await createActivity(data);
      message.success('Activity created successfully');
    } else if (editingActivity.value) {
      await updateActivity(editingActivity.value.id, data);
      message.success('Activity updated successfully');
    }
    showFormModal.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Operation failed');
  } finally {
    formLoading.value = false;
  }
}

async function handlePublish(activity: Activity) {
  try {
    await publishActivity(activity.id);
    message.success('Activity published');
    await loadData();
    if (selectedActivity.value?.id === activity.id) {
      selectedActivity.value = { ...selectedActivity.value, status: 'published' };
    }
  } catch (error: any) {
    message.error(error?.message || 'Failed to publish');
  }
}

async function handleCancel(activity: Activity) {
  Modal.confirm({
    title: 'Cancel Activity',
    content: `Are you sure you want to cancel "${activity.title}"?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-orange-500 mr-2' }),
    okText: 'Cancel Activity',
    okType: 'danger',
    async onOk() {
      try {
        await cancelActivity(activity.id);
        message.success('Activity cancelled');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to cancel');
      }
    },
  });
}

function handleDelete(activity: Activity) {
  Modal.confirm({
    title: 'Delete Activity',
    content: `Are you sure you want to delete "${activity.title}"? This action cannot be undone.`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteActivity(activity.id);
        message.success('Activity deleted');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete');
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

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return '-';
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return formatDate(start || end);
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="activities-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Calendar :size="24" />
          Activities
        </h1>
        <p class="text-gray-500 m-0">Manage events, workshops, and programmes</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Activity
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ stats.total }}</div>
            <div class="text-gray-500 text-sm">Total</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ stats.published }}</div>
            <div class="text-gray-500 text-sm">Published</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-500">{{ stats.upcoming }}</div>
            <div class="text-gray-500 text-sm">Upcoming</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-500">{{ stats.featured }}</div>
            <div class="text-gray-500 text-sm">Featured</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="8">
          <a-input v-model:value="searchQuery" placeholder="Search activities..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-select v-model:value="statusFilter" placeholder="Filter by status" allow-clear style="width: 100%">
            <a-select-option value="draft">Draft</a-select-option>
            <a-select-option value="published">Published</a-select-option>
            <a-select-option value="completed">Completed</a-select-option>
            <a-select-option value="cancelled">Cancelled</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-select v-model:value="categoryFilter" placeholder="Filter by category" allow-clear style="width: 100%">
            <a-select-option v-for="cat in categories" :key="cat" :value="cat">
              {{ cat }}
            </a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredActivities"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <!-- Activity -->
          <template v-if="column.key === 'activity'">
            <div class="flex items-center gap-3">
              <div
                v-if="(record as Activity).cover_image"
                class="w-10 h-10 rounded-lg bg-cover bg-center flex-shrink-0"
                :style="{ backgroundImage: `url(${(record as Activity).cover_image})` }"
              />
              <div v-else class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Calendar :size="18" class="text-blue-400" />
              </div>
              <div class="min-w-0">
                <div class="font-medium truncate flex items-center gap-1.5">
                  <Star v-if="(record as Activity).is_featured" :size="14" class="text-yellow-400 flex-shrink-0" fill="currentColor" />
                  {{ (record as Activity).title }}
                </div>
                <div v-if="(record as Activity).location" class="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin :size="10" />
                  {{ (record as Activity).location }}
                </div>
              </div>
            </div>
          </template>

          <!-- Category -->
          <template v-else-if="column.key === 'category'">
            <a-tag v-if="(record as Activity).category" :color="categoryColors[(record as Activity).category!.toLowerCase()] || 'default'">
              {{ (record as Activity).category }}
            </a-tag>
            <span v-else class="text-gray-300">-</span>
          </template>

          <!-- Status -->
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColors[(record as Activity).status]">
              {{ (record as Activity).status }}
            </a-tag>
          </template>

          <!-- Dates -->
          <template v-else-if="column.key === 'dates'">
            <span class="text-sm">
              {{ formatDateRange((record as Activity).start_date, (record as Activity).end_date) }}
            </span>
          </template>

          <!-- Capacity -->
          <template v-else-if="column.key === 'capacity'">
            <template v-if="(record as Activity).capacity">
              <div class="flex items-center gap-2">
                <Users :size="14" class="text-gray-400" />
                <span class="text-sm">
                  {{ (record as Activity).registered_count || 0 }} / {{ (record as Activity).capacity }}
                </span>
              </div>
              <a-progress
                :percent="Math.round(((record as Activity).registered_count || 0) / (record as Activity).capacity! * 100)"
                :show-info="false"
                size="small"
                :stroke-color="((record as Activity).registered_count || 0) >= (record as Activity).capacity! ? '#ff4d4f' : '#1890ff'"
              />
            </template>
            <span v-else class="text-gray-300">No limit</span>
          </template>

          <!-- Actions -->
          <template v-else-if="column.key === 'actions'">
            <a-dropdown>
              <a-button type="text" size="small">
                <MoreVertical :size="16" />
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="view" @click="openView(record as Activity)">
                    <Eye :size="14" class="mr-2" /> View
                  </a-menu-item>
                  <a-menu-item key="edit" @click="openEdit(record as Activity)">
                    <Edit3 :size="14" class="mr-2" /> Edit
                  </a-menu-item>
                  <a-menu-item
                    v-if="(record as Activity).status === 'draft'"
                    key="publish"
                    @click="handlePublish(record as Activity)"
                  >
                    <Send :size="14" class="mr-2" /> Publish
                  </a-menu-item>
                  <a-menu-item
                    v-if="(record as Activity).status === 'published'"
                    key="cancel"
                    @click="handleCancel(record as Activity)"
                  >
                    <XCircle :size="14" class="mr-2" /> Cancel
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger @click="handleDelete(record as Activity)">
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
      :title="formMode === 'create' ? 'Create Activity' : 'Edit Activity'"
      :confirm-loading="formLoading"
      @ok="handleSubmit"
      width="600px"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Title" required>
          <a-input v-model:value="formState.title" placeholder="Activity title" />
        </a-form-item>
        <a-form-item label="Short Description">
          <a-input v-model:value="formState.short_description" placeholder="Brief summary" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="formState.description" placeholder="Full description" :rows="4" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Category">
              <a-input v-model:value="formState.category" placeholder="e.g., Workshop" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Location">
              <a-input v-model:value="formState.location" placeholder="Event location" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Start Date">
              <a-input v-model:value="formState.start_date" type="date" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="End Date">
              <a-input v-model:value="formState.end_date" type="date" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Capacity">
              <a-input-number v-model:value="formState.capacity" placeholder="Max participants" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Featured">
              <a-switch v-model:checked="formState.is_featured" checked-children="Yes" un-checked-children="No" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- View Drawer -->
    <a-drawer
      v-model:open="showDrawer"
      :title="selectedActivity?.title || 'Activity Details'"
      width="560"
      placement="right"
    >
      <a-spin :spinning="drawerLoading">
        <template v-if="selectedActivity">
          <div class="mb-6">
            <div
              v-if="selectedActivity.cover_image"
              class="w-full h-48 rounded-xl bg-cover bg-center mb-4"
              :style="{ backgroundImage: `url(${selectedActivity.cover_image})` }"
            />
            <div class="flex items-center gap-3 mb-4">
              <a-tag :color="statusColors[selectedActivity.status]" class="text-sm">
                {{ selectedActivity.status }}
              </a-tag>
              <a-tag v-if="selectedActivity.is_featured" color="gold">
                <Star :size="12" class="mr-1" fill="currentColor" /> Featured
              </a-tag>
              <a-tag v-if="selectedActivity.category" :color="categoryColors[selectedActivity.category.toLowerCase()] || 'default'">
                {{ selectedActivity.category }}
              </a-tag>
            </div>
            <p v-if="selectedActivity.short_description" class="text-gray-600 mb-2">
              {{ selectedActivity.short_description }}
            </p>
          </div>

          <a-descriptions :column="1" bordered size="small" class="mb-6">
            <a-descriptions-item label="Location">
              <div v-if="selectedActivity.location" class="flex items-center gap-1">
                <MapPin :size="14" /> {{ selectedActivity.location }}
              </div>
              <span v-else>-</span>
            </a-descriptions-item>
            <a-descriptions-item label="Dates">
              {{ formatDateRange(selectedActivity.start_date, selectedActivity.end_date) }}
            </a-descriptions-item>
            <a-descriptions-item label="Capacity">
              <template v-if="selectedActivity.capacity">
                {{ selectedActivity.registered_count || 0 }} / {{ selectedActivity.capacity }} registered
              </template>
              <span v-else>No limit</span>
            </a-descriptions-item>
            <a-descriptions-item label="Published">
              {{ formatDate(selectedActivity.published_at) }}
            </a-descriptions-item>
            <a-descriptions-item label="Created">
              {{ formatDate(selectedActivity.created_at) }}
            </a-descriptions-item>
          </a-descriptions>

          <div v-if="selectedActivity.description" class="mb-6">
            <h3 class="text-sm font-semibold text-gray-500 mb-2">Description</h3>
            <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedActivity.description }}</div>
          </div>

          <div class="flex gap-2">
            <a-button
              v-if="selectedActivity.status === 'draft'"
              type="primary"
              block
              @click="handlePublish(selectedActivity)"
            >
              <template #icon><Send :size="14" /></template>
              Publish
            </a-button>
            <a-button block @click="openEdit(selectedActivity)">
              <template #icon><Edit3 :size="14" /></template>
              Edit
            </a-button>
            <a-button
              v-if="selectedActivity.status === 'published'"
              block
              danger
              @click="handleCancel(selectedActivity)"
            >
              <template #icon><XCircle :size="14" /></template>
              Cancel
            </a-button>
          </div>
        </template>
      </a-spin>
    </a-drawer>
  </div>
</template>

<style scoped>
.activities-page {
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
