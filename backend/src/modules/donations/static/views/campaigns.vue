<script lang="ts" setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  Megaphone, Plus, RefreshCw, Search, Eye, Edit3, Trash2,
  AlertTriangle, MoreVertical, Star, Target,
} from 'lucide-vue-next';
import {
  getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign,
  type Campaign, type CreateCampaignData,
} from '@modules/donations/static/api/index';

defineOptions({ name: 'CampaignsView' });

// State
const loading = ref(false);
const campaigns = ref<Campaign[]>([]);
const searchQuery = ref('');
const statusFilter = ref<string | undefined>(undefined);

// Modal state
const showFormModal = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const formLoading = ref(false);
const editingCampaign = ref<Campaign | null>(null);
const formState = reactive<CreateCampaignData & { slug?: string }>({
  name: '', description: '', goal_amount: undefined,
  start_date: '', end_date: '', is_featured: false,
});

// Drawer
const showDrawer = ref(false);
const selectedCampaign = ref<Campaign | null>(null);
const drawerLoading = ref(false);

// Computed stats
const stats = computed(() => ({
  total: campaigns.value.length,
  active: campaigns.value.filter((c) => c.status === 'active').length,
  totalGoal: campaigns.value.reduce((s, c) => s + (c.goal_amount || 0), 0),
  totalRaised: campaigns.value.reduce((s, c) => s + (c.raised_amount || 0), 0),
}));

const filteredCampaigns = computed(() => {
  let result = campaigns.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter((c) => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
  }
  if (statusFilter.value) result = result.filter((c) => c.status === statusFilter.value);
  return result;
});

