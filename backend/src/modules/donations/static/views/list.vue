<script setup>
import { ref, onMounted, computed } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Table,
  Tag,
  Space,
  Input,
  Select,
  SelectOption,
  Modal,
  Form,
  FormItem,
  InputNumber,
  DatePicker,
  Switch,
  Tooltip,
  Popconfirm,
  message,
  Spin,
  Row,
  Col,
  Statistic,
} from 'ant-design-vue';

import {
  PlusOutlined,
  SearchOutlined,
  DollarOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import { Eye, Edit3, Trash2 } from 'lucide-vue-next';

defineOptions({
  name: 'DonationsList',
});

const loading = ref(false);
const saving = ref(false);
const searchText = ref('');
const statusFilter = ref(null);
const donations = ref([]);
const campaigns = ref([]);
const modalVisible = ref(false);
const editingDonation = ref(null);

const columns = [
  { title: 'Donor', key: 'donor', width: 200 },
  { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120 },
  { title: 'Campaign', dataIndex: 'campaign', key: 'campaign' },
  { title: 'Date', dataIndex: 'donation_date', key: 'donation_date', width: 150 },
  { title: 'Payment Method', dataIndex: 'payment_method', key: 'payment_method', width: 130 },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 130 },
];

const paymentMethods = ['cash', 'cheque', 'bank_transfer', 'online', 'other'];
const donationStatuses = ['pending', 'completed', 'failed', 'refunded'];

const formState = ref({
  donor_id: null,
  campaign_id: null,
  amount: 0,
  currency: 'USD',
  payment_method: 'online',
  status: 'pending',
  donation_date: '',
  notes: '',
});

const stats = ref({ total: 0, count: 0, average: 0 });

