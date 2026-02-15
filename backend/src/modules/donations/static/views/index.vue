<script lang="ts" setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  Heart,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  AlertTriangle,

  DollarSign,
  CreditCard,
} from 'lucide-vue-next';

import {
  getDonations,
  getDonation,
  getDonationStats,
  createDonation,
  deleteDonation,
  getDonors,
  getCampaigns,
  type Donation,
  type Donor,
  type Campaign,
  type DonationStats,
  type CreateDonationData,
} from '@modules/donations/static/api/index';

defineOptions({ name: 'DonationsView' });

// State
const loading = ref(false);
const donations = ref<Donation[]>([]);
const donors = ref<Donor[]>([]);
const campaigns = ref<Campaign[]>([]);
const stats = ref<DonationStats>({ total: 0, totalAmount: 0, completed: 0, pending: 0 });
const searchQuery = ref('');
const statusFilter = ref<string | undefined>(undefined);

// Modal state
const showFormModal = ref(false);
const formLoading = ref(false);
const formState = reactive<CreateDonationData>({
  donor_id: undefined,
  amount: 0,
  currency: 'USD',
  payment_method: undefined,
  transaction_id: '',
  campaign_id: undefined,
  designation: '',
  notes: '',
  is_recurring: false,
  frequency: 'one_time',
  anonymous: false,
});

// View drawer
const showDrawer = ref(false);
const selectedDonation = ref<Donation | null>(null);
const drawerLoading = ref(false);

// Computed
const filteredDonations = computed(() => {
  let result = donations.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (d) =>
        d.designation?.toLowerCase().includes(q) ||
        d.transaction_id?.toLowerCase().includes(q) ||
        d.donor?.first_name?.toLowerCase().includes(q) ||
        d.donor?.last_name?.toLowerCase().includes(q) ||
        String(d.id).includes(q),
    );
  }
  if (statusFilter.value) {
    result = result.filter((d) => d.status === statusFilter.value);
  }
  return result;
});

// Table columns
const columns: ColumnsType = [
  { title: 'Donation', key: 'donation', width: 220 },
  { title: 'Amount', key: 'amount', width: 130 },
  { title: 'Status', key: 'status', width: 110 },
  { title: 'Payment', key: 'payment', width: 140 },
  { title: 'Campaign', key: 'campaign', width: 150 },
  { title: 'Date', key: 'date', width: 120 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

const statusColors: Record<string, string> = {
  pending: 'orange',
  completed: 'green',
  failed: 'red',
  refunded: 'purple',
};

const paymentLabels: Record<string, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
  other: 'Other',
};

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [donationsRes, statsRes, donorsRes, campaignsRes] = await Promise.allSettled([
      getDonations(),
      getDonationStats(),
      getDonors(),
      getCampaigns(),
    ]);
    if (donationsRes.status === 'fulfilled') {
      const res = donationsRes.value;
      donations.value = Array.isArray(res) ? res : res?.data || [];
    }
    if (statsRes.status === 'fulfilled') {
      stats.value = statsRes.value;
    }
    if (donorsRes.status === 'fulfilled') {
      const res = donorsRes.value;
      donors.value = Array.isArray(res) ? res : res?.data || [];
    }
    if (campaignsRes.status === 'fulfilled') {
      campaigns.value = Array.isArray(campaignsRes.value) ? campaignsRes.value : [];
    }
  } catch (error) {
    message.error('Failed to load donations');
    console.error('Failed to load donations:', error);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  Object.assign(formState, {
    donor_id: undefined, amount: 0, currency: 'USD', payment_method: undefined,
    transaction_id: '', campaign_id: undefined, designation: '', notes: '',
    is_recurring: false, frequency: 'one_time', anonymous: false,
  });
  showFormModal.value = true;
}

async function openView(donation: Donation) {
  drawerLoading.value = true;
  showDrawer.value = true;
  try {
    const detail = await getDonation(donation.id);
    selectedDonation.value = detail;
  } catch {
    selectedDonation.value = donation;
  } finally {
    drawerLoading.value = false;
  }
}

async function handleSubmit() {
  if (!formState.amount || formState.amount <= 0) {
    message.warning('Please enter a valid amount');
    return;
  }

  formLoading.value = true;
  try {
    const data: any = { ...formState };
    if (!data.donor_id) delete data.donor_id;
    if (!data.campaign_id) delete data.campaign_id;
    if (!data.transaction_id) delete data.transaction_id;

    await createDonation(data);
    message.success('Donation recorded successfully');
    showFormModal.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Failed to record donation');
  } finally {
    formLoading.value = false;
  }
}