// Table columns
const columns: ColumnsType = [
  { title: 'Campaign', key: 'campaign', width: 250 },
  { title: 'Goal', key: 'goal', width: 120 },
  { title: 'Raised', key: 'raised', width: 200 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Dates', key: 'dates', width: 180 },
  { title: 'Featured', key: 'featured', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 80, fixed: 'right' },
];

const statusColors: Record<string, string> = {
  draft: 'default', active: 'green', completed: 'blue', cancelled: 'red',
};

// Methods
function formatCurrency(amount?: number) {
  return amount != null ? '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '$0.00';
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return '-';
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return formatDate(start || end);
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function getProgress(campaign: Campaign) {
  if (!campaign.goal_amount || campaign.goal_amount <= 0) return 0;
  return Math.min(100, Math.round((campaign.raised_amount / campaign.goal_amount) * 100));
}

async function loadData() {
  loading.value = true;
  try {
    const res = await getCampaigns();
    campaigns.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch (error) {
    message.error('Failed to load campaigns');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  formMode.value = 'create';
  editingCampaign.value = null;
  Object.assign(formState, {
    name: '', description: '', goal_amount: undefined,
    start_date: '', end_date: '', is_featured: false, slug: '',
  });
  showFormModal.value = true;
}

function openEdit(campaign: Campaign) {
  formMode.value = 'edit';
  editingCampaign.value = campaign;
  Object.assign(formState, {
    name: campaign.name, description: campaign.description || '',
    goal_amount: campaign.goal_amount, start_date: campaign.start_date || '',
    end_date: campaign.end_date || '', is_featured: campaign.is_featured,
  });
  showFormModal.value = true;
}

async function openView(campaign: Campaign) {
  drawerLoading.value = true;
  showDrawer.value = true;
  try {
    const detail = await getCampaign(campaign.id);
    selectedCampaign.value = detail;
  } catch {
    selectedCampaign.value = campaign;
  } finally {
    drawerLoading.value = false;
  }
}

async function handleSubmit() {
  if (!formState.name) { message.warning('Campaign name is required'); return; }
  formLoading.value = true;
  try {
    const data: any = { ...formState };
    if (formMode.value === 'create') {
      data.slug = slugify(formState.name);
    }
    if (!data.goal_amount) delete data.goal_amount;
    if (!data.start_date) delete data.start_date;
    if (!data.end_date) delete data.end_date;
    delete data.slug_display;
    if (formMode.value === 'create') {
      await createCampaign(data);
      message.success('Campaign created');
    } else if (editingCampaign.value) {
      await updateCampaign(editingCampaign.value.id, data);
      message.success('Campaign updated');
    }
    showFormModal.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Operation failed');
  } finally {
    formLoading.value = false;
  }
}

function handleDelete(campaign: Campaign) {
  Modal.confirm({
    title: 'Delete Campaign',
    content: `Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete', okType: 'danger',
    async onOk() {
      try {
        await deleteCampaign(campaign.id);
        message.success('Campaign deleted');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete');
      }
    },
  });
}

onMounted(() => { loadData(); });
</script>

<template>
  <div class="campaigns-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Megaphone :size="24" />
          Campaigns
        </h1>
        <p class="text-gray-500 m-0">Manage fundraising campaigns</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Create Campaign
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ stats.total }}</div>
            <div class="text-gray-500 text-sm">Total Campaigns</div>
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
            <div class="text-2xl font-bold text-orange-500">{{ formatCurrency(stats.totalGoal) }}</div>
            <div class="text-gray-500 text-sm">Total Goal</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-emerald-500">{{ formatCurrency(stats.totalRaised) }}</div>
            <div class="text-gray-500 text-sm">Total Raised</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12">
          <a-input v-model:value="searchQuery" placeholder="Search campaigns..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="12">
          <a-select v-model:value="statusFilter" placeholder="Filter by status" allow-clear style="width: 100%">
            <a-select-option value="draft">Draft</a-select-option>
            <a-select-option value="active">Active</a-select-option>
            <a-select-option value="completed">Completed</a-select-option>
            <a-select-option value="cancelled">Cancelled</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table :columns="columns" :data-source="filteredCampaigns" :loading="loading" :pagination="{ pageSize: 20, showSizeChanger: true }" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'campaign'">
            <div class="min-w-0">
              <div class="font-medium flex items-center gap-1.5">
                <Star v-if="(record as Campaign).is_featured" :size="14" class="text-yellow-400 flex-shrink-0" fill="currentColor" />
                {{ (record as Campaign).name }}
              </div>
              <div class="text-xs text-gray-400">{{ (record as Campaign).slug }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'goal'">
            <span class="text-sm font-medium">
              {{ (record as Campaign).goal_amount ? formatCurrency((record as Campaign).goal_amount) : '-' }}
            </span>
          </template>
          <template v-else-if="column.key === 'raised'">
            <div>
              <span class="text-sm font-medium">{{ formatCurrency((record as Campaign).raised_amount) }}</span>
              <a-progress
                v-if="(record as Campaign).goal_amount"
                :percent="getProgress(record as Campaign)"
                :show-info="true"
                size="small"
                :stroke-color="getProgress(record as Campaign) >= 100 ? '#52c41a' : '#1890ff'"
              />
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColors[(record as Campaign).status]">{{ (record as Campaign).status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'dates'">
            <span class="text-sm">{{ formatDateRange((record as Campaign).start_date, (record as Campaign).end_date) }}</span>
          </template>
          <template v-else-if="column.key === 'featured'">
            <Star v-if="(record as Campaign).is_featured" :size="16" class="text-yellow-400" fill="currentColor" />
            <Star v-else :size="16" class="text-gray-300" />
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-dropdown>
              <a-button type="text" size="small"><MoreVertical :size="16" /></a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="view" @click="openView(record as Campaign)"><Eye :size="14" class="mr-2" /> View</a-menu-item>
                  <a-menu-item key="edit" @click="openEdit(record as Campaign)"><Edit3 :size="14" class="mr-2" /> Edit</a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger @click="handleDelete(record as Campaign)"><Trash2 :size="14" class="mr-2" /> Delete</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal v-model:open="showFormModal" :title="formMode === 'create' ? 'Create Campaign' : 'Edit Campaign'" :confirm-loading="formLoading" @ok="handleSubmit" width="600px">
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Name" required>
          <a-input v-model:value="formState.name" placeholder="Campaign name" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="formState.description" placeholder="Campaign description" :rows="3" />
        </a-form-item>
        <a-form-item label="Goal Amount">
          <a-input-number v-model:value="formState.goal_amount" placeholder="Target amount" :min="0" :precision="2" style="width: 100%" prefix="$" />
        </a-form-item>
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
        <a-form-item label="Featured">
          <a-switch v-model:checked="formState.is_featured" checked-children="Yes" un-checked-children="No" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- View Drawer -->
    <a-drawer v-model:open="showDrawer" :title="selectedCampaign?.name || 'Campaign Details'" width="560" placement="right">
      <a-spin :spinning="drawerLoading">
        <template v-if="selectedCampaign">
          <!-- Progress Display -->
          <div v-if="selectedCampaign.goal_amount" class="text-center mb-6 p-4 bg-gray-50 rounded-xl">
            <div class="text-3xl font-bold text-green-600 mb-1">
              {{ formatCurrency(selectedCampaign.raised_amount) }}
            </div>
            <div class="text-gray-500 mb-3">raised of {{ formatCurrency(selectedCampaign.goal_amount) }} goal</div>
            <a-progress
              :percent="getProgress(selectedCampaign)"
              :stroke-color="getProgress(selectedCampaign) >= 100 ? '#52c41a' : '#1890ff'"
              :stroke-width="12"
            />
          </div>
          <div v-else class="text-center mb-6 p-4 bg-gray-50 rounded-xl">
            <div class="text-3xl font-bold text-green-600 mb-1">
              {{ formatCurrency(selectedCampaign.raised_amount) }}
            </div>
            <div class="text-gray-500">raised (no goal set)</div>
          </div>

          <div class="flex items-center gap-2 mb-4">
            <a-tag :color="statusColors[selectedCampaign.status]" class="text-sm">{{ selectedCampaign.status }}</a-tag>
            <a-tag v-if="selectedCampaign.is_featured" color="gold">
              <Star :size="12" class="mr-1" fill="currentColor" /> Featured
            </a-tag>
          </div>

          <a-descriptions :column="1" bordered size="small" class="mb-6">
            <a-descriptions-item label="Slug">{{ selectedCampaign.slug }}</a-descriptions-item>
            <a-descriptions-item label="Dates">{{ formatDateRange(selectedCampaign.start_date, selectedCampaign.end_date) }}</a-descriptions-item>
            <a-descriptions-item label="Created">{{ formatDate(selectedCampaign.created_at) }}</a-descriptions-item>
          </a-descriptions>

          <div v-if="selectedCampaign.description" class="mb-6">
            <h3 class="text-sm font-semibold text-gray-500 mb-2">Description</h3>
            <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedCampaign.description }}</div>
          </div>

          <div class="flex gap-2">
            <a-button block @click="openEdit(selectedCampaign)">
              <template #icon><Edit3 :size="14" /></template>
              Edit
            </a-button>
            <a-button block danger @click="handleDelete(selectedCampaign)">
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
.campaigns-page { min-height: 100%; }
.stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
:deep(.ant-descriptions-item-label) { font-weight: 500; color: #6b7280; }
</style>
