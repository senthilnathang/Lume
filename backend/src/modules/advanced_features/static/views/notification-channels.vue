<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  Settings,
  Plus,
  RefreshCw,
  Search,
  Edit3,
  Trash2,
} from 'lucide-vue-next';

import {
  getNotificationChannels,
  getNotificationChannel,
  createNotificationChannel,
  updateNotificationChannel,
  deleteNotificationChannel,
} from '@modules/advanced_features/static/api/index';

defineOptions({ name: 'NotificationChannelsView' });

// State
const loading = ref(false);
const channels = ref([]);
const searchQuery = ref('');

// Form drawer
const showFormDrawer = ref(false);
const formLoading = ref(false);
const editingId = ref(null);
const form = ref({
  name: '',
  channelType: 'email',
  config: '{}',
  isDefault: false,
  status: 'active',
});

// Computed
const filteredChannels = computed(() => {
  if (!searchQuery.value) return channels.value;
  const q = searchQuery.value.toLowerCase();
  return channels.value.filter(
    (c) =>
      c.name?.toLowerCase().includes(q) ||
      (c.channelType || c.channel_type)?.toLowerCase().includes(q),
  );
});

// Table columns
const columns = [
  { title: 'Name', key: 'name', width: 200 },
  { title: 'Channel Type', key: 'channelType', width: 140 },
  { title: 'Is Default', key: 'isDefault', width: 110 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Created', key: 'createdAt', width: 140 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

const channelTypeColors = {
  email: 'blue',
  sms: 'green',
  push: 'purple',
  slack: 'orange',
  webhook: 'cyan',
};

const channelTypeLabels = {
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
  slack: 'Slack',
  webhook: 'Webhook',
};

// Methods
async function loadData() {
  loading.value = true;
  try {
    const res = await getNotificationChannels();
    channels.value = Array.isArray(res) ? res : res?.data || [];
  } catch (error) {
    message.error('Failed to load notification channels');
    console.error('Failed to load notification channels:', error);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  form.value = {
    name: '',
    channelType: 'email',
    config: '{}',
    isDefault: false,
    status: 'active',
  };
  showFormDrawer.value = true;
}

async function openEdit(record) {
  editingId.value = record.id;
  formLoading.value = true;
  showFormDrawer.value = true;
  try {
    const detail = await getNotificationChannel(record.id);
    const c = detail || record;
    form.value = {
      name: c.name || '',
      channelType: c.channelType || c.channel_type || 'email',
      config: JSON.stringify(c.config || {}, null, 2),
      isDefault: c.isDefault ?? c.is_default ?? false,
      status: c.status || 'active',
    };
  } catch {
    form.value = {
      name: record.name || '',
      channelType: record.channelType || record.channel_type || 'email',
      config: JSON.stringify(record.config || {}, null, 2),
      isDefault: record.isDefault ?? record.is_default ?? false,
      status: record.status || 'active',
    };
  } finally {
    formLoading.value = false;
  }
}

async function handleSave() {
  if (!form.value.name) {
    message.warning('Name is required');
    return;
  }

  let config;
  try {
    config = JSON.parse(form.value.config);
  } catch {
    message.error('Config must be valid JSON');
    return;
  }

  const payload = {
    name: form.value.name,
    channelType: form.value.channelType,
    config,
    isDefault: form.value.isDefault,
    status: form.value.status,
  };

  formLoading.value = true;
  try {
    if (editingId.value) {
      await updateNotificationChannel(editingId.value, payload);
      message.success('Channel updated');
    } else {
      await createNotificationChannel(payload);
      message.success('Channel created');
    }
    showFormDrawer.value = false;
    await loadData();
  } catch (error) {
    message.error(error?.message || 'Failed to save channel');
  } finally {
    formLoading.value = false;
  }
}

function confirmDelete(record) {
  Modal.confirm({
    title: 'Delete Channel',
    content: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteNotificationChannel(record.id);
        message.success('Channel deleted');
        await loadData();
      } catch (error) {
        message.error(error?.message || 'Failed to delete channel');
      }
    },
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="channels-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Settings :size="24" />
          Notification Channels
        </h1>
        <p class="text-gray-500 m-0">Configure notification delivery channels</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Channel
        </a-button>
      </div>
    </div>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-input v-model:value="searchQuery" placeholder="Search channels..." allow-clear style="max-width: 400px">
        <template #prefix><Search :size="14" class="text-gray-400" /></template>
      </a-input>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredChannels"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span class="font-medium">{{ record.name }}</span>
          </template>

          <template v-else-if="column.key === 'channelType'">
            <a-tag :color="channelTypeColors[record.channelType || record.channel_type] || 'default'">
              {{ channelTypeLabels[record.channelType || record.channel_type] || record.channelType || record.channel_type }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'isDefault'">
            <a-tag v-if="record.isDefault || record.is_default" color="green">Default</a-tag>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 'active' ? 'green' : 'default'">
              {{ record.status }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            <span class="text-sm">{{ formatDate(record.createdAt || record.created_at) }}</span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <div class="flex items-center gap-1">
              <a-tooltip title="Edit">
                <a-button type="text" size="small" @click="openEdit(record)">
                  <Edit3 :size="16" />
                </a-button>
              </a-tooltip>
              <a-tooltip title="Delete">
                <a-button type="text" size="small" danger @click="confirmDelete(record)">
                  <Trash2 :size="16" />
                </a-button>
              </a-tooltip>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Drawer -->
    <a-drawer
      v-model:open="showFormDrawer"
      :title="editingId ? 'Edit Channel' : 'Create Channel'"
      width="480"
      placement="right"
      :footer-style="{ textAlign: 'right' }"
    >
      <a-spin :spinning="formLoading">
        <a-form layout="vertical">
          <a-form-item label="Name" required>
            <a-input v-model:value="form.name" placeholder="e.g. Primary Email Channel" />
          </a-form-item>

          <a-form-item label="Channel Type" required>
            <a-select v-model:value="form.channelType" style="width: 100%">
              <a-select-option value="email">Email</a-select-option>
              <a-select-option value="sms">SMS</a-select-option>
              <a-select-option value="push">Push</a-select-option>
              <a-select-option value="slack">Slack</a-select-option>
              <a-select-option value="webhook">Webhook</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="Configuration (JSON)">
            <a-textarea
              v-model:value="form.config"
              :rows="6"
              placeholder='{"host": "smtp.example.com", "port": 587}'
            />
          </a-form-item>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="Default Channel">
                <a-switch v-model:checked="form.isDefault" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="Status">
                <a-select v-model:value="form.status" style="width: 100%">
                  <a-select-option value="active">Active</a-select-option>
                  <a-select-option value="inactive">Inactive</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </a-spin>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <a-button @click="showFormDrawer = false">Cancel</a-button>
          <a-button type="primary" :loading="formLoading" @click="handleSave">
            {{ editingId ? 'Update' : 'Create' }}
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.channels-page {
  min-height: 100%;
}
</style>