function handleDelete(donation: Donation) {
  Modal.confirm({
    title: 'Delete Donation',
    content: `Are you sure you want to delete donation #${donation.id}?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteDonation(donation.id);
        message.success('Donation deleted');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete');
      }
    },
  });
}

function getDonorName(donation: Donation) {
  if (donation.anonymous) return 'Anonymous';
  if (donation.donor) return `${donation.donor.first_name} ${donation.donor.last_name}`;
  return 'Unknown';
}

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
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
  <div class="donations-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Heart :size="24" />
          Donations
        </h1>
        <p class="text-gray-500 m-0">Track and manage donations and contributions</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Record Donation
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ stats.total }}</div>
            <div class="text-gray-500 text-sm">Total Donations</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ formatCurrency(stats.totalAmount) }}</div>
            <div class="text-gray-500 text-sm">Total Amount</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-emerald-500">{{ stats.completed }}</div>
            <div class="text-gray-500 text-sm">Completed</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-500">{{ stats.pending }}</div>
            <div class="text-gray-500 text-sm">Pending</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12">
          <a-input v-model:value="searchQuery" placeholder="Search donations..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="12">
          <a-select v-model:value="statusFilter" placeholder="Filter by status" allow-clear style="width: 100%">
            <a-select-option value="pending">Pending</a-select-option>
            <a-select-option value="completed">Completed</a-select-option>
            <a-select-option value="failed">Failed</a-select-option>
            <a-select-option value="refunded">Refunded</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredDonations"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <!-- Donation -->
          <template v-if="column.key === 'donation'">
            <div>
              <div class="font-medium">
                <span class="text-gray-400">#{{ (record as Donation).id }}</span>
                {{ getDonorName(record as Donation) }}
              </div>
              <div v-if="(record as Donation).designation" class="text-xs text-gray-400 truncate max-w-[200px]">
                {{ (record as Donation).designation }}
              </div>
            </div>
          </template>

          <!-- Amount -->
          <template v-else-if="column.key === 'amount'">
            <span class="font-semibold text-green-600">
              {{ formatCurrency((record as Donation).amount, (record as Donation).currency) }}
            </span>
            <div v-if="(record as Donation).is_recurring" class="text-xs text-blue-400">
              {{ (record as Donation).frequency }}
            </div>
          </template>

          <!-- Status -->
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColors[(record as Donation).status]">
              {{ (record as Donation).status }}
            </a-tag>
          </template>

          <!-- Payment -->
          <template v-else-if="column.key === 'payment'">
            <div class="flex items-center gap-1.5 text-sm">
              <CreditCard :size="14" class="text-gray-400" />
              {{ paymentLabels[(record as Donation).payment_method || ''] || (record as Donation).payment_method || '-' }}
            </div>
          </template>

          <!-- Campaign -->
          <template v-else-if="column.key === 'campaign'">
            <a-tag v-if="(record as Donation).campaign" color="blue">
              {{ (record as Donation).campaign?.name }}
            </a-tag>
            <span v-else class="text-gray-400 text-sm">General</span>
          </template>

          <!-- Date -->
          <template v-else-if="column.key === 'date'">
            <span class="text-sm text-gray-500">
              {{ formatDate((record as Donation).created_at) }}
            </span>
          </template>

          <!-- Actions -->
          <template v-else-if="column.key === 'actions'">
            <div class="actions-cell flex items-center gap-1">
              <a-tooltip title="View">
                <a-button type="text" size="small" @click="openView(record as Donation)">
                  <template #icon><Eye :size="15" /></template>
                </a-button>
              </a-tooltip>
              <a-popconfirm title="Delete this donation?" ok-text="Delete" ok-type="danger" @confirm="handleDelete(record as Donation)">
                <a-tooltip title="Delete">
                  <a-button type="text" size="small" danger>
                    <template #icon><Trash2 :size="15" /></template>
                  </a-button>
                </a-tooltip>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create Modal -->
    <a-modal
      v-model:open="showFormModal"
      title="Record Donation"
      :confirm-loading="formLoading"
      @ok="handleSubmit"
      width="560px"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Donor">
          <a-select
            v-model:value="formState.donor_id"
            placeholder="Select donor (optional)"
            allow-clear
            show-search
            :filter-option="(input: string, option: any) => option.label?.toLowerCase().includes(input.toLowerCase())"
            style="width: 100%"
          >
            <a-select-option v-for="d in donors" :key="d.id" :value="d.id" :label="`${d.first_name} ${d.last_name}`">
              {{ d.first_name }} {{ d.last_name }} ({{ d.email }})
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Amount" required>
              <a-input-number v-model:value="formState.amount" :min="0" :precision="2" style="width: 100%" placeholder="0.00" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Currency">
              <a-select v-model:value="formState.currency" style="width: 100%">
                <a-select-option value="USD">USD</a-select-option>
                <a-select-option value="EUR">EUR</a-select-option>
                <a-select-option value="GBP">GBP</a-select-option>
                <a-select-option value="LKR">LKR</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Payment Method">
              <a-select v-model:value="formState.payment_method" placeholder="Select method" allow-clear style="width: 100%">
                <a-select-option value="cash">Cash</a-select-option>
                <a-select-option value="cheque">Cheque</a-select-option>
                <a-select-option value="bank_transfer">Bank Transfer</a-select-option>
                <a-select-option value="online">Online</a-select-option>
                <a-select-option value="other">Other</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Transaction ID">
              <a-input v-model:value="formState.transaction_id" placeholder="Reference number" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Campaign">
          <a-select v-model:value="formState.campaign_id" placeholder="Select campaign (optional)" allow-clear style="width: 100%">
            <a-select-option v-for="c in campaigns" :key="c.id" :value="c.id">
              {{ c.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Designation">
          <a-input v-model:value="formState.designation" placeholder="Purpose of donation" />
        </a-form-item>
        <a-form-item label="Notes">
          <a-textarea v-model:value="formState.notes" placeholder="Internal notes" :rows="2" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Anonymous">
              <a-switch v-model:checked="formState.anonymous" checked-children="Yes" un-checked-children="No" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Recurring">
              <a-switch v-model:checked="formState.is_recurring" checked-children="Yes" un-checked-children="No" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item v-if="formState.is_recurring" label="Frequency">
          <a-select v-model:value="formState.frequency" style="width: 100%">
            <a-select-option value="weekly">Weekly</a-select-option>
            <a-select-option value="monthly">Monthly</a-select-option>
            <a-select-option value="quarterly">Quarterly</a-select-option>
            <a-select-option value="annually">Annually</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- View Drawer -->
    <a-drawer
      v-model:open="showDrawer"
      :title="`Donation #${selectedDonation?.id || ''}`"
      width="500"
      placement="right"
    >
      <a-spin :spinning="drawerLoading">
        <template v-if="selectedDonation">
          <div class="mb-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center">
                <DollarSign :size="24" class="text-green-500" />
              </div>
              <div>
                <div class="text-2xl font-bold text-green-600">
                  {{ formatCurrency(selectedDonation.amount, selectedDonation.currency) }}
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <a-tag :color="statusColors[selectedDonation.status]">{{ selectedDonation.status }}</a-tag>
                  <a-tag v-if="selectedDonation.is_recurring" color="blue">{{ selectedDonation.frequency }}</a-tag>
                </div>
              </div>
            </div>
          </div>

          <a-descriptions :column="1" bordered size="small" class="mb-6">
            <a-descriptions-item label="Donor">
              {{ getDonorName(selectedDonation) }}
            </a-descriptions-item>
            <a-descriptions-item label="Payment Method">
              {{ paymentLabels[selectedDonation.payment_method || ''] || selectedDonation.payment_method || '-' }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedDonation.transaction_id" label="Transaction ID">
              <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{{ selectedDonation.transaction_id }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="Campaign">
              {{ selectedDonation.campaign?.name || 'General' }}
            </a-descriptions-item>
            <a-descriptions-item label="Designation">
              {{ selectedDonation.designation || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="Receipt Sent">
              <a-badge :status="selectedDonation.receipt_sent ? 'success' : 'default'" :text="selectedDonation.receipt_sent ? 'Yes' : 'No'" />
            </a-descriptions-item>
            <a-descriptions-item label="Date">
              {{ formatDate(selectedDonation.created_at) }}
            </a-descriptions-item>
          </a-descriptions>

          <div v-if="selectedDonation.notes" class="mb-6">
            <h3 class="text-sm font-semibold text-gray-500 mb-2">Notes</h3>
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedDonation.notes }}</p>
          </div>
        </template>
      </a-spin>
    </a-drawer>
  </div>
</template>

<style scoped>
.donations-page {
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

:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
