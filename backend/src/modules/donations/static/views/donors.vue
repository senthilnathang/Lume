<script lang="ts" setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  HeartHandshake,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Edit3,
  Trash2,
  AlertTriangle,
  MoreVertical,
  Mail,
  MapPin,
} from 'lucide-vue-next';

import {
  getDonors,
  getDonor,
  getDonorStats,
  createDonor,
  type Donor,
  type CreateDonorData,
} from '@modules/donations/static/api/index';

defineOptions({ name: 'DonorsView' });

// State
const loading = ref(false);
const donors = ref<Donor[]>([]);
const searchQuery = ref('');

// Modal state
const showFormModal = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const formLoading = ref(false);
const editingDonor = ref<Donor | null>(null);
const formState = reactive<CreateDonorData>({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  is_anonymous: false,
  is_subscribed: true,
  notes: '',
});

// View drawer
const showDrawer = ref(false);
const selectedDonor = ref<Donor | null>(null);
const donorStatsData = ref<any>(null);
const drawerLoading = ref(false);

// Computed
const filteredDonors = computed(() => {
  if (!searchQuery.value) return donors.value;
  const q = searchQuery.value.toLowerCase();
  return donors.value.filter(
    (d) =>
      d.first_name?.toLowerCase().includes(q) ||
      d.last_name?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q),
  );
});

const totalDonors = computed(() => donors.value.length);
const anonymousDonors = computed(() => donors.value.filter((d) => d.is_anonymous).length);
const subscribedDonors = computed(() => donors.value.filter((d) => d.is_subscribed).length);

