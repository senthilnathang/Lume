<template>
  <div class="donations-view">
    <div class="page-header">
      <div class="header-content">
        <h1>Donations</h1>
        <p class="subtitle">Manage donations and campaigns</p>
      </div>
      <div class="header-actions">
        <button @click="activeTab = 'donations'" :class="{ active: activeTab === 'donations' }" class="tab-btn">
          Donations
        </button>
        <button @click="activeTab = 'donors'" :class="{ active: activeTab === 'donors' }" class="tab-btn">
          Donors
        </button>
        <button @click="activeTab = 'campaigns'" :class="{ active: activeTab === 'campaigns' }" class="tab-btn">
          Campaigns
        </button>
        <button @click="showAddModal = true" class="add-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Donation
        </button>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-label">Total Raised</span>
        <span class="stat-value">{{ formatCurrency(stats.totalRaised) }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">This Month</span>
        <span class="stat-value">{{ formatCurrency(stats.monthlyRaised) }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total Donors</span>
        <span class="stat-value">{{ stats.totalDonors }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Avg Donation</span>
        <span class="stat-value">{{ formatCurrency(stats.avgDonation) }}</span>
      </div>
    </div>

    <DataTable
      v-if="activeTab === 'donations'"
      title="All Donations"
      :columns="donationColumns"
      :data="donations"
      :loading="loading"
      :total="total"
      :page-size="pageSize"
      :actions="['view', 'edit', 'delete']"
      @search="handleSearch"
      @sort="handleSort"
      @page="handlePage"
      @action="handleAction"
      @add="showAddModal = true"
    />

    <DataTable
      v-else-if="activeTab === 'donors'"
      title="Donors"
      singular-name="Donor"
      :columns="donorColumns"
      :data="donors"
      :loading="loading"
      :total="donorTotal"
      :page-size="pageSize"
      :actions="['view', 'edit']"
      @search="handleDonorSearch"
      @sort="handleDonorSort"
      @page="handleDonorPage"
      @action="handleDonorAction"
    />

    <DataTable
      v-else-if="activeTab === 'campaigns'"
      title="Campaigns"
      singular-name="Campaign"
      :columns="campaignColumns"
      :data="campaigns"
      :loading="loading"
      :total="campaignTotal"
      :page-size="pageSize"
      :actions="['view', 'edit', 'delete']"
      @search="handleCampaignSearch"
      @sort="handleCampaignSort"
      @page="handleCampaignPage"
      @action="handleCampaignAction"
      @add="showCampaignModal = true"
    />

    <DonationModal
      v-if="showAddModal"
      :donation="selectedDonation"
      :mode="modalMode"
      @close="closeModal"
      @save="handleSaveDonation"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, h } from 'vue';
import DataTable from '@/components/DataTable.vue';
import CurrencyCell from '@/components/cells/CurrencyCell.vue';
import DateCell from '@/components/cells/DateCell.vue';
import StatusCell from '@/components/cells/StatusCell.vue';
import DonationModal from './DonationModal.vue';

const activeTab = ref('donations');
const loading = ref(false);
const showAddModal = ref(false);
const showCampaignModal = ref(false);
const selectedDonation = ref(null);
const modalMode = ref('add');

const donations = ref([]);
const donors = ref([]);
const campaigns = ref([]);
const total = ref(0);
const donorTotal = ref(0);
const campaignTotal = ref(0);
const pageSize = 10;
const page = ref(1);

const stats = ref({
  totalRaised: 125000,
  monthlyRaised: 15000,
  totalDonors: 245,
  avgDonation: 500
});

const donationColumns = [
  { key: 'receipt_number', label: 'Receipt #', sortable: true },
  { key: 'donor', label: 'Donor', sortable: true },
  { key: 'campaign', label: 'Campaign' },
  { key: 'amount', label: 'Amount', type: 'currency', sortable: true },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'payment_method', label: 'Method' },
  { key: 'donation_date', label: 'Date', type: 'date' }
];

const donorColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'total_donations', label: 'Total Donated', type: 'currency', sortable: true },
  { key: 'donation_count', label: 'Donations', sortable: true },
  { key: 'last_donation', label: 'Last Donation', type: 'date' }
];

const campaignColumns = [
  { key: 'name', label: 'Campaign Name', sortable: true },
  { key: 'goal', label: 'Goal', type: 'currency', sortable: true },
  { key: 'raised', label: 'Raised', type: 'currency', sortable: true },
  { key: 'progress', label: 'Progress', type: 'progress' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'end_date', label: 'End Date', type: 'date' }
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const fetchDonations = async () => {
  loading.value = true;
  try {
    const response = await fetch(`/api/donations?page=${page.value}&limit=${pageSize}`);
    const data = await response.json();
    donations.value = data.data || [];
    total.value = data.total || 0;
  } catch (error) {
    console.error('Failed to fetch donations:', error);
  } finally {
    loading.value = false;
  }
};

const fetchDonors = async () => {
  loading.value = true;
  try {
    const response = await fetch(`/api/donors?page=${page.value}&limit=${pageSize}`);
    const data = await response.json();
    donors.value = data.data || [];
    donorTotal.value = data.total || 0;
  } catch (error) {
    console.error('Failed to fetch donors:', error);
  } finally {
    loading.value = false;
  }
};

const fetchCampaigns = async () => {
  loading.value = true;
  try {
    const response = await fetch(`/api/campaigns?page=${page.value}&limit=${pageSize}`);
    const data = await response.json();
    campaigns.value = data.data || [];
    campaignTotal.value = data.total || 0;
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = (query) => { page.value = 1; fetchDonations(); };
const handleSort = () => fetchDonations();
const handlePage = (p) => { page.value = p; fetchDonations(); };
const handleDonorSearch = (query) => { page.value = 1; fetchDonors(); };
const handleDonorSort = () => fetchDonors();
const handleDonorPage = (p) => { page.value = p; fetchDonors(); };
const handleCampaignSearch = (query) => { page.value = 1; fetchCampaigns(); };
const handleCampaignSort = () => fetchCampaigns();
const handleCampaignPage = (p) => { page.value = p; fetchCampaigns(); };

const handleAction = (action, donation) => {
  if (action === 'view') {
    selectedDonation.value = donation;
    modalMode.value = 'view';
    showAddModal.value = true;
  } else if (action === 'edit') {
    selectedDonation.value = donation;
    modalMode.value = 'edit';
    showAddModal.value = true;
  }
};

const handleDonorAction = (action, donor) => {
  if (action === 'view') {
    selectedDonation.value = donor;
    modalMode.value = 'view';
    showAddModal.value = true;
  }
};

const handleCampaignAction = (action, campaign) => {
  if (action === 'view') {
    selectedDonation.value = campaign;
    modalMode.value = 'view';
    showCampaignModal.value = true;
  }
};

const closeModal = () => {
  showAddModal.value = false;
  showCampaignModal.value = false;
  selectedDonation.value = null;
};

const handleSaveDonation = async (donationData) => {
  try {
    if (modalMode.value === 'add') {
      await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donationData)
      });
    } else {
      await fetch(`/api/donations/${donationData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donationData)
      });
    }
    closeModal();
    fetchDonations();
  } catch (error) {
    console.error('Failed to save donation:', error);
  }
};

onMounted(() => {
  fetchDonations();
});
</script>

<style scoped>
.donations-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.subtitle {
  color: #64748b;
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #f8fafc;
}

.tab-btn.active {
  background: #4f46e5;
  border-color: #4f46e5;
  color: white;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #4338ca;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-label {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
}

@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>