const filteredDonations = computed(() => {
  return donations.value.filter((donation) => {
    const donorName = `${donation.donor?.first_name || ''} ${donation.donor?.last_name || ''}`.toLowerCase();
    const matchesSearch =
      !searchText.value ||
      donorName.includes(searchText.value.toLowerCase()) ||
      (donation.campaign && donation.campaign.toLowerCase().includes(searchText.value.toLowerCase()));
    const matchesStatus = !statusFilter.value || donation.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

function getStatusColor(status) {
  return status === 'completed' ? 'success' : status === 'pending' ? 'warning' : status === 'failed' ? 'error' : 'default';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

async function loadDonations() {
  loading.value = true;
  try {
    const token = localStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const [donationsRes, statsRes, campaignsRes] = await Promise.all([
      fetch('/api/donations', { headers }),
      fetch('/api/donations/stats', { headers }),
      fetch('/api/donations/campaigns', { headers }),
    ]);

    const donationsData = await donationsRes.json();
    const statsData = await statsRes.json();
    const campaignsData = await campaignsRes.json();

    donations.value = donationsData.data || [];
    if (statsData.data) {
      stats.value = statsData.data;
    }
    campaigns.value = campaignsData.data || [];
  } catch (error) {
    console.error('Failed to load donations:', error);
    message.error('Failed to load donations');
  } finally {
    loading.value = false;
  }
}

function openModal(donation = null) {
  editingDonation.value = donation;
  if (donation) {
    formState.value = {
      donor_id: donation.donor_id,
      campaign_id: donation.campaign_id,
      amount: donation.amount,
      currency: donation.currency || 'USD',
      payment_method: donation.payment_method || 'online',
      status: donation.status || 'pending',
      donation_date: donation.donation_date,
      notes: donation.notes || '',
    };
  } else {
    formState.value = {
      donor_id: null,
      campaign_id: null,
      amount: 0,
      currency: 'USD',
      payment_method: 'online',
      status: 'pending',
      donation_date: '',
      notes: '',
    };
  }
  modalVisible.value = true;
}

function closeModal() {
  modalVisible.value = false;
  editingDonation.value = null;
}

async function handleSave() {
  saving.value = true;
  try {
    const token = localStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = '/api/donations';
    let method = 'POST';

    if (editingDonation.value && editingDonation.value.id) {
      url = `/api/donations/${editingDonation.value.id}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(formState.value),
    });

    const result = await response.json();

    if (result.success || response.ok) {
      message.success(editingDonation.value ? 'Donation updated successfully' : 'Donation created successfully');
      closeModal();
      await loadDonations();
    } else {
      message.error(result.error || 'Failed to save donation');
    }
  } catch (error) {
    console.error('Failed to save donation:', error);
    message.error('Failed to save donation');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(donation) {
  Modal.confirm({
    title: 'Delete Donation',
    content: `Are you sure you want to delete this donation of ${formatCurrency(donation.amount)}?`,
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        const token = localStorage.getItem('accessToken');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`/api/donations/${donation.id}`, {
          method: 'DELETE',
          headers,
        });

        const result = await response.json();

        if (result.success || response.ok) {
          message.success('Donation deleted successfully');
          await loadDonations();
        } else {
          message.error(result.error || 'Failed to delete donation');
        }
      } catch (error) {
        message.error('Failed to delete donation');
      }
    },
  });
}

onMounted(() => {
  loadDonations();
});
</script>

<template>
  <Page title="Donations" description="Track and manage donations">
    <Spin :spinning="loading">
      <Row :gutter="[16, 16]" class="mb-4">
        <Col :xs="24" :sm="12" :md="6">
          <Card>
            <Statistic title="Total Donations" :value="stats.total" :precision="2" prefix="$">
              <template #prefix>
                <DollarOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="12" :md="6">
          <Card>
            <Statistic title="Donation Count" :value="stats.count">
              <template #prefix>
                <UserOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="12" :md="6">
          <Card>
            <Statistic title="Average Donation" :value="stats.average" :precision="2" prefix="$" />
          </Card>
        </Col>
      </Row>

      <Card>
        <div class="flex justify-between items-center mb-4">
          <Space>
            <Input
              v-model:value="searchText"
              placeholder="Search donations..."
              style="width: 250px"
              allow-clear
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </Input>
            <Select
              v-model:value="statusFilter"
              placeholder="All Status"
              style="width: 150px"
              allow-clear
            >
              <SelectOption value="completed">Completed</SelectOption>
              <SelectOption value="pending">Pending</SelectOption>
              <SelectOption value="failed">Failed</SelectOption>
            </Select>
          </Space>
          <Button type="primary" @click="openModal()">
            <PlusOutlined />
            Add Donation
          </Button>
        </div>

        <Table
          :data-source="filteredDonations"
          :columns="columns"
          :row-key="(record) => record.id"
          :pagination="{ pageSize: 10 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'donor'">
              <Space>
                <UserOutlined />
                <div>
                  <div class="font-medium">{{ record.donor?.first_name }} {{ record.donor?.last_name }}</div>
                  <div class="text-xs text-gray-500">{{ record.donor?.email }}</div>
                </div>
              </Space>
            </template>
            <template v-else-if="column.key === 'amount'">
              <span class="font-medium">{{ formatCurrency(record.amount) }}</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <Tag :color="getStatusColor(record.status)">{{ record.status }}</Tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="actions-cell flex items-center gap-1">
                <Tooltip title="View">
                  <Button type="text" size="small" @click="openModal(record)">
                    <template #icon><Eye :size="15" /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button type="text" size="small" @click="openModal(record)">
                    <template #icon><Edit3 :size="15" /></template>
                  </Button>
                </Tooltip>
                <Popconfirm title="Delete this donation?" ok-text="Delete" ok-type="danger" @confirm="handleDelete(record)">
                  <Tooltip title="Delete">
                    <Button type="text" size="small" danger>
                      <template #icon><Trash2 :size="15" /></template>
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </div>
            </template>
          </template>
        </Table>
      </Card>

      <Modal
        v-model:open="modalVisible"
        :title="editingDonation ? 'Edit Donation' : 'Add Donation'"
        @ok="handleSave"
        :confirm-loading="saving"
        width="600px"
      >
        <Form layout="vertical">
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Amount" required>
                <InputNumber v-model:value="formState.amount" :min="0" :precision="2" style="width: 100%" />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Currency">
                <Select v-model:value="formState.currency" style="width: 100%">
                  <SelectOption value="USD">USD</SelectOption>
                  <SelectOption value="EUR">EUR</SelectOption>
                  <SelectOption value="GBP">GBP</SelectOption>
                </Select>
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Payment Method">
                <Select v-model:value="formState.payment_method" style="width: 100%">
                  <SelectOption v-for="pm in paymentMethods" :key="pm" :value="pm">
                    {{ pm }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Status">
                <Select v-model:value="formState.status" style="width: 100%">
                  <SelectOption v-for="s in donationStatuses" :key="s" :value="s">
                    {{ s }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
          </Row>
          <FormItem label="Notes">
            <Input v-model:value="formState.notes" type="textarea" :rows="2" placeholder="Any notes" />
          </FormItem>
        </Form>
      </Modal>
    </Spin>
  </Page>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}

.font-medium {
  font-weight: 500;
}

.text-xs {
  font-size: 12px;
}

.text-gray-500 {
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