// Table columns
const columns: ColumnsType = [
  { title: 'Donor', key: 'donor', width: 250 },
  { title: 'Contact', key: 'contact', width: 200 },
  { title: 'Location', key: 'location', width: 180 },
  { title: 'Subscribed', key: 'subscribed', width: 100 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

const avatarColors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#1890ff', '#52c41a', '#722ed1', '#eb2f96'];

function getInitials(donor: Donor) {
  if (donor.is_anonymous) return '?';
  return `${donor.first_name?.[0] || ''}${donor.last_name?.[0] || ''}`.toUpperCase();
}

function getAvatarColor(id: number) {
  return avatarColors[id % avatarColors.length];
}

function getDonorName(donor: Donor) {
  if (donor.is_anonymous) return 'Anonymous';
  return `${donor.first_name} ${donor.last_name}`;
}

// Methods
async function loadData() {
  loading.value = true;
  try {
    const res = await getDonors();
    donors.value = Array.isArray(res) ? res : res?.data || [];
  } catch (error) {
    message.error('Failed to load donors');
    console.error('Failed to load donors:', error);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  formMode.value = 'create';
  editingDonor.value = null;
  Object.assign(formState, {
    first_name: '', last_name: '', email: '', phone: '',
    address: '', city: '', state: '', country: '', postal_code: '',
    is_anonymous: false, is_subscribed: true, notes: '',
  });
  showFormModal.value = true;
}

function openEdit(donor: Donor) {
  formMode.value = 'edit';
  editingDonor.value = donor;
  Object.assign(formState, {
    first_name: donor.first_name,
    last_name: donor.last_name,
    email: donor.email,
    phone: donor.phone || '',
    address: donor.address || '',
    city: donor.city || '',
    state: donor.state || '',
    country: donor.country || '',
    postal_code: donor.postal_code || '',
    is_anonymous: donor.is_anonymous,
    is_subscribed: donor.is_subscribed,
    notes: donor.notes || '',
  });
  showFormModal.value = true;
}

async function openView(donor: Donor) {
  drawerLoading.value = true;
  showDrawer.value = true;
  donorStatsData.value = null;
  try {
    const [detail, statsRes] = await Promise.allSettled([
      getDonor(donor.id),
      getDonorStats(donor.id),
    ]);
    selectedDonor.value = detail.status === 'fulfilled' ? detail.value : donor;
    if (statsRes.status === 'fulfilled') {
      donorStatsData.value = statsRes.value;
    }
  } catch {
    selectedDonor.value = donor;
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
    await createDonor({ ...formState });
    message.success(formMode.value === 'create' ? 'Donor added successfully' : 'Donor updated successfully');
    showFormModal.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Operation failed');
  } finally {
    formLoading.value = false;
  }
}

function handleDelete(donor: Donor) {
  Modal.confirm({
    title: 'Delete Donor',
    content: `Are you sure you want to delete "${getDonorName(donor)}"?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        message.success('Donor deleted');
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

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="donors-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <HeartHandshake :size="24" />
          Donors
        </h1>
        <p class="text-gray-500 m-0">Manage donor information and relationships</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Donor
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalDonors }}</div>
            <div class="text-gray-500 text-sm">Total Donors</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ subscribedDonors }}</div>
            <div class="text-gray-500 text-sm">Subscribed</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-400">{{ anonymousDonors }}</div>
            <div class="text-gray-500 text-sm">Anonymous</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-input v-model:value="searchQuery" placeholder="Search donors..." allow-clear>
        <template #prefix><Search :size="14" class="text-gray-400" /></template>
      </a-input>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredDonors"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <!-- Donor -->
          <template v-if="column.key === 'donor'">
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                :style="{ backgroundColor: getAvatarColor((record as Donor).id) }"
              >
                {{ getInitials(record as Donor) }}
              </div>
              <div class="min-w-0">
                <div class="font-medium">{{ getDonorName(record as Donor) }}</div>
                <div class="text-xs text-gray-400">{{ (record as Donor).email }}</div>
              </div>
            </div>
          </template>

          <!-- Contact -->
          <template v-else-if="column.key === 'contact'">
            <div class="text-sm">
              <div v-if="(record as Donor).phone" class="text-gray-600">{{ (record as Donor).phone }}</div>
              <div class="flex items-center gap-1 text-gray-400 text-xs">
                <Mail :size="10" /> {{ (record as Donor).email }}
              </div>
            </div>
          </template>

          <!-- Location -->
          <template v-else-if="column.key === 'location'">
            <div v-if="(record as Donor).city || (record as Donor).country" class="flex items-center gap-1 text-sm text-gray-600">
              <MapPin :size="12" class="text-gray-400" />
              {{ [(record as Donor).city, (record as Donor).country].filter(Boolean).join(', ') }}
            </div>
            <span v-else class="text-gray-300">-</span>
          </template>

          <!-- Subscribed -->
          <template v-else-if="column.key === 'subscribed'">
            <a-badge
              :status="(record as Donor).is_subscribed ? 'success' : 'default'"
              :text="(record as Donor).is_subscribed ? 'Yes' : 'No'"
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
                  <a-menu-item key="view" @click="openView(record as Donor)">
                    <Eye :size="14" class="mr-2" /> View
                  </a-menu-item>
                  <a-menu-item key="edit" @click="openEdit(record as Donor)">
                    <Edit3 :size="14" class="mr-2" /> Edit
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger @click="handleDelete(record as Donor)">
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
      :title="formMode === 'create' ? 'Add Donor' : 'Edit Donor'"
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
        <a-form-item label="Address">
          <a-input v-model:value="formState.address" placeholder="Street address" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="City">
              <a-input v-model:value="formState.city" placeholder="City" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="State">
              <a-input v-model:value="formState.state" placeholder="State" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Country">
              <a-input v-model:value="formState.country" placeholder="Country" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Notes">
          <a-textarea v-model:value="formState.notes" placeholder="Internal notes" :rows="2" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Anonymous">
              <a-switch v-model:checked="formState.is_anonymous" checked-children="Yes" un-checked-children="No" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Newsletter">
              <a-switch v-model:checked="formState.is_subscribed" checked-children="Subscribed" un-checked-children="No" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- View Drawer -->
    <a-drawer
      v-model:open="showDrawer"
      :title="selectedDonor ? getDonorName(selectedDonor) : 'Donor Details'"
      width="500"
      placement="right"
    >
      <a-spin :spinning="drawerLoading">
        <template v-if="selectedDonor">
          <div class="mb-6">
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                :style="{ backgroundColor: getAvatarColor(selectedDonor.id) }"
              >
                {{ getInitials(selectedDonor) }}
              </div>
              <div>
                <h2 class="text-xl font-semibold m-0">{{ getDonorName(selectedDonor) }}</h2>
                <div class="text-gray-500">{{ selectedDonor.email }}</div>
                <div class="flex items-center gap-2 mt-1">
                  <a-badge
                    :status="selectedDonor.is_subscribed ? 'success' : 'default'"
                    :text="selectedDonor.is_subscribed ? 'Subscribed' : 'Not subscribed'"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Donor Stats -->
          <div v-if="donorStatsData" class="mb-6">
            <a-row :gutter="[12, 12]">
              <a-col :span="12">
                <a-card size="small">
                  <div class="text-center">
                    <div class="text-lg font-bold text-green-500">{{ donorStatsData.totalDonations || 0 }}</div>
                    <div class="text-gray-500 text-xs">Total Donations</div>
                  </div>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card size="small">
                  <div class="text-center">
                    <div class="text-lg font-bold text-blue-500">${{ donorStatsData.totalAmount || 0 }}</div>
                    <div class="text-gray-500 text-xs">Total Given</div>
                  </div>
                </a-card>
              </a-col>
            </a-row>
          </div>

          <a-descriptions :column="1" bordered size="small" class="mb-6">
            <a-descriptions-item label="Phone">
              {{ selectedDonor.phone || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="Address">
              {{ selectedDonor.address || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="Location">
              {{ [selectedDonor.city, selectedDonor.state, selectedDonor.country].filter(Boolean).join(', ') || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="Since">
              {{ formatDate(selectedDonor.created_at) }}
            </a-descriptions-item>
          </a-descriptions>

          <div v-if="selectedDonor.notes" class="mb-6">
            <h3 class="text-sm font-semibold text-gray-500 mb-2">Notes</h3>
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedDonor.notes }}</p>
          </div>

          <div class="flex gap-2">
            <a-button block @click="openEdit(selectedDonor)">
              <template #icon><Edit3 :size="14" /></template>
              Edit
            </a-button>
            <a-button block danger @click="handleDelete(selectedDonor)">
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
.donors-page {
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
